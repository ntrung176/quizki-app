import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Scissors, Upload, Download, CheckCircle2,
    Sparkles, Volume2, Flag, MapPin, Loader2, Wand2
} from 'lucide-react';
import {
    decodeAudioFile,
    getMonoChannelData,
    detectSilenceSegments,
    detectMondaiBoundariesWithAI,
    encodeAudioSliceToWavBlob,
    uploadFileToFirebaseStorage,
    formatTimeShort
} from '../../utils/jlptAudioProcessor';
import { getMondaiListForLevel } from '../jlptTest/jlptYearlyConstants';
import MondaiTimelineEditor from './MondaiTimelineEditor';
import { showToast } from '../../utils/toast';

const SLICE_BADGES = [
    'bg-amber-500 text-white',
    'bg-sky-500 text-white',
    'bg-emerald-500 text-white',
    'bg-rose-500 text-white',
    'bg-slate-600 text-white'
];

const parseTimeInputToSec = (raw, maxSec = 7200) => {
    const clean = String(raw ?? '').trim();
    if (!clean) return null;
    if (/^\d+(\.\d+)?$/.test(clean)) {
        const val = Math.max(0, Number(clean));
        return Number.isFinite(val) ? Math.min(maxSec, val) : null;
    }
    const parts = clean.split(':').map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    let total = 0;
    if (parts.length === 2) total = parts[0] * 60 + parts[1];
    else if (parts.length === 3) total = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else return null;
    return Math.min(maxSec, Math.max(0, total));
};

const buildInitialMondaiRows = (level, durationSec, initialMondaiUrls) => {
    const list = getMondaiListForLevel(level);
    return list.map((m, idx) => ({
        mondai: m.mondai,
        ja: m.ja,
        vi: m.vi,
        startSec: idx === 0 ? 0 : null,
        endSec: idx === list.length - 1 && durationSec > 0 ? Math.ceil(durationSec) : null,
        uploadedUrl: initialMondaiUrls?.[m.mondai] || ''
    }));
};

/**
 * Interactive Mondai Audio Slicer:
 * - Zoomable draggable timeline (drag playhead, region blocks, left/right resize handles)
 * - Fast AI keyword detection ("Mondai ichi", "Mondai ni", "問題1..5", outro) via Whisper / Gemini Audio
 * - Batch WAV slice & Firebase Storage upload
 */
