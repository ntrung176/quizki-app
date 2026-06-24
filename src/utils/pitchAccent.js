// --- Pitch Accent & Audio Utility ---
// Fetches pitch accent + audio data from Jotoba API

// Cache to avoid repeated API calls
// Stores { pitch: [...], audioUrl: string|null }
const cacheKey = 'quizki_jotoba_cache';
let jotobaCache = new Map();

// Helper to load cache from localStorage
const loadCache = () => {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            jotobaCache = new Map(Object.entries(parsed));
        }
    } catch (e) {
        console.warn('Failed to load Jotoba cache from localStorage:', e);
    }
};

// Helper to save cache to localStorage
let saveTimeout = null;
const saveCache = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const obj = Object.fromEntries(jotobaCache.entries());
            localStorage.setItem(cacheKey, JSON.stringify(obj));
        } catch (e) {
            console.warn('Failed to save Jotoba cache to localStorage:', e);
        }
    }, 500);
};

// Initialize cache
if (typeof window !== 'undefined') {
    loadCache();
}

// Circuit breaker to prevent flooding when Jotoba is down/blocked
let isJotobaOffline = false;
let offlineUntil = 0;

const disableJotobaTemporarily = () => {
    isJotobaOffline = true;
    const duration = import.meta.env.DEV ? 2 * 60 * 1000 : 30 * 60 * 1000;
    const until = Date.now() + duration;
    offlineUntil = until;
    try {
        localStorage.setItem('jotoba_offline_until', String(until));
    } catch (_) {}
};

const checkJotobaOffline = () => {
    if (isJotobaOffline && Date.now() < offlineUntil) {
        return true;
    }
    try {
        const stored = localStorage.getItem('jotoba_offline_until');
        if (stored) {
            const until = parseInt(stored, 10);
            if (!isNaN(until) && Date.now() < until) {
                isJotobaOffline = true;
                offlineUntil = until;
                return true;
            }
        }
    } catch (_) {}
    isJotobaOffline = false;
    return false;
};

let aiBatchQueue = [];
let aiBatchTimeout = null;
let aiBatchRunning = false;

const processAiBatchQueue = async () => {
    if (aiBatchRunning || aiBatchQueue.length === 0) return;
    aiBatchRunning = true;

    // Take up to 15 words for this batch
    const batchSize = 15;
    const currentBatch = aiBatchQueue.splice(0, batchSize);
    const words = currentBatch.map(item => item.word);

    try {
        console.log(`🤖 [Pitch Accent] Sending AI batch request for ${words.length} words:`, words);
        const { fetchPitchAccentBatchWithAI } = await import('./aiProvider');
        const batchResults = await fetchPitchAccentBatchWithAI(words);

        // Resolve each word in the batch
        currentBatch.forEach(item => {
            const cleanWord = item.word.split('（')[0].split('(')[0].trim();
            const result = batchResults[cleanWord] || null;
            item.resolve(result);
        });
    } catch (e) {
        console.error('🤖 [Pitch Accent] Batch AI request failed:', e);
        // Reject all in this batch
        currentBatch.forEach(item => item.reject(e));
    } finally {
        // Wait 1.5 seconds between batches to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
        aiBatchRunning = false;
        processAiBatchQueue();
    }
};

