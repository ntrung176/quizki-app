// --- Audio utility functions ---

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

// Play Audio - với fallback sử dụng Web Speech API
export const playAudio = (base64Data, text = '') => {
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

    // Nếu có base64Data, phát audio
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
                    // Fallback to TTS if audio fails
                    speakWithTTS(text);
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
                    // Fallback to TTS if audio fails
                    speakWithTTS(text);
                });
            }
        } catch (e) {
            console.error('playAudio error:', e);
            // Fallback to TTS
            speakWithTTS(text);
        }
    } else if (text) {
        // Không có audio, dùng TTS
        speakWithTTS(text);
    }
};

// Fallback: Sử dụng Web Speech API để đọc text
const speakWithTTS = (text) => {
    if (!text || !window.speechSynthesis) return;

    // Lấy phần từ vựng (không có furigana)
    const cleanText = text.split('（')[0].split('(')[0].trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Tìm giọng tiếng Nhật
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }

    window.speechSynthesis.speak(utterance);
};

// Stop current audio
export const stopAudio = () => {
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
