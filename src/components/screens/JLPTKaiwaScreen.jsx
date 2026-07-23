import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MessageSquare, Mic, MicOff, Volume2, VolumeX, Eye, EyeOff, 
    ArrowLeft, Settings, Sparkle, AlertCircle, CheckCircle2, 
    Play, Send, RefreshCw, Star, Info, Languages, Radio,
    Activity, Zap, Award, Lightbulb, Volume1, X, ShieldAlert, Cpu, Terminal, Sparkles
} from 'lucide-react';
import { callKaiwaAI, parseJsonFromAI, callWhisperSTT, callOpenAITTS } from '../../utils/aiProvider';
import { ROUTES } from '../../router';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';

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

// Predefined Cyber Kaiwa Topics
const TOPICS = [
    { id: 'free_talk', name: '💬 Trò chuyện tự do (Free Talk)', desc: 'Tự do trao đổi về bất kỳ chủ đề đời sống, sở thích hay quan điểm nào.' },
    { id: 'convenience_store', name: '🏪 Mua sắm Konbini (🏪)', desc: 'Thanh toán, yêu cầu quay nóng đồ ăn, mua vé, giao tiếp nhanh tại Konbini.' },
    { id: 'interview', name: '🏢 Phỏng vấn Arubaito / Việc làm', desc: 'Tập trả lời các câu hỏi phỏng vấn xin việc làm thêm hoặc công sở Nhật.' },
    { id: 'restaurant', name: '🍕 Đặt bàn & Llamada nhà hàng', desc: 'Luyện đặt bàn trước, chọn món ăn, yêu cầu tách hóa đơn thanh toán.' },
    { id: 'asking_directions', name: '🗺️ Hỏi đường & Giao thông', desc: 'Hỏi đường ga tàu, di chuyển xe buýt, mua vé shinkansen.' },
    { id: 'school_life', name: '🏫 Học đường & Du học sinh', desc: 'Trò chuyện sinh hoạt trường lớp, câu lạc bộ, bài tập & bạn bè.' }
];

