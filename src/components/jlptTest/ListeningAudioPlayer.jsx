import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Gauge, Lock } from 'lucide-react';
import { formatTimeShort } from '../../utils/jlptAudioProcessor';

const ListeningAudioPlayerInner = ({
    src,
    startSec = null,
    endSec = null,
    externalRef = null,
    label = '',
    compact = false,
    onTimeReport = null,
    examMode = false,
    persistedState = null,
    onStateChange = null
}) => {
    const internalRef = useRef(null);
    const audioElRef = externalRef || internalRef;

    const hasSegmentBounds = typeof startSec === 'number' && startSec >= 0 && typeof endSec === 'number' && endSec > startSec;
    const effectiveStart = typeof startSec === 'number' && startSec >= 0 ? startSec : 0;

    const initialFinished = Boolean(examMode && persistedState?.status === 'finished');
    const initialStarted = Boolean(
        examMode && (persistedState?.status === 'playing' || persistedState?.status === 'paused' || initialFinished)
    );
    const initialResume = (
        examMode
        && typeof persistedState?.resumeSec === 'number'
        && persistedState.resumeSec >= effectiveStart
    ) ? persistedState.resumeSec : effectiveStart;

    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(initialStarted);
    const [isFinished, setIsFinished] = useState(initialFinished);
    const [rawDuration, setRawDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(initialResume);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [audioError, setAudioError] = useState('');

    const lastValidTimeRef = useRef(initialResume);
    const hasStartedRef = useRef(initialStarted);
    const isFinishedRef = useRef(initialFinished);
    const onStateChangeRef = useRef(onStateChange);

    useEffect(() => {
        onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    const effectiveEnd = hasSegmentBounds
        ? Math.min(endSec, rawDuration > 0 ? rawDuration : endSec)
        : rawDuration;
    const segmentDuration = Math.max(0.1, effectiveEnd - effectiveStart);
    const displayTime = isFinished && effectiveEnd > effectiveStart ? effectiveEnd : currentTime;
    const segmentElapsed = Math.max(0, Math.min(segmentDuration, displayTime - effectiveStart));
    const progressPct = Math.max(0, Math.min(100, (segmentElapsed / segmentDuration) * 100));

    // Keep rate locked to 1x in examMode and persist resume offset on unmount
    useEffect(() => {
        const el = audioElRef.current;
        if (!el) return undefined;
        el.playbackRate = examMode ? 1 : playbackRate;
        return () => {
            if (examMode && hasStartedRef.current && !isFinishedRef.current) {
                onStateChangeRef.current?.({
                    status: 'paused',
                    resumeSec: Math.max(effectiveStart, lastValidTimeRef.current)
                });
            }
            el.pause();
        };
    }, [audioElRef, playbackRate, examMode, effectiveStart]);

    const handleLoadedMetadata = () => {
        const el = audioElRef.current;
        if (!el) return;
        setRawDuration(el.duration || 0);
        const targetStart = examMode ? lastValidTimeRef.current : effectiveStart;
        if (targetStart > 0 && Math.abs(el.currentTime - targetStart) > 0.4) {
            try {
                el.currentTime = targetStart;
                setCurrentTime(targetStart);
            } catch {
                // Ignore seek errors before browser buffers metadata
            }
        }
    };

    const finishExamSegment = (finalSec) => {
        isFinishedRef.current = true;
        setIsFinished(true);
        setIsPlaying(false);
        setCurrentTime(finalSec);
        onStateChangeRef.current?.({ status: 'finished', resumeSec: finalSec });
    };

    const handleTimeUpdate = () => {
        const el = audioElRef.current;
        if (!el) return;
        if (examMode && isFinishedRef.current) {
            el.pause();
            setIsPlaying(false);
            return;
        }
        const t = el.currentTime || 0;
        if (!examMode || !hasStartedRef.current || !el.seeking) {
            lastValidTimeRef.current = Math.max(effectiveStart, t);
            setCurrentTime(t);
        }
        if (onTimeReport) onTimeReport(t);

        if (hasSegmentBounds && t >= effectiveEnd) {
            el.pause();
            if (examMode) {
                finishExamSegment(effectiveEnd);
            } else {
                el.currentTime = effectiveStart;
                setCurrentTime(effectiveStart);
                setIsPlaying(false);
            }
        }
    };

    const handleSeeking = () => {
        if (!examMode) return;
        const el = audioElRef.current;
        if (!el || isFinishedRef.current) return;
        if (hasStartedRef.current && Math.abs(el.currentTime - lastValidTimeRef.current) > 1.5) {
            try {
                el.currentTime = lastValidTimeRef.current;
            } catch {
                // Ignore seek lock failures on unbuffered elements
            }
        }
    };

    const handleRateChange = () => {
        if (!examMode) return;
        const el = audioElRef.current;
        if (el && el.playbackRate !== 1) {
            el.playbackRate = 1;
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        if (examMode) {
            const finalSec = effectiveEnd > effectiveStart ? effectiveEnd : lastValidTimeRef.current;
            finishExamSegment(finalSec);
        }
    };

    const togglePlay = async () => {
        const el = audioElRef.current;
        if (!el || !src) return;
        if (examMode) {
            if (isFinishedRef.current || isPlaying) return;
            try {
                const startFrom = hasStartedRef.current
                    ? Math.max(effectiveStart, lastValidTimeRef.current)
                    : effectiveStart;
                el.currentTime = startFrom;
                el.playbackRate = 1;
                lastValidTimeRef.current = startFrom;
                await el.play();
                hasStartedRef.current = true;
                setHasStarted(true);
                setIsPlaying(true);
                onStateChangeRef.current?.({ status: 'playing', resumeSec: startFrom });
            } catch {
                setAudioError('Không phát được file audio (kiểm tra link MP3 hoặc định dạng).');
                setIsPlaying(false);
            }
            return;
        }

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
        if (examMode) return;
        const el = audioElRef.current;
        if (!el) return;
        el.currentTime = effectiveStart;
        setCurrentTime(effectiveStart);
    };

    const handleSeek = (e) => {
        if (examMode) return;
        const el = audioElRef.current;
        if (!el) return;
        const val = Number(e.target.value);
        const target = effectiveStart + val;
        el.currentTime = target;
        setCurrentTime(target);
    };

    const cycleSpeed = () => {
        if (examMode) return;
        const speeds = [0.85, 1, 1.15, 1.25];
        const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
        setPlaybackRate(next);
        if (audioElRef.current) audioElRef.current.playbackRate = next;
    };

    const examStatusText = isFinished
        ? 'Đã phát xong · Không thể phát lại'
        : isPlaying
            ? 'Đang phát · Thi thực tế (không tua / không dừng)'
            : hasStarted
                ? 'Bấm để phát tiếp phần còn lại'
                : (label || 'Thi thực tế · Chỉ phát 1 lần từ đầu đến hết');

    return (
        <div
            onContextMenu={examMode ? (e) => e.preventDefault() : undefined}
            className={`rounded-2xl border-2 border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 ${compact ? 'p-2.5' : 'p-3.5 sm:p-4'} space-y-2`}
        >
            <audio
                ref={audioElRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onRateChange={handleRateChange}
                onEnded={handleEnded}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onError={() => setAudioError('Lỗi tải nguồn audio. Kiểm tra URL hoặc quyền truy cập file.')}
                className="hidden"
            />

            <div className="flex items-center gap-2.5 sm:gap-3">
                {examMode ? (
                    <button
                        type="button"
                        onClick={togglePlay}
                        disabled={isFinished || isPlaying}
                        className={`w-10 h-10 rounded-2xl border-2 border-b-4 flex items-center justify-center shrink-0 transition-all select-none ${
                            isFinished
                                ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-900 text-slate-400 cursor-not-allowed'
                                : isPlaying
                                    ? 'bg-emerald-500 border-emerald-600 border-b-emerald-700 text-white cursor-default shadow-xs'
                                    : 'bg-amber-500 hover:bg-amber-400 border-amber-600 border-b-amber-700 active:translate-y-0.5 active:border-b-2 text-white cursor-pointer shadow-xs'
                        }`}
                        title={examStatusText}
                    >
                        {isFinished ? (
                            <Lock className="w-4 h-4" />
                        ) : isPlaying ? (
                            <Volume2 className="w-4 h-4 animate-pulse" />
                        ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-600 border-b-4 border-b-amber-700 active:translate-y-0.5 active:border-b-2 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-all"
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
                    </>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                    {(examMode || Boolean(label) || hasSegmentBounds) && (
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                            {(examMode || Boolean(label)) && (
                                <span className="flex items-center gap-1 truncate">
                                    <Volume2 className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{examMode ? examStatusText : label}</span>
                                </span>
                            )}
                            {hasSegmentBounds && (
                                <span className="font-mono text-amber-700/80 dark:text-amber-300/80 shrink-0 ml-auto">
                                    [{formatTimeShort(effectiveStart)} – {formatTimeShort(effectiveEnd)}]
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {examMode ? (
                            <div
                                className="flex-1 h-2 bg-amber-200/80 dark:bg-slate-800 rounded-full overflow-hidden border border-amber-300/50 dark:border-slate-700 select-none"
                                aria-label="Tiến độ audio thi thực tế (không thể tua)"
                            >
                                <div
                                    className={`h-full transition-all duration-150 ${isFinished ? 'bg-slate-400 dark:bg-slate-500' : 'bg-amber-500'}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        ) : (
                            <input
                                type="range"
                                min={0}
                                max={segmentDuration}
                                step={0.1}
                                value={segmentElapsed}
                                onChange={handleSeek}
                                className="flex-1 accent-amber-500 h-1.5 bg-amber-200/80 dark:bg-slate-700 rounded-lg cursor-pointer"
                            />
                        )}
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {formatTimeShort(segmentElapsed)} / {formatTimeShort(segmentDuration)}
                        </span>
                    </div>
                </div>

                {!examMode && (
                    <button
                        type="button"
                        onClick={cycleSpeed}
                        className="px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0 hover:bg-amber-100/50"
                        title="Đổi tốc độ đọc"
                    >
                        <Gauge className="w-3 h-3 text-amber-500" />
                        <span>{playbackRate}x</span>
                    </button>
                )}
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
    const segmentKey = `${props.src}_${props.startSec ?? 0}_${props.endSec ?? 'full'}_${props.examMode ? 'exam' : 'free'}`;
    return <ListeningAudioPlayerInner key={segmentKey} {...props} />;
};

export default ListeningAudioPlayer;
