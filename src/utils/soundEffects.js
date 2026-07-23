/**
 * Sound Effects System for QuizKi App
 * Uses Web Audio API for programmatic sound generation
 * No external audio files needed
 */

// Preload Duolingo sound effects
let correctAudio = null;
let wrongAudio = null;
let completionAudio = null;

try {
    if (typeof window !== 'undefined') {
        correctAudio = new Audio('/sfx/duolingo-correct.mp3');
        correctAudio.preload = 'auto';
        
        wrongAudio = new Audio('/sfx/duolingo-wrong.mp3');
        wrongAudio.preload = 'auto';
        
        completionAudio = new Audio('/sfx/duolingo-completed-lesson.mp3');
        completionAudio.preload = 'auto';
    }
} catch (e) {
    console.warn('Audio preloading failed:', e);
}

// ==================== SETTINGS ====================
const SETTINGS_KEY = 'quizki-settings';

const getSettings = () => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

export const getSfxVolume = () => {
    const settings = getSettings();
    return typeof settings.sfxVolume === 'number' ? settings.sfxVolume : 0.7;
};

export const getBgmVolume = () => {
    const settings = getSettings();
    return typeof settings.bgmVolume === 'number' ? settings.bgmVolume : 0.3;
};

export const isSfxEnabled = () => {
    const settings = getSettings();
    return settings.sfxEnabled !== false; // default true
};

// ==================== CORRECT ANSWER SOUND ====================
export function playCorrectSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        let audioToPlay;
        if (correctAudio) {
            audioToPlay = correctAudio.paused ? correctAudio : correctAudio.cloneNode(true);
        } else {
            audioToPlay = new Audio('/sfx/duolingo-correct.mp3');
        }
        audioToPlay.volume = volume;
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch(e => console.log('Audio play error:', e));
    } catch (e) {
        console.log('Sound not available:', e);
    }
}

// ==================== INCORRECT ANSWER SOUND ====================
export function playIncorrectSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        let audioToPlay;
        if (wrongAudio) {
            audioToPlay = wrongAudio.paused ? wrongAudio : wrongAudio.cloneNode(true);
        } else {
            audioToPlay = new Audio('/sfx/duolingo-wrong.mp3');
        }
        audioToPlay.volume = volume;
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch(e => console.log('Audio play error:', e));
    } catch (e) {
        console.log('Sound not available:', e);
    }
}

// ==================== FIREWORKS EFFECT (Visual + Sound) ====================
export function launchFireworks() {
    // Muted to allow new Duolingo sound effects to play exclusively
}

// ==================== CLICK SOUND ====================
function playClickSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(volume * 0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
        setTimeout(() => ctx.close(), 100);
    } catch (e) { }
}

// ==================== CARD FLIP SOUND ====================
let flipAudioCtx = null;

export function playFlipSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        if (!flipAudioCtx || flipAudioCtx.state === 'closed') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                flipAudioCtx = new AudioContextClass();
            }
        }
        if (!flipAudioCtx) return;

        if (flipAudioCtx.state === 'suspended') {
            flipAudioCtx.resume().catch(() => {});
        }

        const osc = flipAudioCtx.createOscillator();
        const gain = flipAudioCtx.createGain();
        const filter = flipAudioCtx.createBiquadFilter();

        osc.type = 'triangle';
        // A soft sweeping sound simulating card paper friction
        osc.frequency.setValueAtTime(320, flipAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, flipAudioCtx.currentTime + 0.16);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, flipAudioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(350, flipAudioCtx.currentTime + 0.16);

        gain.gain.setValueAtTime(0, flipAudioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(volume * 0.18, flipAudioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, flipAudioCtx.currentTime + 0.16);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(flipAudioCtx.destination);

        osc.start(flipAudioCtx.currentTime);
        osc.stop(flipAudioCtx.currentTime + 0.16);
    } catch (e) {
        console.warn('Flip sound error:', e);
    }
}

