import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Mic, MicOff, Volume2, RotateCcw, CheckCircle2, AlertCircle, 
    Sparkles, Star, Trophy, Award, ArrowRight, Zap, RefreshCw, Loader2
} from 'lucide-react';
import FuriganaRenderer from './FuriganaRenderer';
import { playFocusCompleteSound, playCompletionFanfare } from '../../utils/soundEffects';
import { callWhisperSTT } from '../../utils/aiProvider';

const VideoKaiwaShadowingModal = ({
    isOpen,
    onClose,
    subtitle,
    allKeywords = [],
    onReplayAudio,
    awardXP
}) => {
    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [score, setScore] = useState(null); // null | number
    const [feedback, setFeedback] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [hasAwarded, setHasAwarded] = useState(false);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const micStreamRef = useRef(null);
    const hasGotSpeechResultRef = useRef(false);

    // Reset state on open/close
    useEffect(() => {
        if (!isOpen) {
            cleanupAudio();
            setSpokenText('');
            setInterimText('');
            setScore(null);
            setFeedback('');
            setErrorMessage('');
            setHasAwarded(false);
            setIsTranscribing(false);
        }
    }, [isOpen]);

    const cleanupAudio = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
            recognitionRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch (e) {}
            mediaRecorderRef.current = null;
        }
        if (micStreamRef.current) {
            try {
                micStreamRef.current.getTracks().forEach(track => track.stop());
            } catch (e) {}
            micStreamRef.current = null;
        }
        setIsListening(false);
    };

    if (!isOpen || !subtitle) return null;

    // Levenshtein distance for fuzzy matching
    const getLevenshteinDistance = (s1, s2) => {
        const m = s1.length, n = s2.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    };

    // Calculate similarity between Japanese text and spoken text
    const calculateSimilarity = (rawJa, rawFurigana, spoken) => {
        if (!spoken || !spoken.trim()) return 0;

        const clean = (str) => (str || '')
            .replace(/[、。！？\s\.,!?～〜ー・\(\)（）]/gu, '')
            .toLowerCase();

        const targetKanji = clean(rawJa.replace(/\{([^|]+)\|([^}]+)\}/g, '$1'));
        const targetKana = clean((rawFurigana || rawJa).replace(/\{([^|]+)\|([^}]+)\}/g, '$2'));
        const cleanSpoken = clean(spoken);

        if (!cleanSpoken) return 0;
        if (cleanSpoken === targetKanji || cleanSpoken === targetKana) return 100;

        const scoreTarget = (target) => {
            if (!target) return 0;
            if (target === cleanSpoken) return 100;
            if (target.includes(cleanSpoken) || cleanSpoken.includes(target)) {
                const ratio = Math.min(target.length, cleanSpoken.length) / Math.max(target.length, cleanSpoken.length);
                return Math.round(ratio * 100);
            }
            const dist = getLevenshteinDistance(target, cleanSpoken);
            const maxLen = Math.max(target.length, cleanSpoken.length);
            const similarity = Math.round((1 - dist / maxLen) * 100);
            return Math.max(0, similarity);
        };

        const scoreKanji = scoreTarget(targetKanji);
        const scoreKana = scoreTarget(targetKana);

        let charMatches = 0;
        for (let char of cleanSpoken) {
            if (targetKanji.includes(char) || targetKana.includes(char)) charMatches++;
        }
        const charScore = Math.round((charMatches / Math.max(targetKanji.length, cleanSpoken.length)) * 100);

        return Math.min(100, Math.max(scoreKanji, scoreKana, charScore));
    };

    // Process evaluated result
    const evaluateSpokenResult = (finalTranscript) => {
        const text = finalTranscript.trim();
        if (!text) return;

        setSpokenText(text);
        setInterimText('');

        const finalScore = calculateSimilarity(subtitle.ja, subtitle.furigana, text);
        setScore(finalScore);

        if (finalScore >= 80) {
            setFeedback('🎉 Tuyệt vời! Phát âm rất chuẩn xác, ngữ điệu tự nhiên.');
            playCompletionFanfare();
            if (awardXP && !hasAwarded) {
                awardXP(20);
                setHasAwarded(true);
            }
        } else if (finalScore >= 50) {
            setFeedback('👍 Khá tốt! Chú ý các trường âm, âm ngắt hoặc từ nối nhé.');
            playFocusCompleteSound();
            if (awardXP && !hasAwarded) {
                awardXP(10);
                setHasAwarded(true);
            }
        } else {
            setFeedback('💪 Hãy bấm "Nghe lại câu" rồi nhại lại to và rõ hơn nhé!');
        }
    };

    // Start recording & speech recognition
    const handleToggleListening = async () => {
        setErrorMessage('');

        if (isListening) {
            // User stops recording
            cleanupAudio();
            return;
        }

        try {
            hasGotSpeechResultRef.current = false;
            audioChunksRef.current = [];

            // 1. Get user media stream for MediaRecorder
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                }
            });
            micStreamRef.current = stream;

            // 2. Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // If Web Speech API already provided a valid transcription, no need to call Whisper
                if (hasGotSpeechResultRef.current) {
                    return;
                }

                // If no result from Web Speech API, use Whisper STT fallback
                if (audioBlob.size > 1000) {
                    setIsTranscribing(true);
                    try {
                        const whisperText = await callWhisperSTT(audioBlob, 'ja');
                        if (whisperText && whisperText.trim()) {
                            evaluateSpokenResult(whisperText);
                        } else {
                            setErrorMessage('Không nhận diện được giọng nói rõ ràng. Hãy thử đọc lại to hơn.');
                        }
                    } catch (err) {
                        console.warn('Whisper fallback error:', err);
                        setErrorMessage('Chưa nhận được âm thanh. Hãy thử nói lại to và rõ hơn.');
                    } finally {
                        setIsTranscribing(false);
                    }
                }
            };

            mediaRecorder.start();
            setIsListening(true);
            setSpokenText('');
            setInterimText('');
            setScore(null);
            setFeedback('');

            // 3. In parallel, run Web Speech API if supported
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    const recognition = new SpeechRecognition();
                    recognitionRef.current = recognition;
                    recognition.lang = 'ja-JP';
                    recognition.continuous = false;
                    recognition.interimResults = true;

                    recognition.onresult = (event) => {
                        let interim = '';
                        let final = '';

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            const res = event.results[i];
                            if (res.isFinal) {
                                final += res[0].transcript;
                            } else {
                                interim += res[0].transcript;
                            }
                        }

                        if (interim) {
                            setInterimText(interim);
                        }

                        if (final) {
                            hasGotSpeechResultRef.current = true;
                            evaluateSpokenResult(final);
                            cleanupAudio();
                        }
                    };

                    recognition.onerror = (e) => {
                        console.warn('Web Speech API event error (will rely on Whisper):', e.error);
                        // Do not block - MediaRecorder will transcribe audio automatically via Whisper
                    };

                    recognition.onend = () => {
                        if (isListening) {
                            cleanupAudio();
                        }
                    };

                    recognition.start();
                } catch (recErr) {
                    console.warn('SpeechRecognition start failed, using Whisper STT only:', recErr);
                }
            }
        } catch (err) {
            console.error('Failed to access microphone:', err);
            setIsListening(false);
            setErrorMessage('Không thể truy cập Microphone. Vui lòng cho phép quyền truy cập Micro trên trình duyệt của bạn.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            <Mic className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-white">Luyện Nói Shadowing AI</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Nghe câu mẫu và nhại lại chuẩn ngữ điệu</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Target Sentence Display Box (Clean, without top buttons) */}
                <div className="p-5 bg-slate-50 dark:bg-slate-950/70 border-2 border-[#f494bc]/60 dark:border-[#f494bc]/40 rounded-2xl space-y-2.5 text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#db2777] dark:text-[#f494bc] block">
                        CÂU MẪU CẦN ĐỌC
                    </span>

                    <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-loose py-1">
                        <FuriganaRenderer 
                            text={subtitle.furigana || subtitle.ja} 
                            showFurigana={true} 
                            keywords={allKeywords.length > 0 ? allKeywords : (subtitle.keywords || [])}
                        />
                    </div>

                    {/* Vietnamese translation */}
                    {subtitle.vi && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                            "{subtitle.vi}"
                        </p>
                    )}
                </div>

                {/* Live Listening Indicator / Transcribing / Result Box */}
                {isListening ? (
                    <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl text-center space-y-2 animate-pulse">
                        <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span>Đang lắng nghe giọng của bạn... Bấm dừng khi đọc xong</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[24px]">
                            {interimText || spokenText || '(Hãy đọc to câu tiếng Nhật phía trên...)'}
                        </p>
                    </div>
                ) : isTranscribing ? (
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span>Đang phân tích và chấm điểm phát âm...</span>
                        </div>
                    </div>
                ) : (spokenText || interimText) ? (
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl text-center space-y-2 animate-fade-in">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            KẾT QUẢ GIỌNG ĐỌC CỦA BẠN
                        </span>
                        <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                            "{spokenText || interimText}"
                        </p>

                        {score !== null && (
                            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                                    score >= 80 
                                        ? 'bg-emerald-500 text-white' 
                                        : score >= 50 
                                            ? 'bg-amber-500 text-slate-950' 
                                            : 'bg-rose-500 text-white'
                                }`}>
                                    Độ chính xác: {score}%
                                </span>
                                {hasAwarded && (
                                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                        <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> +{score >= 80 ? '20' : '10'} XP
                                    </span>
                                )}
                            </div>
                        )}

                        {feedback && (
                            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 pt-1">
                                {feedback}
                            </p>
                        )}
                    </div>
                ) : null}

                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Bottom Action Controls */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                    {onReplayAudio && (
                        <button
                            type="button"
                            onClick={onReplayAudio}
                            className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-800"
                        >
                            <RotateCcw className="w-4 h-4 text-indigo-500" />
                            <span>Nghe lại câu</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleToggleListening}
                        disabled={isTranscribing}
                        className={`flex-1 py-3 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                            isListening
                                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-500/30'
                                : isTranscribing
                                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 shadow-[0_6px_20px_rgba(244,148,188,0.4)] active:scale-98'
                        }`}
                    >
                        {isListening ? (
                            <>
                                <MicOff className="w-5 h-5" />
                                <span>Đang nghe... Bấm để dừng & chấm điểm</span>
                            </>
                        ) : isTranscribing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Đang xử lý âm thanh...</span>
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5" />
                                <span>{spokenText ? 'Thử nói lại' : 'Bấm để nói (Shadowing)'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaShadowingModal;
