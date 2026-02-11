// --- Pitch Accent & Audio Utility ---
// Fetches pitch accent + audio data from Jotoba API

// Cache to avoid repeated API calls
// Stores { pitch: [...], audioUrl: string|null }
const jotobaCache = new Map();

const JOTOBA_BASE = 'https://jotoba.de';

/**
 * Fetch word data from Jotoba API (pitch accent + audio URL)
 * Returns { pitch: PitchItem[], audioUrl: string|null } or null
 */
export const fetchJotobaWordData = async (word) => {
    if (!word) return null;

    // Clean word (remove furigana in parentheses)
    const cleanWord = word.split('（')[0].split('(')[0].trim();
    if (!cleanWord) return null;

    // Check cache first
    if (jotobaCache.has(cleanWord)) {
        return jotobaCache.get(cleanWord);
    }

    try {
        // Use Vite proxy in development to avoid CORS, direct URL in production
        const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const apiUrl = isDev
            ? '/api/jotoba/search/words'
            : `${JOTOBA_BASE}/api/search/words`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: cleanWord,
                language: 'English',
                no_english: false
            })
        });

        if (!response.ok) {
            console.warn('Jotoba API error:', response.status);
            jotobaCache.set(cleanWord, null);
            return null;
        }

        const data = await response.json();

        if (data.words && data.words.length > 0) {
            // Find exact match first
            const exactMatch = data.words.find(w =>
                w.reading?.kanji === cleanWord || w.reading?.kana === cleanWord
            );
            const wordData = exactMatch || data.words[0];

            const result = {
                pitch: (wordData.pitch && wordData.pitch.length > 0) ? wordData.pitch : null,
                audioUrl: wordData.audio ? `${JOTOBA_BASE}${wordData.audio}` : null,
            };

            jotobaCache.set(cleanWord, result);
            return result;
        }

        jotobaCache.set(cleanWord, null);
        return null;
    } catch (e) {
        console.warn('Failed to fetch Jotoba data:', e);
        jotobaCache.set(cleanWord, null);
        return null;
    }
};

/**
 * Legacy wrapper - fetch pitch accent only
 */
export const fetchPitchAccent = async (word) => {
    const data = await fetchJotobaWordData(word);
    return data?.pitch || null;
};

/**
 * Play audio from Jotoba for a given word
 * Falls back to Web Speech TTS if no Jotoba audio available
 */
export const playJotobaAudio = async (word) => {
    if (!word) return;

    const cleanWord = word.split('（')[0].split('(')[0].trim();

    // Try to get cached data first
    let data = jotobaCache.get(cleanWord);

    // If not cached, fetch it
    if (data === undefined) {
        data = await fetchJotobaWordData(word);
    }

    if (data?.audioUrl) {
        try {
            // Use proxy in dev for audio too
            const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            const audioSrc = isDev
                ? data.audioUrl.replace(JOTOBA_BASE, '')
                : data.audioUrl;

            const audio = new Audio(audioSrc);
            audio.volume = 0.8;
            await audio.play();
            return;
        } catch (e) {
            console.warn('Jotoba audio playback failed, falling back to TTS:', e);
        }
    }

    // Fallback: Web Speech API TTS
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanWord);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        // Try to use a Japanese voice
        const voices = window.speechSynthesis.getVoices();
        const jpVoice = voices.find(v => v.lang.startsWith('ja'));
        if (jpVoice) utterance.voice = jpVoice;

        window.speechSynthesis.speak(utterance);
    }
};

/**
 * Convert accent number + reading to pitch parts array
 * For use when accent data is stored as a number instead of API format
 * accent: 0 = heiban, 1 = atamadaka, n = drop after n-th mora
 */
export const accentNumberToPitchParts = (reading, accentNum) => {
    if (!reading || accentNum === undefined || accentNum === null || accentNum === '') return null;

    const num = parseInt(accentNum);
    if (isNaN(num) || num < 0) return null;

    const chars = [...reading];
    const parts = [];

    if (num === 0) {
        // Heiban: low, then high for the rest
        if (chars.length > 0) {
            parts.push({ part: chars[0], high: false });
            if (chars.length > 1) {
                parts.push({ part: chars.slice(1).join(''), high: true });
            }
        }
    } else if (num === 1) {
        // Atamadaka: high first, then low
        parts.push({ part: chars[0], high: true });
        if (chars.length > 1) {
            parts.push({ part: chars.slice(1).join(''), high: false });
        }
    } else {
        // Nakadaka: low first, high until position n, then low
        if (chars.length > 0) {
            parts.push({ part: chars[0], high: false });
            if (num > 1 && chars.length > 1) {
                const highPart = chars.slice(1, num).join('');
                if (highPart) parts.push({ part: highPart, high: true });
            }
            if (num < chars.length) {
                const lowPart = chars.slice(num).join('');
                if (lowPart) parts.push({ part: lowPart, high: false });
            }
        }
    }

    return parts.length > 0 ? parts : null;
};

/**
 * Clear the cache
 */
export const clearPitchCache = () => {
    jotobaCache.clear();
};
