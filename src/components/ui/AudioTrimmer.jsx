import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Scissors, Upload, Play, Pause, Square, SkipBack, SkipForward,
    Save, X, Volume2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight
} from 'lucide-react';

// ==================== Audio Trimmer Tool ====================
// Allows admin to upload a long audio file (e.g. textbook lesson audio)
// and trim clips for each vocabulary word AND example sentence.
const AudioTrimmer = ({ vocabList = [], onSaveClip, onClose }) => {
    const [audioFile, setAudioFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [selectedVocabIndex, setSelectedVocabIndex] = useState(0);
    const [clipType, setClipType] = useState('word'); // 'word' | 'example'
    const [zoom, setZoom] = useState(1);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(null); // 'start' | 'end' | 'playhead' | null
    const [savedClips, setSavedClips] = useState({}); // { "vocabIndex-word": { start, end, base64 }, "vocabIndex-example": {...} }
    const [isSaving, setIsSaving] = useState(false);
    const [waveformData, setWaveformData] = useState([]);
    const [hasAdjustedSelection, setHasAdjustedSelection] = useState(false); // Track if user manually adjusted selection

    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const animFrameRef = useRef(null);

    const getClipKey = (index, type) => `${index}-${type}`;

    // Upload and decode audio
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);

        // Decode for waveform
        try {
            const arrayBuffer = await file.arrayBuffer();
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const buffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            setAudioBuffer(buffer);
            setDuration(buffer.duration);
            setEndTime(Math.min(5, buffer.duration));
            generateWaveform(buffer);
        } catch (err) {
            console.error('Error decoding audio:', err);
        }
    };

    // Generate waveform data from audio buffer
    const generateWaveform = (buffer) => {
        const channelData = buffer.getChannelData(0);
        const samples = 2000; // number of data points
        const blockSize = Math.floor(channelData.length / samples);
        const data = [];
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[i * blockSize + j]);
            }
            data.push(sum / blockSize);
        }
        // Normalize
        const max = Math.max(...data);
        setWaveformData(data.map(v => v / (max || 1)));
    };

    // Draw waveform on canvas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || waveformData.length === 0) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const visibleDuration = duration / zoom;
        const visibleStart = scrollOffset;
        const visibleEnd = visibleStart + visibleDuration;
        const samplesPerSecond = waveformData.length / duration;

        // Background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Selected region highlight
        const selStartX = ((startTime - visibleStart) / visibleDuration) * width;
        const selEndX = ((endTime - visibleStart) / visibleDuration) * width;
        const highlightColor = clipType === 'word' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        ctx.fillStyle = highlightColor;
        ctx.fillRect(Math.max(0, selStartX), 0, Math.min(width, selEndX) - Math.max(0, selStartX), height);

        // Waveform bars
        const startSample = Math.floor(visibleStart * samplesPerSecond);
        const endSample = Math.ceil(visibleEnd * samplesPerSecond);
        const barsToShow = Math.min(width, endSample - startSample);
        const barWidth = width / barsToShow;

        for (let i = 0; i < barsToShow; i++) {
            const sampleIndex = startSample + Math.floor(i * (endSample - startSample) / barsToShow);
            if (sampleIndex < 0 || sampleIndex >= waveformData.length) continue;

            const amp = waveformData[sampleIndex];
            const barHeight = amp * height * 0.8;
            const x = i * barWidth;
            const y = (height - barHeight) / 2;

            // Color based on selection
            const time = visibleStart + (i / barsToShow) * visibleDuration;
            if (time >= startTime && time <= endTime) {
                ctx.fillStyle = clipType === 'word' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(245, 158, 11, 0.8)';
            } else {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
            }

            ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        }

        // Start marker
        if (startTime >= visibleStart && startTime <= visibleEnd) {
            const x = ((startTime - visibleStart) / visibleDuration) * width;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            // Label
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('S', x + 3, 12);
        }

        // End marker
        if (endTime >= visibleStart && endTime <= visibleEnd) {
            const x = ((endTime - visibleStart) / visibleDuration) * width;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('E', x - 12, 12);
        }

        // Playhead
        if (currentTime >= visibleStart && currentTime <= visibleEnd) {
            const x = ((currentTime - visibleStart) / visibleDuration) * width;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            // Triangle
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(x - 5, 0);
            ctx.lineTo(x + 5, 0);
            ctx.lineTo(x, 8);
            ctx.fill();
        }

        // Time ruler
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '9px monospace';
        const step = visibleDuration > 30 ? 10 : visibleDuration > 10 ? 5 : visibleDuration > 5 ? 2 : 1;
        for (let t = Math.ceil(visibleStart / step) * step; t <= visibleEnd; t += step) {
            const x = ((t - visibleStart) / visibleDuration) * width;
            ctx.fillText(formatTime(t), x + 2, height - 4);
            ctx.fillRect(x, height - 14, 1, 4);
        }
    }, [waveformData, duration, zoom, scrollOffset, startTime, endTime, currentTime, clipType]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    // Update canvas size
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = 120;
            drawWaveform();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [drawWaveform]);

    // Track playback time
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
            if (audio.currentTime >= endTime && isPlaying) {
                audio.pause();
                setIsPlaying(false);
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', () => setIsPlaying(false));
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', () => setIsPlaying(false));
        };
    }, [endTime, isPlaying]);

    // Mouse interaction on canvas
    const getTimeFromX = (clientX) => {
        const canvas = canvasRef.current;
        if (!canvas) return 0;
        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width;
        const visibleDuration = duration / zoom;
        return scrollOffset + x * visibleDuration;
    };

    const handleCanvasMouseDown = (e) => {
        const time = getTimeFromX(e.clientX);
        const threshold = duration / zoom * 0.02; // 2% tolerance

        if (Math.abs(time - startTime) < threshold) {
            setIsDragging('start');
        } else if (Math.abs(time - endTime) < threshold) {
            setIsDragging('end');
        } else {
            setIsDragging('playhead');
            setCurrentTime(Math.max(0, Math.min(duration, time)));
            if (audioRef.current) audioRef.current.currentTime = time;
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDragging) return;
        const time = Math.max(0, Math.min(duration, getTimeFromX(e.clientX)));

        if (isDragging === 'start') {
            setStartTime(Math.min(time, endTime - 0.1));
            setHasAdjustedSelection(true);
        } else if (isDragging === 'end') {
            setEndTime(Math.max(time, startTime + 0.1));
            setHasAdjustedSelection(true);
        } else if (isDragging === 'playhead') {
            setCurrentTime(time);
            if (audioRef.current) audioRef.current.currentTime = time;
        }
    };

    const handleCanvasMouseUp = () => setIsDragging(null);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleCanvasMouseMove);
            document.addEventListener('mouseup', handleCanvasMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleCanvasMouseMove);
                document.removeEventListener('mouseup', handleCanvasMouseUp);
            };
        }
    }, [isDragging, startTime, endTime]);

    // Playback controls
    const playSelection = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = startTime;
        audio.play();
        setIsPlaying(true);
    };

    const stopPlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        setIsPlaying(false);
    };

    const togglePlay = () => {
        if (isPlaying) stopPlayback();
        else playSelection();
    };

    // Zoom controls
    const zoomIn = () => setZoom(z => Math.min(z * 1.5, 50));
    const zoomOut = () => {
        setZoom(z => {
            const newZoom = Math.max(z / 1.5, 1);
            if (newZoom === 1) setScrollOffset(0);
            return newZoom;
        });
    };

    // Scroll
    const scrollLeft = () => setScrollOffset(o => Math.max(0, o - duration / zoom * 0.3));
    const scrollRight = () => setScrollOffset(o => Math.min(duration - duration / zoom, o + duration / zoom * 0.3));

    // Fine tune
    const adjustStart = (delta) => { setStartTime(t => Math.max(0, Math.min(t + delta, endTime - 0.05))); setHasAdjustedSelection(true); };
    const adjustEnd = (delta) => { setEndTime(t => Math.max(startTime + 0.05, Math.min(t + delta, duration))); setHasAdjustedSelection(true); };

    // Set start/end to current playhead position
    const setStartToPlayhead = () => {
        const t = audioRef.current?.currentTime ?? currentTime;
        if (t < endTime - 0.05) { setStartTime(t); setHasAdjustedSelection(true); }
    };
    const setEndToPlayhead = () => {
        const t = audioRef.current?.currentTime ?? currentTime;
        if (t > startTime + 0.05) { setEndTime(t); setHasAdjustedSelection(true); }
    };

    // Keyboard shortcuts: [ = set start, ] = set end, Space = play/pause
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '[') { e.preventDefault(); setStartToPlayhead(); }
            else if (e.key === ']') { e.preventDefault(); setEndToPlayhead(); }
            else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentTime, startTime, endTime, isPlaying]);

    // Save clip as base64
    const saveClip = async () => {
        if (!audioBuffer || startTime >= endTime || !hasAdjustedSelection) return;
        setIsSaving(true);

        try {
            const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioBuffer.sampleRate;
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor(endTime * sampleRate);
            const length = endSample - startSample;
            const channels = audioBuffer.numberOfChannels;

            // Create new buffer for trimmed audio
            const trimmedBuffer = ctx.createBuffer(channels, length, sampleRate);
            for (let ch = 0; ch < channels; ch++) {
                const src = audioBuffer.getChannelData(ch);
                const dst = trimmedBuffer.getChannelData(ch);
                for (let i = 0; i < length; i++) {
                    dst[i] = src[startSample + i];
                }
            }

            // Encode to WAV
            const wavBlob = audioBufferToWav(trimmedBuffer);
            const base64 = await blobToBase64(wavBlob);

            // Save with clip type key
            const key = getClipKey(selectedVocabIndex, clipType);
            const clip = { start: startTime, end: endTime, base64 };
            setSavedClips(prev => ({ ...prev, [key]: clip }));

            // Notify parent with clip type
            if (onSaveClip) {
                onSaveClip(selectedVocabIndex, base64, vocabList[selectedVocabIndex], clipType);
            }

            // Reset adjusted flag before auto-advance
            setHasAdjustedSelection(false);

            // Auto-advance logic
            if (clipType === 'word') {
                // After saving word audio, switch to example mode if example exists
                const currentVocab = vocabList[selectedVocabIndex];
                if (currentVocab?.example) {
                    setClipType('example');
                    setStartTime(endTime);
                    setEndTime(Math.min(endTime + (endTime - startTime) * 1.5, duration));
                } else {
                    // No example, advance to next vocab word
                    if (selectedVocabIndex < vocabList.length - 1) {
                        setSelectedVocabIndex(prev => prev + 1);
                        setClipType('word');
                        setStartTime(endTime);
                        setEndTime(Math.min(endTime + (endTime - startTime), duration));
                    }
                }
            } else {
                // After saving example audio, advance to next vocab word
                if (selectedVocabIndex < vocabList.length - 1) {
                    setSelectedVocabIndex(prev => prev + 1);
                    setClipType('word');
                    setStartTime(endTime);
                    setEndTime(Math.min(endTime + (endTime - startTime), duration));
                }
            }
        } catch (err) {
            console.error('Error saving clip:', err);
        }
        setIsSaving(false);
    };

    // Format time
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${m}:${String(s).padStart(2, '0')}.${ms}`;
    };

    // WAV encoder
    const audioBufferToWav = (buffer) => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        const samples = buffer.length;
        const dataSize = samples * numChannels * (bitDepth / 8);
        const arrayBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(arrayBuffer);

        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
        view.setUint16(32, numChannels * (bitDepth / 8), true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < samples; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    };

    const blobToBase64 = (blob) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });

    // Play a saved clip preview
    const playSavedClip = (key) => {
        const clip = savedClips[key];
        if (!clip?.base64) return;
        const audio = new Audio(clip.base64);
        audio.play().catch(err => console.error('Play error:', err));
    };

    // No audio uploaded yet
    if (!audioUrl) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-violet-500" /> Cắt Audio Từ Vựng & Ví Dụ
                    </h3>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload file audio dài của bài học để cắt ra từng đoạn cho mỗi từ vựng và câu ví dụ.
                </p>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                    <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Chọn file audio (.mp3, .wav, .ogg, .m4a)</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">hoặc kéo thả vào đây</span>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
            </div>
        );
    }

    const currentVocab = vocabList[selectedVocabIndex];
    const clipDuration = endTime - startTime;
    const wordClipKey = getClipKey(selectedVocabIndex, 'word');
    const exampleClipKey = getClipKey(selectedVocabIndex, 'example');
    const hasExample = !!(currentVocab?.example);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Hidden audio element */}
            <audio ref={audioRef} src={audioUrl} preload="auto" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-violet-500" /> Cắt Audio Từ Vựng & Ví Dụ
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {audioFile?.name} • {formatTime(duration)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Đổi file
                        <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Current vocab display */}
            <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                            {selectedVocabIndex + 1}
                        </span>
                        <div>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                {currentVocab?.word || currentVocab?.front || `Từ ${selectedVocabIndex + 1}`}
                            </span>
                            {currentVocab?.meaning && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                    {currentVocab.meaning || currentVocab.back}
                                </span>
                            )}
                        </div>
                        {/* Clip status badges */}
                        <div className="flex items-center gap-1.5">
                            {savedClips[wordClipKey] && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                    ✓ Từ
                                </span>
                            )}
                            {savedClips[exampleClipKey] && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                    ✓ VD
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSelectedVocabIndex(i => Math.max(0, i - 1))}
                            disabled={selectedVocabIndex <= 0}
                            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-400 font-mono">
                            {selectedVocabIndex + 1}/{vocabList.length}
                        </span>
                        <button
                            onClick={() => setSelectedVocabIndex(i => Math.min(vocabList.length - 1, i + 1))}
                            disabled={selectedVocabIndex >= vocabList.length - 1}
                            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Clip Type Selector (Word vs Example) */}
                <div className="flex items-center gap-2 mt-2.5">
                    <button
                        onClick={() => {
                            setClipType('word');
                            const key = getClipKey(selectedVocabIndex, 'word');
                            if (savedClips[key]) {
                                setStartTime(savedClips[key].start);
                                setEndTime(savedClips[key].end);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${clipType === 'word'
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        <Volume2 className="w-3.5 h-3.5" />
                        🔤 Từ vựng
                        {savedClips[wordClipKey] && <span className="text-emerald-300">✓</span>}
                    </button>
                    <button
                        onClick={() => {
                            if (!hasExample) return;
                            setClipType('example');
                            const key = getClipKey(selectedVocabIndex, 'example');
                            if (savedClips[key]) {
                                setStartTime(savedClips[key].start);
                                setEndTime(savedClips[key].end);
                            }
                        }}
                        disabled={!hasExample}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${clipType === 'example'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : hasExample
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <Volume2 className="w-3.5 h-3.5" />
                        💬 Ví dụ
                        {savedClips[exampleClipKey] && <span className="text-emerald-300">✓</span>}
                        {!hasExample && <span className="text-[9px] opacity-60">(không có)</span>}
                    </button>
                </div>

                {/* Show current clip target text */}
                {clipType === 'example' && currentVocab?.example && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">📝 {currentVocab.example}</p>
                        {currentVocab.exampleMeaning && (
                            <p className="text-[10px] text-amber-500 dark:text-amber-500/70 mt-0.5 italic">{currentVocab.exampleMeaning}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Waveform */}
            <div className="px-5 py-4 space-y-3">
                <div ref={containerRef} className="relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full rounded-xl cursor-crosshair"
                        style={{ height: 120 }}
                        onMouseDown={handleCanvasMouseDown}
                    />
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Playback */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={togglePlay}
                            className={`p-2 rounded-xl transition-colors ${clipType === 'word'
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                }`}
                        >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={stopPlayback}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Square className="w-4 h-4" />
                        </button>
                        {/* Clip type indicator */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${clipType === 'word'
                            ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            }`}>
                            {clipType === 'word' ? '🔤 Từ vựng' : '💬 Ví dụ'}
                        </span>
                    </div>

                    {/* Time display */}
                    <div className="flex items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                        <span className="text-emerald-500">S: {formatTime(startTime)}</span>
                        <span className="text-amber-500">▶ {formatTime(currentTime)}</span>
                        <span className="text-red-500">E: {formatTime(endTime)}</span>
                        <span className="text-violet-500">({formatTime(clipDuration)})</span>
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center gap-1">
                        <button onClick={scrollLeft} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <SkipBack className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={zoomOut} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <span className="text-[10px] text-gray-400 font-mono w-8 text-center">{zoom.toFixed(1)}x</span>
                        <button onClick={zoomIn} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={scrollRight} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <SkipForward className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Fine tune controls */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold w-14">Bắt đầu</span>
                        <button onClick={() => adjustStart(-1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">-1s</button>
                        <button onClick={() => adjustStart(-0.1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">-0.1s</button>
                        <input
                            type="number"
                            value={startTime.toFixed(1)}
                            step="0.1"
                            min="0"
                            max={endTime - 0.05}
                            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v < endTime - 0.05) { setStartTime(v); setHasAdjustedSelection(true); } }}
                            className="w-16 px-1.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-emerald-600 dark:text-emerald-400 font-mono text-center outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                        <button onClick={() => adjustStart(0.1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">+0.1s</button>
                        <button onClick={() => adjustStart(1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">+1s</button>
                        <button
                            onClick={setStartToPlayhead}
                            className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 font-bold"
                            title="Đặt điểm bắt đầu tại vị trí hiện tại (phím [)"
                        >S▼</button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold w-14">Kết thúc</span>
                        <button onClick={() => adjustEnd(-1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">-1s</button>
                        <button onClick={() => adjustEnd(-0.1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">-0.1s</button>
                        <input
                            type="number"
                            value={endTime.toFixed(1)}
                            step="0.1"
                            min={startTime + 0.05}
                            max={duration}
                            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > startTime + 0.05 && v <= duration) { setEndTime(v); setHasAdjustedSelection(true); } }}
                            className="w-16 px-1.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-red-500 dark:text-red-400 font-mono text-center outline-none focus:ring-1 focus:ring-red-400"
                        />
                        <button onClick={() => adjustEnd(0.1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">+0.1s</button>
                        <button onClick={() => adjustEnd(1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">+1s</button>
                        <button
                            onClick={setEndToPlayhead}
                            className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-xs text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-bold"
                            title="Đặt điểm kết thúc tại vị trí hiện tại (phím ])"
                        >E▼</button>
                    </div>
                </div>

                {/* Keyboard shortcut hints */}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                    ⌨️ Space: Phát/Dừng • <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">[</kbd> Đặt Start • <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">]</kbd> Đặt End tại playhead
                </p>

                {/* Save button */}
                <button
                    onClick={saveClip}
                    disabled={isSaving || clipDuration < 0.1 || !hasAdjustedSelection}
                    className={`w-full py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${clipType === 'word'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-600/20'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20'
                        }`}
                >
                    {isSaving ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {!hasAdjustedSelection
                        ? 'Hãy chỉnh vùng cắt trước khi lưu'
                        : `Lưu ${clipType === 'word' ? '🔤 từ vựng' : '💬 ví dụ'} cho "${currentVocab?.word || currentVocab?.front || `Từ ${selectedVocabIndex + 1}`}"`
                    }
                </button>
            </div>

            {/* Vocab list with clip status */}
            <div className="border-t border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto">
                {vocabList.map((v, i) => {
                    const wKey = getClipKey(i, 'word');
                    const eKey = getClipKey(i, 'example');
                    const hasWordClip = !!savedClips[wKey];
                    const hasExampleClip = !!savedClips[eKey];
                    const vHasExample = !!(v.example);

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                setSelectedVocabIndex(i);
                                setClipType('word');
                                if (savedClips[wKey]) {
                                    setStartTime(savedClips[wKey].start);
                                    setEndTime(savedClips[wKey].end);
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${i === selectedVocabIndex
                                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {i + 1}
                            </span>
                            <span className="text-sm truncate flex-1">{v.word || v.front || `Từ ${i + 1}`}</span>
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Word clip status */}
                                {hasWordClip ? (
                                    <span
                                        className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                        onClick={(e) => { e.stopPropagation(); playSavedClip(wKey); }}
                                        title="Phát audio từ vựng"
                                    >
                                        🔤✓
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-gray-300 dark:text-gray-600">🔤—</span>
                                )}
                                {/* Example clip status */}
                                {vHasExample && (
                                    hasExampleClip ? (
                                        <span
                                            className="text-[10px] text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                            onClick={(e) => { e.stopPropagation(); playSavedClip(eKey); }}
                                            title="Phát audio ví dụ"
                                        >
                                            💬✓
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 dark:text-gray-600">💬—</span>
                                    )
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AudioTrimmer;
