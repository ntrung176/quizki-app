// --- Audio utility functions ---
// Hỗ trợ Microsoft Azure Speech TTS với fallback Web Speech API

// Convert base64 to ArrayBuffer
import { isEnglishText } from '../languages/en/ipa';
const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Convert PCM to WAV format
const pcmToWav = (pcm16, sampleRate = 24000) => {
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

// Available voices (Microsoft Azure & WebSpeech voices)
export const TTS_VOICES = {
    female: { id: 'female', label: 'Nữ', gender: 'Female' },
    male: { id: 'male', label: 'Nam', gender: 'Male' },
};

// Get current voice preference
export const getTTSVoice = () => {
    try {
        const saved = localStorage.getItem(VOICE_STORAGE_KEY) || 'female';
        if (saved === 'mayu') return 'female';
        if (saved === 'ryota') return 'male';
        return saved === 'male' ? 'male' : 'female';
    } catch {
        return 'female';
    }
};

// Set voice preference
export const setTTSVoice = (voiceId) => {
    try {
        const normalized = voiceId === 'mayu' ? 'female' : (voiceId === 'ryota' ? 'male' : voiceId);
        localStorage.setItem(VOICE_STORAGE_KEY, normalized);
    } catch { /* ignore */ }
};

// ============== AZURE TTS AND CACHE ==============

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
const initSharedAudioCache = (deps) => {
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
        const isEng = isEnglishText(text);
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const targetPath = isEng ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_en') : sharedVocabPath;
        const vocabRef = doc(db, targetPath, encodedKey);
        const snap = await getDoc(vocabRef);
        if (snap.exists()) {
            const data = snap.data();
            const audioField = isEng 
                ? (gender === 'male' ? 'audioBase64_en_male' : 'audioBase64_en_female')
                : (gender === 'male' ? 'audioBase64_male' : 'audioBase64_female');
            if (data[audioField]) {
                console.log(`🔊 Shared audio HIT (${isEng ? 'EN' : 'JA'} ${gender}): "${text}"`);
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
 * @param {string} text - Text tiếng Nhật / Tiếng Anh
 * @param {string} base64 - Audio base64
 * @param {string} gender - 'male' hoặc 'female'
 */
const saveSharedAudio = async (text, base64, gender) => {
    if (!_sharedAudioDeps || !text || !base64) return;
    try {
        const { db, sharedVocabPath, setDoc, doc, disabled } = _sharedAudioDeps;
        if (disabled?.current) return;
        const isEng = isEnglishText(text);
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const targetPath = isEng ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_en') : sharedVocabPath;
        const vocabRef = doc(db, targetPath, encodedKey);
        const audioField = isEng 
            ? (gender === 'male' ? 'audioBase64_en_male' : 'audioBase64_en_female')
            : (gender === 'male' ? 'audioBase64_male' : 'audioBase64_female');
        await setDoc(vocabRef, { [audioField]: base64 }, { merge: true });
        console.log(`💾 Saved shared audio (${isEng ? 'EN' : 'JA'} ${gender}): "${text}"`);
    } catch (e) {
        if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
            if (_sharedAudioDeps?.disabled) _sharedAudioDeps.disabled.current = true;
        }
    }
};

const getSettings = () => {
    try {
        const saved = localStorage.getItem('quizki-settings');
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

const azureTTS = async (text) => {
    const key = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastasia';
    const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;

    if (!proxyUrl && !key) return null;
    if (!text) return null;

    const voiceId = getTTSVoice();
    const speed = 0.8;
    const volume = 'default';
    const isEng = isEnglishText(text);

    const cacheKey = `azure:${voiceId}:${isEng ? 'en' : 'ja'}:${speed}:${volume}:${text}`;
    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey);
    }

    const voiceMap = {
        ja: {
            female: 'ja-JP-MayuNeural',
            male: 'ja-JP-KeitaNeural'
        },
        en: {
            female: 'en-US-JennyNeural',
            male: 'en-US-GuyNeural'
        }
    };

    const langKey = isEng ? 'en' : 'ja';
    const azureVoiceName = (voiceMap[langKey] && voiceMap[langKey][voiceId]) || (isEng ? 'en-US-JennyNeural' : 'ja-JP-MayuNeural');
    const gender = voiceId === 'male' ? 'male' : 'female';

    let cachedAudio = null;
    if (volume === 'default') {
        cachedAudio = await lookupSharedAudio(text, gender);
    }
    if (cachedAudio) {
        const audioSrc = cachedAudio.startsWith('data:audio')
            ? cachedAudio
            : `data:audio/mp3;base64,${cachedAudio}`;
        const audioBlob = await fetch(audioSrc).then(r => r.blob());
        const blobUrl = URL.createObjectURL(audioBlob);
        const result = { blobUrl, base64: cachedAudio, voiceId, fromSharedCache: true };

        if (ttsCache.size >= MAX_CACHE_SIZE) {
            const firstKey = ttsCache.keys().next().value;
            const oldResult = ttsCache.get(firstKey);
            if (oldResult?.blobUrl) URL.revokeObjectURL(oldResult.blobUrl);
            ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, result);
        return result;
    }

    try {
        let ssmlText = text;
        if (speed !== 1.0 || volume !== 'default') {
            const volumeAttr = volume !== 'default' ? ` volume="${volume}"` : '';
            ssmlText = `<prosody rate="${speed}"${volumeAttr}>${text}</prosody>`;
        }

        let response;
        if (proxyUrl) {
            const baseProxy = proxyUrl.replace(/\/+$/, '');
            response = await fetch(baseProxy, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: ssmlText,
                    voiceName: azureVoiceName
                })
            });
        } else {
            const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
            const xmlLang = isEng ? 'en-US' : 'ja-JP';
            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xmlLang}"><voice xml:lang="${xmlLang}" name="${azureVoiceName}">${ssmlText}</voice></speak>`;

            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': key,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'quizki-app'
                },
                body: ssml
            });
        }

        if (!response.ok) {
            console.warn(`⚠️ Azure TTS API error (${response.status})`);
            return null;
        }

        const audioBlob = await response.blob();
        const blobUrl = URL.createObjectURL(audioBlob);

        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                const base64Data = result.split(',')[1] || result;
                resolve(base64Data);
            };
            reader.readAsDataURL(audioBlob);
        });

        const result = { blobUrl, base64, voiceId };

        if (ttsCache.size >= MAX_CACHE_SIZE) {
            const firstKey = ttsCache.keys().next().value;
            const oldResult = ttsCache.get(firstKey);
            if (oldResult?.blobUrl) URL.revokeObjectURL(oldResult.blobUrl);
            ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, result);

        if (volume === 'default') {
            saveSharedAudio(text, base64, gender);
        }

        return result;
    } catch (e) {
        console.warn('⚠️ Azure TTS network error:', e.message);
        return null;
    }
};

