import React, { useEffect, useRef, useState } from 'react';
import {
    Play, Pause, ZoomIn, ZoomOut, Magnet, Link2, Columns, Tag
} from 'lucide-react';
import { formatTimeShort } from '../../utils/jlptAudioProcessor';

const REGION_THEMES = [
    { fill: 'rgba(245, 158, 11, 0.24)', border: '#f59e0b', pill: 'bg-amber-500 text-white' },
    { fill: 'rgba(14, 165, 233, 0.24)', border: '#0ea5e9', pill: 'bg-sky-500 text-white' },
    { fill: 'rgba(16, 185, 129, 0.24)', border: '#10b981', pill: 'bg-emerald-500 text-white' },
    { fill: 'rgba(244, 63, 94, 0.22)', border: '#f43f5e', pill: 'bg-rose-500 text-white' },
    { fill: 'rgba(148, 163, 184, 0.28)', border: '#94a3b8', pill: 'bg-slate-600 text-white' }
];

const getTickIntervalSec = (durationSec, zoom) => {
    const visibleSec = durationSec / Math.max(1, zoom);
    if (visibleSec <= 90) return 10;
    if (visibleSec <= 240) return 30;
    if (visibleSec <= 720) return 60;
    if (visibleSec <= 1800) return 180;
    return 300;
};

/**
 * Interactive zoomable waveform timeline with draggable Playhead,
 * draggable Mondai start/end resize handles, draggable whole blocks,
 * silence snap, and clickable AI keyword cue pins.
 */
