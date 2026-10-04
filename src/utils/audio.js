// --- Audio utility functions ---
// Hỗ trợ Microsoft Azure Speech TTS với fallback Web Speech API

// Convert base64 to ArrayBuffer
import { isEnglishText } from '../languages/en/ipa';
import { isKoreanText } from '../languages/ko/hangul';
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
    female: { id: 'female', label: 'Nữ (Nanami - Chuẩn NHK)', gender: 'Female' },
    male: { id: 'male', label: 'Nam (Keita - Chuẩn Tokyo)', gender: 'Male' },
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
        const isKor = isKoreanText(text);
        const isEng = !isKor && isEnglishText(text);
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const targetPath = isKor
            ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_ko')
            : (isEng ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_en') : sharedVocabPath);
        const vocabRef = doc(db, targetPath, encodedKey);
        const snap = await getDoc(vocabRef);
        if (snap.exists()) {
            const data = snap.data();
            const audioField = isKor
                ? (gender === 'male' ? 'audioBase64_ko_male' : 'audioBase64_ko_female')
                : (isEng 
                    ? (gender === 'male' ? 'audioBase64_en_male' : 'audioBase64_en_female')
                    : (gender === 'male' ? 'audioBase64_male' : 'audioBase64_female'));
            if (data[audioField]) {
                console.log(`🔊 Shared audio HIT (${isKor ? 'KO' : (isEng ? 'EN' : 'JA')} ${gender}): "${text}"`);
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
 * @param {string} text - Text tiếng Nhật / Tiếng Anh / Tiếng Hàn
 * @param {string} base64 - Audio base64
 * @param {string} gender - 'male' hoặc 'female'
 */
const saveSharedAudio = async (text, base64, gender) => {
    if (!_sharedAudioDeps || !text || !base64) return;
    try {
        const { db, sharedVocabPath, setDoc, doc, disabled } = _sharedAudioDeps;
        if (disabled?.current) return;
        const isKor = isKoreanText(text);
        const isEng = !isKor && isEnglishText(text);
        const key = text.trim().replace(/\s+/g, ' ');
        const encodedKey = encodeURIComponent(key);
        const targetPath = isKor
            ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_ko')
            : (isEng ? sharedVocabPath.replace(/shared_vocab$/, 'shared_vocab_en') : sharedVocabPath);
        const vocabRef = doc(db, targetPath, encodedKey);
        const audioField = isKor
            ? (gender === 'male' ? 'audioBase64_ko_male' : 'audioBase64_ko_female')
            : (isEng 
                ? (gender === 'male' ? 'audioBase64_en_male' : 'audioBase64_en_female')
                : (gender === 'male' ? 'audioBase64_male' : 'audioBase64_female'));
        await setDoc(vocabRef, { [audioField]: base64 }, { merge: true });
        console.log(`💾 Saved shared audio (${isKor ? 'KO' : (isEng ? 'EN' : 'JA')} ${gender}): "${text}"`);
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

/**
 * TTS Engine Google Translate miễn phí 100% cho các câu văn dài / ví dụ (Zero Cost, No API Key needed)
 */
export const googleTTS = async (text, lang = null) => {
    if (!text) return null;
    const cleanText = cleanTextForTTS(text);
    if (!cleanText) return null;

    const isEng = isEnglishText(cleanText);
    const targetLang = lang || (isEng ? 'en' : 'ja');
    const cacheKey = `google:${targetLang}:${cleanText}`;

    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey);
    }

    try {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        const response = await fetch(googleUrl);
        if (!response.ok) return null;

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

        const result = { blobUrl, base64, voiceId: 'google' };

        if (ttsCache.size >= MAX_CACHE_SIZE) {
            const firstKey = ttsCache.keys().next().value;
            const oldResult = ttsCache.get(firstKey);
            if (oldResult?.blobUrl) URL.revokeObjectURL(oldResult.blobUrl);
            ttsCache.delete(firstKey);
        }
        ttsCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.warn('Google TTS fetch error:', e.message);
        return null;
    }
};

const escapeXml = (unsafe) => {
    return String(unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Tra cứu file âm thanh thu âm từ người Nhật bản xứ (Native Speaker Audio)
 * Nguồn: Jotoba / Wadoku / Forvo (Chuẩn Tokyo Pitch Accent 100%)
 */
export const fetchNativeJapaneseAudio = async (text, reading = '') => {
    if (!text && !reading) return null;
    const rawWord = String(text || '').split('（')[0].split('(')[0].trim();
    if (!rawWord || !/[\u3040-\u309F\u30A0-\u30FF\u4e00-\u9faf]/.test(rawWord)) return null;

    try {
        const { fetchJotobaWordData } = await import('./pitchAccent');
        const data = await fetchJotobaWordData(rawWord);
        if (data && data.audioUrl) {
            const res = await fetch(data.audioUrl);
            if (res.ok) {
                const audioBlob = await res.blob();
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
                return {
                    blobUrl,
                    base64,
                    voiceId: 'native',
                    fromNative: true,
                    pitch: data.pitch || []
                };
            }
        }
    } catch (e) {
        console.warn('Native audio fetch failed, will fallback to Azure TTS:', e.message);
    }
    return null;
};

/**
 * Bóc tách chữ viết (Word / Kanji) và phiên âm (Reading / Kana)
 * Đảm bảo giữ nguyên chữ Hán để Azure Neural TTS nhận diện đúng ngữ nghĩa và quy tắc Pitch Accent Tokyo
 */
export const getWordAndReading = (text, reading = '') => {
    if (!text && !reading) return { word: '', reading: '' };
    const rawText = String(text || '').trim();
    const rawReading = String(reading || '').trim();

    // 1. Kiểm tra định dạng ngoặc: e.g. "募集（ぼしゅう）" hoặc "雨 (あめ)"
    const bracketMatch = rawText.match(/[（(]([^）)]+)[）)]/);
    const mainText = rawText.split('（')[0].split('(')[0].trim();

    let candidateReading = rawReading;
    if (bracketMatch && !candidateReading) {
        candidateReading = bracketMatch[1].trim();
    }

    const cleanWord = mainText || rawText;
    return {
        word: cleanWord,
        reading: candidateReading || ''
    };
};

/**
 * Microsoft Azure Speech API cho từ vựng (chất lượng cao, chuẩn pitch accent Tokyo)
 * Sử dụng thẻ SSML <sub> để truyền cả chữ Hán (cho ngữ cảnh trọng âm) và Furigana (cho cách đọc chính xác)
 */
export const azureTTS = async (text, reading = '', forceVoice = null) => {
    const key = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastasia';
    const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;

    if (!proxyUrl && !key) return null;
    if (!text && !reading) return null;

    const voiceId = forceVoice || getTTSVoice();
    const speed = 1.0; // Tốc độ 1.0 giữ nguyên dải tần F0 tự nhiên của pitch accent
    const volume = 'default';

    const { word, reading: kanaReading } = getWordAndReading(text, reading);
    const textToSpeak = word || kanaReading;
    if (!textToSpeak) return null;

    const isKor = isKoreanText(textToSpeak);
    const isEng = !isKor && isEnglishText(textToSpeak);
    const langKey = isKor ? 'ko' : (isEng ? 'en' : 'ja');
    const cacheKey = `azure:${voiceId}:${langKey}:${speed}:${volume}:${word}:${kanaReading}`;
    if (ttsCache.has(cacheKey)) {
        return ttsCache.get(cacheKey);
    }

    const voiceMap = {
        ja: {
            female: 'ja-JP-NanamiNeural', // Giọng Nữ chuẩn giáo dục NHK của Microsoft (Tokyo pitch accent)
            male: 'ja-JP-KeitaNeural'     // Giọng Nam Tokyo chuẩn
        },
        en: {
            female: 'en-US-JennyNeural',
            male: 'en-US-GuyNeural'
        },
        ko: {
            female: 'ko-KR-SunHiNeural',  // Giọng Nữ tiếng Hàn chuẩn Seoul
            male: 'ko-KR-InJoonNeural'    // Giọng Nam tiếng Hàn chuẩn Seoul
        }
    };

    const azureVoiceName = (voiceMap[langKey] && voiceMap[langKey][voiceId]) || (isKor ? 'ko-KR-SunHiNeural' : (isEng ? 'en-US-JennyNeural' : 'ja-JP-NanamiNeural'));
    const gender = voiceId === 'male' ? 'male' : 'female';

    let cachedAudio = null;
    if (volume === 'default') {
        cachedAudio = await lookupSharedAudio(word || kanaReading, gender);
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
        let response;
        const xmlLang = isKor ? 'ko-KR' : (isEng ? 'en-US' : 'ja-JP');
        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF\u3005]/.test(word);

        // SSML: Nếu có Kanji và có Kana khác nhau, chỉ dùng <sub alias="Kana">Kanji</sub> khi Kana bao hàm toàn bộ từ/cụm từ
        let ssmlBody = escapeXml(word);
        if (hasKanji && kanaReading && kanaReading !== word) {
            // Kiểm tra xem kanaReading có khớp với word không:
            // 1. Nếu word có chứa Hiragana/Katakana ở đuôi (như 食べる hoặc 警告を与える), kanaReading phải chứa đuôi đó
            const kanaTailMatch = word.match(/[\u3040-\u309F\u30A0-\u30FF]+$/);
            const isTailValid = !kanaTailMatch || kanaReading.endsWith(kanaTailMatch[0]);
            
            // 2. Nếu word có các trợ từ hoặc khoảng trắng (cụm từ dài) mà kanaReading quá ngắn (chỉ là 1 từ đơn)
            const hasMultipleWords = /[をにでがはとからまでより\s]/.test(word);
            const isReadingPartial = hasMultipleWords && !/[をにでがはとからまでより\s]/.test(kanaReading);

            if (isTailValid && !isReadingPartial) {
                ssmlBody = `<sub alias="${escapeXml(kanaReading)}">${escapeXml(word)}</sub>`;
            }
        }

        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xmlLang}"><voice xml:lang="${xmlLang}" name="${azureVoiceName}"><prosody rate="1.0">${ssmlBody}</prosody></voice></speak>`;

        if (proxyUrl) {
            const baseProxy = proxyUrl.replace(/\/+$/, '');
            response = await fetch(baseProxy, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: word,
                    reading: kanaReading,
                    voiceName: azureVoiceName,
                    ssml: ssml
                })
            });
        } else {
            const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
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
            saveSharedAudio(word || kanaReading, base64, gender);
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

export const extractReadingText = (text, reading = '') => {
    if (!text && !reading) return '';
    const { word, reading: kanaReading } = getWordAndReading(text, reading);
    return word || kanaReading || String(text || '').trim();
};

const loadWebVoice = (langKey, voiceId) => {
    const langPrefix = langKey === 'ko' ? 'ko' : (langKey === 'en' ? 'en' : 'ja');
    const langCode = langKey === 'ko' ? 'ko-KR' : (langKey === 'en' ? 'en-US' : 'ja-JP');
    const voices = window.speechSynthesis?.getVoices() || [];

    let matchedVoice = voices.find(v => (v.lang === langCode || v.lang.startsWith(langPrefix)) && (
        voiceId === 'male'
            ? (v.name.includes('Male') || v.name.includes('Guy') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Keita') || v.name.includes('InJoon') || v.name.includes('Heami'))
            : (v.name.includes('Female') || v.name.includes('Jenny') || v.name.includes('Zira') || v.name.includes('Mayu') || v.name.includes('SunHi') || v.name.includes('Google 한국의') || v.name.includes('Google US English'))
    ));

    if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang === langCode || v.lang.startsWith(langPrefix));
    }
    return matchedVoice;
};

const speakWithWebSpeech = (text, reading = '') => {
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
        }, 4000);

        if (!text && !reading) return safeResolve();
        if (typeof window === 'undefined' || !window.speechSynthesis) return safeResolve();

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            window.speechSynthesis.cancel();
        } catch (_) {}

        let cleanText = reading ? extractReadingText(text, reading) : cleanTextForTTS(text);
        if (!cleanText) cleanText = String(text || '').trim();
        if (!cleanText) return safeResolve();

        if (cleanText.includes('<sub alias=')) {
            const match = cleanText.match(/alias="([^"]+)"/);
            if (match) cleanText = match[1];
        }

        const isKor = isKoreanText(cleanText);
        const isEng = !isKor && isEnglishText(cleanText);
        const langKey = isKor ? 'ko' : (isEng ? 'en' : 'ja');
        const voiceId = getTTSVoice();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = isKor ? 'ko-KR' : (isEng ? 'en-US' : 'ja-JP');
        utterance.rate = isEng ? 1.0 : (isKor ? 0.95 : 0.92);
        utterance.pitch = 1;

        const webVoice = loadWebVoice(langKey, voiceId);
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

