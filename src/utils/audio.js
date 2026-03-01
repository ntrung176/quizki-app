// --- Audio utility functions ---
// Hỗ trợ SpeechGen.io TTS (Nanami/Keita) với fallback Web Speech API

// Convert base64 to ArrayBuffer
export const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Convert PCM to WAV format
export const pcmToWav = (pcm16, sampleRate = 24000) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcm16.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(44 + i * 2, pcm16[i], true);
    }

    return buffer;
};

// Global audio object reference
let currentAudioObj = null;

// ============== VOICE SETTINGS ==============

const VOICE_STORAGE_KEY = 'quizki-tts-voice';

// Available voices (SpeechGen.io Japanese voices)
export const TTS_VOICES = {
    mayu: { id: 'mayu', label: 'Mayu (Nữ)', speechgenName: 'Mayu', gender: 'Female' },
    ryota: { id: 'ryota', label: 'Ryota (Nam)', speechgenName: 'Ryota', gender: 'Male' },
};

// Get current voice preference
export const getTTSVoice = () => {
    try {
        return localStorage.getItem(VOICE_STORAGE_KEY) || 'mayu';
    } catch {
        return 'mayu';
    }
};

// Set voice preference
export const setTTSVoice = (voiceId) => {
    try {
        localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
    } catch { /* ignore */ }
};

// ============== SPEECHGEN TTS ==============

// Cache cho audio URL đã tạo (trong session)
const ttsCache = new Map();
const MAX_CACHE_SIZE = 100;

// --- Shared Vocab Audio Cache (Firestore) ---
// Cho phép inject Firestore dependencies từ App.jsx
let _sharedAudioDeps = null;

/**
 * Inject Firestore dependencies cho shared audio cache
 * Gọi 1 lần từ App.jsx khi component mount
 */
export const initSharedAudioCache = (deps) => {
    _sharedAudioDeps = deps;
};

/**
 * Tra cứu audio trong shared vocab (theo giọng nam/nữ)
 * @param {string} text - Text tiếng Nhật
 * @param {string} gender - 'male' hoặc 'female'
 * @returns {Promise<string|null>} base64 audio hoặc null
 */
const lookupSharedAudio = async (text, gender) => {
    if (!_sharedAudioDeps || !text) return null;
    try {
        const { db, sharedVocabPath, getDoc, doc, disabled } = _sharedAudioDeps;
        if (disabled?.current) return null;
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const vocabRef = doc(db, sharedVocabPath, encodedKey);
        const snap = await getDoc(vocabRef);
        if (snap.exists()) {
            const data = snap.data();
            const audioField = gender === 'male' ? 'audioBase64_male' : 'audioBase64_female';
            if (data[audioField]) {
                console.log(`🔊 Shared audio HIT (${gender}): "${text}"`);
                return data[audioField];
            }
        }
        return null;
    } catch (e) {
        if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
            if (_sharedAudioDeps?.disabled) _sharedAudioDeps.disabled.current = true;
        }
        return null;
    }
};

/**
 * Lưu audio vào shared vocab (theo giọng nam/nữ)
 * @param {string} text - Text tiếng Nhật
 * @param {string} base64 - Audio base64
 * @param {string} gender - 'male' hoặc 'female'
 */
const saveSharedAudio = async (text, base64, gender) => {
    if (!_sharedAudioDeps || !text || !base64) return;
    try {
        const { db, sharedVocabPath, setDoc, doc, disabled } = _sharedAudioDeps;
        if (disabled?.current) return;
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const vocabRef = doc(db, sharedVocabPath, encodedKey);
        const audioField = gender === 'male' ? 'audioBase64_male' : 'audioBase64_female';
        await setDoc(vocabRef, { [audioField]: base64 }, { merge: true });
        console.log(`💾 Saved shared audio (${gender}): "${text}"`);
    } catch (e) {
        if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
            if (_sharedAudioDeps?.disabled) _sharedAudioDeps.disabled.current = true;
        }
    }
};

/**
 * Gọi SpeechGen.io API qua Cloudflare Worker proxy
 * Kiểm tra shared vocab audio cache trước → nếu có thì dùng, không tốn API call
 * Trả về {blobUrl, base64, voiceId} để có thể phát và lưu vào database
 * @param {string} text - Text tiếng Nhật cần đọc
 * @returns {Promise<{blobUrl: string, base64: string, voiceId: string}|null>}
 */