let lastPlayedCompletionTime = 0;
export function playCompletionFanfare() {
    if (!isSfxEnabled()) return;
    const now = Date.now();
    if (now - lastPlayedCompletionTime < 1500) {
        return; // Guard against rapid duplicate play
    }
    lastPlayedCompletionTime = now;
    const volume = getSfxVolume();
    try {
        let audioToPlay;
        if (completionAudio) {
            audioToPlay = completionAudio.paused ? completionAudio : completionAudio.cloneNode(true);
        } else {
            audioToPlay = new Audio('/sfx/duolingo-completed-lesson.mp3');
        }
        audioToPlay.volume = volume;
        audioToPlay.currentTime = 0;
        audioToPlay.play().catch(e => console.log('Audio play error:', e));
    } catch (e) {
        console.log('Sound not available:', e);
    }
}

// ==================== BACKGROUND MUSIC SYSTEM ====================
let bgmContext = null;
let bgmGain = null;
let bgmOscillators = [];
let bgmInterval = null;
let bgmIsPlaying = false;
let bgmAudioElement = null;

// ==================== PRESET TRACKS ====================
const PRESET_TRACKS = [
    {
        id: 'lofi-chill',
        name: '🎵 Lo-fi Chill',
        description: 'Nhạc lo-fi nhẹ nhàng để tập trung',
        type: 'generated',
        chords: [
            [261.63, 329.63, 392.00],
            [293.66, 369.99, 440.00],
            [246.94, 311.13, 369.99],
            [261.63, 329.63, 392.00],
            [220.00, 277.18, 329.63],
            [246.94, 311.13, 369.99],
        ],
        tempo: 4000,
        waveform: 'sine',
        filterFreq: 600,
        color: 'from-sky-500 to-indigo-500',
    },
    {
        id: 'soft-piano',
        name: '🎹 Soft Piano',
        description: 'Giai điệu piano nhẹ nhàng',
        type: 'generated',
        chords: [
            [261.63, 329.63, 392.00],
            [349.23, 440.00, 523.25],
            [293.66, 369.99, 440.00],
            [329.63, 415.30, 493.88],
            [261.63, 329.63, 392.00],
            [220.00, 277.18, 329.63],
        ],
        tempo: 5000,
        waveform: 'triangle',
        filterFreq: 1200,
        color: 'from-sky-500 to-blue-500',
    },
    {
        id: 'ambient-dream',
        name: '🌙 Ambient Dream',
        description: 'Không gian mơ màng, thư giãn',
        type: 'generated',
        chords: [
            [130.81, 196.00, 261.63],
            [146.83, 220.00, 293.66],
            [164.81, 246.94, 329.63],
            [146.83, 220.00, 293.66],
        ],
        tempo: 6000,
        waveform: 'sine',
        filterFreq: 400,
        color: 'from-sky-500 to-indigo-500',
    },
    {
        id: 'jazz-cafe',
        name: '☕ Jazz Café',
        description: 'Nhạc jazz nhẹ nhàng cho buổi học',
        type: 'generated',
        chords: [
            [261.63, 329.63, 392.00, 493.88],
            [293.66, 369.99, 440.00, 523.25],
            [349.23, 440.00, 523.25, 659.25],
            [329.63, 415.30, 493.88, 587.33],
            [261.63, 329.63, 392.00, 493.88],
        ],
        tempo: 3500,
        waveform: 'triangle',
        filterFreq: 900,
        color: 'from-amber-500 to-orange-500',
    },
    {
        id: 'ocean-waves',
        name: '🌊 Ocean Waves',
        description: 'Tiếng sóng biển thư giãn',
        type: 'generated',
        chords: [
            [130.81, 164.81, 196.00],
            [146.83, 174.61, 220.00],
            [130.81, 164.81, 196.00],
            [123.47, 155.56, 185.00],
        ],
        tempo: 7000,
        waveform: 'sine',
        filterFreq: 350,
        color: 'from-cyan-500 to-teal-500',
    },
    {
        id: 'forest-rain',
        name: '🌲 Forest Rain',
        description: 'Mưa rừng yên bình',
        type: 'generated',
        chords: [
            [196.00, 246.94, 293.66],
            [220.00, 277.18, 329.63],
            [185.00, 233.08, 277.18],
            [196.00, 246.94, 293.66],
        ],
        tempo: 5500,
        waveform: 'sine',
        filterFreq: 500,
        color: 'from-emerald-500 to-green-500',
    },
    {
        id: 'sakura-garden',
        name: '🌸 Sakura Garden',
        description: 'Giai điệu Nhật Bản nhẹ nhàng',
        type: 'generated',
        chords: [
            [329.63, 392.00, 493.88],
            [349.23, 440.00, 523.25],
            [293.66, 369.99, 440.00],
            [329.63, 392.00, 493.88],
            [261.63, 329.63, 415.30],
            [293.66, 369.99, 440.00],
        ],
        tempo: 4500,
        waveform: 'sine',
        filterFreq: 800,
        color: 'from-pink-500 to-rose-500',
    },
    {
        id: 'meditation',
        name: '🧘 Meditation',
        description: 'Thiền định, tĩnh tâm',
        type: 'generated',
        chords: [
            [130.81, 196.00, 261.63],
            [146.83, 220.00, 293.66],
            [130.81, 196.00, 261.63],
        ],
        tempo: 8000,
        waveform: 'sine',
        filterFreq: 300,
        color: 'from-teal-500 to-cyan-500',
    },
    {
        id: 'city-pop',
        name: '🏙️ City Pop',
        description: 'Nhạc city pop Nhật hoài cổ',
        type: 'generated',
        chords: [
            [349.23, 440.00, 523.25],
            [392.00, 493.88, 587.33],
            [329.63, 415.30, 493.88],
            [293.66, 369.99, 440.00],
            [349.23, 440.00, 523.25],
            [392.00, 493.88, 587.33],
        ],
        tempo: 3000,
        waveform: 'triangle',
        filterFreq: 1000,
        color: 'from-fuchsia-500 to-pink-500',
    },
    {
        id: 'study-beats',
        name: '📚 Study Beats',
        description: 'Beat học bài tập trung cao',
        type: 'generated',
        chords: [
            [261.63, 329.63, 392.00],
            [220.00, 277.18, 329.63],
            [246.94, 311.13, 369.99],
            [261.63, 329.63, 392.00],
            [293.66, 349.23, 440.00],
            [261.63, 329.63, 392.00],
        ],
        tempo: 3800,
        waveform: 'sine',
        filterFreq: 700,
        color: 'from-indigo-500 to-blue-500',
    },
];