const speakWithTTS = (text, onAudioGenerated = null, sessionId = null, reading = '') => {
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
            safeResolve();
        }, 6000);

        if (!text && !reading) return safeResolve();

        if (currentAudioObj) {
            try {
                currentAudioObj.pause();
                currentAudioObj.currentTime = 0;
            } catch (_) {}
            currentAudioObj = null;
        }
        safeCancelSpeechSynthesis();

        let result = null;

        // 1. Thử âm thanh người bản xứ Jotoba / Wadoku trước (chỉ áp dụng cho từ vựng tiếng Nhật)
        const isKor = isKoreanText(text || reading);
        const isEng = !isKor && isEnglishText(text || reading);
        if (!isEng && !isKor) {
            try {
                result = await fetchNativeJapaneseAudio(text, reading);
            } catch (e) {
                console.warn('Native audio fetch in speakWithTTS error:', e);
            }
        }

        // 2. Nếu không có âm thanh người thật, gọi Microsoft Azure Neural TTS (Nanami / Keita kèm SSML chữ Hán)
        if (!result) {
            const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
            const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
            if (azureKey || proxyUrl) {
                try {
                    result = await azureTTS(text, reading);
                } catch (e) {
                    console.warn('Azure TTS error:', e);
                }
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
                currentAudioObj = null;
                await speakWithWebSpeech(text, reading);
                safeResolve();
            };
            try {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass && AudioCtxClass.state === 'suspended') {
                    AudioCtxClass.resume?.().catch(() => {});
                }
                await currentAudioObj.play();
            } catch (e) {
                await speakWithWebSpeech(text, reading);
                safeResolve();
            }

            if (onAudioGenerated && result.base64) {
                onAudioGenerated(result.base64 + '|cleaned', result.voiceId);
            }
            return;
        }

        // Fallback: Web Speech API (khi không có mạng hoặc Azure proxy offline)
        await speakWithWebSpeech(text, reading);
        safeResolve();
    });
};