// ============== FALLBACK: Web Speech API ==============

const JAP_HOMOGRAPHS = {
    '来る': { default: 'くる', alternatives: ['きたる', 'きた'] },
    '行く': { default: 'いく', alternatives: ['おこなう', 'ゆく'] },
    '開く': { default: 'ひらく', alternatives: ['あく'] },
    '一日': { default: 'いちにち', alternatives: ['ついたち'] },
    '中': { default: 'なか', alternatives: ['ちゅう', 'じゅう'] },
    '下': { default: 'した', alternatives: ['もと', 'しも', 'くだ'] },
    '本': { default: 'ほん', alternatives: ['もと'] },
    '人気': { default: 'にんき', alternatives: ['ひとけ'] },
    '上手': { default: 'じょうず', alternatives: ['うわて', 'かみて'] },
    '下手': { default: 'へた', alternatives: ['したて', 'しもて'] },
    '十分': { default: 'じゅうぶん', alternatives: ['じゅっぷん'] },
    '生': { default: 'なま', alternatives: ['せい', 'しょう', 'き'] },
    '昨日': { default: 'きのう', alternatives: ['さくじつ'] },
    '明日': { default: 'あした', alternatives: ['あす', 'みょうにち'] },
    '今日': { default: 'きょう', alternatives: ['こんにち'] },
    '最中': { default: 'さいちゅう', alternatives: ['もなか'] },
    '辛い': { default: 'からい', alternatives: ['つらい'] },
    '汚れ': { default: 'よごれ', alternatives: ['けがれ'] },
};