const fetchPitchAccentWithAIQueued = (word) => {
    return new Promise((resolve, reject) => {
        aiBatchQueue.push({ word, resolve, reject });
        
        if (aiBatchTimeout) clearTimeout(aiBatchTimeout);
        aiBatchTimeout = setTimeout(() => {
            processAiBatchQueue();
        }, 150); // Wait 150ms to gather multiple calls into a batch
    });
};

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
        const cached = jotobaCache.get(cleanWord);
        if (cached) {
            // If the cached entry has valid pitch accent data, return it
            if (cached.pitch && cached.pitch.length > 0) {
                return cached;
            }
            // If it has no pitch accent data, and we haven't attempted AI for it yet, try AI!
            if (!cached._aiAttempted) {
                try {
                    console.log(`🤖 [Pitch Accent] Cached entry for "${cleanWord}" has no pitch. Attempting AI generation...`);
                    const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
                    if (aiData && aiData.reading) {
                        const pitchParts = accentNumberToPitchParts(aiData.reading, aiData.accent);
                        cached.pitch = pitchParts;
                        cached.reading = cached.reading || aiData.reading;
                        cached._fromAI = true;
                        console.log(`🤖 [Pitch Accent] AI generated pitch for cached word "${cleanWord}":`, pitchParts);
                    }
                } catch (e) {
                    console.warn(`🤖 [Pitch Accent] Failed to generate AI pitch for cached word "${cleanWord}":`, e);
                }
                cached._aiAttempted = true;
                jotobaCache.set(cleanWord, cached);
                saveCache();
            }
            return cached;
        }
    }

    console.log(`🔍 [Pitch Accent] Fetching fresh data for: "${cleanWord}"`);

    // Circuit breaker check
    if (checkJotobaOffline()) {
        console.log(`⚠️ [Pitch Accent] Jotoba is temporarily offline/rate-limited. Directing "${cleanWord}" to AI...`);
        try {
            const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
            if (aiData && aiData.reading) {
                const pitchParts = accentNumberToPitchParts(aiData.reading, aiData.accent);
                const result = {
                    pitch: pitchParts,
                    audioUrl: null,
                    reading: aiData.reading,
                    _fromAI: true,
                    _aiAttempted: true
                };
                jotobaCache.set(cleanWord, result);
                saveCache();
                console.log(`🤖 [Pitch Accent] AI successfully generated pitch for "${cleanWord}":`, pitchParts);
                return result;
            }
        } catch (e) {
            console.warn(`🤖 [Pitch Accent] AI generation failed for "${cleanWord}":`, e);
        }
        return null;
    }

    try {
        // Use Vite proxy in development to avoid CORS, direct URL in production
        const isDev = import.meta.env.DEV;
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
            if (response.status === 500 || response.status === 429 || response.status === 503) {
                disableJotobaTemporarily();
            }

            console.log(`⚠️ [Pitch Accent] Jotoba API failed for "${cleanWord}". Falling back to AI...`);
            try {
                const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
                if (aiData && aiData.reading) {
                    const pitchParts = accentNumberToPitchParts(aiData.reading, aiData.accent);
                    const result = {
                        pitch: pitchParts,
                        audioUrl: null,
                        reading: aiData.reading,
                        _fromAI: true,
                        _aiAttempted: true
                    };
                    jotobaCache.set(cleanWord, result);
                    saveCache();
                    return result;
                }
            } catch (_) {}

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
                reading: wordData.reading?.kana || null,
            };

            // If Jotoba has no pitch accent data, call AI to generate it
            if (!result.pitch) {
                console.log(`🤖 [Pitch Accent] Jotoba found "${cleanWord}" but has no pitch. Fetching AI pitch...`);
                try {
                    const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
                    if (aiData && aiData.reading) {
                        result.pitch = accentNumberToPitchParts(aiData.reading, aiData.accent);
                        result._fromAI = true;
                        if (!result.reading) result.reading = aiData.reading;
                        console.log(`🤖 [Pitch Accent] AI generated pitch for Jotoba word "${cleanWord}":`, result.pitch);
                    }
                } catch (e) {
                    console.warn(`🤖 [Pitch Accent] Failed to fetch AI pitch for Jotoba word "${cleanWord}":`, e);
                }
            }

            result._aiAttempted = true;
            jotobaCache.set(cleanWord, result);
            saveCache();
            return result;
        }

        // Jotoba returned no words - fallback to AI
        console.log(`🤖 [Pitch Accent] Jotoba has no results for "${cleanWord}". Falling back to AI...`);
        try {
            const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
            if (aiData && aiData.reading) {
                const pitchParts = accentNumberToPitchParts(aiData.reading, aiData.accent);
                const result = {
                    pitch: pitchParts,
                    audioUrl: null,
                    reading: aiData.reading,
                    _fromAI: true,
                    _aiAttempted: true
                };
                jotobaCache.set(cleanWord, result);
                saveCache();
                return result;
            }
        } catch (_) {}

        return null;
    } catch (e) {
        console.warn('Failed to fetch Jotoba data:', e);
        disableJotobaTemporarily();

        console.log(`⚠️ [Pitch Accent] Network error fetching Jotoba for "${cleanWord}". Falling back to AI...`);
        try {
            const aiData = await fetchPitchAccentWithAIQueued(cleanWord);
            if (aiData && aiData.reading) {
                const pitchParts = accentNumberToPitchParts(aiData.reading, aiData.accent);
                const result = {
                    pitch: pitchParts,
                    audioUrl: null,
                    reading: aiData.reading,
                    _fromAI: true,
                    _aiAttempted: true
                };
                jotobaCache.set(cleanWord, result);
                saveCache();
                return result;
            }
        } catch (_) {}

        return null;
    }
};

/**
 * Legacy wrapper - fetch pitch accent only
 */
const fetchPitchAccent = async (word) => {
    const data = await fetchJotobaWordData(word);
    return data?.pitch || null;
};

/**
 * Play audio from Jotoba for a given word
 * Falls back to Web Speech TTS if no Jotoba audio available
 */
const playJotobaAudio = async (word) => {
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
            const isDev = import.meta.env.DEV;
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
const clearPitchCache = () => {
    jotobaCache.clear();
    try {
        localStorage.removeItem(cacheKey);
    } catch (e) {
        console.warn('Failed to clear Jotoba cache from localStorage:', e);
    }
};