let globalAudioSessionId = 0;

// ============== PLAY AUDIO ==============

export const playAudio = (base64Data, text = '', onAudioGenerated = null, cardVoiceId = null, reading = '') => {
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
            safeResolve();
        }, 5000);

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
                await speakWithTTS(text, onAudioGenerated, currentSessionId, reading);
                safeResolve();
            };
            currentAudioObj.play().catch(async () => {
                if (globalAudioSessionId !== currentSessionId) return safeResolve();
                await speakWithTTS(text, onAudioGenerated, currentSessionId, reading);
                safeResolve();
            });
        } else if (text || reading) {
            if (globalAudioSessionId !== currentSessionId) return safeResolve();
            speakWithTTS(text, onAudioGenerated, currentSessionId, reading).then(safeResolve);
        } else {
            safeResolve();
        }
    });
};

export const speakJapanese = (cardOrText, audioBase64 = null, onAudioGenerated = null, cardVoiceId = null, reading = '') => {
    if (!cardOrText && !audioBase64) return Promise.resolve();

    // Support receiving card object directly
    if (typeof cardOrText === 'object' && cardOrText !== null) {
        const card = cardOrText;
        const text = card.front || card.word || '';
        const effectiveAudioBase64 = card.audioBase64 || audioBase64;
        const effectiveVoiceId = card.audioVoiceId || cardVoiceId;
        const effectiveReading = card.reading || reading;
        return speakJapanese(text, effectiveAudioBase64, onAudioGenerated, effectiveVoiceId, effectiveReading);
    }

    const text = String(cardOrText || '');
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

    if (effectiveBase64) return playAudio(effectiveBase64, text || '', onAudioGenerated, cardVoiceId, reading);
    const textToSpeak = extractReadingText(text, reading);
    return textToSpeak ? playAudio(null, textToSpeak, onAudioGenerated, cardVoiceId, reading) : Promise.resolve();
};

