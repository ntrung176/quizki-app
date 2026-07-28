import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MessageSquare, Mic, MicOff, Volume2, VolumeX, Eye, EyeOff, 
    ArrowLeft, Settings, Sparkle, AlertCircle, CheckCircle2, 
    Play, Send, RefreshCw, Star, Info, Languages, Radio,
    Activity, Zap, Award, Lightbulb, Volume1, X, ShieldAlert, Cpu, Terminal, Sparkles, Clock
} from 'lucide-react';
import { callKaiwaAI, parseJsonFromAI, callWhisperSTT, callOpenAITTS } from '../../utils/aiProvider';
import { ROUTES } from '../../router';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';

// Level configurations with futuristic Cyber gradients & HUD tags
const LEVELS = [
    { value: 'N5', label: 'JLPT N5', tag: 'NOVICE LEVEL', desc: 'Sơ cấp 1 (Chào hỏi, giao tiếp sinh hoạt cơ bản)', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
    { value: 'N4', label: 'JLPT N4', tag: 'ELEMENTARY LEVEL', desc: 'Sơ cấp 2 (Giao tiếp thường nhật & đời sống Nhật Bản)', gradient: 'from-cyan-500 via-sky-500 to-blue-500' },
    { value: 'N3', label: 'JLPT N3', tag: 'INTERMEDIATE LEVEL', desc: 'Trung cấp (Trao đổi quan điểm, công việc & tin tức)', gradient: 'from-blue-500 via-indigo-500 to-violet-500' },
    { value: 'N2', label: 'JLPT N2', tag: 'UPPER ADVANCED', desc: 'Thượng trung cấp (Bàn luận xã hội, chuyên môn & công sở)', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' },
    { value: 'N1', label: 'JLPT N1', tag: 'MASTERY LEVEL', desc: 'Cao cấp (Hội thoại chuyên sâu, thương mại & học thuật)', gradient: 'from-rose-500 via-pink-500 to-red-500' }
];

// Virtual Teachers with Cyber HUD Profiles
const TEACHERS = [
    {
        id: 'sakura',
        name: 'Sakura-sensei',
        gender: 'female',
        avatar: '🌸',
        role: 'Neural Voice Engine - Female',
        desc: 'Giọng đọc nhẹ nhàng, phát âm chuẩn Tokyo, tốc độ điều chỉnh linh hoạt. Phù hợp cấp độ N5 - N3.',
        systemName: 'Sakura-sensei'
    },
    {
        id: 'kenji',
        name: 'Kenji-sensei',
        gender: 'male',
        avatar: '💼',
        role: 'Neural Voice Engine - Male',
        desc: 'Phong cách chuẩn công sở & hội thoại tự nhiên của nam giới Nhật Bản. Phù hợp cấp độ N3 - N1.',
        systemName: 'Kenji-sensei'
    }
];

// Predefined Cyber Kaiwa Topics (Japanese)
const TOPICS = [
    { id: 'free_talk', name: '💬 Trò chuyện tự do (Free Talk)', desc: 'Tự do trao đổi về bất kỳ chủ đề đời sống, sở thích hay quan điểm nào.' },
    { id: 'convenience_store', name: '🏪 Mua sắm Konbini (🏪)', desc: 'Thanh toán, yêu cầu quay nóng đồ ăn, mua vé, giao tiếp nhanh tại Konbini.' },
    { id: 'interview', name: '🏢 Phỏng vấn Arubaito / Việc làm', desc: 'Tập trả lời các câu hỏi phỏng vấn xin việc làm thêm hoặc công sở Nhật.' },
    { id: 'restaurant', name: '🍕 Đặt bàn & Llamada nhà hàng', desc: 'Luyện đặt bàn trước, chọn món ăn, yêu cầu tách hóa đơn thanh toán.' },
    { id: 'asking_directions', name: '🗺️ Hỏi đường & Giao thông', desc: 'Hỏi đường ga tàu, di chuyển xe buýt, mua vé shinkansen.' },
    { id: 'school_life', name: '🏫 Học đường & Du học sinh', desc: 'Trò chuyện sinh hoạt trường lớp, câu lạc bộ, bài tập & bạn bè.' }
];

// English Kaiwa Configurations
const ENGLISH_LEVELS = [
    { value: 'A1_A2', label: 'CEFR A1 - A2', tag: 'ELEMENTARY', desc: 'Sơ cấp (Chào hỏi, giao tiếp cơ bản hàng ngày & mua sắm)', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
    { value: 'B1_B2', label: 'IELTS 5.5 - 6.5 / B1-B2', tag: 'INTERMEDIATE', desc: 'Trung cấp (Thảo luận chủ đề công việc, du lịch & quan điểm)', gradient: 'from-blue-500 via-indigo-500 to-violet-500' },
    { value: 'C1_C2', label: 'IELTS 7.0 - 8.5 / C1-C2', tag: 'ADVANCED', desc: 'Cao cấp (Hội thoại chuyên sâu, phỏng vấn quốc tế & học thuật)', gradient: 'from-rose-500 via-pink-500 to-red-500' },
];

const ENGLISH_TEACHERS = [
    {
        id: 'alex',
        name: 'Teacher Alex (US)',
        gender: 'male',
        avatar: '🗽',
        role: 'American Voice Accent',
        desc: 'Giọng Anh-Mỹ chuẩn New York, phong cách hiện đại, năng động & tự nhiên.',
        systemName: 'Alex'
    },
    {
        id: 'emma',
        name: 'Teacher Emma (UK)',
        gender: 'female',
        avatar: '👑',
        role: 'British Voice Accent',
        desc: 'Giọng Anh-Anh thanh lịch, phát âm chuẩn London, rõ ràng & trang trọng.',
        systemName: 'Emma'
    }
];

const ENGLISH_TOPICS = [
    { id: 'free_talk', name: '💬 Free Conversation', desc: 'Trao đổi tự do về cuộc sống, sở thích, âm nhạc và sở trường.' },
    { id: 'job_interview', name: '💼 Global Job Interview', desc: 'Luyện tập trả lời câu hỏi phỏng vấn công ty đa quốc gia & startup.' },
    { id: 'coffee_order', name: '☕ Coffee Shop & Restaurant', desc: 'Gọi đồ uống tại Starbucks, đặt bàn nhà hàng & yêu cầu thanh toán.' },
    { id: 'airport_travel', name: '✈️ Airport & Hotel Check-in', desc: 'Giao tiếp khi đi du lịch, thủ tục tại sân bay & khách sạn.' },
    { id: 'business_meeting', name: '📊 Business Presentation', desc: 'Thuyết trình ý tưởng, đàm phán hợp đồng & làm việc nhóm bằng Tiếng Anh.' },
];

const DAILY_KAIWA_LIMIT_SECONDS = 600; // 10 minutes limit per day

const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const JLPTKaiwaScreen = ({ profile, isAdmin }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isEnglishMode } = useTargetLanguage();

    const currentLevels = isEnglishMode ? ENGLISH_LEVELS : LEVELS;
    const currentTeachers = isEnglishMode ? ENGLISH_TEACHERS : TEACHERS;
    const currentTopics = isEnglishMode ? ENGLISH_TOPICS : TOPICS;
    
    // Core setup states
    const [step, setStep] = useState('setup'); // 'setup' | 'chat'
    const [level, setLevel] = useState(isEnglishMode ? 'B1_B2' : 'N3');
    const [teacher, setTeacher] = useState(isEnglishMode ? 'alex' : 'sakura');
    const [topic, setTopic] = useState('free_talk');
    
    // Premium Daily 10-Min Limit (Unlimited for Admin)
    const isUnlimited = isAdmin && !profile?.trialPricingTier;
    const [dailyUsedSeconds, setDailyUsedSeconds] = useState(() => {
        try {
            const todayKey = getTodayStr();
            const saved = localStorage.getItem(`quizki_kaiwa_used_${todayKey}`);
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    });
    const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);

    // Chat states
    const [conversation, setConversation] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputText, setInputText] = useState('');
    const [showTranslation, setShowTranslation] = useState(true);
    const [showFurigana, setShowFurigana] = useState(true);
    const [ttsRate, setTtsRate] = useState(1.0); // 0.8 | 1.0 | 1.2
    const [isMuted, setIsMuted] = useState(false);
    const [pendingCorrection, setPendingCorrection] = useState(null);
    
    // Hands-Free VAD Mode (Default OFF for clean control & safety)
    const [isHandsFree, setIsHandsFree] = useState(false); 
    const [showHandsFreeConfirm, setShowHandsFreeConfirm] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    // Audio/Speech states
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);

    // Active timer effect during Kaiwa chat
    useEffect(() => {
        if (step !== 'chat' || isUnlimited) return;

        if (dailyUsedSeconds >= DAILY_KAIWA_LIMIT_SECONDS) {
            setShowTimeLimitModal(true);
            return;
        }

        const interval = setInterval(() => {
            setDailyUsedSeconds(prev => {
                const nextSec = prev + 1;
                try {
                    localStorage.setItem(`quizki_kaiwa_used_${getTodayStr()}`, String(nextSec));
                } catch (e) {}

                if (nextSec >= DAILY_KAIWA_LIMIT_SECONDS) {
                    setShowTimeLimitModal(true);
                    if (audioRef.current) audioRef.current.pause();
                }
                return nextSec;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [step, isUnlimited]);

    // Web Audio API refs for VAD & Waveform

    // Web Audio API refs for VAD & Waveform
    const audioContextRef = useRef(null);
    const micAnalyserRef = useRef(null);
    const aiAnalyserRef = useRef(null);
    const micStreamRef = useRef(null);
    const vadFrameRef = useRef(null);
    const silenceStartRef = useRef(null);
    const speechStartRef = useRef(null);
    const recordingStartTimeRef = useRef(null);
    const isVadListeningRef = useRef(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const chatEndRef = useRef(null);
    const isRecordingRef = useRef(false);
    const audioRef = useRef(new Audio());

    // Check MediaRecorder support on mount & cleanup audio
    useEffect(() => {
        if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setSpeechSupported(false);
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            stopVadLoop();
        };
    }, []);

    // Keyboard Spacebar listener: Press & hold Spacebar to speak, release to send
    const isSpacePressedRef = useRef(false);

    useEffect(() => {
        if (step !== 'chat') return;

        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag === 'input' || tag === 'textarea') return;

                if (e.repeat) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                if (!isSpacePressedRef.current && !isGenerating && !isTranscribing && !isAiSpeaking) {
                    isSpacePressedRef.current = true;
                    startRecordingDirect();
                }
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag === 'input' || tag === 'textarea') return;

                e.preventDefault();
                if (isSpacePressedRef.current) {
                    isSpacePressedRef.current = false;
                    stopRecordingDirect();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [step, isGenerating, isTranscribing, isAiSpeaking]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation, isGenerating]);

    // Setup Web Audio API Context and Mic Analyser for VAD & Waveform
    // Setup Web Audio API Context and Mic Analyser for VAD & Waveform
    const initAudioContextAndMic = async () => {
        try {
            if (!audioContextRef.current) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioCtx();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (!micStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1
                    }
                });
                micStreamRef.current = stream;
                
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.35; // Fast decay for immediate silence response
                source.connect(analyser);
                micAnalyserRef.current = analyser;
            }
            return true;
        } catch (err) {
            console.warn('Could not initialize mic AudioContext:', err);
            return false;
        }
    };

    // Stop VAD loop & cleanup streams COMPLETELY
    const stopVadLoop = () => {
        isVadListeningRef.current = false;
        if (vadFrameRef.current) {
            cancelAnimationFrame(vadFrameRef.current);
            vadFrameRef.current = null;
        }
        if (micStreamRef.current) {
            try {
                micStreamRef.current.getTracks().forEach(t => t.stop());
            } catch (e) {
                console.warn('Error stopping mic tracks:', e);
            }
            micStreamRef.current = null;
        }
        micAnalyserRef.current = null;
    };

    // VAD (Voice Activity Detection) Continuous Listening Loop
    useEffect(() => {
        if (step !== 'chat' || !isHandsFree || isGenerating || isTranscribing || isAiSpeaking) {
            stopVadLoop();
            if (isRecordingRef.current) {
                stopRecordingDirect();
            }
            return;
        }

        let isCancelled = false;

        const startVadMonitoring = async () => {
            const hasMic = await initAudioContextAndMic();
            if (!hasMic || isCancelled || !isHandsFree) return;

            isVadListeningRef.current = true;
            silenceStartRef.current = null;
            speechStartRef.current = null;

            const checkVolume = () => {
                if (!isVadListeningRef.current || isCancelled || !isHandsFree) return;

                const analyser = micAnalyserRef.current;
                if (analyser) {
                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(dataArray);

                    // Focus on human vocal frequencies (~150Hz to ~4000Hz) to ignore ambient noise
                    const startBin = 1;
                    const endBin = Math.min(25, dataArray.length);
                    let vocalSum = 0;
                    for (let i = startBin; i < endBin; i++) {
                        vocalSum += dataArray[i] * dataArray[i];
                    }
                    const rms = Math.sqrt(vocalSum / (endBin - startBin));

                    const SILENCE_THRESHOLD = 26; // Raised threshold to filter out background room noise/fans
                    const MAX_SILENCE_DURATION = 650; // Cutoff recording in 0.65s after user stops speaking
                    const MAX_RECORDING_DURATION = 12000; 

                    if (rms > SILENCE_THRESHOLD) {
                        silenceStartRef.current = null;
                        if (!isRecordingRef.current) {
                            speechStartRef.current = Date.now();
                            startRecordingDirect();
                        } else {
                            if (recordingStartTimeRef.current && (Date.now() - recordingStartTimeRef.current > MAX_RECORDING_DURATION)) {
                                console.log('🎙️ VAD safety limit reached (12s max). Auto-stopping recording...');
                                stopRecordingDirect();
                            }
                        }
                    } else {
                        if (isRecordingRef.current) {
                            if (!silenceStartRef.current) {
                                silenceStartRef.current = Date.now();
                            } else if (Date.now() - silenceStartRef.current > MAX_SILENCE_DURATION) {
                                console.log('🎙️ VAD detected silence. Auto-stopping recording...');
                                stopRecordingDirect();
                            }
                        }
                    }
                }

                vadFrameRef.current = requestAnimationFrame(checkVolume);
            };

            checkVolume();
        };

        startVadMonitoring();

        return () => {
            isCancelled = true;
            stopVadLoop();
        };
    }, [step, isHandsFree, isGenerating, isTranscribing, isAiSpeaking]);

    // Handle Speech-to-Text direct recording triggers
    const startRecordingDirect = async () => {
        if (isRecordingRef.current || isGenerating || isTranscribing || isAiSpeaking) return;
        unlockAudio();
        if (!speechSupported) return;

        setIsRecording(true);
        isRecordingRef.current = true;
        setTranscript('🎙️ Đang lắng nghe giọng nói tiếng Nhật...');
        audioChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();

        try {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);

            let stream = micStreamRef.current;
            if (!stream || !stream.active) {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1
                    }
                });
                micStreamRef.current = stream;
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const recordingEndTime = Date.now();
                const durationSec = Math.max(1, Math.round((recordingEndTime - (recordingStartTimeRef.current || recordingEndTime)) / 1000));

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                if (audioBlob.size < 2500 || durationSec < 1) {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    setTranscript('');
                    return;
                }

                setIsTranscribing(true);
                setTranscript('⚡ Neural Whisper đang chuyển giọng nói thành văn bản...');
                try {
                    const text = await callWhisperSTT(audioBlob, isEnglishMode ? 'en' : 'ja');
                    const clean = text ? text.trim() : '';
                    
                    const hallucinations = [
                        'ご視聴ありがとうございました',
                        'ご視聴ありがとうございました。',
                        'チャンネル登録よろしくお願いします',
                        'チャンネル登録よろしくお願いします。',
                        '視聴していただきありがとうございました',
                        '視聴していただきありがとうございました。',
                        'お勧めします',
                        'お楽しみください',
                        'Subtitles by',
                        'Amara.org'
                    ];

                    const isHallucination = hallucinations.some(h => clean.includes(h) || h.includes(clean)) && clean.length < 30;

                    if (isHallucination || !clean) {
                        setTranscript('');
                        return;
                    }

                    handleSendUserMessage(clean, durationSec);
                } catch (err) {
                    console.error('Speech transcription failed:', err);
                    alert('Không thể chuyển giọng nói thành văn bản. Lỗi: ' + err.message);
                } finally {
                    setIsTranscribing(false);
                    setTranscript('');
                }
            };

            mediaRecorder.start();
        } catch (err) {
            console.error('Failed to start recording:', err);
            setIsRecording(false);
            isRecordingRef.current = false;
            setTranscript('');
        }
    };

    const stopRecordingDirect = () => {
        if (!isRecordingRef.current) return;
        setIsRecording(false);
        isRecordingRef.current = false;

        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        } catch (e) {
            console.warn('Error stopping media recorder:', e);
        }
    };

    const startRecording = (e) => {
        if (e) e.preventDefault();
        startRecordingDirect();
    };

    const stopRecording = (e) => {
        if (e) e.preventDefault();
        stopRecordingDirect();
    };

    // Find English voice
    const getBestEnglishVoice = (gender) => {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        if (enVoices.length === 0) return null;

        if (gender === 'female') {
            let voice = enVoices.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('emma') || v.name.toLowerCase().includes('female'));
            if (voice) return voice;
        } else {
            let voice = enVoices.find(v => v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('alex') || v.name.toLowerCase().includes('male'));
            if (voice) return voice;
        }
        return enVoices[0];
    };

    // Find Japanese voice
    const getBestJapaneseVoice = (gender) => {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang === 'ja_JP');
        if (jaVoices.length === 0) return null;

        if (gender === 'female') {
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('nanami') && v.name.toLowerCase().includes('online'));
            if (voice) return voice;
            voice = jaVoices.find(v => v.name.toLowerCase().includes('google') || v.name.includes('日本語'));
            if (voice) return voice;
            voice = jaVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('sakura') || v.name.toLowerCase().includes('haruka'));
            if (voice) return voice;
        } else {
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('keita') && v.name.toLowerCase().includes('online'));
            if (voice) return voice;
            voice = jaVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('kenji') || v.name.toLowerCase().includes('keita'));
            if (voice) return voice;
        }
        return jaVoices[0];
    };

    // Text-to-Speech (TTS) Reader
    const speakText = async (text) => {
        if (isMuted || !text) return;
        setIsAiSpeaking(true);

        // Safety fallback timer so UI audio state is NEVER stuck on mobile devices
        const maxDurationMs = Math.min(12000, Math.max(3500, text.length * 180));
        const safetyTimer = setTimeout(() => {
            setIsAiSpeaking(false);
        }, maxDurationMs);

        const clearSafety = () => {
            clearTimeout(safetyTimer);
            setIsAiSpeaking(false);
        };
        
        // Strip out furigana reading brackets completely for TTS
        const cleanText = text.replace(/([^\s\[\]]+)\[([^\]]+)\]/g, '$1').replace(/\[[^\]]+\]/g, '');
        const selectedTeacher = currentTeachers.find(t => t.id === teacher) || currentTeachers[0];
        const gender = selectedTeacher ? selectedTeacher.gender : 'female';

        try {
            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audioUrl = await callOpenAITTS(cleanText, gender, isEnglishMode ? 'en' : 'ja');
            if (!audioUrl) {
                throw new Error('No premium neural TTS key configured');
            }
            
            audioRef.current.src = audioUrl;
            audioRef.current.playbackRate = ttsRate;
            audioRef.current.onended = clearSafety;
            audioRef.current.onerror = clearSafety;

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Autoplay blocked on mobile, attempting WebSpeech fallback:', err);
                    fallbackWebSpeech(cleanText, gender, clearSafety);
                });
            }
        } catch (err) {
            console.log('Neural TTS fallback to WebSpeech:', err.message);
            fallbackWebSpeech(cleanText, gender, clearSafety);
        }
    };

    const fallbackWebSpeech = (cleanText, gender, onDone) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = isEnglishMode ? (teacher === 'emma' ? 'en-GB' : 'en-US') : 'ja-JP';
                utterance.rate = ttsRate;
                utterance.onend = onDone;
                utterance.onerror = onDone;

                const voice = isEnglishMode ? getBestEnglishVoice(gender) : getBestJapaneseVoice(gender);
                if (voice) utterance.voice = voice;

                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.warn('WebSpeech error:', e);
                onDone();
            }
        } else {
            onDone();
        }
    };

    // Unlock browser audio context
    const unlockAudio = () => {
        if (audioRef.current && !audioRef.current.src) {
            audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
            audioRef.current.play().catch((e) => console.log('Audio unlock check:', e.message));
        }
    };

    // Parse Furigana for HTML output with exact Kanji-to-Reading alignment
    const formatFurigana = (text) => {
        if (!text) return '';
        if (!showFurigana) {
            return text.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf\w]+)\[([^\]]+)\]/g, '$1').replace(/\[[^\]]+\]/g, '');
        }
        // Match ONLY Kanji or Alphanumeric characters immediately preceding [furigana] bracket
        if (isEnglishMode) return text;
        return text.replace(
            /([\u4e00-\u9faf\u3005\u3400-\u4dbf\w]+)\[([^\]]+)\]/g, 
            '<ruby class="inline-ruby mx-0.5">$1<rt class="text-[10px] font-bold select-none text-rose-600 dark:text-rose-400 leading-none">$2</rt></ruby>'
        );
    };

    // Helper to start the Kaiwa session
    const handleStartConversation = async () => {
        unlockAudio();
        setStep('chat');
        setIsGenerating(true);
        setConversation([]);
        setPendingCorrection(null);

        const selectedTeacher = currentTeachers.find(t => t.id === teacher) || currentTeachers[0];
        const selectedTopic = currentTopics.find(t => t.id === topic) || currentTopics[0];

        let systemPrompt = '';
        if (isEnglishMode) {
            systemPrompt = `You are a friendly, encouraging native English conversation teacher named ${selectedTeacher.name}.
            You are conducting a 1:1 conversation with an English learner.
            Mandatory Requirements:
            1. Student English level: ${level}. Use vocabulary and grammar appropriate for this level.
            2. Role & Tone: Polite, warm, encouraging, patient native English speaker.
            3. Topic: ${selectedTopic.name} - ${selectedTopic.desc}.
            4. Length restriction: Teacher's reply ("replyJa") MUST be concise and natural (1-2 short sentences, 15-25 words max), just like a real casual conversation.
            5. For this FIRST message, send a warm greeting, introduce yourself as ${selectedTeacher.name}, mention today's conversation topic, and ask a short open question to prompt the student.
            
            Response Format: Return ONLY a valid JSON object matching this structure (no markdown backticks, no extra text):
            {
              "replyJa": "Teacher's English response text",
              "replyVi": "Bản dịch tiếng Việt tự nhiên",
              "feedback": {
                "hasError": false,
                "userOriginal": "",
                "correctedJa": "",
                "explanationVi": ""
              },
              "suggestions": [
                "2 to 3 short English response suggestions for the student"
              ]
            }`;
        } else {
            systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
            Bạn sẽ thực hiện hội thoại 1:1 với người học.
            Yêu cầu bắt buộc:
            1. Cấp độ JLPT hội thoại của học viên: ${level}. Chỉ sử dụng từ vựng và ngữ pháp phù hợp với cấp độ này.
            2. Tông giọng và vai trò của bạn: Là một giáo viên tiếng Nhật bản xứ thân thiện, lịch sự (sử dụng kính ngữ desu/masu thích hợp), kiên nhẫn.
            3. Chủ đề hội thoại: ${selectedTopic.name} - ${selectedTopic.desc}.
            4. Yêu cầu về độ dài: Câu nói của giáo viên ("replyJa") phải cực kỳ ngắn gọn, súc tích (1-2 câu ngắn, tối đa 20-30 ký tự), tự nhiên như đang trò chuyện đời thường.
            5. Đối với tin nhắn đầu tiên này, hãy gửi một lời chào ấm áp ngắn gọn, giới thiệu bản thân là ${selectedTeacher.name}, nhắc đến chủ đề cuộc hội thoại hôm nay và hỏi một câu hỏi mở thật ngắn phù hợp với chủ đề để học viên trả lời.
            
            Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không chứa markdown backticks, không chứa văn bản thừa):
            {
              "replyJa": "Nội dung câu nói của giáo viên bằng tiếng Nhật kèm Furigana dạng Chữ[Furigana]. Ví dụ: 私[わたし]",
              "replyVi": "Bản dịch tiếng Việt tự nhiên",
              "feedback": {
                "hasError": false,
                "userOriginal": "",
                "correctedJa": "",
                "explanationVi": ""
              },
              "suggestions": [
                "2 đến 3 câu gợi ý phản xạ ngắn phù hợp"
              ]
            }`;
        }

        try {
            const resultText = await callKaiwaAI(systemPrompt, [], "Bắt đầu hội thoại.");
            const parsed = parseJsonFromAI(resultText);
            
            if (parsed && parsed.replyJa) {
                const aiMsg = {
                    sender: 'ai',
                    textJa: parsed.replyJa,
                    textVi: parsed.replyVi,
                    suggestions: parsed.suggestions || [],
                    feedback: null
                };
                setConversation([aiMsg]);
                speakText(parsed.replyJa);
            } else {
                throw new Error('AI response empty or missing replyJa');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            setConversation([{
                sender: 'ai',
                textJa: isEnglishMode ? "Hello! It seems there was a network connection issue. Please try again." : 'こんにちは！接続に問題が発生したようです。もう一度やり直してください。',
                textVi: 'Xin chào! Đã xảy ra lỗi kết nối. Vui lòng thử lại.',
                suggestions: []
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Helper to send message to AI
    const handleSendUserMessage = async (textToSend, speakDurationSec = null) => {
        unlockAudio();
        const messageText = textToSend || inputText;
        if (!messageText.trim()) return;

        setInputText('');
        setTranscript('');

        const charCount = messageText.length;
        const durationSec = speakDurationSec || Math.max(2, Math.round(charCount / 4));
        const wpm = Math.round((charCount / durationSec) * 15); 

        const userMsg = {
            sender: 'user',
            textJa: messageText,
            textVi: '',
            feedback: null,
            stats: {
                durationSec,
                charCount,
                wpm,
                fluencyScore: Math.min(98, Math.max(70, 75 + Math.round(wpm / 3))),
                fluencyLabel: wpm > 80 ? 'Rất trôi chảy' : wpm > 45 ? 'Trôi chảy tự nhiên' : 'Cần tăng tốc độ',
                pronunciationNotes: 'Ngữ điệu tự nhiên'
            }
        };

        const updatedHistory = [...conversation, userMsg];
        setConversation(updatedHistory);
        setIsGenerating(true);

        const selectedTeacher = currentTeachers.find(t => t.id === teacher) || currentTeachers[0];
        const selectedTopic = currentTopics.find(t => t.id === topic) || currentTopics[0];

        let systemPrompt = '';
        if (isEnglishMode) {
            if (pendingCorrection) {
                systemPrompt = `You are an AI English native conversation teacher named ${selectedTeacher.name}.
                The student just re-read or re-typed their response to fix a previous error.
                - Previous incorrect response: "${pendingCorrection.original}"
                - Target correct sentence student was asked to repeat: "${pendingCorrection.corrected}"
                - Student's current response: "${messageText}"
                
                Mandatory rules:
                1. Check if the student's current response "${messageText}" fixed the error compared to "${pendingCorrection.corrected}".
                2. IF STUDENT FIXED THE ERROR CORRECTLY:
                   - "feedback.hasError" is false.
                   - "replyJa": Short praise in English (e.g. "Great job! You said that perfectly!") PLUS 1 short follow-up question to CONTINUE the conversation on topic: ${selectedTopic.name}.
                   - "speechAnalytics": { "fluencyScore": 92, "fluencyLabel": "Great correction", "pronunciationTips": "Corrected sentence clearly and accurately!" }
                   - "suggestions": Create exactly 3 new response suggestions for your new follow-up question.
                3. IF STUDENT STILL MADE A MISTAKE:
                   - "feedback.hasError" is true.
                   - "feedback.userOriginal" is "${messageText}".
                   - "feedback.correctedJa" is "${pendingCorrection.corrected}".
                   - "feedback.explanationVi" explains the mistake in Vietnamese concisely.
                   - "replyJa": Ask the student to try reading the correct sentence again "${pendingCorrection.corrected}". DO NOT ask a new question.
                   - "suggestions": [ "${pendingCorrection.corrected}", "${pendingCorrection.corrected}", "${pendingCorrection.corrected}" ]
                
                Response Format: Return ONLY a valid JSON object:
                {
                  "replyJa": "Teacher's English message",
                  "replyVi": "Bản dịch tiếng Việt",
                  "feedback": { "hasError": true/false, "userOriginal": "...", "correctedJa": "...", "explanationVi": "..." },
                  "suggestions": [ "Suggestion 1", "Suggestion 2", "Suggestion 3" ],
                  "speechAnalytics": { "fluencyScore": 92, "fluencyLabel": "...", "pronunciationTips": "..." }
                }`;
            } else {
                systemPrompt = `You are an AI English conversation teacher named ${selectedTeacher.name}.
                1:1 conversation for CEFR level: ${level}. Topic: ${selectedTopic.name}.
                
                Response processing steps:
                1. Analyze student's response: "${messageText}" (speaking duration: ${durationSec} seconds).
                2. Check if student made grammar, vocabulary, or expression errors:
                   - IF STUDENT MADE A MISTAKE:
                     + "feedback.hasError" is true.
                     + "correctedJa": natural, correct English sentence.
                     + "explanationVi": short explanation in Vietnamese.
                     + "replyJa": Request student to re-read/repeat the corrected sentence "${messageText}" -> [correctedJa]. DO NOT ask a new question yet.
                     + "suggestions": [ "[correctedJa]", "[correctedJa]", "[correctedJa]" ]
                   - IF STUDENT SPOKE CORRECTLY (NO ERRORS):
                     + "feedback.hasError" is false.
                     + "replyJa": Natural response + 1 short follow-up question (1-2 sentences).
                     + "suggestions": Create 3 new English response suggestions for your follow-up question.
                3. Evaluate speech analytics in "speechAnalytics":
                   - "fluencyScore": Score 0-100.
                   - "fluencyLabel": Short label ("Excellent" | "Fluent" | "Natural" | "Needs Practice").
                   - "pronunciationTips": Short tip in Vietnamese.
                
                Response Format: Return ONLY a valid JSON object:
                {
                  "replyJa": "Teacher's English message",
                  "replyVi": "Bản dịch tiếng Việt tương ứng",
                  "feedback": { "hasError": true/false, "userOriginal": "...", "correctedJa": "...", "explanationVi": "..." },
                  "suggestions": [ "Suggestion 1", "Suggestion 2", "Suggestion 3" ],
                  "speechAnalytics": { "fluencyScore": 88, "fluencyLabel": "Fluent", "pronunciationTips": "..." }
                }`;
            }
        } else {
            if (pendingCorrection) {
                systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
                Học viên vừa đọc/phát âm lại câu để sửa lỗi.
                - Câu sai trước đó: "${pendingCorrection.original}"
                - Câu sửa đúng yêu cầu học viên phải đọc lại: "${pendingCorrection.corrected}"
                - Câu học viên vừa đọc/gửi: "${messageText}"
                
                Quy trình bắt buộc:
                1. Kiểm tra câu học viên vừa đọc "${messageText}" đã sửa đúng theo câu chuẩn "${pendingCorrection.corrected}" chưa.
                2. NẾU HỌC VIÊN ĐÃ ĐỌC/SỬA ĐÚNG:
                   - "feedback.hasError" là false.
                   - "replyJa": 1 câu ngắn khen học viên đã đọc đúng (ví dụ: "素晴らしい！正しく言えましたね。") KÈM THEO 1 câu hỏi ngắn tiếp theo để TIẾP TỤC cuộc hội thoại chủ đề ${selectedTopic.name}.
                   - "speechAnalytics": { "fluencyScore": 92, "fluencyLabel": "Sửa lỗi xuất sắc", "pronunciationTips": "Đã phát âm và sửa câu chuẩn xác!" }
                   - "suggestions": BẮT BUỘC LUÔN TẠO ĐÚNG 3 CÂU GỢI Ý TRẢ LỜI MỚI (tiếng Nhật kèm Furigana dạng Chữ[Furigana]) cho câu hỏi tiếp theo bạn vừa hỏi.
                3. NẾU HỌC VIÊN ĐỌC VẪN SAI / CHƯA ĐÚNG:
                   - "feedback.hasError" là true.
                   - "feedback.userOriginal" là "${messageText}".
                   - "feedback.correctedJa" là "${pendingCorrection.corrected}".
                   - "feedback.explanationVi" giải thích lỗi phát âm/dùng từ bằng tiếng Việt.
                   - "replyJa": Yêu cầu học viên thử đọc lại câu đúng "${pendingCorrection.corrected}". TUYỆT ĐỐI KHÔNG hỏi câu mới.
                   - "suggestions": [ "${pendingCorrection.corrected}", "${pendingCorrection.corrected}", "${pendingCorrection.corrected}" ]
                
                Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON:
                {
                  "replyJa": "Nội dung câu nói của giáo viên kèm Furigana dạng Chữ[Furigana]",
                  "replyVi": "Bản dịch tiếng Việt",
                  "feedback": { "hasError": true/false, "userOriginal": "...", "correctedJa": "...", "explanationVi": "..." },
                  "suggestions": [
                    "Gợi ý 1 mới cho câu hỏi tiếp theo",
                    "Gợi ý 2 mới cho câu hỏi tiếp theo",
                    "Gợi ý 3 mới cho câu hỏi tiếp theo"
                  ],
                  "speechAnalytics": { "fluencyScore": 92, "fluencyLabel": "...", "pronunciationTips": "..." }
                }`;
            } else {
                systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
                Hội thoại 1:1 cấp độ JLPT: ${level}. Chủ đề: ${selectedTopic.name}.
                
                Quy trình xử lý phản hồi:
                1. Phân tích câu nói của học viên: "${messageText}" (thời gian nói: ${durationSec} giây).
                2. Kiểm tra xem học viên có mắc lỗi ngữ pháp, dùng từ sai hoặc phát âm/diễn đạt chưa tự nhiên không:
                   - QUAN TRỌNG - NẾU HỌC VIÊN CÓ LỖI SAI:
                     + "feedback.hasError" là true.
                     + "correctedJa": chứa câu tiếng Nhật chuẩn (kèm Furigana dạng Chữ[Furigana]).
                     + "explanationVi": giải thích lỗi bằng tiếng Việt ngắn gọn.
                     + "replyJa": BẮT BUỘC chỉ yêu cầu học viên đọc/phát âm lại câu đúng "${messageText}" -> [correctedJa]. TUYỆT ĐỐI KHÔNG HỎI CÂU MỚI, KHÔNG CHUYỂN CHỦ ĐỀ. Bắt buộc để học viên phát âm sửa lỗi trước.
                     + "suggestions": [ "[correctedJa]", "[correctedJa]", "[correctedJa]" ]
                   - NẾU HỌC VIÊN NÓI CHUẨN (KHÔNG CÓ LỖI):
                     + "feedback.hasError" là false.
                     + "replyJa": Phản hồi tự nhiên + hỏi câu tiếp theo ngắn gọn (1-2 câu).
                     + "suggestions": BẮT BUỘC LUÔN TẠO ĐÚNG 3 CÂU GỢI Ý TRẢ LỜI MỚI (tiếng Nhật kèm Furigana dạng Chữ[Furigana]) cho câu hỏi bạn vừa hỏi.
                3. Đánh giá độ trôi chảy và nhận xét phát âm trong "speechAnalytics":
                   - "fluencyScore": Điểm 0-100.
                   - "fluencyLabel": Nhãn ngắn ("Xuất sắc" | "Trôi chảy" | "Tự nhiên" | "Cần chú ý").
                   - "pronunciationTips": Nhận xét 1 câu ngắn bằng tiếng Việt.
                
                Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON:
                {
                  "replyJa": "Nội dung câu nói của giáo viên bằng tiếng Nhật kèm Furigana dạng Chữ[Furigana]",
                  "replyVi": "Bản dịch tiếng Việt tương ứng",
                  "feedback": {
                    "hasError": true hoặc false,
                    "userOriginal": "câu gốc học viên",
                    "correctedJa": "câu sửa tiếng Nhật nếu error",
                    "explanationVi": "lời khuyên nếu error"
                  },
                  "suggestions": [
                    "Gợi ý 1 mới cho câu hỏi tiếp theo",
                    "Gợi ý 2 mới cho câu hỏi tiếp theo",
                    "Gợi ý 3 mới cho câu hỏi tiếp theo"
                  ],
                  "speechAnalytics": {
                    "fluencyScore": 88,
                    "fluencyLabel": "Trôi chảy",
                    "pronunciationTips": "Phát âm rõ ràng, ngữ điệu tự nhiên"
                  }
                }`;
            }
        }

        const historyForAI = conversation.map(msg => ({
            role: msg.sender === 'ai' ? 'assistant' : 'user',
            content: msg.textJa
        }));

        try {
            const resultText = await callKaiwaAI(systemPrompt, historyForAI, messageText);
            const parsed = parseJsonFromAI(resultText);

            if (parsed) {
                if (parsed.feedback && parsed.feedback.hasError) {
                    setConversation(prev => {
                        const next = [...prev];
                        const lastUserIdx = next.map(m => m.sender).lastIndexOf('user');
                        if (lastUserIdx !== -1) {
                            next[lastUserIdx].feedback = parsed.feedback;
                            if (parsed.speechAnalytics) {
                                next[lastUserIdx].stats.fluencyScore = parsed.speechAnalytics.fluencyScore || 75;
                                next[lastUserIdx].stats.fluencyLabel = parsed.speechAnalytics.fluencyLabel || 'Cần chú ý';
                                next[lastUserIdx].stats.pronunciationNotes = parsed.speechAnalytics.pronunciationTips || 'Cần điều chỉnh câu';
                            }
                        }
                        return next;
                    });
                    setPendingCorrection({
                        original: parsed.feedback.userOriginal || messageText,
                        corrected: parsed.feedback.correctedJa,
                        explanation: parsed.feedback.explanationVi
                    });
                } else {
                    setPendingCorrection(null);
                    if (parsed.speechAnalytics) {
                        setConversation(prev => {
                            const next = [...prev];
                            const lastUserIdx = next.map(m => m.sender).lastIndexOf('user');
                            if (lastUserIdx !== -1) {
                                next[lastUserIdx].stats.fluencyScore = parsed.speechAnalytics.fluencyScore || 90;
                                next[lastUserIdx].stats.fluencyLabel = parsed.speechAnalytics.fluencyLabel || 'Trôi chảy';
                                next[lastUserIdx].stats.pronunciationNotes = parsed.speechAnalytics.pronunciationTips || 'Phát âm chuẩn xác';
                            }
                            return next;
                        });
                    }
                }

                // Ensure suggestions array is never empty
                let finalSuggestions = parsed.suggestions;
                if (!Array.isArray(finalSuggestions) || finalSuggestions.length === 0) {
                    if (parsed.feedback && parsed.feedback.hasError && parsed.feedback.correctedJa) {
                        finalSuggestions = [parsed.feedback.correctedJa, parsed.feedback.correctedJa, parsed.feedback.correctedJa];
                    } else {
                        finalSuggestions = [
                            "はい、わかりました。",
                            "そうですね。詳しく教[おし]えてください。",
                            "もう一[いち]度[ど]お願[ねが]いします。"
                        ];
                    }
                }

                const aiReply = {
                    sender: 'ai',
                    textJa: parsed.replyJa,
                    textVi: parsed.replyVi,
                    suggestions: finalSuggestions,
                    feedback: null
                };
                setConversation(prev => [...prev, aiReply]);
                speakText(parsed.replyJa);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setConversation(prev => [...prev, {
                sender: 'ai',
                textJa: 'すみません、もう一度言っていただくか、メッセージを再送信してください。',
                textVi: 'Xin lỗi, bạn có thể nói lại hoặc gửi lại tin nhắn được không?',
                suggestions: [
                    "はい、わかりました。",
                    "そうですね。詳しく教[おし]えてください。",
                    "もう一[いち]度[ど]お願[ねが]いします。"
                ]
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Quit session safely
    const handleQuit = async () => {
        if (await window.showConfirm('Bạn có chắc chắn muốn dừng buổi luyện tập Kaiwa này không? Lịch sử cuộc hội thoại sẽ không được lưu.', { type: 'warning' })) {
            window.speechSynthesis.cancel();
            stopVadLoop();
            if (isRecordingRef.current) {
                stopRecordingDirect();
            }
            setStep('setup');
            setConversation([]);
            setPendingCorrection(null);
            setIsHandsFree(false);
        }
    };

    return (
        <>
        <div className="w-full min-h-[calc(100vh-70px)] flex flex-col justify-start py-6 px-3 md:px-6 relative overflow-hidden font-sans text-slate-800 dark:text-slate-100 selection:bg-cyan-500 selection:text-white">

            {step === 'setup' ? (
                /* SIMPLIFIED ELEVATED SETUP PANEL */
                <div className="w-full max-w-3xl mx-auto space-y-6 relative z-10 py-2">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                            <span>{isEnglishMode ? 'AI VOICE SPEAKING AGENT' : 'NEURAL KAIWA AGENT'}</span>
                        </div>

                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {isEnglishMode ? 'Phòng Luyện Nói Tiếng Anh AI' : 'Phòng Kaiwa AI Bản Xứ'}
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm max-w-lg mx-auto font-medium">
                            Luyện phản xạ giao tiếp tự nhiên và nhận phản hồi trực tiếp từ Giáo viên AI.
                        </p>
                    </div>

                    {/* Single Unified Configuration Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 shadow-xl space-y-6">
                        {/* 1. TEACHER SELECTION */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500" />
                                <span>1. Chọn Giáo Viên AI</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {currentTeachers.map((tc) => {
                                    const isSelected = teacher === tc.id;
                                    return (
                                        <button
                                            key={tc.id}
                                            onClick={() => setTeacher(tc.id)}
                                            className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                                                isSelected
                                                    ? 'border-cyan-500 bg-cyan-50/80 dark:border-cyan-500 dark:bg-cyan-950/60 shadow-md ring-1 ring-cyan-500/30'
                                                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <span className="text-2xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                                {tc.avatar}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                                                    {tc.name}
                                                </h4>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                                    {tc.gender === 'female' ? 'Giọng Nữ nhẹ nhàng' : 'Giọng Nam tự nhiên'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. LEVEL SELECTION (Pills Bar) */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Languages className="w-4 h-4 text-cyan-500" />
                                <span>2. Trình Độ Cấp Độ</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {currentLevels.map((lvl) => {
                                    const isSelected = level === lvl.value;
                                    return (
                                        <button
                                            key={lvl.value}
                                            onClick={() => setLevel(lvl.value)}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex-1 min-w-[100px] text-center border ${
                                                isSelected
                                                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 border-transparent shadow-md scale-[1.02]'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
                                            }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. TOPIC SELECTION */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                <span>3. Chủ Đề Trò Chuyện</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {currentTopics.map((tpc) => {
                                    const isSelected = topic === tpc.id;
                                    return (
                                        <button
                                            key={tpc.id}
                                            onClick={() => setTopic(tpc.id)}
                                            className={`p-3 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-50/80 dark:border-cyan-400 dark:bg-cyan-950/60 font-bold shadow-sm'
                                                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {tpc.name}
                                            </span>
                                            {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-cyan-400 shrink-0"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* START BUTTON */}
                    <div className="flex justify-center pt-1">
                        <button
                            onClick={handleStartConversation}
                            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-sky-500 text-white font-black text-sm md:text-base tracking-wide shadow-xl shadow-cyan-500/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 border border-cyan-400/30"
                        >
                            <Play className="w-5 h-5 fill-white" />
                            <span>BẮT ĐẦU TRÒ CHUYỆN AI</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* FIXED HEIGHT CHAT PANEL WITH STICKY FOOTER */
                <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-90px)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-cyan-500/30 shadow-2xl relative overflow-hidden z-10">
                    {/* Sci-Fi Top Cyber Terminal Header */}
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between bg-slate-50 dark:bg-slate-950 relative z-20 gap-3 shrink-0">
                        {/* Teacher & Session Info */}
                        <div className="flex items-center gap-3.5">
                            <button
                                onClick={handleQuit}
                                className="p-2 rounded-xl bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-750 transition-colors cursor-pointer"
                                title="Thoát phòng học"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-cyan-500/40 flex items-center justify-center text-xl shadow-sm">
                                        {currentTeachers.find(t => t.id === teacher)?.avatar}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${isAiSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-emerald-500'}`}></span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm font-mono">
                                            {currentTeachers.find(t => t.id === teacher)?.name}
                                        </h3>
                                        <span className="text-[10px] font-mono text-indigo-700 dark:text-cyan-400 bg-indigo-50 dark:bg-cyan-950/60 border border-indigo-200 dark:border-cyan-800/60 px-1.5 py-0.2 rounded font-bold">
                                            AI CORE
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                        {isEnglishMode ? `Level ${level}` : `JLPT ${level}`} • {currentTopics.find(t => t.id === topic)?.name.split(' ')[1] || 'Free Talk'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Controls HUD Panel */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Daily Time Limit HUD Badge */}
                            {!isUnlimited ? (
                                <div 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold shadow-xs"
                                    title="Giới hạn 10 phút luyện Kaiwa mỗi ngày cho tài khoản Premium"
                                >
                                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    <span>Thử nghiệm: {formatTime(Math.max(0, DAILY_KAIWA_LIMIT_SECONDS - dailyUsedSeconds))}</span>
                                </div>
                            ) : (
                                <div 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold shadow-xs"
                                    title="Tài khoản Quản trị viên không giới hạn thời lượng Kaiwa"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Admin: Không giới hạn</span>
                                </div>
                            )}
                            {/* Hands-Free VAD Mode Toggle Button */}
                            <button
                                onClick={() => {
                                    if (!isHandsFree) {
                                        // Turning ON: show confirmation first
                                        setShowHandsFreeConfirm(true);
                                    } else {
                                        // Turning OFF: stop immediately
                                        stopVadLoop();
                                        if (isRecordingRef.current) stopRecordingDirect();
                                        setIsHandsFree(false);
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                                    isHandsFree 
                                        ? 'bg-cyan-500 text-white dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500 dark:border-cyan-400 shadow-md animate-pulse' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                                title="Bật/Tắt chế độ rảnh tay tự động nhận diện giọng nói"
                            >
                                <Radio className={`w-3.5 h-3.5 ${isHandsFree ? 'text-white dark:text-cyan-400 animate-spin-slow' : 'text-slate-500 dark:text-slate-400'}`} />
                                <span>{isHandsFree ? '⚡ HANDS-FREE VAD: ON' : '🎙️ PUSH-TO-TALK MODE'}</span>
                            </button>

                            {/* Furigana Toggle */}
                            <button
                                onClick={() => setShowFurigana(prev => !prev)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                                    showFurigana 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-200 dark:border-slate-750'
                                }`}
                                title="Hiện/Ẩn Furigana"
                            >
                                Furigana
                            </button>

                            {/* Translation Toggle */}
                            <button
                                onClick={() => setShowTranslation(prev => !prev)}
                                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                                    showTranslation 
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-200 dark:border-slate-750'
                                }`}
                                title="Hiện/Ẩn Dịch nghĩa"
                            >
                                {showTranslation ? <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                            </button>

                            {/* Speech Speed */}
                            <button
                                onClick={() => setTtsRate(r => r === 1.0 ? 1.2 : r === 1.2 ? 0.8 : 1.0)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-850 dark:text-slate-300 border border-slate-200 dark:border-slate-750 text-xs font-mono font-bold cursor-pointer transition-colors"
                                title="Tốc độ nói AI"
                            >
                                {ttsRate}x
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages Body Log (Internally Scrollable Only) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                        {conversation.map((msg, idx) => {
                            const isAi = msg.sender === 'ai';
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
                                >
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                                        {isAi ? TEACHERS.find(t => t.id === teacher)?.avatar : '👤'}
                                    </div>

                                    {/* Bubble block */}
                                    <div className="space-y-2 max-w-[85%]">
                                        {/* Speakable Speech bubble */}
                                        <div className={`p-4.5 rounded-2xl relative group transition-all ${
                                            isAi 
                                                ? 'bg-white text-slate-800 border border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 rounded-tl-none' 
                                                : 'bg-indigo-600 text-white dark:bg-gradient-to-r dark:from-indigo-600 dark:to-cyan-700 rounded-tr-none shadow-md border border-indigo-500 dark:border-cyan-400/30'
                                        }`}>
                                            {/* Japanese content with Furigana */}
                                            <p 
                                                className="text-base font-japanese leading-loose whitespace-pre-wrap font-medium"
                                                dangerouslySetInnerHTML={{ __html: formatFurigana(msg.textJa) }}
                                            />
                                            
                                            {/* AI Speak trigger */}
                                            {isAi && (
                                                <button
                                                    onClick={() => speakText(msg.textJa)}
                                                    className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-indigo-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer duration-200 shadow-md"
                                                    title="Phát lại âm thanh AI"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Vietnamese translation details */}
                                        {isAi && showTranslation && msg.textVi && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic pl-1 font-sans">
                                                {msg.textVi}
                                            </p>
                                        )}

                                        {/* User Speech Analytics Telemetry Card */}
                                        {!isAi && msg.stats && (
                                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-2 shadow-sm">
                                                <div className="flex items-center justify-between font-mono font-bold">
                                                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-cyan-400">
                                                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                                                        <span>SPEECH TELEMETRY</span>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                        msg.stats.fluencyScore >= 85 
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60' 
                                                            : msg.stats.fluencyScore >= 75 
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60' 
                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60'
                                                    }`}>
                                                        {msg.stats.fluencyScore}/100 • {msg.stats.fluencyLabel}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                        <span>Pace: <strong>{msg.stats.wpm} char/min</strong> ({msg.stats.durationSec}s)</span>
                                                    </div>
                                                </div>

                                                {msg.stats.pronunciationNotes && (
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-1.5">
                                                        🎯 {msg.stats.pronunciationNotes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* User Smart Diagnostic Correction Feedback */}
                                        {!isAi && msg.feedback && (
                                            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2 shadow-sm">
                                                <div className="flex items-center gap-1.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                    <span>[AI DIAGNOSTIC REPAIR] Gợi ý sửa câu:</span>
                                                </div>
                                                <div className="space-y-1 pl-1">
                                                    <p className="line-through text-slate-400 dark:text-slate-500 font-japanese">
                                                        Gốc: {msg.feedback.userOriginal}
                                                    </p>
                                                    <p className="font-japanese font-bold text-sm text-indigo-700 dark:text-cyan-300">
                                                        Nên nói: <span dangerouslySetInnerHTML={{ __html: formatFurigana(msg.feedback.correctedJa) }} />
                                                    </p>
                                                    {msg.feedback.explanationVi && (
                                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-1 italic font-sans">
                                                            Phân tích: {msg.feedback.explanationVi}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Loading Indicator */}
                        {isGenerating && (
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                                    {TEACHERS.find(t => t.id === teacher)?.avatar}
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none max-w-[80%] flex items-center gap-2 shadow-sm">
                                    <span className="w-2 h-2 bg-indigo-600 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-indigo-600 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-indigo-600 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    <span className="text-xs font-mono text-indigo-600 dark:text-cyan-400 ml-1">AI Thinking...</span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Cyber Speech Waveform Visualizer */}
                    {(isRecording || isAiSpeaking) && (
                        <div className="px-6 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-cyan-500/30 shrink-0">
                            <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
                                <span className="text-indigo-600 dark:text-cyan-400 font-bold flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-600 dark:text-cyan-400" />
                                    {isRecording ? 'LIVE MIC SPECTRUM (VAD Active)...' : 'AI NEURAL SPEECH SPECTRUM...'}
                                </span>
                            </div>
                            <AudioWaveformVisualizer 
                                analyserNode={isRecording ? micAnalyserRef.current : aiAnalyserRef.current} 
                                isActive={true}
                                mode={isRecording ? 'mic' : 'ai'}
                                height={38}
                            />
                        </div>
                    )}

                    {/* Chat Footer panel: Sticky Bottom Mic & Input Controllers */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative z-20 shrink-0 sticky bottom-0">
                        {/* Correction Alert Banner */}
                        {pendingCorrection && (
                            <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/50 rounded-2xl flex items-start gap-3 animate-fade-in shadow-sm">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div className="space-y-1 font-sans">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                                        Hãy đọc hoặc nhập lại câu sửa bên dưới để tiếp tục hội thoại:
                                    </p>
                                    <p className="text-sm font-bold text-indigo-700 dark:text-cyan-300 font-japanese animate-pulse" dangerouslySetInnerHTML={{ __html: formatFurigana(pendingCorrection.corrected) }}>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Quick Suggestions label */}
                        {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                            <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-2">💡 GỢI Ý TRẢ LỜI:</p>
                        )}

                        {/* Quick suggestions pills */}
                        {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {conversation[conversation.length - 1].suggestions.map((sug, idx) => {
                                    const cleanText = sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={isAiSpeaking || isGenerating || isTranscribing}
                                            onClick={() => speakText(cleanText)}
                                            title={isAiSpeaking ? "Vui lòng chờ AI nói xong" : "Bấm để nghe phát âm mẫu (Dùng Mic / Phím Cách để nói)"}
                                            className="px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-cyan-800/60 bg-indigo-50/80 dark:bg-cyan-950/40 hover:bg-indigo-100 dark:hover:bg-cyan-900/60 hover:border-indigo-400 dark:hover:border-cyan-500 text-xs font-semibold text-indigo-700 dark:text-cyan-300 cursor-pointer font-japanese transition-all shadow-sm active:scale-95 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                                        >
                                            <Volume1 className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400 shrink-0" />
                                            <span>{cleanText}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Microphone live status HUD */}
                        {(isRecording || isTranscribing) && (
                            <div className="mb-3 px-3.5 py-2 bg-indigo-50 dark:bg-slate-900 border border-indigo-200 dark:border-cyan-500/40 rounded-xl text-xs text-indigo-700 dark:text-cyan-300 flex items-center gap-2.5 font-mono shadow-sm">
                                <span className={`w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-cyan-400 ${isRecording ? 'animate-ping' : 'animate-pulse'}`}></span>
                                <span className="font-bold">{isRecording ? 'VAD RECOGNIZING:' : 'NEURAL WHISPER:'}</span> 
                                <span className="italic font-japanese text-slate-700 dark:text-slate-200">{transcript || (isRecording ? 'Hãy nói tiếng Nhật...' : 'Đang xử lý giọng nói...')}</span>
                            </div>
                        )}

                        {/* Futuristic AI Voice Mic Control Center (Centered, Orb Effects) */}
                        <div className="flex flex-col items-center justify-center gap-3 pt-2 pb-1">
                            {/* Micro Orb Control with Glowing Pulse Rings */}
                            <div className="relative flex items-center justify-center">
                                {/* Outer Pulsing Wave Halo */}
                                {isRecording && (
                                    <span className="absolute w-24 h-24 rounded-full bg-rose-500/30 dark:bg-rose-500/20 animate-ping pointer-events-none"></span>
                                )}
                                {isHandsFree && !isRecording && !isGenerating && !isTranscribing && !isAiSpeaking && (
                                    <span className="absolute w-20 h-20 rounded-full bg-cyan-500/20 dark:bg-cyan-500/15 animate-pulse pointer-events-none"></span>
                                )}
                                {isAiSpeaking && (
                                    <span className="absolute w-20 h-20 rounded-full bg-violet-500/30 dark:bg-violet-500/20 animate-ping pointer-events-none"></span>
                                )}

                                {/* Central Futuristic AI Mic Orb Button */}
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    onTouchStart={startRecording}
                                    onTouchEnd={stopRecording}
                                    onTouchCancel={stopRecording}
                                    disabled={isGenerating || isTranscribing || isAiSpeaking}
                                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 select-none border-2 ${
                                        isAiSpeaking
                                            ? 'bg-slate-400 dark:bg-slate-700 border-slate-300 opacity-60 cursor-not-allowed'
                                            : isRecording 
                                            ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 border-rose-300 shadow-rose-500/50 scale-110 cursor-pointer' 
                                            : isHandsFree 
                                            ? 'bg-gradient-to-tr from-cyan-600 via-indigo-600 to-blue-600 border-cyan-300 shadow-cyan-500/40 hover:scale-105 cursor-pointer'
                                            : 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 border-indigo-400 shadow-indigo-600/40 hover:scale-105 cursor-pointer'
                                    }`}
                                    title={isAiSpeaking ? "Vui lòng chờ AI nói xong" : (isHandsFree ? "VAD đang tự động nhận diện (Nhấn giữ/chạm để nói trực tiếp)" : "Nhấn giữ để nói, thả ra để gửi")}
                                >
                                    {isRecording ? (
                                        <MicOff className="w-7 h-7 animate-pulse text-white" />
                                    ) : (
                                        <Mic className="w-7 h-7 text-white" />
                                    )}
                                </button>


                            </div>

                            {/* Dynamic Status Telemetry Label under Orb */}
                            <div className="text-center">
                                <p className="text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    {isRecording ? (
                                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                            ĐANG LẮNG NGHE GIỌNG NÓI...
                                        </span>
                                    ) : isTranscribing ? (
                                        <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 animate-pulse">
                                            <Cpu className="w-3.5 h-3.5 animate-spin-slow" />
                                            ĐANG CHUYỂN GIỌNG NÓI THÀNH VĂN BẢN...
                                        </span>
                                    ) : isGenerating ? (
                                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse">
                                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                            AI ĐANG TẠO CÂU TRẢ LỜI...
                                        </span>
                                    ) : isAiSpeaking ? (
                                        <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1.5 animate-pulse">
                                            <Volume2 className="w-3.5 h-3.5 text-violet-500 animate-bounce" />
                                            AI ĐANG NÓI... (VUI LÒNG CHỜ AI NÓI XONG)
                                        </span>
                                    ) : isHandsFree ? (
                                        <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                            <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                                            HANDS-FREE VAD: NÓI TRỰC TIẾP QUA MICRO
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 dark:text-slate-400">
                                            GIỮ CHUỘT / GIỮ PHÍM CÁCH ĐỂ NÓI • THẢ RA ĐỂ GỬI
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Dual-mode usage hint */}
                            {!isRecording && !isTranscribing && !isGenerating && (
                                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 flex-wrap justify-center">
                                    <span className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">🖱 Chuột</span>
                                        Nhấn giữ nút Mic
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold tracking-wider">SPACE</span>
                                        Nhấn giữ Phím Cách
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">→</span>
                                    <span>Thả ra để gửi</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

            {/* Hands-Free VAD Confirmation Modal */}
            {showHandsFreeConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-fade-in">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center border border-amber-300 dark:border-amber-600/60">
                                <Radio className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                Bật Chế Độ Hands-Free VAD?
                            </h3>
                        </div>

                        {/* Warning body */}
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-2xl p-4 space-y-2 text-xs text-amber-900 dark:text-amber-300">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                Yêu cầu môi trường yên tĩnh
                            </p>
                            <ul className="space-y-1 pl-5 list-disc text-amber-800 dark:text-amber-400 font-medium">
                                <li>Chế độ này tự động nhận diện giọng nói liên tục qua micro.</li>
                                <li>Nếu có <strong>tạp âm, tiếng quạt, tiếng TV</strong> xung quanh, micro có thể nhận diện nhầm và tự gửi câu không mong muốn.</li>
                                <li>Khuyến nghị sử dụng tại phòng yên tĩnh hoặc dùng tai nghe có micro.</li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowHandsFreeConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={() => {
                                    setShowHandsFreeConfirm(false);
                                    setIsHandsFree(true);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-black hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-cyan-500/20"
                            >
                                ⚡ Xác Nhận Bật
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thông Báo Hết 10 Phút Kaiwa Hôm Nay */}
            {showTimeLimitModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white dark:bg-slate-850 border border-amber-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                            <Clock className="w-10 h-10 text-amber-500 animate-bounce" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                                ⏱️ Hết 10 Phút Luyện Kaiwa Hôm Nay
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                Bạn đã hoàn thành <strong>10 phút thử nghiệm AI Kaiwa</strong> hôm nay. Tiến độ và lịch sử cuộc hội thoại đã được bảo toàn.
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/40">
                                💡 Hẹn gặp lại bạn vào ngày mai để tiếp tục luyện phản xạ nhé!
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => navigate(ROUTES.HOME)}
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer text-sm"
                            >
                                Về Trang Chủ
                            </button>
                            <button
                                onClick={() => {
                                    setShowTimeLimitModal(false);
                                    setStep('setup');
                                }}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Quay lại Màn hình Cấu hình
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default JLPTKaiwaScreen;