const extractReadingText = (text) => {
    if (!text) return '';

    const mainText = text.split('（')[0].split('(')[0].trim();
    const readingMatch = text.match(/[（(]([^）)]+)[）)]/);

    if (readingMatch) {
        const candidate = readingMatch[1].trim();
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(candidate);
        const hasLatin = /[a-zA-Z]/.test(candidate);

        if (hasJapanese && !hasLatin) {
            return `<sub alias="${candidate}">${mainText}</sub>`;
        }
    }
    return mainText;
};

const loadWebVoice = (isEng, voiceId) => {
    const langPrefix = isEng ? 'en' : 'ja';
    const langCode = isEng ? 'en-US' : 'ja-JP';
    const voices = window.speechSynthesis?.getVoices() || [];

    let matchedVoice = voices.find(v => (v.lang === langCode || v.lang.startsWith(langPrefix)) && (
        voiceId === 'male'
            ? (v.name.includes('Male') || v.name.includes('Guy') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Keita'))
            : (v.name.includes('Female') || v.name.includes('Jenny') || v.name.includes('Zira') || v.name.includes('Mayu') || v.name.includes('Google US English'))
    ));

    if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang === langCode || v.lang.startsWith(langPrefix));
    }
    return matchedVoice;
};

const speakWithWebSpeech = (text) => {
    return new Promise((resolve) => {
        let isResolved = false;
        const safeResolve = () => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(safetyTimeout);
                resolve();
            }
        };

        const safetyTimeout = setTimeout(() => {
            console.warn('⚠️ Web Speech synthesis timed out');
            safeResolve();
        }, 3000);

        if (!text || !window.speechSynthesis) return safeResolve();

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            window.speechSynthesis.cancel();
        } catch (_) {}

        let cleanText = extractReadingText(text);
        if (cleanText.includes('<sub alias=')) {
            const match = cleanText.match(/alias="([^"]+)"/);
            if (match) cleanText = match[1];
        }

        const isEng = isEnglishText(cleanText);
        const voiceId = getTTSVoice();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = isEng ? 'en-US' : 'ja-JP';
        utterance.rate = isEng ? 1.0 : 0.9;
        utterance.pitch = 1;

        const webVoice = loadWebVoice(isEng, voiceId);
        if (webVoice) utterance.voice = webVoice;

        utterance.onend = () => safeResolve();
        utterance.onerror = () => safeResolve();

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utterance);
        } catch (_) {
            safeResolve();
        }
    });
};

// ============== MAIN TTS FUNCTION ==============

export const safeCancelSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                setTimeout(() => {
                    try { window.speechSynthesis.cancel(); } catch (e) {}
                }, 0);
            }
        } catch (e) {}
    }
};

const speakWithTTS = (text, onAudioGenerated = null, sessionId = null) => {
    return new Promise(async (resolve) => {
        let isResolved = false;
        const safeResolve = () => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(safetyTimeout);
                resolve();
            }
        };

        const safetyTimeout = setTimeout(() => {
            console.warn('⚠️ TTS playback timed out');
            safeResolve();
        }, 3000);

        if (!text) return safeResolve();

        const cleanText = extractReadingText(text);
        if (!cleanText) return safeResolve();

        safeCancelSpeechSynthesis();

        const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
        const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
        let result = null;

        if (azureKey || proxyUrl) {
            try {
                result = await azureTTS(cleanText);
            } catch (e) {
                console.warn('Azure TTS error:', e);
            }
        }

        if (sessionId !== null && globalAudioSessionId !== sessionId) return safeResolve();

        if (result && result.blobUrl) {
            currentAudioObj = new Audio(result.blobUrl);
            currentAudioObj.onended = () => {
                currentAudioObj = null;
                safeResolve();
            };
            currentAudioObj.onerror = async () => {
                await speakWithWebSpeech(text);
                safeResolve();
            };
            try {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass && AudioCtxClass.state === 'suspended') {
                    AudioCtxClass.resume?.().catch(() => {});
                }
                await currentAudioObj.play();
            } catch (e) {
                await speakWithWebSpeech(text);
                safeResolve();
            }

            if (onAudioGenerated && result.base64) {
                onAudioGenerated(result.base64 + '|cleaned', result.voiceId);
            }
            return;
        }

        await speakWithWebSpeech(text);
        safeResolve();
    });
};