export const generateAudioSilent = async (text, reading = '', forceVoice = null) => {
    if (!text && !reading) return null;

    // 1. Thử lấy âm thanh từ người Nhật bản xứ (Jotoba / Wadoku - chỉ tiếng Nhật)
    const isKor = isKoreanText(text || reading);
    const isEng = !isKor && isEnglishText(text || reading);
    if (!isEng && !isKor) {
        try {
            const nativeResult = await fetchNativeJapaneseAudio(text, reading);
            if (nativeResult && nativeResult.base64) {
                const { word, reading: kanaReading } = getWordAndReading(text, reading);
                const gender = (forceVoice || getTTSVoice()) === 'male' ? 'male' : 'female';
                saveSharedAudio(word || kanaReading, nativeResult.base64, gender);
                return {
                    base64: nativeResult.base64,
                    voiceId: 'native',
                    fromNative: true
                };
            }
        } catch (e) {
            console.warn('Native audio lookup in generateAudioSilent failed, proceeding to Azure TTS:', e);
        }
    }

    // 2. Gọi Microsoft Azure Neural TTS (Nanami/Keita kèm SSML chữ Hán Tokyo Pitch)
    const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
    try {
        if (azureKey || proxyUrl) {
            const result = await azureTTS(text, reading, forceVoice);
            if (result && result.base64) return { base64: result.base64, voiceId: result.voiceId };
        }
    } catch (e) {
        console.warn('generateAudioSilent error:', e.message);
    }
    return null;
};

export const generateAudioSilentWithVoice = async (text, voiceId, reading = '') => {
    return generateAudioSilent(text, reading, voiceId);
};

