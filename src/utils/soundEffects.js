/**
 * Sound Effects System for QuizKi App
 * Uses Web Audio API for programmatic sound generation
 * No external audio files needed
 */

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
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Pleasant ascending chime - C5, E5, G5
        const notes = [
            { freq: 523.25, start: 0, dur: 0.15 },
            { freq: 659.25, start: 0.08, dur: 0.15 },
            { freq: 783.99, start: 0.16, dur: 0.25 },
        ];

        notes.forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur);
        });

        // Sparkle overtone
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(1568, ctx.currentTime + 0.2);
        sparkleGain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
        sparkleGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.22);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(masterGain);
        sparkle.start(ctx.currentTime + 0.2);
        sparkle.stop(ctx.currentTime + 0.5);

        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        console.log('Sound not available');
    }
}

// ==================== INCORRECT ANSWER SOUND ====================
export function playIncorrectSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Descending buzz - dissonant interval
        const notes = [
            { freq: 330, start: 0, dur: 0.18 },
            { freq: 277, start: 0.12, dur: 0.25 },
        ];

        notes.forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime + start);

            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur);
        });

        setTimeout(() => ctx.close(), 800);
    } catch (e) {
        console.log('Sound not available');
    }
}

// ==================== FIREWORKS EFFECT (Visual + Sound) ====================
export function launchFireworks() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Firework launch whoosh
        const noise = ctx.createBufferSource();
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime);
        noiseFilter.frequency.linearRampToValueAtTime(6000, ctx.currentTime + 0.3);
        noiseFilter.Q.setValueAtTime(2, ctx.currentTime);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(ctx.currentTime);

        // Explosion pops
        for (let i = 0; i < 3; i++) {
            const pop = ctx.createOscillator();
            const popGain = ctx.createGain();
            const startTime = 0.3 + i * 0.15;
            pop.type = 'sine';
            pop.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime + startTime);
            pop.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + startTime + 0.1);

            popGain.gain.setValueAtTime(0.4, ctx.currentTime + startTime);
            popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.15);

            pop.connect(popGain);
            popGain.connect(masterGain);
            pop.start(ctx.currentTime + startTime);
            pop.stop(ctx.currentTime + startTime + 0.2);
        }

        // Sparkle cascade
        const sparkleNotes = [1047, 1175, 1319, 1397, 1568]; // C6 to G6
        sparkleNotes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = 0.5 + i * 0.06;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 0.3);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + 0.35);
        });

        setTimeout(() => ctx.close(), 2000);
    } catch (e) {
        console.log('Sound not available');
    }
}

// ==================== CLICK SOUND ====================
export function playClickSound() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
        setTimeout(() => ctx.close(), 200);
    } catch (e) { }
}

// ==================== COMPLETION FANFARE ====================
export function playCompletionFanfare() {
    if (!isSfxEnabled()) return;
    const volume = getSfxVolume();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Triumphant melody
        const notes = [
            { freq: 523.25, start: 0, dur: 0.12 },
            { freq: 587.33, start: 0.1, dur: 0.12 },
            { freq: 659.25, start: 0.2, dur: 0.12 },
            { freq: 783.99, start: 0.3, dur: 0.12 },
            { freq: 1046.50, start: 0.4, dur: 0.35 },
            { freq: 783.99, start: 0.8, dur: 0.08 },
            { freq: 1046.50, start: 0.9, dur: 0.5 },
        ];

        notes.forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2500, ctx.currentTime + start);

            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + start + 0.02);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + dur * 0.6);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        });

        setTimeout(() => ctx.close(), 2500);
    } catch (e) {
        console.log('Completion fanfare not available');
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
        color: 'from-purple-500 to-indigo-500',
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
        color: 'from-violet-500 to-purple-500',
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

// ==================== START BACKGROUND MUSIC ====================
export function startBackgroundMusic() {
    if (bgmIsPlaying) return;
    const settings = getSettings();
    if (settings.bgmEnabled === false) return;

    const trackId = getSelectedTrackId();
    const allTracks = getAllBgmTracks();
    const track = allTracks.find(t => t.id === trackId) || PRESET_TRACKS[0];

    if (track.type === 'mp3' && track.audioData) {
        _playMp3Track(track);
    } else {
        _playGeneratedTrack(track);
    }
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

