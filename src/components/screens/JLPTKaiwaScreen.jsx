import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare, Mic, MicOff, Volume2, VolumeX, Eye, EyeOff,
    ArrowLeft, ArrowRight, Settings, AlertCircle, CheckCircle2,
    Play, Send, RefreshCw, Star, Info, Languages, Radio, Trophy, Phone, PhoneOff,
    Activity, Zap, Award, Lightbulb, Volume1, X, ShieldAlert, Cpu, Terminal, ShieldCheck, Loader2, Clock,
    SlidersHorizontal, BookOpen
} from 'lucide-react';
import { callKaiwaAI, parseJsonFromAI, callWhisperSTT, callOpenAITTS } from '../../utils/aiProvider';
import { ROUTES } from '../../router';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import KaiwaScorecardModal from '../ui/KaiwaScorecardModal';
import AiKaiwaCallOverlay from '../ui/AiKaiwaCallOverlay';
import KaiwaCoachSection from '../kaiwa/KaiwaCoachSection';
import { AiCreditPill, AiCostTag } from '../ui/AiCreditBadge';


// Level configurations with futuristic Cyber gradients & HUD tags
const LEVELS = [
    { value: 'N5', label: 'JLPT N5', tag: 'NOVICE LEVEL', desc: 'Sơ cấp 1 (Chào hỏi, giao tiếp sinh hoạt cơ bản)', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
    { value: 'N4', label: 'JLPT N4', tag: 'ELEMENTARY LEVEL', desc: 'Sơ cấp 2 (Giao tiếp thường nhật & đời sống Nhật Bản)', gradient: 'from-cyan-500 via-sky-500 to-blue-500' },
    { value: 'N3', label: 'JLPT N3', tag: 'INTERMEDIATE LEVEL', desc: 'Trung cấp (Trao đổi quan điểm, công việc & tin tức)', gradient: 'from-blue-500 via-emerald-500 to-sky-500' },
    { value: 'N2', label: 'JLPT N2', tag: 'UPPER ADVANCED', desc: 'Thượng trung cấp (Bàn luận xã hội, chuyên môn & công sở)', gradient: 'from-sky-500 via-teal-500 to-emerald-500' },
    { value: 'N1', label: 'JLPT N1', tag: 'MASTERY LEVEL', desc: 'Cao cấp (Hội thoại chuyên sâu, thương mại & học thuật)', gradient: 'from-rose-500 via-pink-500 to-red-500' }
];

// Virtual Teachers & AI Personas with Cyber HUD Profiles
const TEACHERS = [
    {
        id: 'sakura',
        name: 'Sakura-sensei',
        gender: 'female',
        avatar: '👩🏻‍🏫',
        role: 'Giảng viên Nữ Chuẩn Tokyo',
        desc: 'Giọng đọc dịu dàng, phát âm chuẩn Tokyo, kiên nhẫn khích lệ. Trả lời cực kỳ ngắn gọn (1-2 câu).',
        systemName: 'Sakura-sensei',
        personalityPrompt: 'Bạn là Sakura-sensei, cô giáo tiếng Nhật dịu dàng, ân cần, luôn khích lệ học viên. BẮT BUỘC trả lời cực kỳ ngắn gọn (1-2 câu ngắn).',
        avatarBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        activeClass: 'border-rose-500 bg-rose-50/80 dark:border-rose-400 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/30',
        badgeBg: 'bg-rose-500'
    },
    {
        id: 'kenji',
        name: 'Kenji-sensei',
        gender: 'male',
        avatar: '👨🏻‍🏫',
        role: 'Thầy Giáo Nam Hài Hước',
        desc: 'Thầy giáo nam siêu hài hước, hóm hỉnh phong cách Manzai! Vừa dạy vừa pha trò đùa vui, trả lời cực ngắn gọn!',
        systemName: 'Kenji-sensei',
        personalityPrompt: 'Bạn là Kenji-sensei, thầy giáo nam cực kỳ hài hước, dí dỏm, hay đùa vui chọc cười học viên kiểu hài kịch Kansai Manzai. BẮT BUỘC trả lời cực kỳ ngắn gọn, súc tích và hài hước (1-2 câu ngắn).',
        avatarBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        activeClass: 'border-amber-500 bg-amber-50/80 dark:border-amber-400 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400/30',
        badgeBg: 'bg-amber-500'
    },
    {
        id: 'tama',
        name: 'Tama-chan',
        gender: 'female',
        avatar: '😸',
        role: 'Trợ lý Mèo Đáng Yêu',
        desc: 'Chú mèo AI đáng yêu, chèn tiếng "nya~" nhí nhảnh. Trả lời ngắn gọn, siêu dễ thương cho N5 - N4.',
        systemName: 'Tama-chan',
        personalityPrompt: 'Bạn là Tama-chan, chú mèo AI cực kỳ đáng yêu, hay thêm "nya~" (～にゃ) ở cuối câu. BẮT BUỘC trả lời cực kỳ ngắn gọn (1-2 câu ngắn).',
        avatarBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        activeClass: 'border-emerald-500 bg-emerald-50/80 dark:border-emerald-400 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30',
        badgeBg: 'bg-emerald-500'
    },
    {
        id: 'tanaka',
        name: 'Tanaka-bucho',
        gender: 'male',
        avatar: '👨🏻‍💼',
        role: 'Trưởng Phòng Nghiêm Túc',
        desc: 'Sếp công sở Nhật Bản, dùng Kính ngữ Keigo dứt khoát & quyết đoán. Trả lời cực ngắn gọn chuẩn công sở.',
        systemName: 'Tanaka-bucho',
        personalityPrompt: 'Bạn là Tanaka-bucho, trưởng phòng công ty Nhật Bản nghiêm túc, quyết đoán, dùng Keigo chuẩn mực. BẮT BUỘC trả lời cực kỳ ngắn gọn & dứt khoát (1-2 câu ngắn).',
        avatarBg: 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-700',
        activeClass: 'border-sky-500 bg-sky-50/80 dark:border-sky-400 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30',
        badgeBg: 'bg-sky-500'
    },
    {
        id: 'yuki',
        name: 'Yuki-chan',
        gender: 'female',
        avatar: '💁🏻‍♀️',
        role: 'Cô Bạn Gen-Z Hài Hước',
        desc: 'Cô bạn Tokyo Gen-Z siêu hài hước, lầy lội! Dùng Slang trẻ vui nhộn, phản xạ siêu nhanh & cực ngắn gọn!',
        systemName: 'Yuki-chan',
        personalityPrompt: 'Bạn là Yuki-chan, cô bạn Gen-Z Tokyo cực kỳ hài hước, lầy lội, dùng Wakamono-kotoba & khẩu ngữ trẻ đùa vui nhộn. BẮT BUỘC trả lời cực kỳ ngắn gọn & hài hước (1-2 câu ngắn).',
        avatarBg: 'bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700',
        activeClass: 'border-teal-500 bg-teal-50/80 dark:border-teal-400 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500/30',
        badgeBg: 'bg-teal-500'
    }
];

// Predefined Cyber Kaiwa Topics (Japanese)
const TOPICS = [
    {
        id: 'free_talk',
        name: '💬 Trò chuyện tự do (Free Talk)',
        desc: 'Tự do trao đổi về bất kỳ chủ đề đời sống, sở thích hay quan điểm nào.'
    },
    {
        id: 'convenience_store',
        name: '🏪 Mua sắm Konbini (コンビニ)',
        desc: 'Thanh toán, yêu cầu quay nóng đồ ăn, mua vé, giao tiếp nhanh tại Konbini.'
    },
    {
        id: 'interview',
        name: '🏢 Phỏng vấn Arubaito / Việc làm',
        desc: 'Tập trả lời các câu hỏi phỏng vấn xin việc làm thêm hoặc công sở Nhật.'
    },
    {
        id: 'restaurant',
        name: '🍕 Đặt bàn & Gọi món nhà hàng',
        desc: 'Luyện đặt bàn trước, chọn món ăn, yêu cầu tách hóa đơn thanh toán.'
    },
    {
        id: 'asking_directions',
        name: '🗺️ Hỏi đường & Giao thông',
        desc: 'Hỏi đường ga tàu, di chuyển xe buýt, mua vé shinkansen.'
    },
    {
        id: 'school_life',
        name: '🏫 Học đường & Bạn bè',
        desc: 'Trò chuyện sinh hoạt trường lớp, câu lạc bộ, bài tập & bạn bè.'
    }
];

// English Kaiwa Configurations
const ENGLISH_LEVELS = [
    { value: 'A1_A2', label: 'CEFR A1 - A2', tag: 'ELEMENTARY', desc: 'Sơ cấp (Chào hỏi, giao tiếp cơ bản hàng ngày & mua sắm)', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
    { value: 'B1_B2', label: 'IELTS 5.5 - 6.5 / B1-B2', tag: 'INTERMEDIATE', desc: 'Trung cấp (Thảo luận chủ đề công việc, du lịch & quan điểm)', gradient: 'from-blue-500 via-emerald-500 to-sky-500' },
    { value: 'C1_C2', label: 'IELTS 7.0 - 8.5 / C1-C2', tag: 'ADVANCED', desc: 'Cao cấp (Hội thoại chuyên sâu, phỏng vấn quốc tế & học thuật)', gradient: 'from-rose-500 via-pink-500 to-red-500' },
];

const ENGLISH_TEACHERS = [
    {
        id: 'alex',
        name: 'Teacher Alex (US)',
        gender: 'male',
        avatar: '👨🏼‍🏫',
        role: 'American Voice Accent',
        desc: 'Giọng Anh-Mỹ chuẩn New York, phong cách hiện đại, năng động & tự nhiên.',
        systemName: 'Alex',
        avatarBg: 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-700',
        activeClass: 'border-sky-500 bg-sky-50/80 dark:border-sky-400 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30',
        badgeBg: 'bg-sky-500'
    },
    {
        id: 'emma',
        name: 'Teacher Emma (UK)',
        gender: 'female',
        avatar: '👩🏼‍🏫',
        role: 'British Voice Accent',
        desc: 'Giọng Anh-Anh thanh lịch, phát âm chuẩn London, rõ ràng & trang trọng.',
        systemName: 'Emma',
        avatarBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        activeClass: 'border-rose-500 bg-rose-50/80 dark:border-rose-400 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/30',
        badgeBg: 'bg-rose-500'
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

const JLPTKaiwaScreen = ({ profile, isAdmin, awardXP }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isEnglishMode } = useTargetLanguage();

    const currentLevels = isEnglishMode ? ENGLISH_LEVELS : LEVELS;
    const currentTeachers = isEnglishMode ? ENGLISH_TEACHERS : TEACHERS;
    const currentTopics = isEnglishMode ? ENGLISH_TOPICS : TOPICS;

    // Core setup states
    const [step, setStep] = useState('setup'); // 'setup' | 'chat'
    const [mainKaiwaTab, setMainKaiwaTab] = useState('live'); // 'live' | 'coach'
    const [practiceMode, setPracticeMode] = useState('topic'); // 'topic' | 'lesson'
    const [level, setLevel] = useState(isEnglishMode ? 'B1_B2' : 'N3');
    const [teacher, setTeacher] = useState(isEnglishMode ? 'alex' : 'sakura');
    const [topic, setTopic] = useState('free_talk');

    // 70 Coach Lessons Reflex States
    const [coachLessons, setCoachLessons] = useState([]);
    const [selectedCoachLesson, setSelectedCoachLesson] = useState(null);
    const [activeLessonSession, setActiveLessonSession] = useState(null);
    const [showQuitConfirmModal, setShowQuitConfirmModal] = useState(false);

    // Fetch 70 Coach Lessons data
    useEffect(() => {
        const fetchCoachData = async () => {
            try {
                const res = await fetch('/data/kaiwa_coach_data.json');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setCoachLessons(data);
                        setSelectedCoachLesson(data[0]);
                    }
                }
            } catch (e) {
                console.warn('Error fetching coach lessons in JLPTKaiwaScreen:', e);
            }
        };
        fetchCoachData();
    }, []);


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
    const [showScorecardModal, setShowScorecardModal] = useState(false);
    const [showCallOverlay, setShowCallOverlay] = useState(false);
    const [showMobileSettings, setShowMobileSettings] = useState(false);

    // Chat states
    const [conversation, setConversation] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputText, setInputText] = useState('');
    const [showTranslation, setShowTranslation] = useState(true);
    const [showFurigana, setShowFurigana] = useState(true);
    const [ttsRate, setTtsRate] = useState(1.15); // 0.85 | 1.0 | 1.15 | 1.3
    const [isMuted, setIsMuted] = useState(false);
    const [pendingCorrection, setPendingCorrection] = useState(null);
    const [completedMissions, setCompletedMissions] = useState([]);

    // Hands-Free VAD Mode (Default OFF for clean control & safety)
    const [isHandsFree, setIsHandsFree] = useState(false);
    const [showHandsFreeConfirm, setShowHandsFreeConfirm] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    // Audio/Speech states
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);

    // Credit-based metering governs Kaiwa usage (no arbitrary 10-minute timer wall when credits > 0)
    useEffect(() => {
        if (step !== 'chat' || isUnlimited) return;
        const interval = setInterval(() => {
            setDailyUsedSeconds(prev => prev + 1);
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
    const noiseFloorRef = useRef(15);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const chatEndRef = useRef(null);
    const isRecordingRef = useRef(false);
    const audioRef = useRef(new Audio());
    const recognitionRef = useRef(null);
    const speechRecognitionTextRef = useRef('');

    // Check MediaRecorder support on mount & cleanup audio
    useEffect(() => {
        if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setSpeechSupported(false);
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            } catch (e) { }
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

                    // 1. Adaptive noise floor tracking (exponential moving average during non-recording)
                    if (!isRecordingRef.current) {
                        noiseFloorRef.current = noiseFloorRef.current * 0.96 + rms * 0.04;
                    }

                    // 2. Dynamic Speech Threshold is calculated as 1.6x the ambient noise floor (min 28, max 50)
                    const DYNAMIC_SPEECH_THRESHOLD = Math.max(28, Math.min(50, noiseFloorRef.current * 1.6));
                    const MAX_SILENCE_DURATION = 650; // Cutoff recording in 0.65s after user stops speaking
                    const MAX_RECORDING_DURATION = 12000;

                    // 3. Require speech to be sustained above dynamic threshold for >220ms before starting recording
                    if (rms > DYNAMIC_SPEECH_THRESHOLD) {
                        silenceStartRef.current = null;
                        if (!isRecordingRef.current) {
                            if (!speechStartRef.current) {
                                speechStartRef.current = Date.now();
                            } else if (Date.now() - speechStartRef.current > 220) {
                                // Sustained human voice confirmed! Start recording.
                                startRecordingDirect();
                            }
                        } else {
                            if (recordingStartTimeRef.current && (Date.now() - recordingStartTimeRef.current > MAX_RECORDING_DURATION)) {
                                console.log('🎙️ VAD safety limit reached (12s max). Auto-stopping recording...');
                                stopRecordingDirect();
                            }
                        }
                    } else {
                        speechStartRef.current = null; // Reset vocal start timer if audio drops
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
        setTranscript(isEnglishMode ? '🎙️ Đang lắng nghe giọng nói tiếng Anh...' : '🎙️ Đang lắng nghe giọng nói tiếng Nhật...');
        audioChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();

        try {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);

            // Parallel Web Speech API for real-time live preview and zero-key fallback
            speechRecognitionTextRef.current = '';
            const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
            if (SpeechRec) {
                try {
                    const recognition = new SpeechRec();
                    recognitionRef.current = recognition;
                    recognition.lang = isEnglishMode ? 'en-US' : 'ja-JP';
                    recognition.continuous = true;
                    recognition.interimResults = true;

                    recognition.onresult = (event) => {
                        let interim = '';
                        let final = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                final += event.results[i][0].transcript;
                            } else {
                                interim += event.results[i][0].transcript;
                            }
                        }
                        if (final) {
                            speechRecognitionTextRef.current = (speechRecognitionTextRef.current + ' ' + final).trim();
                        }
                        const currentSpoken = (speechRecognitionTextRef.current + ' ' + interim).trim();
                        if (currentSpoken) {
                            setTranscript(currentSpoken);
                        }
                    };

                    recognition.onerror = (e) => {
                        console.warn('Web Speech API event notice (relying on Whisper/MediaRecorder):', e.error);
                    };

                    recognition.start();
                } catch (recErr) {
                    console.warn('SpeechRecognition start notice:', recErr);
                }
            }

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
                const webSpeechText = speechRecognitionTextRef.current ? speechRecognitionTextRef.current.trim() : '';

                if ((audioBlob.size < 2500 || durationSec < 1) && !webSpeechText) {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    setTranscript('');
                    return;
                }

                setIsTranscribing(true);
                setTranscript('⚡ Đang xử lý giọng nói thành văn bản...');
                try {
                    let text = '';
                    try {
                        text = await callWhisperSTT(audioBlob, isEnglishMode ? 'en' : 'ja');
                    } catch (sttErr) {
                        console.warn('Whisper STT failed or key not configured, checking Web Speech API fallback:', sttErr);
                        if (webSpeechText) {
                            text = webSpeechText;
                        } else {
                            throw sttErr;
                        }
                    }

                    // If Whisper returned empty but Web Speech API captured text, fallback to webSpeechText
                    if (!text && webSpeechText) {
                        text = webSpeechText;
                    }

                    let clean = text ? text.trim() : '';

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

                    if (isHallucination && webSpeechText) {
                        clean = webSpeechText;
                    } else if (isHallucination || !clean) {
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
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        } catch (e) {
            console.warn('Error stopping speech recognition:', e);
        }

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

    // Find Japanese voice with strict per-persona differentiation
    const getBestJapaneseVoice = (teacherId, gender) => {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang === 'ja_JP' || v.lang.includes('ja'));
        if (jaVoices.length === 0) return null;

        // Search persona specific voice names across Windows, macOS, Android, iOS
        if (teacherId === 'tama') {
            const v = jaVoices.find(v => v.name.toLowerCase().includes('mayu') || v.name.toLowerCase().includes('ayumi'));
            if (v) return v;
        } else if (teacherId === 'tanaka') {
            const v = jaVoices.find(v => v.name.toLowerCase().includes('daichi') || v.name.toLowerCase().includes('ichiro') || v.name.toLowerCase().includes('naoki'));
            if (v) return v;
        } else if (teacherId === 'yuki') {
            const v = jaVoices.find(v => v.name.toLowerCase().includes('aoi') || v.name.toLowerCase().includes('haruka'));
            if (v) return v;
        } else if (teacherId === 'sakura') {
            const v = jaVoices.find(v => v.name.toLowerCase().includes('shiori') || v.name.toLowerCase().includes('nanami') || v.name.toLowerCase().includes('haruka'));
            if (v) return v;
        } else if (teacherId === 'kenji') {
            const v = jaVoices.find(v => v.name.toLowerCase().includes('naoki') || v.name.toLowerCase().includes('keita') || v.name.toLowerCase().includes('ichiro'));
            if (v) return v;
        }

        if (gender === 'female') {
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('nanami') || v.name.toLowerCase().includes('shiori') || v.name.toLowerCase().includes('haruka') || v.name.toLowerCase().includes('ayumi') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('sakura'));
            if (voice) return voice;
            voice = jaVoices.find(v => v.name.toLowerCase().includes('google') || v.name.includes('日本語'));
            if (voice) return voice;
            return jaVoices[0];
        } else {
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('daichi') || v.name.toLowerCase().includes('naoki') || v.name.toLowerCase().includes('keita') || v.name.toLowerCase().includes('ichiro') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.toLowerCase().includes('kenji'));
            if (voice) return voice;
            if (jaVoices.length > 1) return jaVoices[1];
            return jaVoices[0];
        }
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

            const audioUrl = await callOpenAITTS(cleanText, gender, isEnglishMode ? 'en' : 'ja', teacher);
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

                // Pitch & Rate tuning per AI Persona for distinct voice identity
                let personaPitch = 1.0;
                let personaRateModifier = 1.0;

                if (teacher === 'tama') {
                    personaPitch = 1.55; // Cute, high-pitched cat assistant
                    personaRateModifier = 0.85; // Slower pace
                } else if (teacher === 'tanaka') {
                    personaPitch = 0.50; // Deep, firm male manager voice
                    personaRateModifier = 0.95;
                } else if (teacher === 'yuki') {
                    personaPitch = 1.25; // Energetic Gen-Z Tokyo style
                    personaRateModifier = 1.08;
                } else if (teacher === 'sakura') {
                    personaPitch = 1.15; // Soft Tokyo female teacher
                } else if (teacher === 'kenji') {
                    personaPitch = 0.55; // Distinct deep male teacher voice
                }

                utterance.pitch = personaPitch;
                utterance.rate = ttsRate * personaRateModifier;
                utterance.onend = onDone;
                utterance.onerror = onDone;

                const voice = isEnglishMode ? getBestEnglishVoice(gender) : getBestJapaneseVoice(teacher, gender);
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
    const handleStartConversation = async (targetLessonParam = null) => {
        unlockAudio();
        setStep('chat');
        setIsGenerating(true);
        setConversation([]);
        setPendingCorrection(null);

        // Determine if this is a Coach Lesson session
        let activeLesson = null;
        if (targetLessonParam) {
            activeLesson = targetLessonParam;
            setPracticeMode('lesson');
            setSelectedCoachLesson(targetLessonParam);
        } else if (practiceMode === 'lesson' && selectedCoachLesson) {
            activeLesson = selectedCoachLesson;
        }
        setActiveLessonSession(activeLesson);

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
        } else if (activeLesson) {
            // Specialized Prompt for 70 Coach Strategy Lessons
            const steps = activeLesson.steps || [];
            const firstStep = steps[0];
            const strategySummary = firstStep?.strategy ? firstStep.strategy.join('\n- ') : '';
            const personasSummary = firstStep?.personas ? firstStep.personas.map(p => `${p.label} (từ khóa: ${p.wordRef})`).join(', ') : '';

            systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
            Tính cách & Phong cách: ${selectedTeacher.personalityPrompt || 'Thân thiện, động viên, phản xạ tự nhiên.'}
            Học viên đang luyện tập phản xạ theo: "${activeLesson.title}".
            
            MỤC TIÊU CHIẾN LƯỢC BÀI HỌC CẦN LUYỆN:
            - ${strategySummary}
            
            CÁC VAI DIỄN TÌNH HUỐNG (PERSONAS):
            - ${personasSummary}
            
            YÊU CẦU BẮT BUỘC:
            1. Bạn đóng vai nhân vật đối thoại phù hợp với tình huống của bài học này.
            2. Dẫn dắt học viên luyện tập bám sát từng bước chiến lược của bài học.
            3. Cấp độ JLPT: ${level}.
            4. Độ dài: Lời nói ("replyJa") BẮT BUỘC cực kỳ ngắn gọn, súc tích (1-2 câu ngắn, tối đa 25 ký tự tiếng Nhật) để tạo cảm giác phản xạ tức thì.
            5. TIN NHẮN MỞ ĐẦU: Chào học viên ngắn gọn, nêu tình huống của bài "${activeLesson.title}", và hỏi câu hỏi Bước 1 gợi mở để học viên trả lời.
            6. GỢI Ý ("suggestions"): Cung cấp đúng 3 câu trả lời ngắn bằng tiếng Nhật kèm Furigana giúp học viên dễ dàng phản xạ theo Bước 1 của bài học này.
            
            Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không dùng dấu ngoặc kép đôi bên trong các chuỗi tiếng Việt như replyVi, dùng dấu nháy đơn ' ' thay thế, không chứa markdown backticks):
            {
              "replyJa": "Câu mở đầu tiếng Nhật kèm Furigana dạng Chữ[Furigana]. Ví dụ: 私[わたし]",
              "replyVi": "Bản dịch tiếng Việt ngắn gọn tự nhiên",
              "feedback": {
                "hasError": false,
                "userOriginal": "",
                "correctedJa": "",
                "explanationVi": ""
              },
              "suggestions": [
                "Gợi ý 1 tiếng Nhật phù hợp Bước 1",
                "Gợi ý 2 tiếng Nhật phù hợp Bước 1",
                "Gợi ý 3 tiếng Nhật phù hợp Bước 1"
              ]
            }`;
        } else {
            systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
            Tính cách & Phong cách nói chuyện của bạn: ${selectedTeacher.personalityPrompt || 'Thân thiện, lịch sự, ngắn gọn.'}
            Bạn sẽ thực hiện hội thoại 1:1 với người học.
            Yêu cầu bắt buộc:
            1. Cấp độ JLPT hội thoại của học viên: ${level}. Chỉ sử dụng từ vựng và ngữ pháp phù hợp với cấp độ này.
            2. Tông giọng và vai trò của bạn: Đúng theo đặc tính nhân vật (${selectedTeacher.role}).
            3. Chủ đề hội thoại: ${selectedTopic.name} - ${selectedTopic.desc}.
            4. Yêu cầu về độ dài: Câu nói của giáo viên ("replyJa") BẮT BUỘC phải cực kỳ ngắn gọn, súc tích (chỉ 1 đến 2 câu ngắn, tối đa 20-25 ký tự tiếng Nhật), đáp trả nhanh chóng và phản xạ tự nhiên.
            5. Đối với tin nhắn đầu tiên này, hãy gửi một lời chào ngắn gọn đúng phong cách nhân vật, giới thiệu tên ${selectedTeacher.name}, và hỏi 1 câu hỏi mở siêu ngắn phù hợp chủ đề để học viên phản xạ trả lời.
            
            Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không dùng dấu ngoặc kép đôi bên trong các chuỗi tiếng Việt như replyVi, dùng dấu nháy đơn ' ' hoặc ngoặc vuông [ ] thay thế, không chứa markdown backticks):
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
            const isInsufficient = error?.code === 'INSUFFICIENT_AI_CREDITS';
            setConversation([{
                sender: 'ai',
                textJa: isInsufficient
                    ? 'クレジットが不足しています。アップグレードページから追加してください。'
                    : (isEnglishMode ? "Hello! It seems there was a network connection issue. Please try again." : 'こんにちは！接続に問題が発生したようです。もう一度やり直してください。'),
                textVi: isInsufficient
                    ? `⚠️ ${error.message}`
                    : 'Xin chào! Đã xảy ra lỗi kết nối. Vui lòng thử lại.',
                suggestions: []
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Helper: User wants to practice/read corrected sentence
    const handleReadCorrectedSentence = (feedbackObj) => {
        if (!feedbackObj || !feedbackObj.correctedJa) return;
        const cleanText = feedbackObj.correctedJa.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf\w]+)\[([^\]]+)\]/g, '$1').replace(/\[[^\]]+\]/g, '');

        speakText(feedbackObj.correctedJa);
        setInputText(cleanText);

        setPendingCorrection({
            original: feedbackObj.userOriginal || '',
            corrected: feedbackObj.correctedJa,
            explanation: feedbackObj.explanationVi
        });
    };

    // Helper: User skips correction and continues conversation
    const handleSkipCorrectionAndContinue = async () => {
        setPendingCorrection(null);
        handleSendUserMessage("Tự nhiên tiếp tục cuộc trò chuyện.", null, true);
    };

    // Helper to send message to AI
    const handleSendUserMessage = async (textToSend, speakDurationSec = null, isSkipTrigger = false) => {
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
            if (pendingCorrection && !isSkipTrigger) {
                systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
                Học viên vừa phát âm/đọc lại câu để sửa lỗi theo yêu cầu của bạn.
                - Câu sai trước đó: "${pendingCorrection.original}"
                - Câu sửa đúng chuẩn: "${pendingCorrection.corrected}"
                - Câu học viên vừa gửi/đọc: "${messageText}"
                
                QUY TẮC BẮT BUỘC:
                1. BẮT BUỘC đặt "feedback.hasError" là false! Học viên đã cố gắng đọc lại, BẮT BUỘC KHÔNG ĐƯỢC BẮT SỬA LỖI NỮA.
                2. Trong "replyJa": Gửi 1 câu ngắn khen ngợi học viên phát âm/đọc câu đúng rất tốt (Ví dụ: "素晴らしい！正しく言えましたね。") KÈM THEO 1 câu hỏi mở ngắn tiếp theo để TIẾP TỤC cuộc hội thoại chủ đề ${selectedTopic.name}.
                3. BẮT BUỘC tạo 3 câu gợi ý trả lời mới trong "suggestions" cho câu hỏi tiếp theo bạn vừa hỏi.
                
                Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không dùng dấu ngoặc kép đôi bên trong các chuỗi tiếng Việt như replyVi, không chứa markdown backticks):
                {
                  "replyJa": "Lời khen tiếng Nhật + 1 câu hỏi tiếp theo ngắn gọn kèm Furigana dạng Chữ[Furigana]",
                  "replyVi": "Bản dịch tiếng Việt tự nhiên",
                  "feedback": { "hasError": false, "userOriginal": "${messageText}", "correctedJa": "", "explanationVi": "" },
                  "suggestions": [
                    "Gợi ý 1 mới cho câu hỏi tiếp theo",
                    "Gợi ý 2 mới cho câu hỏi tiếp theo",
                    "Gợi ý 3 mới cho câu hỏi tiếp theo"
                  ],
                  "speechAnalytics": { "fluencyScore": 95, "fluencyLabel": "Cải thiện tuyệt vời", "pronunciationTips": "Phát âm và sửa câu rất tốt!" }
                }`;
            } else if (activeLessonSession) {
                const steps = activeLessonSession.steps || [];
                const firstStep = steps[0];
                const strategySummary = firstStep?.strategy ? firstStep.strategy.join(' -> ') : '';
                systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
                Tính cách & Phong cách: ${selectedTeacher.personalityPrompt || 'Thân thiện, động viên, ngắn gọn.'}
                Học viên đang luyện phản xạ thực chiến theo bài: "${activeLessonSession.title}".
                Chiến lược các bước của bài: ${strategySummary}.
                
                QUY TẮC ĐÁNH GIÁ VÀ TIẾP NỐI BÀI HỌC:
                1. Phân tích câu nói của học viên: "${messageText}" (thời gian: ${durationSec}s).
                2. Đánh giá lỗi sai:
                   - CHỈ ĐẶT "feedback.hasError" là true NẾU học viên mắc lỗi ngữ pháp CỰC KỲ NGHIỆM TRỌNG làm méo mó câu.
                   - NẾU CÓ LỖI NGHIỆM TRỌNG ("feedback.hasError" là true):
                     + "correctedJa": câu sửa tiếng Nhật chuẩn (kèm Furigana dạng Chữ[Furigana]).
                     + "explanationVi": giải thích ngắn gọn bằng tiếng Việt.
                     + "replyJa": BẮT BUỘC ĐỂ RỖNG "".
                     + "suggestions": [ "[correctedJa]", "[correctedJa]", "[correctedJa]" ]
                   - NẾU HỌC VIÊN NÓI CHUẨN HOẶC HIỂU ĐƯỢC Ý ("feedback.hasError" là false):
                     + "replyJa": Lời khen ngắn (1 câu) + câu hỏi ngắn dẫn dắt bước tiếp theo trong chiến lược bài học "${activeLessonSession.title}". BẮT BUỘC chỉ 1-2 câu ngắn (tối đa 25 ký tự).
                     + "suggestions": BẮT BUỘC tạo 3 câu gợi ý phản xạ mới bám sát bước tiếp theo của bài học này.
                3. Đánh giá độ trôi chảy trong "speechAnalytics":
                   - "fluencyScore": 88-98.
                   - "fluencyLabel": Nhãn ngắn ("Xuất sắc" | "Trôi chảy" | "Tự nhiên").
                   - "pronunciationTips": Nhận xét 1 câu ngắn tiếng Việt.
                
                Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không dùng ngoặc kép trong replyVi, không markdown backticks):
                {
                  "replyJa": "Nội dung câu nói của giáo viên bằng tiếng Nhật kèm Furigana dạng Chữ[Furigana] (để rỗng \"\" nếu feedback.hasError là true)",
                  "replyVi": "Bản dịch tiếng Việt tương ứng",
                  "feedback": {
                    "hasError": true hoặc false,
                    "userOriginal": "${messageText}",
                    "correctedJa": "câu sửa tiếng Nhật nếu error",
                    "explanationVi": "lời khuyên nếu error"
                  },
                  "suggestions": [
                    "Gợi ý 1 mới cho bước tiếp theo của bài học",
                    "Gợi ý 2 mới cho bước tiếp theo của bài học",
                    "Gợi ý 3 mới cho bước tiếp theo của bài học"
                  ],
                  "speechAnalytics": {
                    "fluencyScore": 92,
                    "fluencyLabel": "Trôi chảy",
                    "pronunciationTips": "Phát âm rõ ràng, phản xạ tốt"
                  }
                }`;
            } else {
                systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
                Tính cách & Phong cách: ${selectedTeacher.personalityPrompt || 'Thân thiện, động viên, ngắn gọn.'}
                Hội thoại 1:1 cấp độ JLPT: ${level}. Chủ đề: ${selectedTopic.name}.
                
                QUY TẮC ĐÁNH GIÁ VÀ XỬ LÝ PHẢN HỒI:
                1. Phân tích câu nói của học viên: "${messageText}" (thời gian nói: ${durationSec} giây).
                2. Đánh giá lỗi sai:
                   - QUAN TRỌNG: CHỈ ĐẶT "feedback.hasError" là true NẾU câu học viên nói mắc lỗi ngữ pháp CỰC KỲ NGHIỆM TRỌNG làm biến dạng hoàn toàn nghĩa của câu.
                   - NẾU HỌC VIÊN NÓI CÓ LỖI SAI NGHIỆM TRỌNG ("feedback.hasError" là true):
                     + "correctedJa": chứa câu tiếng Nhật chuẩn (kèm Furigana dạng Chữ[Furigana]).
                     + "explanationVi": giải thích lỗi bằng tiếng Việt ngắn gọn.
                     + "replyJa": BẮT BUỘC ĐỂ RỖNG "" (vì hệ thống sẽ tạm dừng chờ học viên chọn đọc lại hoặc bỏ qua).
                     + "suggestions": [ "[correctedJa]", "[correctedJa]", "[correctedJa]" ]
                   - NẾU HỌC VIÊN NÓI CHUẨN HOẶC HIỂU ĐƯỢC Ý ("feedback.hasError" là false):
                     + "replyJa": Phản hồi tự nhiên + hỏi 1 câu hỏi tiếp theo ngắn gọn (1-2 câu).
                     + "suggestions": BẮT BUỘC tạo 3 câu gợi ý phản xạ mới.
                3. Đánh giá độ trôi chảy trong "speechAnalytics":
                   - "fluencyScore": Điểm 0-100 (khích lệ 88-98 điểm).
                   - "fluencyLabel": Nhãn ngắn ("Xuất sắc" | "Trôi chảy" | "Tự nhiên").
                   - "pronunciationTips": Nhận xét 1 câu ngắn bằng tiếng Việt.
                
                Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không dùng dấu ngoặc kép đôi bên trong các chuỗi tiếng Việt như replyVi, không chứa markdown backticks):
                {
                  "replyJa": "Nội dung câu nói của giáo viên bằng tiếng Nhật kèm Furigana dạng Chữ[Furigana] (để rỗng \"\" nếu feedback.hasError là true)",
                  "replyVi": "Bản dịch tiếng Việt tương ứng",
                  "feedback": {
                    "hasError": true hoặc false,
                    "userOriginal": "${messageText}",
                    "correctedJa": "câu sửa tiếng Nhật nếu error",
                    "explanationVi": "lời khuyên nếu error"
                  },
                  "suggestions": [
                    "Gợi ý 1 mới cho câu hỏi tiếp theo",
                    "Gợi ý 2 mới cho câu hỏi tiếp theo",
                    "Gợi ý 3 mới cho câu hỏi tiếp theo"
                  ],
                  "speechAnalytics": {
                    "fluencyScore": 90,
                    "fluencyLabel": "Trôi chảy",
                    "pronunciationTips": "Phát âm rõ ràng, phản xạ tự nhiên"
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
                if (parsed.feedback && parsed.feedback.hasError && !isSkipTrigger) {
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
                    // Pause AI response! Let user choose to re-read or skip & continue
                    setIsGenerating(false);
                    return;
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

                if (awardXP) {
                    awardXP(15);
                }
            } else {
                throw new Error('AI response empty or missing replyJa');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const isInsufficient = error?.code === 'INSUFFICIENT_AI_CREDITS';
            setConversation(prev => [...prev, {
                sender: 'ai',
                textJa: isInsufficient
                    ? 'クレジットが不足しています。アップグレードページから追加してください。'
                    : 'すみません、もう一度言っていただくか、メッセージを再送信してください。',
                textVi: isInsufficient
                    ? `⚠️ ${error.message}`
                    : 'Xin lỗi, bạn có thể nói lại hoặc gửi lại tin nhắn được không?',
                suggestions: isInsufficient ? [] : [
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
    const handleQuit = () => {
        setShowQuitConfirmModal(true);
    };

    const confirmQuit = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsAiSpeaking(false);
        stopVadLoop();
        if (isRecordingRef.current) {
            stopRecordingDirect();
        }
        setStep('setup');
        setConversation([]);
        setPendingCorrection(null);
        setIsHandsFree(false);
        setActiveLessonSession(null);
        setShowQuitConfirmModal(false);
    };

    const isCoachTabActive = step === 'setup' && mainKaiwaTab === 'coach';

    return (
        <div className={`w-full relative font-sans bg-transparent text-slate-800 dark:text-slate-100 selection:bg-emerald-500 selection:text-white ${
            isCoachTabActive
                ? 'min-h-[calc(100vh-65px)] flex flex-col p-2.5 sm:p-3.5 md:p-4 pb-24 sm:pb-32'
                : 'w-full h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex flex-col p-2.5 sm:p-3.5 md:p-4 overflow-hidden'
        }`}>
            <div className={`w-full max-w-5xl xl:max-w-6xl mx-auto flex flex-col ${
                isCoachTabActive ? 'min-h-0' : 'h-full max-h-full min-h-0'
            }`}>

            {step === 'setup' ? (
                /* DUOLINGO 3D SETUP COCKPIT */
                <div className={`w-full flex flex-col ${
                    isCoachTabActive
                        ? 'space-y-3 sm:space-y-4'
                        : 'h-full max-h-full min-h-0 space-y-2 sm:space-y-3'
                }`}>
                    {/* Compact Header Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 px-1">
                        <div className="text-center sm:text-left">
                            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {isEnglishMode ? 'Phòng Luyện Nói Tiếng Anh' : 'Trung Tâm Giao Tiếp & Hội Thoại AI'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium hidden sm:block">
                                Luyện phản xạ giao tiếp thực chiến và phương pháp tạo lập câu qua 70 bài học chiến lược.
                            </p>
                        </div>

                        {/* Tab switchers: Live room vs 70 Lessons Coach */}
                        <div className="flex items-center gap-1.5 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                            <button
                                onClick={() => setMainKaiwaTab('live')}
                                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    mainKaiwaTab === 'live'
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Radio className="w-3.5 h-3.5" />
                                <span>Phòng Luyện Nói AI</span>
                            </button>
                            <button
                                onClick={() => setMainKaiwaTab('coach')}
                                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    mainKaiwaTab === 'coach'
                                        ? 'bg-sky-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Huấn Luyện Viên (70 Bài)</span>
                            </button>
                        </div>
                    </div>

                    {mainKaiwaTab === 'coach' ? (
                        <div className="w-full">
                            <KaiwaCoachSection
                                onStartCoachChat={(coachLesson) => {
                                    handleStartConversation(coachLesson);
                                }}
                            />
                        </div>
                    ) : (
                        /* Cockpit 2-column layout - fits 100% in viewport without any outer scroll! */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
                                                {/* Left Column (7 cols): Teachers & Level */}
                                                <div className="lg:col-span-7 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                                                    {/* 1. TEACHER SELECTION */}
                                                    <div className="flex-1 min-h-0 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3 sm:p-4 shadow-sm overflow-hidden">
                                                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2 shrink-0">
                                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            <span>{t('kaiwa.stepSelectTeacher', '1. Chọn Giáo Viên AI')}</span>
                                                        </label>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                                                            {currentTeachers.map((tc, idx) => {
                                                                const isSelected = teacher === tc.id;
                                                                const isLastOdd = idx === currentTeachers.length - 1 && currentTeachers.length % 2 !== 0;
                                                                return (
                                                                    <button
                                                                        key={tc.id}
                                                                        type="button"
                                                                        onClick={() => setTeacher(tc.id)}
                                                                        className={`p-3 sm:p-3.5 rounded-2xl text-left border-2 border-b-4 transition-all duration-150 flex items-center gap-3 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 group ${isLastOdd ? 'sm:col-span-2' : ''
                                                                            } ${isSelected
                                                                                ? (tc.activeClass || 'border-emerald-500 bg-emerald-50/80 dark:border-emerald-400 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20')
                                                                                : 'border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80'
                                                                            }`}
                                                                    >
                                                                        <span className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 shrink-0 shadow-sm text-3xl sm:text-4xl transition-transform group-hover:scale-105 ${tc.avatarBg || 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                                            {tc.avatar}
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                                                    {tc.name}
                                                                                </h4>
                                                                                {tc.role && (
                                                                                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 truncate max-w-[130px]">
                                                                                        {tc.role}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                                                                                {tc.gender === 'female' ? t('kaiwa.gentleFemaleVoice', 'Giọng Nữ dịu dàng') : t('kaiwa.naturalMaleVoice', 'Giọng Nam tự nhiên')}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 hidden sm:block">
                                                                                {tc.desc}
                                                                            </p>
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div className={`w-6 h-6 rounded-full ${tc.badgeBg || 'bg-emerald-500'} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                                                                                <CheckCircle2 className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* 2. LEVEL SELECTION */}
                                                    <div className="shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3 sm:p-3.5 shadow-sm">
                                                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                            <Languages className="w-4 h-4 text-sky-500" />
                                                            <span>{t('kaiwa.stepSelectLevel', '2. Trình Độ Cấp Độ')}</span>
                                                        </label>

                                                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                                            {currentLevels.map((lvl) => {
                                                                const isSelected = level === lvl.value;
                                                                return (
                                                                    <button
                                                                        key={lvl.value}
                                                                        type="button"
                                                                        onClick={() => setLevel(lvl.value)}
                                                                        className={`py-2 px-1 rounded-xl font-black text-xs transition-all duration-150 cursor-pointer flex items-center justify-center border-2 border-b-4 select-none active:translate-y-0.5 active:border-b-2 ${isSelected
                                                                                ? 'bg-sky-500 text-white border-sky-700 shadow-sm'
                                                                                : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
                                                                            }`}
                                                                    >
                                                                        {lvl.label.replace('JLPT ', '')}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column (5 cols): Practice Mode & Start Button */}
                                                <div className="lg:col-span-5 flex flex-col justify-between gap-2.5 min-h-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-3 sm:p-4 shadow-sm overflow-hidden">
                                                    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
                                                        <div className="flex items-center justify-between shrink-0">
                                                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                                <MessageSquare className="w-4 h-4 text-sky-500" />
                                                                <span>3. Chế Độ Luyện Tập</span>
                                                            </label>
                                                        </div>

                                                        {/* Mode Toggle Pills: [💬 Chủ Đề] vs [⚡ 70 Bài Phản Xạ] */}
                                                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPracticeMode('topic')}
                                                                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border-2 ${practiceMode === 'topic'
                                                                        ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                                                                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                                    }`}
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <span>Theo Chủ Đề</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPracticeMode('lesson')}
                                                                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border-2 ${practiceMode === 'lesson'
                                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                                    }`}
                                                            >
                                                                <Zap className="w-3.5 h-3.5" />
                                                                <span>70 Bài Phản Xạ</span>
                                                            </button>
                                                        </div>

                                                        {/* Mode 1: TOPIC LIST */}
                                                        {practiceMode === 'topic' ? (
                                                            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                                {currentTopics.map((tpc) => {
                                                                    const isSelected = topic === tpc.id;
                                                                    return (
                                                                        <button
                                                                            key={tpc.id}
                                                                            type="button"
                                                                            onClick={() => setTopic(tpc.id)}
                                                                            className={`w-full p-2.5 rounded-2xl text-left border-2 border-b-3 transition-all cursor-pointer flex items-center justify-between select-none active:translate-y-0.5 active:border-b-1 ${isSelected
                                                                                    ? 'border-sky-500 bg-sky-50/80 dark:border-sky-400 dark:bg-sky-950/40 font-black text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/20 shadow-xs'
                                                                                    : 'border-slate-200/90 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                                                                }`}
                                                                        >
                                                                            <div className="min-w-0 pr-2">
                                                                                <p className="text-xs font-black truncate">{tpc.name}</p>
                                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{tpc.desc}</p>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shrink-0"></span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            /* Mode 2: 70 LESSONS REFLEX SELECTOR */
                                                            <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                                                                {/* Dropdown selector */}
                                                                <div className="shrink-0 space-y-1">
                                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                                                        <span>Chọn bài học phản xạ:</span>
                                                                        <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                                                                            {coachLessons.length} bài có sẵn
                                                                        </span>
                                                                    </label>
                                                                    <select
                                                                        value={selectedCoachLesson?.id || ''}
                                                                        onChange={(e) => {
                                                                            const found = coachLessons.find(l => l.id === e.target.value);
                                                                            if (found) setSelectedCoachLesson(found);
                                                                        }}
                                                                        className="w-full p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-amber-500 shadow-xs"
                                                                    >
                                                                        {coachLessons.map((l) => (
                                                                            <option key={l.id} value={l.id}>
                                                                                Bài {l.lessonNum}: {l.title.replace(/^Bài \d+\s*-\s*/, '')}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {/* Preview card of selected lesson */}
                                                                {selectedCoachLesson && (
                                                                    <div className="flex-1 min-h-0 overflow-y-auto p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/60 space-y-2 custom-scrollbar">
                                                                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-xs">
                                                                            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                                                                            <span>Chiến lược phản xạ ({selectedCoachLesson.steps?.[0]?.strategy?.length || 0} bước):</span>
                                                                        </div>
                                                                        <div className="space-y-1 pl-1">
                                                                            {selectedCoachLesson.steps?.[0]?.strategy?.map((st, sIdx) => (
                                                                                <p key={sIdx} className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                                                    {st}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                        {selectedCoachLesson.steps?.[0]?.personas?.length > 0 && (
                                                                            <div className="pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                                                                                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                                                                                    Nhân vật nhập vai:
                                                                                </p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {selectedCoachLesson.steps[0].personas.map((p, pIdx) => (
                                                                                        <span key={pIdx} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                                            {p.label}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 3D Duolingo CTA Button - ALWAYS PINNED AT BOTTOM, NO SCROLLING! */}
                                                    <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                                Chi phí hội thoại: <strong className="text-amber-600 dark:text-amber-400">3 Credit AI / lượt phản hồi</strong>
                                                            </span>
                                                            <AiCreditPill featureId="kaiwa_agent" isUnlimited={isUnlimited} compact />
                                                        </div>
                                                        <button
                                                            onClick={() => handleStartConversation()}
                                                            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-2 border-2 border-b-[5px] border-emerald-700 text-white font-black text-sm tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2.5 select-none shadow-lg shadow-emerald-500/20"
                                                        >
                                                            <Play className="w-5 h-5 fill-white" />
                                                            <span>{practiceMode === 'lesson' ? 'BẮT ĐẦU PHẢN XẠ BÀI HỌC' : 'BẮT ĐẦU TRÒ CHUYỆN AI'}</span>
                                                            <AiCostTag featureId="kaiwa_agent" darkBg />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                    )}
                                        </div>
                                    ) : (

                                        /* DUOLINGO 3D 100% FIT CHAT PANEL */
                                        <div className="w-full h-full max-h-full flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800/80 shadow-xl relative overflow-hidden z-10">
                                            {/* Top Terminal Header */}
                                            <div className="px-3.5 sm:px-5 py-3 border-b-2 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm relative z-20 shrink-0 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
                                                {/* Primary Header Row (Mobile & Desktop) */}
                                                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                                                    <div className="flex items-center gap-2.5">
                                                        <button
                                                            onClick={handleQuit}
                                                            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-2 border-b-3 border-slate-200 dark:border-slate-700 active:translate-y-0.5 active:border-b-1 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                                            title="Dừng luyện tập"
                                                        >
                                                            <ArrowLeft className="w-4 h-4" />
                                                        </button>

                                                        <div className="flex items-center gap-2.5">
                                                            <div className="relative shrink-0">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm border-2 ${currentTeachers.find(t => t.id === teacher)?.avatarBg || 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                                    {currentTeachers.find(t => t.id === teacher)?.avatar}
                                                                </div>
                                                                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 ${isAiSpeaking ? 'bg-amber-400 animate-ping' : (currentTeachers.find(t => t.id === teacher)?.badgeBg || 'bg-emerald-500')}`}></span>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-[130px] sm:max-w-none">
                                                                        {currentTeachers.find(t => t.id === teacher)?.name}
                                                                    </h3>
                                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-lg shrink-0 truncate max-w-[140px]">
                                                                        {currentTeachers.find(t => t.id === teacher)?.role || 'AI TEACHER'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">
                                                                    <span>{isEnglishMode ? `Level ${level}` : `JLPT ${level}`}</span>
                                                                    <span>•</span>
                                                                    {activeLessonSession ? (
                                                                        <span className="text-amber-600 dark:text-amber-400 font-black truncate max-w-[140px] sm:max-w-[200px]">
                                                                            ⚡ Bài {activeLessonSession.lessonNum}: {activeLessonSession.title.replace(/^Bài \d+\s*-\s*/, '')}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="truncate">
                                                                            {currentTopics.find(t => t.id === topic)?.name.split(' ')[1] || 'Free Talk'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Bar Quick Toggles (Call & Menu Drawer Trigger) */}
                                                    <div className="flex items-center gap-1.5 sm:hidden">
                                                        <button
                                                            onClick={() => {
                                                                setIsHandsFree(true);
                                                                setShowCallOverlay(true);
                                                            }}
                                                            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1 border-2 border-b-3 border-emerald-700 active:translate-y-0.5 active:border-b-1 cursor-pointer select-none"
                                                            title="Gợi gọi thoại FaceTime AI"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                            <span className="text-[11px]">{t('kaiwa.callAi', 'GỌI AI')}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => setShowMobileSettings(prev => !prev)}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-b-3 transition-all cursor-pointer ${showMobileSettings
                                                                    ? 'bg-emerald-500 text-white border-emerald-700 shadow-md'
                                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            title="Mở menu tùy chỉnh"
                                                        >
                                                            <SlidersHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Controls HUD Panel (Desktop always visible, Mobile collapsible drawer) */}
                                                <div className={`flex items-center gap-2 flex-wrap transition-all ${showMobileSettings ? 'flex pt-2 border-t border-slate-200 dark:border-slate-800 sm:border-0 sm:pt-0' : 'hidden sm:flex'}`}>
                                                    {/* Live AI Credit Pill */}
                                                    <AiCreditPill featureId="kaiwa_agent" isUnlimited={isUnlimited} compact />

                                                    {/* Hands-Free VAD Mode Toggle Button */}
                                                    <button
                                                        onClick={() => {
                                                            if (!isHandsFree) {
                                                                setShowHandsFreeConfirm(true);
                                                            } else {
                                                                stopVadLoop();
                                                                if (isRecordingRef.current) stopRecordingDirect();
                                                                setIsHandsFree(false);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border-2 border-b-3 active:translate-y-0.5 active:border-b-1 flex-1 sm:flex-none ${isHandsFree
                                                                ? 'bg-emerald-500 text-white border-emerald-700 shadow-md animate-pulse'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        title="Bật/Tắt chế độ rảnh tay tự động nhận diện giọng nói"
                                                    >
                                                        <Radio className={`w-3.5 h-3.5 ${isHandsFree ? 'text-white animate-spin-slow' : 'text-slate-500 dark:text-slate-400'}`} />
                                                        <span>{isHandsFree ? '⚡ HANDS-FREE: ON' : '🎙️ PUSH-TO-TALK'}</span>
                                                    </button>

                                                    {/* FaceTime Call Overlay Trigger Button (Desktop view) */}
                                                    <button
                                                        onClick={() => {
                                                            setIsHandsFree(true);
                                                            setShowCallOverlay(true);
                                                        }}
                                                        className="hidden sm:flex px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition-all border-2 border-b-3 border-emerald-700 active:translate-y-0.5 active:border-b-1 cursor-pointer items-center gap-1.5 select-none"
                                                        title="Bật màn hình Cuộc gọi thoại FaceTime AI"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>GỌI AI FACETIME</span>
                                                    </button>

                                                    {/* Scorecard Report HUD Button */}
                                                    <button
                                                        onClick={() => setShowScorecardModal(true)}
                                                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black transition-all border-2 border-b-3 border-amber-700 active:translate-y-0.5 active:border-b-1 cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-none select-none"
                                                        title="Xem báo cáo chấm điểm phản xạ Kaiwa"
                                                    >
                                                        <Trophy className="w-3.5 h-3.5 text-amber-100" />
                                                        <span>Báo Cáo HUD</span>
                                                    </button>

                                                    {/* Furigana Toggle */}
                                                    <button
                                                        onClick={() => setShowFurigana(prev => !prev)}
                                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-2 border-b-3 active:translate-y-0.5 active:border-b-1 ${showFurigana
                                                                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        title="Hiện/Ẩn Furigana"
                                                    >
                                                        Furigana
                                                    </button>

                                                    {/* Translation Toggle */}
                                                    <button
                                                        onClick={() => setShowTranslation(prev => !prev)}
                                                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 border-b-3 active:translate-y-0.5 active:border-b-1 ${showTranslation
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        title="Hiện/Ẩn Dịch nghĩa"
                                                    >
                                                        {showTranslation ? <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                                                    </button>

                                                    {/* Speech Speed */}
                                                    <button
                                                        onClick={() => setTtsRate(r => r === 1.0 ? 1.2 : r === 1.2 ? 0.8 : 1.0)}
                                                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-xs font-black cursor-pointer transition-all active:translate-y-0.5 active:border-b-1"
                                                        title="Tốc độ nói AI"
                                                    >
                                                        {ttsRate}x
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Chat Messages Body Log (Internally Scrollable Only) */}
                                            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 min-h-0 custom-scrollbar bg-slate-50/50 dark:bg-[#0c131f]/50">
                                                {conversation.map((msg, idx) => {
                                                    const isAi = msg.sender === 'ai';
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex items-start gap-2.5 sm:gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
                                                        >
                                                            {/* Avatar */}
                                                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
                                                                {isAi ? currentTeachers.find(t => t.id === teacher)?.avatar : '👤'}
                                                            </div>

                                                            {/* Bubble block */}
                                                            <div className="space-y-2 max-w-[90%] sm:max-w-[85%]">
                                                                {/* Speakable Speech bubble */}
                                                                <div className={`p-3.5 sm:p-4 rounded-3xl relative group transition-all border-2 border-b-4 ${isAi
                                                                        ? 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 rounded-tl-sm shadow-xs'
                                                                        : 'bg-emerald-600 text-white border-emerald-700 rounded-tr-sm shadow-sm'
                                                                    }`}>
                                                                    {/* Japanese content with Furigana */}
                                                                    <p
                                                                        className="text-sm sm:text-base font-japanese leading-relaxed sm:leading-loose whitespace-pre-wrap font-medium"
                                                                        dangerouslySetInnerHTML={{ __html: formatFurigana(msg.textJa) }}
                                                                    />

                                                                    {/* AI Speak trigger */}
                                                                    {isAi && (
                                                                        <button
                                                                            onClick={() => speakText(msg.textJa)}
                                                                            className="absolute -right-9 sm:-right-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer duration-150 shadow-xs"
                                                                            title="Phát lại âm thanh AI"
                                                                        >
                                                                            <Volume2 className="w-4 h-4" />
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
                                                                    <div className="bg-white dark:bg-slate-900 border-2 border-b-3 border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-2 shadow-xs">
                                                                        <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                                                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                                                <Activity className="w-3.5 h-3.5 animate-pulse" />
                                                                                <span>SPEECH TELEMETRY</span>
                                                                            </div>
                                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${msg.stats.fluencyScore >= 85
                                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                                                                    : msg.stats.fluencyScore >= 75
                                                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
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
                                                                    <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-b-4 border-amber-300 dark:border-amber-700 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2.5 shadow-sm">
                                                                        <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                                                                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                                                            <span>Gợi ý sửa câu từ AI:</span>
                                                                        </div>
                                                                        <div className="space-y-1 pl-1">
                                                                            <p className="line-through text-slate-400 dark:text-slate-500 font-japanese">
                                                                                Gốc: {msg.feedback.userOriginal}
                                                                            </p>
                                                                            <p className="font-japanese font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                                                                Nên nói: <span dangerouslySetInnerHTML={{ __html: formatFurigana(msg.feedback.correctedJa) }} />
                                                                            </p>
                                                                            {msg.feedback.explanationVi && (
                                                                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-1 italic font-sans">
                                                                                    Phân tích: {msg.feedback.explanationVi}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {/* 2 Touch-friendly Action Buttons */}
                                                                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-amber-200 dark:border-amber-800">
                                                                            <button
                                                                                onClick={() => handleReadCorrectedSentence(msg.feedback)}
                                                                                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-1 border-2 border-b-3 border-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer flex-1"
                                                                            >
                                                                                <Volume2 className="w-4 h-4" />
                                                                                <span>🔊 Đọc lại câu đúng</span>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleSkipCorrectionAndContinue()}
                                                                                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b-1 flex-1"
                                                                            >
                                                                                <ArrowRight className="w-4 h-4 text-emerald-500" />
                                                                                <span>➡️ Bỏ qua & Tiếp tục</span>
                                                                            </button>
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
                                                        <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                                                            {TEACHERS.find(t => t.id === teacher)?.avatar}
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 p-3.5 rounded-3xl rounded-tl-sm max-w-[80%] flex items-center gap-2 shadow-xs">
                                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 ml-1">AI Thinking...</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div ref={chatEndRef} />
                                            </div>

                                            {/* Speech Waveform Visualizer */}
                                            {(isRecording || isAiSpeaking) && (
                                                <div className="px-4 sm:px-6 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
                                                    <div className="flex items-center justify-between mb-1 font-mono text-[10px] sm:text-[11px]">
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 sm:gap-2">
                                                            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
                                                            {isRecording ? 'LIVE MIC SPECTRUM (VAD Active)...' : 'AI NEURAL SPEECH SPECTRUM...'}
                                                        </span>
                                                    </div>
                                                    <AudioWaveformVisualizer
                                                        analyserNode={isRecording ? micAnalyserRef.current : aiAnalyserRef.current}
                                                        isActive={true}
                                                        mode={isRecording ? 'mic' : 'ai'}
                                                        height={32}
                                                    />
                                                </div>
                                            )}

                                            {/* Chat Footer panel: Sticky Bottom Mic & Input Controllers */}
                                            <div className="p-3 sm:p-4 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative z-20 shrink-0 sticky bottom-0">
                                                {/* Correction Alert Banner */}
                                                {pendingCorrection && (
                                                    <div className="mb-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border-2 border-b-3 border-amber-300 dark:border-amber-700 rounded-2xl flex items-start gap-2.5 animate-fade-in shadow-xs">
                                                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                                        <div className="space-y-1 font-sans min-w-0">
                                                            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                                                                Hãy đọc hoặc nhập lại câu sửa bên dưới để tiếp tục hội thoại:
                                                            </p>
                                                            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-japanese animate-pulse truncate" dangerouslySetInnerHTML={{ __html: formatFurigana(pendingCorrection.corrected) }}>
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quick Suggestions label */}
                                                {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">💡 GỢI Ý TRẢ LỜI:</p>
                                                )}

                                                {/* Quick suggestions pills (Mobile horizontal scrollable, Desktop flex-wrap) */}
                                                {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                                                    <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-wrap">
                                                        {conversation[conversation.length - 1].suggestions.map((sug, idx) => {
                                                            const cleanText = sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    disabled={isAiSpeaking || isGenerating || isTranscribing}
                                                                    onClick={() => {
                                                                        speakText(cleanText);
                                                                        setInputText(cleanText);
                                                                    }}
                                                                    title={isAiSpeaking ? "Vui lòng chờ AI nói xong" : "Bấm để nghe phát âm mẫu (Dùng Mic / Phím Cách để nói)"}
                                                                    className="px-3.5 py-2 rounded-xl border-2 border-b-3 border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer font-japanese transition-all shadow-xs active:translate-y-0.5 active:border-b-1 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0 sm:shrink whitespace-nowrap"
                                                                >
                                                                    <Volume1 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                    <span>{cleanText}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Microphone live status HUD */}
                                                {(isRecording || isTranscribing) && (
                                                    <div className="mb-2.5 px-3 py-2 bg-emerald-50 dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-mono shadow-xs">
                                                        <span className={`w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 ${isRecording ? 'animate-ping' : 'animate-pulse'}`}></span>
                                                        <span className="font-bold">{isRecording ? 'VAD RECOGNIZING:' : 'NEURAL WHISPER:'}</span>
                                                        <span className="italic font-japanese text-slate-700 dark:text-slate-200 truncate">{transcript || (isRecording ? 'Hãy nói tiếng Nhật...' : 'Đang xử lý giọng nói...')}</span>
                                                    </div>
                                                )}

                                                {/* Duolingo 3D Mic Control Center */}
                                                <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-1">
                                                    {/* Micro Orb Control with Glowing Pulse Rings */}
                                                    <div className="relative flex items-center justify-center">
                                                        {/* Outer Pulsing Wave Halo */}
                                                        {isRecording && (
                                                            <span className="absolute w-24 h-24 rounded-full bg-rose-500/30 dark:bg-rose-500/20 animate-ping pointer-events-none"></span>
                                                        )}
                                                        {isHandsFree && !isRecording && !isGenerating && !isTranscribing && !isAiSpeaking && (
                                                            <span className="absolute w-20 h-20 rounded-full bg-emerald-500/20 dark:bg-emerald-500/15 animate-pulse pointer-events-none"></span>
                                                        )}
                                                        {isAiSpeaking && (
                                                            <span className="absolute w-20 h-20 rounded-full bg-amber-500/30 dark:bg-amber-500/20 animate-ping pointer-events-none"></span>
                                                        )}

                                                        {/* Central 3D Duolingo Mic Button */}
                                                        <button
                                                            onMouseDown={startRecording}
                                                            onMouseUp={stopRecording}
                                                            onMouseLeave={stopRecording}
                                                            onTouchStart={startRecording}
                                                            onTouchEnd={stopRecording}
                                                            onTouchCancel={stopRecording}
                                                            disabled={isGenerating || isTranscribing || isAiSpeaking}
                                                            className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-150 select-none border-4 border-b-[6px] active:translate-y-1 active:border-b-4 ${isAiSpeaking
                                                                    ? 'bg-slate-400 dark:bg-slate-700 border-slate-500 opacity-60 cursor-not-allowed'
                                                                    : isRecording
                                                                        ? 'bg-rose-500 border-rose-700 shadow-rose-500/40 scale-105 cursor-pointer'
                                                                        : isHandsFree
                                                                            ? 'bg-emerald-500 border-emerald-700 shadow-emerald-500/40 hover:scale-105 cursor-pointer'
                                                                            : 'bg-emerald-500 border-emerald-700 shadow-emerald-600/40 hover:scale-105 cursor-pointer'
                                                                }`}
                                                            title={isAiSpeaking ? "Vui lòng chờ AI nói xong" : (isHandsFree ? "VAD đang tự động nhận diện (Nhấn giữ/chạm để nói trực tiếp)" : "Nhấn giữ để nói, thả ra để gửi")}
                                                        >
                                                            {isRecording ? (
                                                                <MicOff className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-white" />
                                                            ) : (
                                                                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Dynamic Status Label */}
                                                    <div className="text-center">
                                                        <p className="text-[11px] sm:text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                            {isRecording ? (
                                                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-pulse">
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                                                    ĐANG LẮNG NGHE GIỌNG NÓI...
                                                                </span>
                                                            ) : isTranscribing ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
                                                                    <Cpu className="w-3.5 h-3.5 animate-spin-slow" />
                                                                    CHUYỂN GIỌNG NÓI THÀNH VĂN BẢN...
                                                                </span>
                                                            ) : isGenerating ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    AI ĐANG TẠO CÂU TRẢ LỜI...
                                                                </span>
                                                            ) : isAiSpeaking ? (
                                                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-pulse">
                                                                    <Volume2 className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                                                                    AI ĐANG NÓI... (CHỜ AI NÓI XONG)
                                                                </span>
                                                            ) : isHandsFree ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                                                    HANDS-FREE VAD: NÓI TRỰC TIẾP QUA MIC
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold">
                                                                    GIỮ NÚT MIC HOẶC PHÍM CÁCH ĐỂ NÓI • THẢ RA ĐỂ GỬI
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    {/* Dual-mode usage hint */}
                                                    {!isRecording && !isTranscribing && !isGenerating && (
                                                        <div className="flex items-center gap-2.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 flex-wrap justify-center">
                                                            <span className="flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">Chạm / Mouse</span>
                                                                Giữ nút Mic
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                                            <span className="flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold tracking-wider">SPACE</span>
                                                                Giữ Phím Cách
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Duolingo 3D Quit Confirmation Modal */}
                                {showQuitConfirmModal && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                                        <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-5">
                                            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-b-4 border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-2xl">
                                                🛑
                                            </div>
                                            <div className="text-center space-y-1.5">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                                    Dừng buổi luyện tập?
                                                </h3>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    Bạn có chắc muốn rời khỏi phòng? Lịch sử cuộc trò chuyện sẽ không được lưu.
                                                </p>
                                            </div>
                                            <div className="flex gap-2.5">
                                                <button
                                                    onClick={() => setShowQuitConfirmModal(false)}
                                                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-black border-2 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                                                >
                                                    TIẾP TỤC HỌC
                                                </button>
                                                <button
                                                    onClick={confirmQuit}
                                                    className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black border-2 border-b-4 border-rose-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                                                >
                                                    THOÁT RA
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-2 border-emerald-700 text-white text-sm font-black transition-all cursor-pointer select-none"
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
                                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black rounded-2xl transition-all cursor-pointer text-sm select-none"
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

                                {/* Kaiwa Scorecard Report Modal */}
                                <KaiwaScorecardModal
                                    isOpen={showScorecardModal}
                                    onClose={() => setShowScorecardModal(false)}
                                    conversation={conversation}
                                    selectedLevel={level}
                                    selectedTeacher={currentTeachers.find(t => t.id === teacher)}
                                />

                                {/* FaceTime AI Phone Call Overlay HUD */}
                                <AiKaiwaCallOverlay
                                    isOpen={showCallOverlay}
                                    onClose={() => setShowCallOverlay(false)}
                                    teacher={currentTeachers.find(t => t.id === teacher)}
                                    isAiSpeaking={isAiSpeaking}
                                    isRecording={isRecording}
                                    isGenerating={isGenerating}
                                    isTranscribing={isTranscribing}
                                    latestAiText={conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' ? conversation[conversation.length - 1].textJa : ''}
                                    latestUserText={conversation.length > 0 && conversation[conversation.length - 1].sender === 'user' ? conversation[conversation.length - 1].text : ''}
                                    onToggleMute={() => setIsMuted(prev => !prev)}
                                    isMuted={isMuted}
                                />
                            </div>
                        );
};

                        export default JLPTKaiwaScreen;