// Get all available tracks (presets + custom)
export function getAllBgmTracks() {
    const settings = getSettings();
    const customTracks = settings.customBgmTracks || [];
    return [...PRESET_TRACKS, ...customTracks];
}

// Get currently selected track ID
export function getSelectedTrackId() {
    const settings = getSettings();
    return settings.selectedBgmTrack || 'lofi-chill';
}

// Set selected track
export function setSelectedTrack(trackId) {
    const settings = getSettings();
    settings.selectedBgmTrack = trackId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // If BGM is playing, restart with new track
    if (bgmIsPlaying) {
        stopBackgroundMusic();
        setTimeout(() => startBackgroundMusic(), 100);
    }
}

// Add custom MP3 track (admin only)
export function addCustomBgmTrack(name, audioBase64) {
    const settings = getSettings();
    if (!settings.customBgmTracks) settings.customBgmTracks = [];
    const id = 'custom-' + Date.now();
    settings.customBgmTracks.push({
        id,
        name: `🎶 ${name}`,
        description: 'Nhạc tùy chỉnh',
        type: 'mp3',
        audioData: audioBase64,
        color: 'from-gray-500 to-gray-600',
    });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return id;
}

// Remove custom BGM track
export function removeCustomBgmTrack(trackId) {
    const settings = getSettings();
    if (!settings.customBgmTracks) return;
    settings.customBgmTracks = settings.customBgmTracks.filter(t => t.id !== trackId);
    if (settings.selectedBgmTrack === trackId) {
        settings.selectedBgmTrack = 'lofi-chill';
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (bgmIsPlaying) {
        stopBackgroundMusic();
        setTimeout(() => startBackgroundMusic(), 100);
    }
}

export function startBackgroundMusic() {
    return; // Background music has been removed
}

function _playMp3Track(track) {
    try {
        // Stop any existing audio
        if (bgmAudioElement) {
            bgmAudioElement.pause();
            bgmAudioElement = null;
        }

        bgmAudioElement = new Audio(track.audioData);
        bgmAudioElement.loop = true;
        bgmAudioElement.volume = getBgmVolume() * 0.5;
        bgmAudioElement.play().catch(e => console.log('BGM autoplay blocked:', e));
        bgmIsPlaying = true;
    } catch (e) {
        console.log('MP3 playback not available:', e);
    }
}

function _playGeneratedTrack(track) {
    try {
        bgmContext = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = bgmContext.createGain();
        bgmGain.gain.setValueAtTime(getBgmVolume() * 0.08, bgmContext.currentTime);
        bgmGain.connect(bgmContext.destination);

        const chords = track.chords || PRESET_TRACKS[0].chords;
        const tempo = track.tempo || 4000;
        const waveform = track.waveform || 'sine';
        const filterFreq = track.filterFreq || 600;
        let chordIndex = 0;

        const playChord = () => {
            if (!bgmContext || bgmContext.state === 'closed') return;

            // Clear old oscillators
            bgmOscillators.forEach(o => { try { o.stop(); } catch { } });
            bgmOscillators = [];

            const chord = chords[chordIndex % chords.length];
            chordIndex++;

            chord.forEach((freq, i) => {
                const osc = bgmContext.createOscillator();
                const oscGain = bgmContext.createGain();
                const filter = bgmContext.createBiquadFilter();

                osc.type = waveform;
                osc.frequency.setValueAtTime(freq, bgmContext.currentTime);

                // Slight detuning for warmth
                osc.detune.setValueAtTime((Math.random() - 0.5) * 10, bgmContext.currentTime);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(filterFreq + i * 100, bgmContext.currentTime);

                const dur = tempo / 1000;
                oscGain.gain.setValueAtTime(0, bgmContext.currentTime);
                oscGain.gain.linearRampToValueAtTime(0.3, bgmContext.currentTime + dur * 0.12);
                oscGain.gain.linearRampToValueAtTime(0.15, bgmContext.currentTime + dur * 0.75);
                oscGain.gain.linearRampToValueAtTime(0, bgmContext.currentTime + dur);

                osc.connect(filter);
                filter.connect(oscGain);
                oscGain.connect(bgmGain);
                osc.start(bgmContext.currentTime);
                osc.stop(bgmContext.currentTime + dur + 0.5);
                bgmOscillators.push(osc);
            });
        };

        playChord();
        bgmInterval = setInterval(playChord, tempo);
        bgmIsPlaying = true;
    } catch (e) {
        console.log('Background music not available');
    }
}

export function stopBackgroundMusic() {
    bgmIsPlaying = false;

    // Stop MP3 audio element
    if (bgmAudioElement) {
        bgmAudioElement.pause();
        bgmAudioElement.currentTime = 0;
        bgmAudioElement = null;
    }

    // Stop generated music
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
    bgmOscillators.forEach(o => { try { o.stop(); } catch { } });
    bgmOscillators = [];
    if (bgmContext) {
        try { bgmContext.close(); } catch { }
        bgmContext = null;
    }
    bgmGain = null;
}

export function updateBgmVolume(newVolume) {
    // Update generated music volume
    if (bgmGain && bgmContext && bgmContext.state !== 'closed') {
        bgmGain.gain.setValueAtTime(newVolume * 0.08, bgmContext.currentTime);
    }
    // Update MP3 volume
    if (bgmAudioElement) {
        bgmAudioElement.volume = newVolume * 0.5;
    }
}

export function isBgmPlaying() {
    return bgmIsPlaying;
}