const speechgenTTS = async (text) => {
    const token = import.meta.env.VITE_SPEECHGEN_TOKEN;
    const email = import.meta.env.VITE_SPEECHGEN_EMAIL;
    const proxyUrl = import.meta.env.VITE_SPEECHGEN_PROXY_URL;

    if (!token || !email || !proxyUrl || !text) return null;

    // Check session cache (holds {blobUrl, base64, voiceId})
    const voiceId = getTTSVoice();
    const cacheKey = `${voiceId}:${text}`;
    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey);
    }

    const voice = TTS_VOICES[voiceId] || TTS_VOICES.mayu;
    const gender = voice.gender === 'Male' ? 'male' : 'female';

    // === Bước 1: Kiểm tra shared vocab audio cache ===
    const cachedAudio = await lookupSharedAudio(text, gender);
    if (cachedAudio) {
        // Có audio sẵn trong shared vocab → dùng luôn, không tốn SpeechGen API
        const audioSrc = cachedAudio.startsWith('data:audio')
            ? cachedAudio
            : `data:audio/mp3;base64,${cachedAudio}`;
        const audioBlob = await fetch(audioSrc).then(r => r.blob());
        const blobUrl = URL.createObjectURL(audioBlob);
        const result = { blobUrl, base64: cachedAudio, voiceId, fromSharedCache: true };

        // Cache vào session
        if (ttsCache.size >= MAX_CACHE_SIZE) {
            const firstKey = ttsCache.keys().next().value;
            const oldResult = ttsCache.get(firstKey);
            if (oldResult?.blobUrl) URL.revokeObjectURL(oldResult.blobUrl);
            ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, result);
        return result;
    }

    // === Bước 2: Không có cache → gọi SpeechGen API ===
    try {
        // Step 1: Gọi SpeechGen API qua proxy để lấy URL file MP3
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                email,
                voice: voice.speechgenName,
                text,
                format: 'mp3',
                speed: 0.9,
                pitch: 0,
                emotion: 'neutral',
            }),
        });

        if (!response.ok) {
            console.warn(`⚠️ SpeechGen API error (${response.status}), falling back to Web Speech`);
            return null;
        }

        const data = await response.json();

        if (data.status === 1 && data.file) {
            // Step 2: Fetch audio file qua proxy /audio endpoint (bypass CORS trên file MP3)
            const baseProxy = proxyUrl.replace(/\/+$/, ''); // Xóa trailing slash
            const audioResponse = await fetch(`${baseProxy}/audio?url=${encodeURIComponent(data.file)}`);
            if (!audioResponse.ok) {
                console.warn('⚠️ SpeechGen audio fetch error:', audioResponse.status);
                return null;
            }

            const audioBlob = await audioResponse.blob();
            const blobUrl = URL.createObjectURL(audioBlob);

            // Convert blob to base64 để lưu vào database
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Lấy phần base64 sau prefix "data:audio/mpeg;base64,"
                    const result = reader.result;
                    const base64Data = result.split(',')[1] || result;
                    resolve(base64Data);
                };
                reader.readAsDataURL(audioBlob);
            });

            const result = { blobUrl, base64, voiceId };

            // Cache vào session
            if (ttsCache.size >= MAX_CACHE_SIZE) {
                const firstKey = ttsCache.keys().next().value;
                const oldResult = ttsCache.get(firstKey);
                if (oldResult?.blobUrl) URL.revokeObjectURL(oldResult.blobUrl);
                ttsCache.delete(firstKey);
            }
            ttsCache.set(cacheKey, result);

            // === Bước 3: Lưu audio vào shared vocab (fire-and-forget) ===
            saveSharedAudio(text, base64, gender);

            return result;
        } else {
            console.warn('⚠️ SpeechGen error:', data.error || data);
            return null;
        }
    } catch (e) {
        console.warn('⚠️ SpeechGen network error:', e.message);
        return null;
    }
};

// ============== FALLBACK: Web Speech API ==============

// Cache for Japanese voices (loaded once)
let cachedJapaneseVoice = null;
let voicesLoaded = false;

