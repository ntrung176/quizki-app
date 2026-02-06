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

// Play Audio - CHỈ phát audioBase64 từ Gemini TTS, không dùng Browser TTS/Google Translate
export const playAudio = (base64Data) => {
    if (!base64Data) {
        console.warn('playAudio: No base64Data provided');
        return;
    }

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

    try {
        // Phân biệt: nếu là base64 PCM raw từ Gemini TTS thì convert sang WAV
        // Nếu là base64 audio chuẩn (mp3, wav có header) thì dùng trực tiếp
        // Kiểm tra header: Data URI hoặc header audio file thực sự
        if (base64Data.startsWith('data:audio') || base64Data.startsWith('UklGR') || base64Data.startsWith('SUQz') || base64Data.startsWith('//uQ') || base64Data.startsWith('AAAA')) {
            // Đây là audio file hoàn chỉnh (mp3, wav) - dùng trực tiếp
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
            currentAudioObj.play().catch(e => console.error('Audio play error:', e));
        } else {
            // Đây là PCM raw từ Gemini TTS - cần convert sang WAV
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
            currentAudioObj.play().catch(e => console.error('Audio play error:', e));
        }
    } catch (e) {
        console.error('playAudio error:', e);
    }
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