const MondaiTimelineEditor = ({
    waveformBars = [],
    durationSec = 0,
    currentTime = 0,
    isPlaying = false,
    playbackRate = 1,
    setPlaybackRate = () => {},
    onTogglePlay = () => {},
    onSeek = () => {},
    rows = [],
    activeMondai = null,
    onSelectMondai = () => {},
    onUpdateRegion = () => {},
    onAutoEvenSplit = () => {},
    aiMarkers = [],
    silencePoints = [],
    showSilences = false
}) => {
    const scrollViewportRef = useRef(null);
    const trackRef = useRef(null);
    const canvasRef = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [linkedEdges, setLinkedEdges] = useState(true);
    const [dragTooltip, setDragTooltip] = useState(null); // { label, leftPct }

    // Draw sharp waveform bars on canvas whenever bars/zoom/size update
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || waveformBars.length === 0) return;

        const width = Math.round(760 * zoom);
        const height = 104;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Draw subtle silence pause bands if scanned
        if (showSilences && durationSec > 0 && silencePoints.length > 0) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
            silencePoints.forEach((sp) => {
                const x = (sp.startSec / durationSec) * width;
                const w = Math.max(2, ((sp.endSec - sp.startSec) / durationSec) * width);
                ctx.fillRect(x, 0, w, height);
            });
        }

        const barW = width / waveformBars.length;
        const curPct = durationSec > 0 ? currentTime / durationSec : 0;

        waveformBars.forEach((amp, idx) => {
            const barH = Math.max(4, amp * (height - 26));
            const x = idx * barW;
            const y = (height - barH) / 2;
            const pct = idx / waveformBars.length;
            ctx.fillStyle = pct <= curPct ? '#fbbf24' : '#38bdf8';
            ctx.fillRect(x, y, Math.max(1, barW - 0.6), barH);
        });
    }, [waveformBars, zoom, currentTime, durationSec, silencePoints, showSilences]);

    const clientXToSec = (clientX) => {
        const el = trackRef.current;
        if (!el || !durationSec) return 0;
        const rect = el.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        return ratio * durationSec;
    };

    const snapTimeIfClose = (rawSec) => {
        if (!snapEnabled || !durationSec) return rawSec;
        const threshold = Math.max(0.8, 3.0 / zoom);
        let best = rawSec;
        let bestDist = threshold;

        aiMarkers.forEach((m) => {
            const d = Math.abs(m.timeSec - rawSec);
            if (d < bestDist) {
                bestDist = d;
                best = m.timeSec;
            }
        });
        silencePoints.forEach((sp) => {
            const mid = (sp.startSec + sp.endSec) / 2;
            [sp.endSec, mid].forEach((cand) => {
                const d = Math.abs(cand - rawSec);
                if (d < bestDist) {
                    bestDist = d;
                    best = cand;
                }
            });
        });
        return best;
    };

    const startTrackPointerDrag = (e, mode, payload = {}) => {
        if (!durationSec) return;
        e.preventDefault();
        e.stopPropagation();

        const startMouseX = e.clientX;
        const initStart = payload.startSec ?? 0;
        const initEnd = payload.endSec ?? durationSec;

        const onMove = (ev) => {
            const secAtPointer = clientXToSec(ev.clientX);
            if (mode === 'playhead') {
                onSeek(secAtPointer);
                setDragTooltip({ label: formatTimeShort(secAtPointer), leftPct: (secAtPointer / durationSec) * 100 });
                return;
            }

            const trackRect = trackRef.current?.getBoundingClientRect();
            const trackW = Math.max(1, trackRect?.width || 1);
            const deltaSec = ((ev.clientX - startMouseX) / trackW) * durationSec;

            if (mode === 'start') {
                const snapped = Math.round(snapTimeIfClose(secAtPointer));
                const nextStart = Math.max(0, Math.min(initEnd - 2, snapped));
                onUpdateRegion(payload.idx, { startSec: nextStart, endSec: initEnd }, linkedEdges ? 'start' : null);
                setDragTooltip({
                    label: `M${payload.mondai} Start: ${formatTimeShort(nextStart)}`,
                    leftPct: (nextStart / durationSec) * 100
                });
            } else if (mode === 'end') {
                const snapped = Math.round(snapTimeIfClose(secAtPointer));
                const nextEnd = Math.min(Math.ceil(durationSec), Math.max(initStart + 2, snapped));
                onUpdateRegion(payload.idx, { startSec: initStart, endSec: nextEnd }, linkedEdges ? 'end' : null);
                setDragTooltip({
                    label: `M${payload.mondai} End: ${formatTimeShort(nextEnd)}`,
                    leftPct: (nextEnd / durationSec) * 100
                });
            } else if (mode === 'move') {
                const widthSec = initEnd - initStart;
                let nextStart = Math.round(initStart + deltaSec);
                nextStart = Math.max(0, Math.min(Math.ceil(durationSec) - widthSec, nextStart));
                const nextEnd = Math.min(Math.ceil(durationSec), nextStart + widthSec);
                onUpdateRegion(payload.idx, { startSec: nextStart, endSec: nextEnd }, null);
                setDragTooltip({
                    label: `M${payload.mondai}: ${formatTimeShort(nextStart)} – ${formatTimeShort(nextEnd)}`,
                    leftPct: (((nextStart + nextEnd) / 2) / durationSec) * 100
                });
            }
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            setDragTooltip(null);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        onMove(e);
    };

    const tickInterval = getTickIntervalSec(durationSec || 600, zoom);
    const ticks = [];
    if (durationSec > 0) {
        for (let t = 0; t <= durationSec; t += tickInterval) {
            ticks.push(t);
        }
    }

    const playheadPct = durationSec > 0 ? Math.max(0, Math.min(100, (currentTime / durationSec) * 100)) : 0;

    return (
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-3 space-y-2.5 select-none">
            {/* Top Timeline Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onAutoEvenSplit}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-black flex items-center gap-1 cursor-pointer"
                        title="Chia đều thành các khối để kéo đầu–cuối trực tiếp trên thanh timeline"
                    >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Tạo khối kéo nhanh</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setLinkedEdges((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                            linkedEdges
                                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                        title="Khi kéo ranh giới giữa 2 Mondai liền kề sẽ tự kéo cả điểm tiếp giáp"
                    >
                        <Link2 className="w-3 h-3" />
                        <span>Dính liền Mondai</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSnapEnabled((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                            snapEnabled
                                ? 'bg-sky-950/60 border-sky-600 text-sky-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                        title="Tự hít nhẹ vào mốc AI & khoảng lặng khi kéo"
                    >
                        <Magnet className="w-3 h-3" />
                        <span>Hít mốc</span>
                    </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 text-slate-300">
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(1, z / 2))}
                        disabled={zoom <= 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                        title="Thu nhỏ timeline"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    {[1, 2, 4, 8].map((z) => (
                        <button
                            key={z}
                            type="button"
                            onClick={() => setZoom(z)}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-black cursor-pointer ${
                                zoom === z ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            {z}x
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(8, z * 2))}
                        disabled={zoom >= 8}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                        title="Phóng to timeline để kéo chính xác từng giây"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Interactive Timeline Track */}
            <div
                ref={scrollViewportRef}
                onWheel={(e) => {
                    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        const dir = e.deltaY < 0 ? 1 : -1;
                        if (e.ctrlKey) {
                            e.preventDefault();
                            setZoom((z) => Math.max(1, Math.min(8, dir > 0 ? z * 2 : z / 2)));
                        }
                    }
                }}
                className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 relative"
            >
                <div
                    ref={trackRef}
                    style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
                    className="relative"
                >
                    {/* Floating Drag Timestamp Tooltip */}
                    {dragTooltip && (
                        <div
                            style={{ left: `${Math.max(4, Math.min(92, dragTooltip.leftPct))}%` }}
                            className="absolute top-1 z-40 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 border border-emerald-400 text-emerald-300 font-mono text-[10px] font-black shadow-lg pointer-events-none whitespace-nowrap"
                        >
                            {dragTooltip.label}
                        </div>
                    )}

                    {/* Ruler Strip (Click/drag to scrub Playhead) */}
                    <div
                        onPointerDown={(e) => startTrackPointerDrag(e, 'playhead')}
                        className="h-6 bg-slate-950 border-b border-slate-800 relative cursor-col-resize"
                        title="Kéo hoặc bấm lên thước để tua nhanh"
                    >
                        {ticks.map((sec) => {
                            const leftPct = durationSec > 0 ? (sec / durationSec) * 100 : 0;
                            return (
                                <div
                                    key={sec}
                                    style={{ left: `${leftPct}%` }}
                                    className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                                >
                                    <span className="text-[9px] font-mono text-slate-400 pl-1 leading-none pt-1">
                                        {formatTimeShort(sec)}
                                    </span>
                                    <span className="w-px h-1.5 bg-slate-700" />
                                </div>
                            );
                        })}

                        {/* AI Keyword Cue Pins on Ruler */}
                        {durationSec > 0 && aiMarkers.map((marker, mIdx) => {
                            const leftPct = Math.max(0, Math.min(99.5, (marker.timeSec / durationSec) * 100));
                            const pinColor = marker.kind === 'mondai'
                                ? 'bg-amber-500 text-white'
                                : (marker.kind === 'outro' ? 'bg-rose-500 text-white' : 'bg-sky-600 text-white');
                            return (
                                <button
                                    key={`${marker.kind}_${marker.timeSec}_${mIdx}`}
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSeek(marker.timeSec);
                                    }}
                                    style={{ left: `${leftPct}%` }}
                                    title={`${formatTimeShort(marker.timeSec)} · ${marker.text}`}
                                    className={`absolute bottom-0.5 -translate-x-1/2 px-1.5 py-0 rounded text-[9px] font-black shadow cursor-pointer z-20 hover:scale-110 transition ${pinColor}`}
                                >
                                    {marker.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Waveform + Interactive Mondai Region Blocks */}
                    <div
                        onPointerDown={(e) => startTrackPointerDrag(e, 'playhead')}
                        className="relative h-[104px] cursor-crosshair"
                    >
                        <canvas ref={canvasRef} className="w-full h-full block" />

                        {/* Draggable Colored Region Overlays */}
                        {durationSec > 0 && rows.map((row, idx) => {
                            if (typeof row.startSec !== 'number' || typeof row.endSec !== 'number' || row.endSec <= row.startSec) {
                                return null;
                            }
                            const leftPct = (row.startSec / durationSec) * 100;
                            const widthPct = ((row.endSec - row.startSec) / durationSec) * 100;
                            const theme = REGION_THEMES[idx % REGION_THEMES.length];
                            const isActive = activeMondai === row.mondai;

                            return (
                                <div
                                    key={row.mondai}
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${Math.max(0.6, widthPct)}%`,
                                        backgroundColor: theme.fill,
                                        borderColor: theme.border
                                    }}
                                    onPointerDown={(e) => {
                                        onSelectMondai(row.mondai);
                                        startTrackPointerDrag(e, 'move', {
                                            idx,
                                            mondai: row.mondai,
                                            startSec: row.startSec,
                                            endSec: row.endSec
                                        });
                                    }}
                                    className={`absolute top-1 bottom-1 border-2 rounded-lg z-10 group cursor-grab active:cursor-grabbing ${
                                        isActive ? 'ring-2 ring-white/80' : ''
                                    }`}
                                    title={`Kéo giữa để di chuyển khối M${row.mondai}, kéo 2 mép trái/phải để chỉnh Start/End`}
                                >
                                    {/* Left Resize Handle */}
                                    <div
                                        onPointerDown={(e) => {
                                            onSelectMondai(row.mondai);
                                            startTrackPointerDrag(e, 'start', {
                                                idx,
                                                mondai: row.mondai,
                                                startSec: row.startSec,
                                                endSec: row.endSec
                                            });
                                        }}
                                        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center bg-black/25 hover:bg-white/30 rounded-l"
                                        title={`Kéo chỉnh Start M${row.mondai}`}
                                    >
                                        <span className="w-0.5 h-5 bg-white/90 rounded-full" />
                                    </div>

                                    {/* Label Badge inside Region */}
                                    <div className="px-3 pt-1 flex items-center justify-between gap-1 pointer-events-none overflow-hidden">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shadow-2xs shrink-0 ${theme.pill}`}>
                                            M{row.mondai}
                                        </span>
                                        <span className="text-[9px] font-mono font-bold text-white/95 bg-slate-950/60 px-1 rounded truncate">
                                            {formatTimeShort(row.endSec - row.startSec)}
                                        </span>
                                    </div>

                                    {/* Right Resize Handle */}
                                    <div
                                        onPointerDown={(e) => {
                                            onSelectMondai(row.mondai);
                                            startTrackPointerDrag(e, 'end', {
                                                idx,
                                                mondai: row.mondai,
                                                startSec: row.startSec,
                                                endSec: row.endSec
                                            });
                                        }}
                                        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center bg-black/25 hover:bg-white/30 rounded-r"
                                        title={`Kéo chỉnh End M${row.mondai}`}
                                    >
                                        <span className="w-0.5 h-5 bg-white/90 rounded-full" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Draggable Playhead Needle */}
                        {durationSec > 0 && (
                            <div
                                style={{ left: `${playheadPct}%` }}
                                onPointerDown={(e) => startTrackPointerDrag(e, 'playhead')}
                                className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-30 cursor-col-resize"
                            >
                                <div className="w-3.5 h-3.5 -ml-[6px] -mt-1 rounded-full bg-emerald-400 border-2 border-white shadow cursor-col-resize" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Playback & Scrubbing Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-white">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onTogglePlay}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                        <span>{isPlaying ? 'Tạm dừng' : 'Nghe'}</span>
                    </button>
                    {[-30, -10, -5, -1, 1, 5, 10, 30].map((delta) => (
                        <button
                            key={delta}
                            type="button"
                            onClick={() => onSeek(currentTime + delta)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold cursor-pointer"
                        >
                            {delta > 0 ? `+${delta}s` : `${delta}s`}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-amber-300">
                        {formatTimeShort(currentTime)} / {formatTimeShort(durationSec)}
                    </span>
                    {[1, 1.25, 1.5, 2].map((spd) => (
                        <button
                            key={spd}
                            type="button"
                            onClick={() => setPlaybackRate(spd)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                                playbackRate === spd ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            {spd}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Clickable AI Keyword Cue Pills */}
            {aiMarkers.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 mr-1">
                        <Tag className="w-3 h-3" /> Mốc AI nhận diện:
                    </span>
                    {aiMarkers.map((mk, idx) => (
                        <button
                            key={`${mk.kind}_${idx}`}
                            type="button"
                            onClick={() => onSeek(mk.timeSec)}
                            title={mk.text}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition border ${
                                mk.kind === 'mondai'
                                    ? 'bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900'
                                    : (mk.kind === 'outro'
                                        ? 'bg-rose-950/60 border-rose-700 text-rose-300 hover:bg-rose-900'
                                        : 'bg-slate-800 border-slate-700 text-sky-300 hover:bg-sky-900')
                            }`}
                        >
                            {mk.label} ({formatTimeShort(mk.timeSec)})
                        </button>
                    ))}
                </div>
            )}

            {/* Silence Pause Suggestions */}
            {showSilences && silencePoints.length > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Khoảng lặng dài:</span>
                    {silencePoints.slice(0, 14).map((sp, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSeek(sp.endSec)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-sky-700 text-sky-300 text-[10px] font-mono font-bold cursor-pointer"
                        >
                            {formatTimeShort(sp.endSec)} ({sp.durationSec.toFixed(1)}s)
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MondaiTimelineEditor;
