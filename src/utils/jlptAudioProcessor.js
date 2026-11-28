/**
 * Browser-side JLPT Audio Processor:
 * - Decodes MP3/WAV/M4A via Web Audio API
 * - Detects silence pauses to suggest question boundaries
 * - Encodes chunks to compact 16kHz Mono 16-bit WAV (<25MB for Groq Whisper verbose_json)
 * - Runs chunked Whisper STT with stitched exact timestamps & Mondai heuristics
 * - Uploads audio/images to Firebase Storage (for Admin authoring)
 */
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { callAI, getWhisperApiConfig } from './aiProvider';
import { extractMondaiBoundariesFromSegments } from './jlptWhisperSegments';
export {
    groupWhisperSegmentsIntoBlocks,
    normalizeWhisperCueText,
    extractMondaiBoundariesFromSegments
} from './jlptWhisperSegments';

const WHISPER_MAX_CHUNK_SEC = 400; // ~6m40s at 16kHz mono = ~12.8 MB WAV (well under Groq 25MB cap)

/**
 * Decodes an uploaded Audio File into a Web Audio AudioBuffer.
 */
export const decodeAudioFile = async (file) => {
    if (!file) throw new Error('Chưa chọn file audio.');
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error('Trình duyệt không hỗ trợ Web Audio API.');

    const ctx = new AudioCtx();
    try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return {
            audioBuffer,
            durationSec: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels
        };
    } finally {
        await ctx.close().catch(() => {});
    }
};

/**
 * Downmixes an AudioBuffer into a mono Float32Array.
 */
export const getMonoChannelData = (audioBuffer) => {
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    if (channels === 1) return audioBuffer.getChannelData(0);

    const mono = new Float32Array(length);
    for (let c = 0; c < channels; c++) {
        const ch = audioBuffer.getChannelData(c);
        for (let i = 0; i < length; i++) {
            mono[i] += ch[i] / channels;
        }
    }
    return mono;
};

/**
 * Detects long silence gaps inside an AudioBuffer (e.g. pauses between JLPT questions).
 * Returns { silences: [{ startSec, endSec, durationSec }], segments: [{ startSec, endSec, durationSec }] }.
 */
export const detectSilenceSegments = (audioBuffer, {
    silenceRmsThreshold = 0.012,
    minSilenceSec = 1.8,
    minSegmentSec = 7
} = {}) => {
    const sampleRate = audioBuffer.sampleRate;
    const mono = getMonoChannelData(audioBuffer);
    const windowSize = Math.max(1, Math.floor(sampleRate * 0.1)); // 100ms frames
    const silences = [];

    let silenceStartSample = null;
    for (let offset = 0; offset < mono.length; offset += windowSize) {
        const end = Math.min(mono.length, offset + windowSize);
        let sumSq = 0;
        for (let i = offset; i < end; i++) {
            sumSq += mono[i] * mono[i];
        }
        const rms = Math.sqrt(sumSq / Math.max(1, end - offset));

        if (rms < silenceRmsThreshold) {
            if (silenceStartSample === null) silenceStartSample = offset;
        } else if (silenceStartSample !== null) {
            const startSec = silenceStartSample / sampleRate;
            const endSec = offset / sampleRate;
            if (endSec - startSec >= minSilenceSec) {
                silences.push({ startSec, endSec, durationSec: endSec - startSec });
            }
            silenceStartSample = null;
        }
    }

    // Build speech segments split at silence midpoints
    const splitPoints = [0];
    for (const s of silences) {
        const mid = (s.startSec + s.endSec) / 2;
        if (mid - splitPoints[splitPoints.length - 1] >= minSegmentSec) {
            splitPoints.push(Number(mid.toFixed(2)));
        }
    }
    if (audioBuffer.duration - splitPoints[splitPoints.length - 1] >= 2) {
        splitPoints.push(Number(audioBuffer.duration.toFixed(2)));
    } else if (splitPoints.length > 1) {
        splitPoints[splitPoints.length - 1] = Number(audioBuffer.duration.toFixed(2));
    } else {
        splitPoints.push(Number(audioBuffer.duration.toFixed(2)));
    }

    const segments = [];
    for (let i = 0; i < splitPoints.length - 1; i++) {
        segments.push({
            index: i + 1,
            startSec: splitPoints[i],
            endSec: splitPoints[i + 1],
            durationSec: Number((splitPoints[i + 1] - splitPoints[i]).toFixed(2))
        });
    }

    return { silences, segments };
};