// Preload Japanese voice
const loadJapaneseVoice = () => {
    if (voicesLoaded) return cachedJapaneseVoice;

    const voices = window.speechSynthesis?.getVoices() || [];
    // Ưu tiên: Google Japanese > Microsoft Japanese > any ja voice
    cachedJapaneseVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google'))
        || voices.find(v => v.lang === 'ja-JP' && v.name.includes('Microsoft'))
        || voices.find(v => v.lang === 'ja-JP')
        || voices.find(v => v.lang.startsWith('ja'));

    if (voices.length > 0) voicesLoaded = true;
    return cachedJapaneseVoice;
};

// Ensure voices are loaded (some browsers load async)
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        voicesLoaded = false;
        loadJapaneseVoice();
    };
    // Initial load attempt
    loadJapaneseVoice();
}

// Fallback: Sử dụng Web Speech API để đọc text tiếng Nhật
const speakWithWebSpeech = (text) => {
    if (!text || !window.speechSynthesis) return;

    // Lấy phần từ vựng (không có furigana)
    const cleanText = text.split('（')[0].split('(')[0].trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Tìm giọng tiếng Nhật (dùng cached voice)
    const japaneseVoice = loadJapaneseVoice();
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }

    window.speechSynthesis.speak(utterance);
};

// ============== MAIN TTS FUNCTION ==============

/**
 * Phát âm text tiếng Nhật bằng SpeechGen TTS, fallback Web Speech
 * @param {string} text - Text cần đọc
 * @param {Function|null} onAudioGenerated - Callback khi TTS tạo audio mới: (base64, voiceId) => void
 */
const speakWithTTS = async (text, onAudioGenerated = null) => {
    if (!text) return;

    // Clean text: remove furigana in parentheses for TTS
    const cleanText = text.split('（')[0].split('(')[0].trim();
    if (!cleanText) return;

    // Dừng speech cũ
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // Thử SpeechGen TTS trước
    const token = import.meta.env.VITE_SPEECHGEN_TOKEN;
    const email = import.meta.env.VITE_SPEECHGEN_EMAIL;
    const proxyUrl = import.meta.env.VITE_SPEECHGEN_PROXY_URL;

    if (token && email && proxyUrl) {
        try {
            const result = await speechgenTTS(cleanText);
            if (result && result.blobUrl) {
                currentAudioObj = new Audio(result.blobUrl);
                currentAudioObj.onended = () => {
                    currentAudioObj = null;
                };
                currentAudioObj.play().catch(e => {
                    console.warn('SpeechGen play error, falling back:', e);
                    speakWithWebSpeech(text);
                });

                // Gọi callback để component lưu audio vào database
                if (onAudioGenerated && result.base64) {
                    onAudioGenerated(result.base64, result.voiceId);
                }
                return;
            }
        } catch (e) {
            console.warn('SpeechGen TTS error, falling back:', e);
        }
    }

    // Fallback to Web Speech API
    speakWithWebSpeech(text);
};

// ============== PLAY AUDIO ==============

// Play Audio - với fallback sử dụng SpeechGen TTS → Web Speech API
export const playAudio = (base64Data, text = '', onAudioGenerated = null) => {
    // Dừng audio đang phát (nếu có)
    if (currentAudioObj) {
        try {
            currentAudioObj.pause();
            currentAudioObj.currentTime = 0;
            currentAudioObj.remove?.();
        } catch (e) {
            console.error('Error stopping previous audio:', e);
        }
        currentAudioObj = null;
    }

    // Dừng speech đang nói (nếu có)
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    // Nếu có base64Data, phát audio (đã lưu trước đó, không cần tạo mới)
    if (base64Data) {
        try {
            if (base64Data.startsWith('data:audio') || base64Data.startsWith('UklGR') || base64Data.startsWith('SUQz') || base64Data.startsWith('//uQ') || base64Data.startsWith('AAAA')) {
                const audioSrc = base64Data.startsWith('data:audio')
                    ? base64Data
                    : `data:audio/mp3;base64,${base64Data}`;
                currentAudioObj = new Audio(audioSrc);
                currentAudioObj.onended = () => {
                    if (currentAudioObj) {
                        currentAudioObj.remove?.();
                    }
                    currentAudioObj = null;
                };
                currentAudioObj.play().catch(e => {
                    console.error('Audio play error:', e);
                    speakWithTTS(text, onAudioGenerated);
                });
            } else {
                const rawData = base64ToArrayBuffer(base64Data);
                const pcm16 = new Int16Array(rawData);
                const wavBuffer = pcmToWav(pcm16, 24000);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                currentAudioObj = new Audio(url);
                currentAudioObj.onended = () => {
                    URL.revokeObjectURL(url);
                    if (currentAudioObj) {
                        currentAudioObj.remove?.();
                    }
                    currentAudioObj = null;
                };
                currentAudioObj.play().catch(e => {
                    console.error('Audio play error:', e);
                    speakWithTTS(text, onAudioGenerated);
                });
            }
        } catch (e) {
            console.error('playAudio error:', e);
            speakWithTTS(text, onAudioGenerated);
        }
    } else if (text) {
        // Không có audio → dùng TTS và lưu kết quả qua callback
        speakWithTTS(text, onAudioGenerated);
    }
};