let globalAudioSessionId = 0;

// ============== PLAY AUDIO ==============

export const playAudio = (base64Data, text = '', onAudioGenerated = null) => {
    globalAudioSessionId++;
    const currentSessionId = globalAudioSessionId;

    let isAudioCleaned = false;
    if (base64Data && base64Data.includes('|cleaned')) {
        isAudioCleaned = true;
        base64Data = base64Data.replace('|cleaned', '');
    }

    return new Promise((resolve) => {
        let isResolved = false;
        const safeResolve = () => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(safetyTimeout);
                resolve();
            }
        };

        const safetyTimeout = setTimeout(() => {
            console.warn('⚠️ playAudio timed out');
            safeResolve();
        }, 4000);

        if (currentAudioObj) {
            try {
                currentAudioObj.pause();
                currentAudioObj.currentTime = 0;
            } catch (e) {}
            currentAudioObj = null;
        }
        safeCancelSpeechSynthesis();

        if (base64Data && text && !isAudioCleaned) {
            const match = text.match(/[（(]([^）)]+)[）)]/);
            if (match && /[a-zA-Z]/.test(match[1])) {
                base64Data = null;
            }
        }

        if (base64Data) {
            const audioSrc = base64Data.startsWith('data:audio') ? base64Data : `data:audio/mp3;base64,${base64Data}`;
            currentAudioObj = new Audio(audioSrc);
            currentAudioObj.onended = () => {
                currentAudioObj = null;
                safeResolve();
            };
            currentAudioObj.onerror = async () => {
                if (globalAudioSessionId !== currentSessionId) return safeResolve();
                await speakWithTTS(text, onAudioGenerated, currentSessionId);
                safeResolve();
            };
            currentAudioObj.play().catch(async () => {
                if (globalAudioSessionId !== currentSessionId) return safeResolve();
                await speakWithTTS(text, onAudioGenerated, currentSessionId);
                safeResolve();
            });
        } else if (text) {
            if (globalAudioSessionId !== currentSessionId) return safeResolve();
            speakWithTTS(text, onAudioGenerated, currentSessionId).then(safeResolve);
        } else {
            safeResolve();
        }
    });
};

export const speakJapanese = (text, audioBase64 = null, onAudioGenerated = null, cardVoiceId = null) => {
    if (!text && !audioBase64) return Promise.resolve();

    const currentVoiceId = getTTSVoice();
    let effectiveBase64 = audioBase64;

    if (audioBase64) {
        const savedVoiceId = cardVoiceId || 'female';
        const normSaved = savedVoiceId === 'mayu' ? 'female' : (savedVoiceId === 'ryota' ? 'male' : savedVoiceId);
        if (normSaved !== currentVoiceId) {
            console.log(`🔊 Voice mismatch: card voice is "${normSaved}", user selected "${currentVoiceId}". Bypassing pre-saved audio to regenerate.`);
            effectiveBase64 = null;
        }
    }

    if (effectiveBase64) return playAudio(effectiveBase64, text || '', onAudioGenerated);
    const textToSpeak = extractReadingText(text);
    return textToSpeak ? playAudio(null, textToSpeak, onAudioGenerated) : Promise.resolve();
};

export const generateAudioSilent = async (text) => {
    if (!text) return null;
    const cleanText = extractReadingText(text);
    if (!cleanText) return null;
    const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
    try {
        if (azureKey || proxyUrl) {
            const result = await azureTTS(cleanText);
            if (result && result.base64) return { base64: result.base64, voiceId: result.voiceId };
        }
    } catch (e) {
        console.warn('generateAudioSilent error:', e.message);
    }
    return null;
};

export const generateAudioSilentWithVoice = async (text, voiceId) => {
    if (!text) return null;
    const cleanText = extractReadingText(text.replace(/＿+/g, ''));
    if (!cleanText) return null;
    const originalVoice = getTTSVoice();
    try {
        setTTSVoice(voiceId);
        const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
        const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
        let result = null;
        if (azureKey || proxyUrl) {
            result = await azureTTS(cleanText);
        }
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