/**
 * Encodes an AudioBuffer time slice [startSec, endSec] to a 16kHz Mono 16-bit PCM WAV Blob.
 */
export const encodeAudioSliceToWavBlob = (audioBuffer, startSec = 0, endSec = audioBuffer.duration, targetRate = 16000) => {
    const srcRate = audioBuffer.sampleRate;
    const mono = getMonoChannelData(audioBuffer);
    const startSample = Math.max(0, Math.floor(startSec * srcRate));
    const endSample = Math.min(mono.length, Math.floor(endSec * srcRate));
    const srcSliceLen = Math.max(1, endSample - startSample);

    const ratio = srcRate / targetRate;
    const outLength = Math.max(1, Math.floor(srcSliceLen / ratio));
    const buffer = new ArrayBuffer(44 + outLength * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + outLength * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);           // PCM chunk size
    view.setUint16(20, 1, true);            // PCM format
    view.setUint16(22, 1, true);            // Mono
    view.setUint32(24, targetRate, true);   // Sample rate
    view.setUint32(28, targetRate * 2, true); // Byte rate
    view.setUint16(32, 2, true);            // Block align
    view.setUint16(34, 16, true);           // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, outLength * 2, true);

    let byteOffset = 44;
    for (let i = 0; i < outLength; i++) {
        const srcIdx = startSample + i * ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(mono.length - 1, idx0 + 1);
        const frac = srcIdx - idx0;
        const sample = mono[idx0] * (1 - frac) + mono[idx1] * frac;
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(byteOffset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
        byteOffset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Calls Groq/OpenAI Whisper with verbose_json to get timestamped segments.
 */
export const callWhisperVerboseSTT = async (audioBlob, langCode = 'ja', signal = null) => {
    const { url, apiKey, model } = await getWhisperApiConfig();

    const formData = new FormData();
    const ext = audioBlob.type?.includes('wav') ? 'wav' : 'mp3';
    const file = new File([audioBlob], `jlpt_chunk.${ext}`, { type: audioBlob.type || 'audio/wav' });
    formData.append('file', file);
    formData.append('model', model);
    formData.append('language', langCode || 'ja');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    formData.append('prompt', '日本語能力試験JLPTの聴解試験。問題1、問題2、問題3、問題4、問題5、例、1番、2番、男の人と女の人が話しています。');

    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Whisper STT lỗi ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return {
        text: data.text || '',
        segments: Array.isArray(data.segments)
            ? data.segments.map((seg) => ({
                start: Number(seg.start || 0),
                end: Number(seg.end || 0),
                text: (seg.text || '').trim()
            }))
            : []
    };
};

/**
 * Splits a long AudioBuffer along silence boundaries into Whisper-safe chunks (<=400s),
 * transcribes every chunk, and returns continuous timestamped segments across the full audio.
 */
export const transcribeAudioWithTimestamps = async (audioBuffer, {
    onProgress = () => {},
    onLog = () => {},
    signal = null
} = {}) => {
    const totalDuration = audioBuffer.duration;
    onLog(`🔊 Đang phân tích khoảng lặng trên audio dài ${Math.round(totalDuration)} giây...`);
    const { silences } = detectSilenceSegments(audioBuffer, { minSilenceSec: 1.5, minSegmentSec: 6 });

    // Choose split points <= WHISPER_MAX_CHUNK_SEC snapping to silence midpoints
    const boundaries = [0];
    let lastBoundary = 0;
    while (totalDuration - lastBoundary > WHISPER_MAX_CHUNK_SEC) {
        const idealEnd = lastBoundary + WHISPER_MAX_CHUNK_SEC;
        // Find best silence pause near [idealEnd - 90s, idealEnd]
        const candidate = silences
            .map((s) => (s.startSec + s.endSec) / 2)
            .filter((t) => t > lastBoundary + 60 && t <= idealEnd)
            .pop();

        const nextBoundary = candidate ? Number(candidate.toFixed(2)) : Number(idealEnd.toFixed(2));
        boundaries.push(nextBoundary);
        lastBoundary = nextBoundary;
    }
    boundaries.push(Number(totalDuration.toFixed(2)));

    const totalChunks = boundaries.length - 1;
    onLog(`🎙️ Chia audio thành ${totalChunks} phần (mỗi phần <15MB WAV) để gửi Groq Whisper lấy mốc giây...`);

    const allSegments = [];
    for (let i = 0; i < totalChunks; i++) {
        if (signal?.aborted) throw new Error('Đã hủy tiến trình tách audio.');
        const chunkStart = boundaries[i];
        const chunkEnd = boundaries[i + 1];

        onProgress({
            stage: 'WHISPER_STT',
            percent: Math.round(((i) / totalChunks) * 100),
            detail: `Whisper đang nghe & bóc script phần ${i + 1}/${totalChunks} (${formatTimeShort(chunkStart)} – ${formatTimeShort(chunkEnd)})...`
        });
        onLog(`⏳ Whisper [${i + 1}/${totalChunks}] (${formatTimeShort(chunkStart)} – ${formatTimeShort(chunkEnd)})...`);

        const wavBlob = encodeAudioSliceToWavBlob(audioBuffer, chunkStart, chunkEnd, 16000);
        const result = await callWhisperVerboseSTT(wavBlob, 'ja', signal);

        result.segments.forEach((seg) => {
            if (!seg.text) return;
            allSegments.push({
                start: Number((chunkStart + seg.start).toFixed(2)),
                end: Number((chunkStart + seg.end).toFixed(2)),
                text: seg.text
            });
        });
        onLog(`✅ Xong Whisper phần ${i + 1}/${totalChunks}: thu được ${result.segments.length} câu thoại có mốc giây.`);
    }

    onProgress({ stage: 'WHISPER_STT', percent: 100, detail: 'Đã bóc xong toàn bộ transcript kèm mốc thời gian.' });
    return { segments: allSegments, totalDuration };
};

/**
 * Uploads an audio or image Blob/File to Firebase Storage and returns its public download URL.
 */
export const uploadFileToFirebaseStorage = (fileOrBlob, storagePath, onProgress = () => {}) => {
    if (!storage) {
        return Promise.reject(new Error('Firebase Storage chưa được khởi tạo.'));
    }
    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, fileOrBlob);

    return new Promise((resolve, reject) => {
        task.on(
            'state_changed',
            (snap) => {
                const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
                onProgress(pct);
            },
            (err) => reject(err),
            async () => {
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve(url);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

export const uploadBase64ImageToStorage = async (dataUrl, storagePath) => {
    if (!storage) throw new Error('Firebase Storage chưa được khởi tạo.');
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
    return await getDownloadURL(fileRef);
};

export const formatTimeShort = (sec = 0) => {
    const safe = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const res = String(reader.result || '');
        const commaIdx = res.indexOf(',');
        resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Không thể chuyển Blob audio sang base64.'));
    reader.readAsDataURL(blob);
});

const parseGeminiCuesJson = (raw = '') => {
    const text = String(raw || '').trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fence ? fence[1].trim() : text;
    try {
        return JSON.parse(body);
    } catch {
        const firstBrace = body.indexOf('{');
        const lastBrace = body.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(body.slice(firstBrace, lastBrace + 1));
        }
        return null;
    }
};

/**
 * Fast AI Mondai Boundary Scanner ("Mondai ichi", "Mondai ni", "問題1..5", "1番", outro).
 * Primary: Groq/OpenAI Whisper verbose_json at compact 8 kHz mono chunks (2 concurrent requests).
 * Fallback: OpenRouter Gemini 2.5 Flash multimodal `input_audio` when no Whisper API key is configured.
 */
export const detectMondaiBoundariesWithAI = async (audioBuffer, {
    level = 'N3',
    trimIntroAndExample = false,
    onProgress = () => {},
    signal = null
} = {}) => {
    if (!audioBuffer) throw new Error('Chưa có dữ liệu Audio đã giải mã.');
    const totalDuration = audioBuffer.duration;
    const { silences } = detectSilenceSegments(audioBuffer, { minSilenceSec: 1.5, minSegmentSec: 6 });

    let hasWhisperKey = false;
    try {
        await getWhisperApiConfig();
        hasWhisperKey = true;
    } catch {
        hasWhisperKey = false;
    }

    const maxChunkSec = hasWhisperKey ? 620 : 140; // 8kHz mono WAV: 620s ~ 9.9MB (Groq), 140s ~ 2.2MB (Gemini)
    const boundaries = [0];
    let lastBoundary = 0;
    while (totalDuration - lastBoundary > maxChunkSec) {
        const idealEnd = lastBoundary + maxChunkSec;
        const candidate = silences
            .map((s) => (s.startSec + s.endSec) / 2)
            .filter((t) => t > lastBoundary + 45 && t <= idealEnd)
            .pop();
        const nextBoundary = candidate ? Number(candidate.toFixed(2)) : Number(idealEnd.toFixed(2));
        boundaries.push(nextBoundary);
        lastBoundary = nextBoundary;
    }
    boundaries.push(Number(totalDuration.toFixed(2)));

    const chunkJobs = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
        chunkJobs.push({ index: i, start: boundaries[i], end: boundaries[i + 1] });
    }

    const allSegments = [];
    const totalChunks = chunkJobs.length;
    let completed = 0;

    if (hasWhisperKey) {
        // Run Whisper chunks with concurrency=2 for fast parallel Mondai keyword scan
        const CONCURRENCY = 2;
        for (let i = 0; i < chunkJobs.length; i += CONCURRENCY) {
            if (signal?.aborted) throw new Error('Đã hủy quét AI.');
            const batch = chunkJobs.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (job) => {
                const wavBlob = encodeAudioSliceToWavBlob(audioBuffer, job.start, job.end, 8000);
                const result = await callWhisperVerboseSTT(wavBlob, 'ja', signal);
                completed += 1;
                onProgress({
                    percent: Math.round((completed / totalChunks) * 90),
                    detail: `Whisper đang nghe tìm Mondai (${completed}/${totalChunks} đoạn)...`
                });
                return (result.segments || [])
                    .filter((seg) => seg.text)
                    .map((seg) => ({
                        start: Number((job.start + seg.start).toFixed(2)),
                        end: Number((job.start + seg.end).toFixed(2)),
                        text: seg.text
                    }));
            }));
            batchResults.forEach((list) => allSegments.push(...list));
        }
    } else {
        for (let i = 0; i < chunkJobs.length; i++) {
            if (signal?.aborted) throw new Error('Đã hủy quét AI.');
            const job = chunkJobs[i];
            onProgress({
                percent: Math.round((i / totalChunks) * 90),
                detail: `Gemini AI đang nghe tìm từ khóa Mondai (${i + 1}/${totalChunks})...`
            });
            const wavBlob = encodeAudioSliceToWavBlob(audioBuffer, job.start, job.end, 8000);
            const base64Audio = await blobToBase64(wavBlob);
            const chunkLen = (job.end - job.start).toFixed(1);
            const raw = await callAI([
                {
                    type: 'text',
                    text: `Nghe đoạn audio JLPT ${level} dài ${chunkLen} giây này. Tìm MỌI thời điểm (offsetSec tính từ 0.0 đầu đoạn clip) mà người đọc nói:
- "問題1 / もんだいいち / Mondai ichi", "問題2 / もんだいに / Mondai ni", "問題3 / もんだいさん", "問題4 / もんだいよん", "問題5 / もんだいご"
- "例 / れい" (Ví dụ)
- Câu mở đầu "1番 / いちばん"
- Câu kết thúc "これで聴解試験を終わります"
Trả về DUY NHẤT JSON: { "cues": [{ "offsetSec": 12.5, "text": "問題2。問題2では..." }] }`
                },
                { type: 'input_audio', input_audio: { data: base64Audio, format: 'wav' } }
            ], 'google/gemini-2.5-flash', 'pdf_ingest', 1200);

            const parsed = parseGeminiCuesJson(raw);
            (parsed?.cues || []).forEach((c) => {
                const offset = Number(c?.offsetSec);
                if (!Number.isFinite(offset) || !c?.text) return;
                allSegments.push({
                    start: Number((job.start + Math.max(0, offset)).toFixed(2)),
                    end: Number((job.start + Math.max(0, offset + 2)).toFixed(2)),
                    text: String(c.text)
                });
            });
        }
    }

    onProgress({ percent: 95, detail: 'Đang khớp mốc Mondai & từ khóa chuyển phần...' });
    const extracted = extractMondaiBoundariesFromSegments(allSegments, {
        totalDuration,
        level,
        trimIntroAndExample
    });

    onProgress({ percent: 100, detail: `Nhận diện được ${extracted.detectedCount} Mondai!` });
    return {
        ...extracted,
        engine: hasWhisperKey ? 'whisper' : 'gemini',
        segmentsCount: allSegments.length
    };
};