/**
 * speakJapanese - Hàm tiện ích phát âm tiếng Nhật
 * Ưu tiên đọc hiragana/katakana (trong ngoặc) để tránh đọc sai kanji
 * 
 * @param {string} text - Từ vựng tiếng Nhật cần phát âm (có thể chứa furigana: "食べる（たべる）")
 * @param {string|null} audioBase64 - Dữ liệu audio base64 đã lưu sẵn
 * @param {Function|null} onAudioGenerated - Callback khi TTS tạo audio mới: (base64, voiceId) => void
 */
export const speakJapanese = (text, audioBase64 = null, onAudioGenerated = null) => {
    if (!text && !audioBase64) return;

    // Nếu có audioBase64 lưu sẵn, dùng nó (không cần callback vì đã lưu rồi)
    if (audioBase64) {
        playAudio(audioBase64, text || '');
        return;
    }

    // Ưu tiên đọc phần hiragana/katakana trong ngoặc để tránh sai phát âm kanji
    const readingMatch = text.match(/[（(]([^）)]+)[）)]/);
    const textToSpeak = readingMatch ? readingMatch[1] : text.split('（')[0].split('(')[0].trim();

    if (textToSpeak) {
        playAudio(null, textToSpeak, onAudioGenerated);
    }
};

// Stop current audio
export const stopAudio = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (currentAudioObj) {
        try {
            currentAudioObj.pause();
            currentAudioObj.currentTime = 0;
        } catch (e) {
            console.error('Error stopping audio:', e);
        }
        currentAudioObj = null;
    }
};

/**
 * Tạo audio TTS ngầm (không phát) — dùng cho background audio generation
 * Kiểm tra shared cache → gọi SpeechGen API nếu cần
 * @param {string} text - Text tiếng Nhật cần tạo audio
 * @returns {Promise<{base64: string, voiceId: string}|null>}
 */
export const generateAudioSilent = async (text) => {
    if (!text) return null;

    // Clean text: remove furigana
    const cleanText = text.split('（')[0].split('(')[0].trim();
    if (!cleanText) return null;

    try {
        const result = await speechgenTTS(cleanText);
        if (result && result.base64) {
            return { base64: result.base64, voiceId: result.voiceId };
        }
    } catch (e) {
        console.warn('generateAudioSilent error:', e.message);
    }
    return null;
};

/**
 * Tạo audio TTS ngầm với giọng chỉ định (không phụ thuộc user preference)
 * Dùng cho book vocab: word → giọng nam (ryota), example → giọng nữ (mayu)
 * @param {string} text - Text tiếng Nhật
 * @param {string} voiceId - 'ryota' (nam) hoặc 'mayu' (nữ)
 * @returns {Promise<{base64: string, voiceId: string}|null>}
 */
export const generateAudioSilentWithVoice = async (text, voiceId) => {
    if (!text) return null;

    // Clean text: remove furigana & blanks
    const cleanText = text.replace(/＿+/g, '').split('（')[0].split('(')[0].trim();
    if (!cleanText) return null;

    // Temporarily set voice, generate, then restore
    const originalVoice = getTTSVoice();
    try {
        setTTSVoice(voiceId);
        const result = await speechgenTTS(cleanText);
        setTTSVoice(originalVoice);
        if (result && result.base64) {
            return { base64: result.base64, voiceId };
        }
    } catch (e) {
        setTTSVoice(originalVoice);
        console.warn('generateAudioSilentWithVoice error:', e.message);
    }
    return null;
};