/**
 * Chuẩn hóa và làm sạch câu văn tiếng Nhật trước khi đọc TTS:
 * - Bóc tách toàn bộ ngoặc Furigana gắn sau Kanji: 漢字[かんじ], 漢字(かんじ), 漢字（かんじ）, 漢字{かんじ} -> 漢字
 * - Bóc tách ngoặc phiên âm đứng độc lập: (かんじ), [かんじ], {かんじ}
 * - Loại bỏ các ký tự gạch chân điền từ như "________", "＿＿", "---" để tránh đọc "gạch dưới"
 * - Loại bỏ tag HTML/XML
 */
export const cleanTextForTTS = (text) => {
    if (!text) return '';
    let clean = String(text).trim();

    // 1. Remove bracketed readings attached to Kanji:
    clean = clean.replace(/([\u4E00-\u9FAF\u3400-\u4DBF\u3005]+)\s*[（\(\[\{][\u3040-\u309F\u30A0-\u30FF\s]+[）\)\]\}]/g, '$1');

    // 2. Remove any remaining isolated phonetic brackets:
    clean = clean.replace(/[（\(\[\{][\u3040-\u309F\u30A0-\u30FF\s]+[）\)\]\}]/g, '');

    // 3. Clean blanks / underscores: e.g. "________", "＿＿", "---" -> replace with space
    clean = clean.replace(/[_＿—\-]{2,}/g, ' ');

    // 4. Remove leftover XML or HTML tags if any (like <sub>, <ruby>, <rt>, etc.)
    clean = clean.replace(/<rt>[^<]*<\/rt>/gi, '');
    clean = clean.replace(/<[^>]+>/g, '');

    // 5. Clean extra spaces
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
};

/**
 * Phát âm câu ví dụ bằng giọng đọc Google Translate chuẩn (tự nhiên, tròn vành rõ chữ)
 * Tự động làm sạch ngoặc furigana, thử lần lượt các endpoint Google TTS và chỉ fallback sang Web Speech API miễn phí (Tuyệt đối không gọi Azure)
 */
export const speakExampleSentence = (text, lang = 'ja') => {
    globalAudioSessionId++;
    const currentSessionId = globalAudioSessionId;

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
            safeResolve();
        }, 8000);

        if (!text) return safeResolve();

        const cleanText = cleanTextForTTS(text);
        if (!cleanText) return safeResolve();

        if (currentAudioObj) {
            try {
                currentAudioObj.pause();
                currentAudioObj.currentTime = 0;
            } catch (_) {}
            currentAudioObj = null;
        }
        safeCancelSpeechSynthesis();

        // 1. Prime / resume speech synthesis & audio context synchronously within user gesture
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
            } catch (_) {}
        }
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass && AudioCtxClass.state === 'suspended') {
                AudioCtxClass.resume?.().catch(() => {});
            }
        } catch (_) {}

        const isKor = isKoreanText(cleanText);
        const isEng = !isKor && isEnglishText(cleanText);
        const targetLang = isKor ? 'ko' : (isEng ? 'en' : (lang || 'ja'));

        // Detect mobile / touch environment
        const isMobile = typeof navigator !== 'undefined' && (
            /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
        );

        // On mobile devices, Web Speech API provides instant, native, 100% reliable audio without CORS/403 blocks
        if (isMobile && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            speakWithWebSpeech(cleanText).then(safeResolve).catch(safeResolve);
            return;
        }

        // On desktop, attempt Google TTS audio stream with immediate WebSpeech fallback
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        const audio = new Audio(googleUrl);
        currentAudioObj = audio;

        let hasFallbackTriggered = false;
        const triggerFallback = () => {
            if (hasFallbackTriggered) return;
            hasFallbackTriggered = true;
            if (globalAudioSessionId === currentSessionId) {
                speakWithWebSpeech(cleanText).then(safeResolve).catch(safeResolve);
            } else {
                safeResolve();
            }
        };

        audio.onended = () => {
            currentAudioObj = null;
            safeResolve();
        };

        audio.onerror = () => {
            triggerFallback();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                triggerFallback();
            });
        }
    });
};

/**
 * Phát âm ký tự hoặc từ vựng tiếng Hàn chuẩn (ko)
 */
export const speakKorean = (text) => {
    if (!text) return Promise.resolve();
    return speakExampleSentence(text, 'ko');
};

/**
 * Phát âm từ vựng hoặc ngữ âm tiếng Anh chuẩn (en)
 */
export const speakEnglish = (text) => {
    if (!text) return Promise.resolve();
    return speakExampleSentence(text, 'en');
};