const JLPTKaiwaScreen = ({ profile, isAdmin }) => {
    const navigate = useNavigate();
    
    // Core setup states
    const [step, setStep] = useState('setup'); // 'setup' | 'chat'
    const [level, setLevel] = useState('N3');
    const [teacher, setTeacher] = useState('sakura');
    const [topic, setTopic] = useState('free_talk');
    
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
    const [isSpeechBlockOpen, setIsSpeechBlockOpen] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    // Audio/Speech states
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);

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

                    const SILENCE_THRESHOLD = 14; 
                    const MAX_SILENCE_DURATION = 750; // Cutoff recording in 0.75s after user stops speaking
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
        if (isRecordingRef.current || isGenerating || isTranscribing) return;
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
                    const text = await callWhisperSTT(audioBlob);
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
        } catch (err) {
            console.warn('Failed to stop recording:', err);
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
        if (isMuted) return;
        setIsAiSpeaking(true);
        
        // Strip out furigana reading brackets completely for TTS (handles Katakana, Kanji, Romaji)
        const cleanText = text.replace(/([^\s\[\]]+)\[([^\]]+)\]/g, '$1').replace(/\[[^\]]+\]/g, '');
        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const gender = selectedTeacher ? selectedTeacher.gender : 'female';

        try {
            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audioUrl = await callOpenAITTS(cleanText, gender);
            if (!audioUrl) {
                throw new Error('No premium neural TTS key configured');
            }
            
            audioRef.current.src = audioUrl;
            audioRef.current.playbackRate = ttsRate;
            audioRef.current.onended = () => setIsAiSpeaking(false);
            audioRef.current.onerror = () => setIsAiSpeaking(false);

            await audioRef.current.play();
        } catch (err) {
            console.log('Neural TTS fallback to WebSpeech:', err.message);
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'ja-JP';
                utterance.rate = ttsRate;
                utterance.onend = () => setIsAiSpeaking(false);
                utterance.onerror = () => setIsAiSpeaking(false);

                const voice = getBestJapaneseVoice(gender);
                if (voice) utterance.voice = voice;

                window.speechSynthesis.speak(utterance);
            } else {
                setIsAiSpeaking(false);
            }
        }
    };

    // Unlock browser audio context
    const unlockAudio = () => {
        if (audioRef.current && !audioRef.current.src) {
            audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
            audioRef.current.play().catch((e) => console.log('Audio unlock check:', e.message));
        }
    };

    // Parse Furigana for HTML output with Cyber highlight styling
    const formatFurigana = (text) => {
        if (!text) return '';
        if (!showFurigana) {
            return text.replace(/([^\s\[\]]+)\[([^\]]+)\]/g, '$1').replace(/\[[^\]]+\]/g, '');
        }
        return text.replace(/([^\s\[\]]+)\[([^\]]+)\]/g, '<ruby>$1<rt class="text-[10px] font-bold select-none text-rose-600 dark:text-rose-400">$2</rt></ruby>');
    };

    // Helper to start the Kaiwa session
    const handleStartConversation = async () => {
        unlockAudio();
        setStep('chat');
        setIsGenerating(true);
        setConversation([]);
        setPendingCorrection(null);

        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const selectedTopic = TOPICS.find(t => t.id === topic);

        const systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
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
            "2 đến 3 câu gợi ý phản xạ ngắn bằng tiếng Nhật kèm Furigana dạng Chữ[Furigana]"
          ],
          "speechAnalytics": {
            "fluencyScore": 90,
            "fluencyLabel": "Trôi chảy",
            "pronunciationTips": "Chào mừng bạn đến buổi học Kaiwa!"
          }
        }`;

        try {
            const resultText = await callKaiwaAI(systemPrompt, [], "Bắt đầu hội thoại.");
            const parsed = parseJsonFromAI(resultText);
            
            if (parsed) {
                const aiMsg = {
                    sender: 'ai',
                    textJa: parsed.replyJa,
                    textVi: parsed.replyVi,
                    suggestions: parsed.suggestions || [],
                    feedback: null
                };
                setConversation([aiMsg]);
                speakText(parsed.replyJa);
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            setConversation([{
                sender: 'ai',
                textJa: 'こんにちは！接続に問題が発生したようです。もう一度やり直してください。',
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

        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const selectedTopic = TOPICS.find(t => t.id === topic);

        let systemPrompt = '';
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
            3. NẾU HỌC VIÊN ĐỌC VẪN SAI / CHƯA ĐÚNG:
               - "feedback.hasError" là true.
               - "feedback.userOriginal" là "${messageText}".
               - "feedback.correctedJa" là "${pendingCorrection.corrected}".
               - "feedback.explanationVi" giải thích lỗi phát âm/dùng từ bằng tiếng Việt.
               - "replyJa": Yêu cầu học viên thử đọc lại câu đúng "${pendingCorrection.corrected}". TUYỆT ĐỐI KHÔNG hỏi câu mới.
            
            Định dạng phản hồi: Bắt buộc trả về cấu trúc JSON:
            {
              "replyJa": "Nội dung câu nói của giáo viên kèm Furigana dạng Chữ[Furigana]",
              "replyVi": "Bản dịch tiếng Việt",
              "feedback": { "hasError": true/false, "userOriginal": "...", "correctedJa": "...", "explanationVi": "..." },
              "suggestions": ["${pendingCorrection.corrected}"],
              "speechAnalytics": { "fluencyScore": 85, "fluencyLabel": "...", "pronunciationTips": "..." }
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
                 + "suggestions": [ [correctedJa] ]
               - NẾU HỌC VIÊN NÓI CHUẨN (KHÔNG CÓ LỖI):
                 + "feedback.hasError" là false.
                 + "replyJa": Phản hồi tự nhiên + hỏi câu tiếp theo ngắn gọn (1-2 câu).
                 + "suggestions": [ 2 đến 3 câu gợi ý phản xạ ngắn ]
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
                "câu gợi ý phản xạ hoặc câu cần đọc lại"
              ],
              "speechAnalytics": {
                "fluencyScore": 88,
                "fluencyLabel": "Trôi chảy",
                "pronunciationTips": "Phát âm rõ ràng, ngữ điệu tự nhiên"
              }
            }`;
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

                const aiReply = {
                    sender: 'ai',
                    textJa: parsed.replyJa,
                    textVi: parsed.replyVi,
                    suggestions: parsed.suggestions || [],
                    feedback: null
                };
                setConversation(prev => [...prev, aiReply]);
                speakText(parsed.replyJa);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setConversation(prev => [...prev, {
                sender: 'ai',
                textJa: 'すみません, もう一度言っていただくか, メッセージを再送信してください。',
                textVi: 'Xin lỗi, bạn có thể nói lại hoặc gửi lại tin nhắn được không?',
                suggestions: []
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
        <div className="w-full min-h-[calc(100vh-70px)] flex flex-col justify-start py-6 px-3 md:px-6 relative overflow-hidden font-sans text-slate-800 dark:text-slate-100 selection:bg-cyan-500 selection:text-white">

            {step === 'setup' ? (
                /* FUTURISTIC SETUP PANEL */
                <div className="w-full max-w-5xl mx-auto space-y-8 relative z-10">
                    {/* Sci-Fi HUD Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400 text-xs font-mono tracking-widest uppercase shadow-sm">
                            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                            <span>NEURAL KAIWA AGENT v3.5 • VOICE VAD ENGINE</span>
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-cyan-200 dark:to-indigo-300 tracking-tight drop-shadow-sm">
                            Phòng Kaiwa AI Thế Hệ Mới
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-normal leading-relaxed">
                            Trải nghiệm công nghệ nhận diện giọng nói rảnh tay <span className="text-cyan-600 dark:text-cyan-400 font-bold">Hands-Free VAD</span>, phân tích âm điệu real-time & phản xạ giao tiếp tự nhiên với Giáo viên AI bản xứ.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. LEVEL SELECTION */}
                        <div className="md:col-span-2 space-y-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-cyan-500/20 shadow-xl shadow-slate-200/50 dark:shadow-none relative group">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="font-bold text-indigo-700 dark:text-cyan-400 flex items-center gap-2.5 text-sm uppercase tracking-wider font-mono">
                                    <Languages className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                                    [01] CHỌN CẤP ĐỘ JLPT MỤC TIÊU
                                </h3>
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">LEXICON MATCHING</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                {LEVELS.map((lvl) => {
                                    const isSelected = level === lvl.value;
                                    return (
                                        <button
                                            key={lvl.value}
                                            onClick={() => setLevel(lvl.value)}
                                            className={`p-4 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/80 dark:border-cyan-400 dark:bg-cyan-950/60 shadow-md scale-[1.02]' 
                                                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-md text-white bg-gradient-to-r ${lvl.gradient} tracking-wider font-mono shadow-sm`}>
                                                    {lvl.label}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                                    {lvl.tag}
                                                </span>
                                            </div>
                                            <p className="mt-3 font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
                                                <span>Cấp độ {lvl.value}</span>
                                                {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-cyan-400 animate-ping"></span>}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                {lvl.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. TEACHER SELECTION */}
                        <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-indigo-500/20 shadow-xl shadow-slate-200/50 dark:shadow-none">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2.5 text-sm uppercase tracking-wider font-mono">
                                    <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    [02] GIÁO VIÊN AI
                                </h3>
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">VOICE SYNTH</span>
                            </div>

                            <div className="flex flex-col gap-3.5 pt-1">
                                {TEACHERS.map((tc) => {
                                    const isSelected = teacher === tc.id;
                                    return (
                                        <button
                                            key={tc.id}
                                            onClick={() => setTeacher(tc.id)}
                                            className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-start gap-3.5 cursor-pointer relative overflow-hidden ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/80 dark:border-indigo-400 dark:bg-indigo-950/60 shadow-md scale-[1.02]' 
                                                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl border ${isSelected ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-200 dark:border-slate-700'}`}>
                                                    {tc.avatar}
                                                </div>
                                                {isSelected && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-ping"></span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                        {tc.name}
                                                    </h4>
                                                    {isSelected && (
                                                        <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                                                            ACTIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                                                    {tc.role}
                                                </span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                                                    {tc.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 3. TOPIC SELECTION */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-cyan-500/20 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-indigo-700 dark:text-cyan-400 flex items-center gap-2.5 text-sm uppercase tracking-wider font-mono">
                                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                                [03] CHỌN NGỮ CẢNH HỘI THOẠI REAL-WORLD
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">6 SCENARIOS</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
                            {TOPICS.map((tpc) => {
                                const isSelected = topic === tpc.id;
                                return (
                                    <button
                                        key={tpc.id}
                                        onClick={() => setTopic(tpc.id)}
                                        className={`p-4 rounded-2xl text-left border transition-all duration-300 cursor-pointer ${
                                            isSelected 
                                                ? 'border-indigo-600 bg-indigo-50/80 dark:border-cyan-400 dark:bg-cyan-950/60 shadow-md ring-1 ring-indigo-500/30 dark:ring-cyan-400/50' 
                                                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate flex items-center justify-between">
                                            <span>{tpc.name}</span>
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-cyan-400"></span>}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                            {tpc.desc}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* FUTURISTIC LAUNCH BUTTON */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={handleStartConversation}
                            className="relative group px-12 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 text-white font-black text-base tracking-wide shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-3 border border-indigo-400/30"
                        >
                            <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></span>
                            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                            <span>KÍCH HOẠT PHÒNG HỌC NEURAL KAIWA</span>
                            <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                        </button>
                    </div>
                </div>
            ) : (
                /* FUTURISTIC CHAT PANEL */
                <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-cyan-500/30 shadow-2xl relative overflow-hidden z-10">
                    {/* Sci-Fi Top Cyber Terminal Header */}
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between bg-slate-50 dark:bg-slate-950 relative z-20 gap-3">
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
                                        {TEACHERS.find(t => t.id === teacher)?.avatar}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${isAiSpeaking ? 'bg-cyan-400 animate-ping' : 'bg-emerald-500'}`}></span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm font-mono">
                                            {TEACHERS.find(t => t.id === teacher)?.name}
                                        </h3>
                                        <span className="text-[10px] font-mono text-indigo-700 dark:text-cyan-400 bg-indigo-50 dark:bg-cyan-950/60 border border-indigo-200 dark:border-cyan-800/60 px-1.5 py-0.2 rounded font-bold">
                                            AI CORE
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                        JLPT {level} • {TOPICS.find(t => t.id === topic)?.name.split(' ')[1] || 'Free Talk'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Controls HUD Panel */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Hands-Free VAD Mode Toggle Button */}
                            <button
                                onClick={() => {
                                    setIsHandsFree(prev => {
                                        const nextState = !prev;
                                        if (!nextState) {
                                            stopVadLoop();
                                            if (isRecordingRef.current) stopRecordingDirect();
                                        }
                                        return nextState;
                                    });
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

                            {/* Mute */}
                            <button
                                onClick={() => setIsMuted(prev => !prev)}
                                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                                    isMuted 
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-200 dark:border-slate-750'
                                }`}
                                title="Bật/Tắt âm thanh AI"
                            >
                                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages Body Log */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-h-[calc(100vh-270px)] custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
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
                        <div className="px-6 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-cyan-500/30">
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

                    {/* Chat Footer panel: Suggestions + Microphone controllers */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative z-10">
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

                        {/* Quick Suggestions & Speech Helper Toggle */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                💡 GỢI Ý PHẢN XẠ NHANH:
                            </span>

                            {/* Speech Block Helper button */}
                            <button
                                onClick={() => setIsSpeechBlockOpen(prev => !prev)}
                                className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                Bị "Tịt từ"? (Speech Helper)
                            </button>
                        </div>

                        {/* Speech Block Helper Drawer */}
                        {isSpeechBlockOpen && (
                            <div className="mb-4 p-4 bg-amber-50/90 dark:bg-slate-900 border border-amber-200 dark:border-amber-500/40 rounded-2xl space-y-3 relative shadow-xl">
                                <div className="flex items-center justify-between border-b border-amber-200 dark:border-slate-800 pb-2">
                                    <h4 className="font-mono font-bold text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2 uppercase">
                                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        Mẫu câu phản xạ khẩn cấp ({level})
                                    </h4>
                                    <button 
                                        onClick={() => setIsSpeechBlockOpen(false)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { levelLabel: 'Sơ cấp (Đơn giản)', ja: 'はい、わかりました。ありがとうございます。', vi: 'Vâng, tôi đã hiểu. Xin cảm ơn bạn.' },
                                        { levelLabel: 'Trung cấp (Tự nhiên)', ja: 'すみません、もう一度説明していただけますか。', vi: 'Xin lỗi, bạn có thể giải thích lại một lần nữa giúp tôi được không?' },
                                        { levelLabel: 'Nâng cao (Chuyên nghiệp)', ja: '大変参考になりました。ぜひ検討させていただきます。', vi: 'Rất hữu ích đối với tôi. Tôi nhất định sẽ suy nghĩ/cân nhắc về điều này.' }
                                    ].map((hint, hIdx) => (
                                        <div key={hIdx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-amber-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm">
                                            <div className="space-y-0.5 flex-1 min-w-0">
                                                <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 uppercase">
                                                    {hint.levelLabel}
                                                </span>
                                                <p className="text-xs font-japanese font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                    {hint.ja}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate font-sans">
                                                    {hint.vi}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => speakText(hint.ja)}
                                                    className="p-2 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                                                    title="Nghe phát âm thử"
                                                >
                                                    <Volume1 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleSendUserMessage(hint.ja);
                                                        setIsSpeechBlockOpen(false);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono transition-colors cursor-pointer"
                                                >
                                                    Gửi ngay
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick suggestions pills */}
                        {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {conversation[conversation.length - 1].suggestions.map((sug, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const cleanText = sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
                                            handleSendUserMessage(cleanText);
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-cyan-400 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer font-japanese transition-all shadow-sm"
                                    >
                                        {sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1')}
                                    </button>
                                ))}
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

                        {/* Message Input Controllers */}
                        <div className="flex items-center gap-3">
                            {/* Microphone recording button */}
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                onTouchCancel={stopRecording}
                                className={`p-4 rounded-2xl text-white shadow-lg cursor-pointer transition-all flex-shrink-0 select-none border ${
                                    isRecording 
                                        ? 'bg-red-600 hover:bg-red-700 border-red-400 shadow-red-500/30 scale-105' 
                                        : isHandsFree 
                                        ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 shadow-cyan-500/30'
                                        : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-600/30'
                                }`}
                                title={isHandsFree ? "VAD đang chủ động ghi âm tự động (Nhấn giữ nếu muốn thu trực tiếp)" : "Nhấn giữ để nói, buông ra để gửi"}
                            >
                                {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                            </button>

                            {/* Text Input Box */}
                            <div className="flex-1 relative flex items-center">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSendUserMessage();
                                        }
                                    }}
                                    disabled={isGenerating || isTranscribing}
                                    placeholder={
                                        isRecording 
                                            ? '🟢 Hands-Free VAD đang lắng nghe giọng nói...' 
                                            : isTranscribing 
                                            ? '⚡ Whisper đang chuyển giọng nói thành văn bản...' 
                                            : isHandsFree
                                            ? '⚡ VAD Auto-Detecting... (Nói trực tiếp hoặc Nhập văn bản)'
                                            : 'Nói trực tiếp hoặc Nhập tin nhắn tiếng Nhật...'
                                    }
                                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-indigo-500/30 transition-all font-japanese placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                                />
                                
                                {/* Manual send trigger */}
                                <button
                                    onClick={() => handleSendUserMessage()}
                                    disabled={!inputText.trim() || isGenerating}
                                    className="absolute right-2 p-2 rounded-xl text-indigo-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JLPTKaiwaScreen;