const MondaiAudioSlicerModal = ({
    isOpen,
    onClose,
    level = 'N3',
    examYear = 2024,
    examSession = '12',
    audioFile = null,
    audioBuffer = null,
    onSelectAudioFile = null,
    initialMondaiUrls = {},
    listeningCountByMondai = {},
    onApplyMondaiAudios = () => {}
}) => {
    const [localFile, setLocalFile] = useState(null);
    const [localBuffer, setLocalBuffer] = useState(null);
    const [decoding, setDecoding] = useState(false);

    const activeFile = localFile || audioFile;
    const activeBuffer = localBuffer || audioBuffer;
    const durationSec = activeBuffer?.duration || 0;

    const previewUrl = useMemo(() => (activeFile ? URL.createObjectURL(activeFile) : ''), [activeFile]);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const audioElRef = useRef(null);
    const previewLimitRef = useRef(null);
    const aiAbortRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [sampleRate, setSampleRate] = useState(16000);

    const [silencePoints, setSilencePoints] = useState([]);
    const [showSilences, setShowSilences] = useState(false);

    // AI Keyword Boundary Detection State
    const [isScanningAi, setIsScanningAi] = useState(false);
    const [aiProgress, setAiProgress] = useState({ percent: 0, detail: '' });
    const [aiMarkers, setAiMarkers] = useState([]);
    const [trimIntroAndExample, setTrimIntroAndExample] = useState(false);

    const [activeMondai, setActiveMondai] = useState(1);
    const [rowOverrides, setRowOverrides] = useState({});
    const [rowSyncKey, setRowSyncKey] = useState('');
    const [timeDrafts, setTimeDrafts] = useState({});
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [uploadStatusText, setUploadStatusText] = useState('');

    // Derive rows cleanly from level + duration + user/AI edits without setState-in-effect
    const currentScopeKey = `${level}_${Math.round(durationSec)}`;
    const rows = useMemo(() => {
        const defaults = buildInitialMondaiRows(level, durationSec, initialMondaiUrls);
        const scopedMap = rowSyncKey === currentScopeKey ? rowOverrides : {};
        return defaults.map((base) => {
            const override = scopedMap[base.mondai];
            return {
                ...base,
                ...(override || {}),
                uploadedUrl: override?.uploadedUrl || initialMondaiUrls?.[base.mondai] || ''
            };
        });
    }, [level, durationSec, initialMondaiUrls, rowOverrides, rowSyncKey, currentScopeKey]);

    const mutateRows = (updater) => {
        setRowSyncKey(currentScopeKey);
        setRowOverrides((prev) => {
            const baseList = buildInitialMondaiRows(level, durationSec, initialMondaiUrls);
            const currentRows = baseList.map((base) => ({
                ...base,
                ...((rowSyncKey === currentScopeKey ? prev[base.mondai] : null) || {}),
                uploadedUrl: prev[base.mondai]?.uploadedUrl || initialMondaiUrls?.[base.mondai] || ''
            }));
            const nextRows = typeof updater === 'function' ? updater(currentRows) : updater;
            const nextMap = {};
            nextRows.forEach((r) => {
                nextMap[r.mondai] = {
                    startSec: r.startSec,
                    endSec: r.endSec,
                    uploadedUrl: r.uploadedUrl
                };
            });
            return nextMap;
        });
    };

    useEffect(() => {
        if (audioElRef.current) audioElRef.current.playbackRate = playbackRate;
    }, [playbackRate]);

    // Precompute crisp waveform bars (360 bars for zoom clarity)
    const waveformBars = useMemo(() => {
        if (!activeBuffer) return [];
        const mono = getMonoChannelData(activeBuffer);
        const barCount = 360;
        const step = Math.max(1, Math.floor(mono.length / barCount));
        const bars = [];
        let maxPeak = 0.001;
        for (let b = 0; b < barCount; b++) {
            const from = b * step;
            const to = Math.min(mono.length, from + step);
            let peak = 0;
            for (let i = from; i < to; i += Math.max(1, Math.floor((to - from) / 20))) {
                const abs = Math.abs(mono[i]);
                if (abs > peak) peak = abs;
            }
            if (peak > maxPeak) maxPeak = peak;
            bars.push(peak);
        }
        return bars.map((v) => v / maxPeak);
    }, [activeBuffer]);

    const seekTo = (sec) => {
        const el = audioElRef.current;
        if (!el || !durationSec) return;
        const clamped = Math.max(0, Math.min(durationSec, sec));
        el.currentTime = clamped;
        setCurrentTime(clamped);
    };

    const togglePlay = () => {
        const el = audioElRef.current;
        if (!el) return;
        previewLimitRef.current = null;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
    };

    // Keyboard shortcuts (Space Play/Pause, Left/Right +-5s)
    useEffect(() => {
        if (!isOpen || !activeBuffer) return undefined;
        const handleKey = (e) => {
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                seekTo(currentTime - 5);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                seekTo(currentTime + 5);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    const handlePickLocalAudio = async (file) => {
        if (!file) return;
        setDecoding(true);
        try {
            setLocalFile(file);
            if (typeof onSelectAudioFile === 'function') onSelectAudioFile(file);
            const decoded = await decodeAudioFile(file);
            setLocalBuffer(decoded.audioBuffer);
            setSilencePoints([]);
            setAiMarkers([]);
            setRowOverrides({});
            setCurrentTime(0);
            showToast(`Đã nạp audio "${file.name}" (${formatTimeShort(decoded.durationSec)}).`, 'success');
        } catch (err) {
            showToast(`Không giải mã được file audio: ${err.message}`, 'error');
        } finally {
            setDecoding(false);
        }
    };

    const handleScanSilences = () => {
        if (!activeBuffer) return;
        const { silences } = detectSilenceSegments(activeBuffer, {
            minSilenceSec: 3.5,
            silenceRmsThreshold: 0.012,
            minSegmentSec: 15
        });
        setSilencePoints(silences || []);
        setShowSilences(true);
        if (!silences || silences.length === 0) {
            showToast('Không tìm thấy khoảng lặng dài > 3.5s, bạn có thể kéo trực tiếp trên timeline.', 'info');
        }
    };

    const handleAiDetectMondais = async () => {
        if (!activeBuffer) return showToast('Hãy chọn file audio trước.', 'warning');
        setIsScanningAi(true);
        setAiProgress({ percent: 5, detail: 'Đang chuẩn bị quét từ khóa Mondai (Mondai ichi, ni...)' });
        aiAbortRef.current = new AbortController();

        try {
            const { silences } = detectSilenceSegments(activeBuffer, {
                minSilenceSec: 3.0,
                silenceRmsThreshold: 0.012,
                minSegmentSec: 15
            });
            setSilencePoints(silences || []);

            const res = await detectMondaiBoundariesWithAI(activeBuffer, {
                level,
                trimIntroAndExample,
                onProgress: setAiProgress,
                signal: aiAbortRef.current.signal
            });

            setAiMarkers(res.markers || []);

            if (res.detectedCount > 0) {
                mutateRows((prev) => prev.map((r) => {
                    const b = res.boundaries?.[r.mondai];
                    if (!b) return r;
                    return { ...r, startSec: b.startSec, endSec: b.endSec };
                }));
                setTimeDrafts({});
                const engineLabel = res.engine === 'whisper' ? 'Whisper STT' : 'Gemini Audio';
                showToast(`✨ ${engineLabel} đã nhận diện & đặt khung ${res.detectedCount} Mondai! Hãy kéo tinh chỉnh nếu cần.`, 'success');
            } else {
                setShowSilences(true);
                showToast('AI không nghe rõ câu "問題1..5" trong file này — hãy bấm "Tạo khối kéo nhanh" hoặc dùng mốc khoảng lặng.', 'warning');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast(err.message || 'Lỗi khi quét AI nhận diện Mondai.', 'error');
            }
        } finally {
            setIsScanningAi(false);
        }
    };

    const handleAutoEvenSplit = () => {
        if (!durationSec) return;
        const count = rows.length || 5;
        const chunkLen = durationSec / count;
        mutateRows((prev) => prev.map((r, i) => ({
            ...r,
            startSec: Math.round(i * chunkLen),
            endSec: Math.min(Math.ceil(durationSec), Math.round((i + 1) * chunkLen))
        })));
        setTimeDrafts({});
        showToast(`Đã chia đều ${count} khối M1–M${count}. Kéo mép trái/phải trên timeline để căn chuẩn!`, 'info');
    };

    // Update region directly from Timeline drag (optionally keeping adjacent Mondai boundaries linked)
    const handleTimelineRegionChange = (idx, nextRange, linkEdge = null) => {
        mutateRows((prev) => {
            const updated = [...prev];
            const cur = updated[idx];
            if (!cur) return prev;
            updated[idx] = { ...cur, startSec: nextRange.startSec, endSec: nextRange.endSec };

            if (linkEdge === 'start' && idx > 0) {
                const leftNeighbor = updated[idx - 1];
                if (typeof leftNeighbor?.endSec === 'number' && Math.abs(leftNeighbor.endSec - cur.startSec) <= 3) {
                    const minLeftEnd = (leftNeighbor.startSec ?? 0) + 2;
                    updated[idx - 1] = { ...leftNeighbor, endSec: Math.max(minLeftEnd, nextRange.startSec) };
                }
            } else if (linkEdge === 'end' && idx < updated.length - 1) {
                const rightNeighbor = updated[idx + 1];
                if (typeof rightNeighbor?.startSec === 'number' && Math.abs(rightNeighbor.startSec - cur.endSec) <= 3) {
                    const maxRightStart = (rightNeighbor.endSec ?? durationSec) - 2;
                    updated[idx + 1] = { ...rightNeighbor, startSec: Math.min(maxRightStart, nextRange.endSec) };
                }
            }
            return updated;
        });
        setTimeDrafts({});
    };

    const updateRowField = (mNum, patch) => {
        mutateRows((prev) => prev.map((r) => (r.mondai === mNum ? { ...r, ...patch } : r)));
    };

    const captureStartAtPlayhead = (idx) => {
        const sec = Math.floor(currentTime);
        mutateRows((prev) => prev.map((r, i) => {
            if (i === idx) return { ...r, startSec: sec };
            if (i === idx - 1 && (r.endSec === null || r.endSec === undefined)) {
                return { ...r, endSec: Math.max(r.startSec || 0, sec) };
            }
            return r;
        }));
        setTimeDrafts((prev) => {
            const next = { ...prev };
            delete next[`${rows[idx].mondai}_start`];
            if (idx > 0) delete next[`${rows[idx - 1].mondai}_end`];
            return next;
        });
    };

    const captureEndAtPlayhead = (idx) => {
        const sec = Math.min(Math.ceil(durationSec), Math.ceil(currentTime));
        updateRowField(rows[idx].mondai, { endSec: sec });
        setTimeDrafts((prev) => {
            const next = { ...prev };
            delete next[`${rows[idx].mondai}_end`];
            return next;
        });
    };

    const commitTimeDraft = (mNum, edge) => {
        const key = `${mNum}_${edge}`;
        const raw = timeDrafts[key];
        if (raw === undefined) return;
        const parsed = parseTimeInputToSec(raw, Math.ceil(durationSec || 7200));
        if (parsed !== null) {
            updateRowField(mNum, { [edge === 'start' ? 'startSec' : 'endSec']: parsed });
        }
        setTimeDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const previewSlice = (row) => {
        if (!audioElRef.current || typeof row.startSec !== 'number') return;
        previewLimitRef.current = typeof row.endSec === 'number' && row.endSec > row.startSec ? row.endSec : null;
        setActiveMondai(row.mondai);
        audioElRef.current.currentTime = row.startSec;
        setCurrentTime(row.startSec);
        audioElRef.current.play().catch(() => {});
    };

    const downloadSliceWav = (row) => {
        if (!activeBuffer || typeof row.startSec !== 'number' || typeof row.endSec !== 'number' || row.endSec <= row.startSec) {
            return showToast('Chưa đặt đủ Start và End hợp lệ cho Mondai này.', 'warning');
        }
        const blob = encodeAudioSliceToWavBlob(activeBuffer, row.startSec, row.endSec, sampleRate);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JLPT_${level}_${examYear}_${examSession}_M${row.mondai}.wav`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const validRows = rows.filter(
        (r) => typeof r.startSec === 'number' && typeof r.endSec === 'number' && r.endSec > r.startSec
    );

    const handleSliceAndUploadAll = async () => {
        if (!activeBuffer) return showToast('Vui lòng chọn file Audio gốc trước.', 'warning');
        if (validRows.length === 0) return showToast('Hãy đánh dấu Start & End cho ít nhất 1 Mondai.', 'warning');

        setIsBatchUploading(true);
        const uploadedMap = {};
        try {
            for (let i = 0; i < validRows.length; i++) {
                const row = validRows[i];
                setUploadStatusText(`Đang cắt & nén WAV 問題${row.mondai} (${i + 1}/${validRows.length})...`);
                const wavBlob = encodeAudioSliceToWavBlob(activeBuffer, row.startSec, row.endSec, sampleRate);
                const path = `jlpt_audio/${level.toLowerCase()}/${level.toLowerCase()}_${examYear}_${examSession}_m${row.mondai}_${Date.now()}.wav`;
                const remoteUrl = await uploadFileToFirebaseStorage(wavBlob, path, (pct) => {
                    setUploadStatusText(`Đang upload 問題${row.mondai}: ${pct}% (${i + 1}/${validRows.length})`);
                });
                uploadedMap[row.mondai] = remoteUrl;
                updateRowField(row.mondai, { uploadedUrl: remoteUrl });
            }
            onApplyMondaiAudios(uploadedMap);
            setUploadStatusText(`✅ Đã cắt, upload & gắn audio vào ${validRows.length} Mondai!`);
            showToast(`Đã cắt & gắn audio xong cho ${validRows.length} Mondai ${level}!`, 'success');
        } catch (err) {
            setUploadStatusText(`❌ Lỗi upload: ${err.message}`);
            showToast(`Lỗi upload: ${err.message}`, 'error');
        } finally {
            setIsBatchUploading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl my-auto">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Scissors className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                Tool Cắt Audio Timeline · JLPT {level}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Kéo mép khối trên timeline để chỉnh đầu–cuối từng Mondai, hoặc bấm AI tự nhận diện &quot;Mondai ichi, Mondai ni...&quot;.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                    {/* Audio Loader & AI Action Bar */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>{activeFile ? `Đổi file (${activeFile.name})` : 'Chọn file MP3 / WAV'}</span>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => handlePickLocalAudio(e.target.files?.[0])}
                                    />
                                </label>
                                {decoding && (
                                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang giải mã sóng âm...
                                    </span>
                                )}
                                {activeBuffer && (
                                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                        Tổng: {formatTimeShort(durationSec)}
                                    </span>
                                )}
                            </div>

                            {activeBuffer && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={isScanningAi}
                                        onClick={handleAiDetectMondais}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title="AI nghe audio tìm từ khóa 'Mondai ichi / ni / 問題1..5' và tự đánh dấu các khối Mondai"
                                    >
                                        {isScanningAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                        <span>{isScanningAi ? `Đang quét ${aiProgress.percent}%` : 'AI Tìm Mondai (ichi, ni...)'}</span>
                                    </button>

                                    {isScanningAi && (
                                        <button
                                            type="button"
                                            onClick={() => aiAbortRef.current?.abort()}
                                            className="px-2.5 py-2 rounded-xl bg-rose-500 text-white text-xs font-black cursor-pointer"
                                        >
                                            Dừng
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleScanSilences}
                                        className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Khoảng lặng</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {activeBuffer && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                                <label className="flex items-center gap-2 font-bold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={trimIntroAndExample}
                                        onChange={(e) => setTrimIntroAndExample(e.target.checked)}
                                        className="accent-emerald-500"
                                    />
                                    <span>Bỏ qua lời dẫn &amp; Ví dụ (例) khi AI cắt — bắt đầu thẳng từ &quot;1番&quot;</span>
                                </label>
                                {aiProgress.detail && (
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {aiProgress.detail}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {previewUrl && (
                        <audio
                            ref={audioElRef}
                            src={previewUrl}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={(e) => {
                                const cur = e.currentTarget.currentTime;
                                setCurrentTime(cur);
                                if (previewLimitRef.current !== null && cur >= previewLimitRef.current) {
                                    e.currentTarget.pause();
                                    previewLimitRef.current = null;
                                }
                            }}
                        />
                    )}

                    {/* Pro Draggable Timeline Editor */}
                    {activeBuffer ? (
                        <MondaiTimelineEditor
                            waveformBars={waveformBars}
                            durationSec={durationSec}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            playbackRate={playbackRate}
                            setPlaybackRate={setPlaybackRate}
                            onTogglePlay={togglePlay}
                            onSeek={seekTo}
                            rows={rows}
                            activeMondai={activeMondai}
                            onSelectMondai={setActiveMondai}
                            onUpdateRegion={handleTimelineRegionChange}
                            onAutoEvenSplit={handleAutoEvenSplit}
                            aiMarkers={aiMarkers}
                            silencePoints={silencePoints}
                            showSilences={showSilences}
                        />
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400 font-bold">
                            Chưa có file Audio. Hãy bấm &quot;Chọn file MP3 / WAV&quot; ở trên để hiển thị thanh timeline kéo &amp; quét AI Mondai.
                        </div>
                    )}

                    {/* Mondai Rows Table */}
                    <div className="space-y-2">
                        {rows.map((row, idx) => {
                            const hasSlice = typeof row.startSec === 'number' && typeof row.endSec === 'number' && row.endSec > row.startSec;
                            const sliceLen = hasSlice ? row.endSec - row.startSec : 0;
                            const badgeCls = SLICE_BADGES[idx % SLICE_BADGES.length];
                            const qCount = listeningCountByMondai?.[row.mondai] || 0;
                            const isSelected = activeMondai === row.mondai;

                            const startKey = `${row.mondai}_start`;
                            const endKey = `${row.mondai}_end`;
                            const startDisplay = timeDrafts[startKey] ?? (typeof row.startSec === 'number' ? formatTimeShort(row.startSec) : '');
                            const endDisplay = timeDrafts[endKey] ?? (typeof row.endSec === 'number' ? formatTimeShort(row.endSec) : '');

                            return (
                                <div
                                    key={row.mondai}
                                    onClick={() => setActiveMondai(row.mondai)}
                                    className={`rounded-2xl border p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition ${
                                        isSelected
                                            ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${badgeCls}`}>
                                            M{row.mondai}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                                <span className="font-japanese">{row.ja}</span> · {row.vi}
                                                {qCount > 0 && (
                                                    <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                        ({qCount} câu JSON)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                                                <span>{hasSlice ? `Độ dài đoạn cắt: ${formatTimeShort(sliceLen)}` : 'Chưa đặt đủ đầu–cuối'}</span>
                                                {row.uploadedUrl && (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                                        <CheckCircle2 className="w-3 h-3" /> Đã gắn
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                        <input
                                            type="text"
                                            value={startDisplay}
                                            onChange={(e) => setTimeDrafts((p) => ({ ...p, [startKey]: e.target.value }))}
                                            onBlur={() => commitTimeDraft(row.mondai, 'start')}
                                            onKeyDown={(e) => { if (e.key === 'Enter') commitTimeDraft(row.mondai, 'start'); }}
                                            placeholder="00:00"
                                            className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-center font-bold text-slate-800 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            disabled={!activeBuffer}
                                            onClick={() => captureStartAtPlayhead(idx)}
                                            title="Lấy mốc đang phát làm Start (tự chốt End Mondai trước)"
                                            className="px-2 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                        >
                                            <MapPin className="w-3 h-3" /> Start
                                        </button>

                                        <span className="text-slate-400 font-bold text-xs">→</span>

                                        <input
                                            type="text"
                                            value={endDisplay}
                                            onChange={(e) => setTimeDrafts((p) => ({ ...p, [endKey]: e.target.value }))}
                                            onBlur={() => commitTimeDraft(row.mondai, 'end')}
                                            onKeyDown={(e) => { if (e.key === 'Enter') commitTimeDraft(row.mondai, 'end'); }}
                                            placeholder="08:30"
                                            className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-center font-bold text-slate-800 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            disabled={!activeBuffer}
                                            onClick={() => captureEndAtPlayhead(idx)}
                                            title="Lấy mốc đang phát làm End"
                                            className="px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                        >
                                            <Flag className="w-3 h-3" /> End
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!hasSlice}
                                            onClick={() => previewSlice(row)}
                                            title="Nghe thử đúng đoạn Mondai này"
                                            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400 cursor-pointer disabled:opacity-35"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!hasSlice}
                                            onClick={() => downloadSliceWav(row)}
                                            title="Tải về file WAV riêng cho Mondai này"
                                            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 cursor-pointer disabled:opacity-35"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>Chất lượng WAV:</span>
                        <select
                            value={sampleRate}
                            onChange={(e) => setSampleRate(Number(e.target.value))}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        >
                            <option value={16000}>16 kHz (Chuẩn thoại, nhẹ ~1.9MB/phút)</option>
                            <option value={22050}>22 kHz (Rõ nét hơn ~2.6MB/phút)</option>
                        </select>
                        {uploadStatusText && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-black ml-1">{uploadStatusText}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            disabled={isBatchUploading || validRows.length === 0 || !activeBuffer}
                            onClick={handleSliceAndUploadAll}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 disabled:opacity-45 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                            {isBatchUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                            <span>Cắt, Upload Storage &amp; Gắn ({validRows.length} Mondai)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MondaiAudioSlicerModal;
