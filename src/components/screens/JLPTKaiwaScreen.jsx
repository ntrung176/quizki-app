import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MessageSquare, Mic, MicOff, Volume2, VolumeX, Eye, EyeOff, 
    ArrowLeft, Settings, Sparkle, AlertCircle, CheckCircle2, 
    Play, Send, RefreshCw, Star, Info, Languages
} from 'lucide-react';
import { callKaiwaAI, parseJsonFromAI, callWhisperSTT, callOpenAITTS } from '../../utils/aiProvider';
import { ROUTES } from '../../router';

// Level configurations with style gradients
const LEVELS = [
    { value: 'N5', label: 'JLPT N5', desc: 'Sơ cấp 1 (Chào hỏi, sinh hoạt cơ bản)', gradient: 'from-emerald-500 to-teal-600' },
    { value: 'N4', label: 'JLPT N4', desc: 'Sơ cấp 2 (Giao tiếp thường nhật đơn giản)', gradient: 'from-teal-500 to-cyan-600' },
    { value: 'N3', label: 'JLPT N3', desc: 'Trung cấp (Trao đổi quan điểm, đời sống/công việc)', gradient: 'from-blue-500 to-indigo-600' },
    { value: 'N2', label: 'JLPT N2', desc: 'Thượng trung cấp (Bàn luận xã hội, công sở chuyên sâu)', gradient: 'from-sky-500 to-blue-600' },
    { value: 'N1', label: 'JLPT N1', desc: 'Cao cấp (Hội thoại chuyên sâu, học thuật/thương mại)', gradient: 'from-rose-500 to-red-600' }
];

// Virtual Teachers
const TEACHERS = [
    {
        id: 'sakura',
        name: 'Sakura-sensei',
        gender: 'female',
        avatar: '🌸',
        desc: 'Giáo viên Nữ. Giọng đọc nhẹ nhàng, tốc độ chậm rãi, sử dụng từ ngữ lịch sự, phù hợp cấp độ N5 - N3.',
        systemName: 'Sakura-sensei'
    },
    {
        id: 'kenji',
        name: 'Kenji-sensei',
        gender: 'male',
        avatar: '💼',
        desc: 'Giáo viên Nam. Phong cách chuẩn công sở và hội thoại tự nhiên của nam giới Nhật Bản, phù hợp cấp độ N3 - N1.',
        systemName: 'Kenji-sensei'
    }
];

// Predefined conversation topics
const TOPICS = [
    { id: 'free_talk', name: '💬 Trò chuyện tự do (Free Talk)', desc: 'Tự do trao đổi về bất kỳ chủ đề gì bạn muốn.' },
    { id: 'convenience_store', name: '🏪 Mua sắm tại Konbini', desc: 'Luyện giao tiếp thanh toán, mua đồ ăn, hỏi lò vi sóng...' },
    { id: 'interview', name: '🏢 Phỏng vấn việc làm thêm (Arubaito)', desc: 'Tập trả lời các câu hỏi phỏng vấn phổ biến của chủ cửa hàng.' },
    { id: 'restaurant', name: '🍕 Đặt bàn & Gọi món tại nhà hàng', desc: 'Luyện gọi món, đặt bàn trước, yêu cầu thanh toán hóa đơn.' },
    { id: 'asking_directions', name: '🗺️ Hỏi đường & Đi lại', desc: 'Luyện cách hỏi ga tàu, chỉ đường đi đến địa điểm cụ thể.' },
    { id: 'school_life', name: '🏫 Đời sống học đường', desc: 'Trò chuyện về các câu lạc bộ, bài tập, bạn bè ở trường Nhật ngữ.' }
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
    
    // Audio/Speech states
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const chatEndRef = useRef(null);
    const isRecordingRef = useRef(false);
    const audioRef = useRef(new Audio());

    // Check MediaRecorder support on mount and cleanup audio
    useEffect(() => {
        if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setSpeechSupported(false);
        }
        // Warm up Web Speech Synthesis voices list for instant availability
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation, isGenerating]);

    // Handle Speech-to-Text hold-to-speak logic
    const startRecording = async (e) => {
        if (e) e.preventDefault();
        unlockAudio();
        if (!speechSupported) {
            alert('Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp. Vui lòng sử dụng Chrome, Edge hoặc Safari.');
            return;
        }

        setIsRecording(true);
        isRecordingRef.current = true;
        setTranscript('Đang ghi âm giọng nói...');
        audioChunksRef.current = [];

        try {
            window.speechSynthesis.cancel(); // Mute teacher

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks to release microphone hardware indicator
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // Compile the chunks into a blob
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // If the hold was cancelled or aborted, don't transcribe
                if (audioBlob.size < 2000) {
                    console.log('🎙️ Audio recording too short or empty, ignoring.');
                    return;
                }

                setIsTranscribing(true);
                setTranscript('Đang xử lý giọng nói...');
                try {
                    const text = await callWhisperSTT(audioBlob);
                    
                    // Filter Whisper hallucinations for silence/noise
                    const clean = text ? text.trim() : '';
                    const hallucinations = [
                        'ご視聴ありがとうございました',
                        'ご視聴ありがとうございました。',
                        'チャンネル登録よろしくお願いします',
                        'チャンネル登録よろしくお願いします。',
                        '視聴していただきありがとうございました',
                        '視聴していただきありがとうございました。',
                        'お勧めします',
                        'お楽しみください'
                    ];

                    const isHallucination = hallucinations.some(h => clean.includes(h) || h.includes(clean)) && clean.length < 25;

                    if (isHallucination || !clean) {
                        console.warn('🎙️ Whisper hallucination detected or silence, ignored:', clean);
                        alert('Không nghe rõ giọng nói của bạn. Vui lòng giữ nút mic lâu hơn và nói rõ ràng nhé!');
                        return;
                    }

                    handleSendUserMessage(clean);
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
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert('Trình duyệt chưa được cấp quyền truy cập Microphone. Vui lòng bật quyền microphone ở góc thanh địa chỉ trình duyệt.');
            } else {
                alert('Không tìm thấy thiết bị Microphone kết nối với máy tính.');
            }
            setIsRecording(false);
            isRecordingRef.current = false;
            setTranscript('');
        }
    };

    const stopRecording = (e) => {
        if (e) e.preventDefault();
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

    // Find the best available Japanese voice in the browser
    const getBestJapaneseVoice = (gender) => {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang === 'ja_JP');

        if (jaVoices.length === 0) return null;

        if (gender === 'female') {
            // 1. Edge Neural Female Voice
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('nanami') && v.name.toLowerCase().includes('online'));
            if (voice) return voice;

            // 2. Google Japanese Voice (Chrome)
            voice = jaVoices.find(v => v.name.toLowerCase().includes('google') || v.name.includes('日本語'));
            if (voice) return voice;

            // 3. Standard female voices
            voice = jaVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('sakura') || v.name.toLowerCase().includes('haruka') || v.name.toLowerCase().includes('shiori'));
            if (voice) return voice;
        } else {
            // 1. Edge Neural Male Voice
            let voice = jaVoices.find(v => v.name.toLowerCase().includes('keita') && v.name.toLowerCase().includes('online'));
            if (voice) return voice;

            // 2. Standard male voices
            voice = jaVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('kenji') || v.name.toLowerCase().includes('keita') || v.name.toLowerCase().includes('ichiro'));
            if (voice) return voice;
        }

        // Fallback to first available ja-JP voice
        return jaVoices[0];
    };

    // Text-to-Speech (TTS) Reader
    const speakText = async (text) => {
        if (isMuted) return;
        
        // Remove ruby/furigana markup if any: e.g. "今日[きょう]" -> "今日"
        const cleanText = text.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const gender = selectedTeacher ? selectedTeacher.gender : 'female';

        try {
            // Stop any playing audio
            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audioUrl = await callOpenAITTS(cleanText, gender);
            if (!audioUrl) {
                throw new Error('No premium neural TTS key configured');
            }
            
            audioRef.current.src = audioUrl;
            audioRef.current.playbackRate = ttsRate;
            
            // Await play to handle network or autoplay issues and catch failures in try-catch
            await audioRef.current.play();
        } catch (err) {
            console.log('Neural TTS fallback to browser WebSpeech. Reason:', err.message);
            // Fallback to legacy WebSpeech if audio fails
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel(); // stop any current speech
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'ja-JP';
                utterance.rate = ttsRate;

                // Select the best available Japanese voice
                const voice = getBestJapaneseVoice(gender);
                if (voice) {
                    utterance.voice = voice;
                }

                window.speechSynthesis.speak(utterance);
            }
        }
    };

    // Unlock browser audio context on user interaction to bypass Autoplay blocks
    const unlockAudio = () => {
        if (audioRef.current && !audioRef.current.src) {
            audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
            audioRef.current.play().catch((e) => console.log('Audio unlock check:', e.message));
        }
    };

    // Parse Furigana for HTML output
    const formatFurigana = (text) => {
        if (!text) return '';
        if (!showFurigana) {
            // Strip furigana format: e.g. "日本語[にほんご]" -> "日本語"
            return text.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
        }
        // Format to HTML ruby tags: e.g. "日本語[にほんご]" -> "<ruby>日本語<rt>にほんご</rt></ruby>"
        return text.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '<ruby>$1<rt class="text-[10px] select-none text-slate-400 dark:text-slate-500">$2</rt></ruby>');
    };

    // Helper to start the Kaiwa session
    const handleStartConversation = async () => {
        unlockAudio();
        setStep('chat');
        setIsGenerating(true);
        setConversation([]);

        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const selectedTopic = TOPICS.find(t => t.id === topic);

        // System prompt design
        const systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
        Bạn sẽ thực hiện hội thoại 1:1 với người học.
        Yêu cầu bắt buộc:
        1. Cấp độ JLPT hội thoại của học viên: ${level}. Chỉ sử dụng từ vựng và ngữ pháp phù hợp với cấp độ này.
        2. Tông giọng và vai trò của bạn: Là một giáo viên tiếng Nhật bản xứ thân thiện, lịch sự (sử dụng kính ngữ desu/masu thích hợp), kiên nhẫn.
        3. Chủ đề hội thoại: ${selectedTopic.name} - ${selectedTopic.desc}.
        4. Đối với tin nhắn đầu tiên này, hãy gửi một lời chào ấm áp, giới thiệu bản thân bạn là ${selectedTeacher.name}, nhắc đến chủ đề cuộc hội thoại hôm nay và hỏi một câu hỏi mở phù hợp với chủ đề để học viên trả lời.
        
        Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không chứa markdown backticks, không chứa bất kỳ văn bản nào khác ngoài JSON):
        {
          "replyJa": "Nội dung câu nói của giáo viên bằng tiếng Nhật. Bắt buộc viết các từ Kanji kèm Furigana theo định dạng: Chữ[Furigana]. Ví dụ: 私[わたし], 日本語[にほんご]",
          "replyVi": "Bản dịch tiếng Việt tự nhiên của câu trả lời trên",
          "feedback": {
            "hasError": false,
            "userOriginal": "",
            "correctedJa": "",
            "explanationVi": ""
          },
          "suggestions": [
            "2 đến 3 câu gợi ý phản xạ ngắn bằng tiếng Nhật (kèm Furigana theo định dạng chữ[Furigana]) để học viên có thể lựa chọn trả lời."
          ]
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
    const handleSendUserMessage = async (textToSend) => {
        unlockAudio();
        const messageText = textToSend || inputText;
        if (!messageText.trim()) return;

        setInputText('');
        setTranscript('');

        // Add user message to local state
        const userMsg = {
            sender: 'user',
            textJa: messageText,
            textVi: '',
            feedback: null
        };
        const updatedHistory = [...conversation, userMsg];
        setConversation(updatedHistory);
        setIsGenerating(true);

        const selectedTeacher = TEACHERS.find(t => t.id === teacher);
        const selectedTopic = TOPICS.find(t => t.id === topic);

        // System prompt design
        const systemPrompt = `Bạn là giáo viên dạy tiếng Nhật ảo tên là ${selectedTeacher.name}.
        Bạn đang thực hiện hội thoại 1:1 với người học.
        Nhiệm vụ của bạn:
        1. Nhận tin nhắn mới nhất của học viên bằng tiếng Nhật.
        2. Phân tích tin nhắn của học viên:
           - Kiểm tra xem câu nói có lỗi sai ngữ pháp, dùng từ sai, hoặc câu nói không tự nhiên đối với người Nhật hay không.
           - Nếu có lỗi hoặc chưa tự nhiên, hãy đặt "feedback.hasError" là true, đưa ra câu sửa lại tự nhiên hơn tại "correctedJa", và giải thích chi tiết lỗi bằng tiếng Việt tại "explanationVi".
           - Nếu câu nói hoàn toàn chính xác và tự nhiên, đặt "feedback.hasError" là false.
        3. Tạo ra câu trả lời tiếp theo của giáo viên:
           - Trả lời phù hợp với nội dung của học viên để giữ mạch hội thoại trôi chảy.
           - Cấp độ JLPT phù hợp: ${level}.
           - Đóng vai: ${selectedTeacher.name} thân thiện.
        4. Gợi ý 2-3 cách trả lời tiếp theo bằng tiếng Nhật (dạng chữ[Furigana]) để học viên có thể dùng.

        Định dạng phản hồi: Bắt buộc trả về đúng cấu trúc JSON sau (không chứa markdown backticks, không chứa văn bản thừa):
        {
          "replyJa": "Nội dung câu trả lời tiếp theo của giáo viên bằng tiếng Nhật. Bắt buộc có Furigana theo định dạng: Chữ[Furigana]. Ví dụ: 今日[きょう]は",
          "replyVi": "Bản dịch câu trả lời trên sang tiếng Việt",
          "feedback": {
            "hasError": true hoặc false,
            "userOriginal": "nội dung gốc của học viên",
            "correctedJa": "câu sửa lỗi tiếng Nhật (nếu có, kèm Furigana dạng Chữ[Furigana])",
            "explanationVi": "lời khuyên giải thích lỗi sai bằng tiếng Việt (nếu có)"
          },
          "suggestions": [
            "2 đến 3 câu gợi ý phản xạ tiếp theo bằng tiếng Nhật (kèm Furigana dạng Chữ[Furigana])"
          ]
        }`;

        // Map conversation history to OpenRouter structure
        const historyForAI = conversation.map(msg => ({
            role: msg.sender === 'ai' ? 'assistant' : 'user',
            content: msg.textJa
        }));

        try {
            const resultText = await callKaiwaAI(systemPrompt, historyForAI, messageText);
            const parsed = parseJsonFromAI(resultText);

            if (parsed) {
                // Update the user's message with feedback in history if any
                if (parsed.feedback && parsed.feedback.hasError) {
                    setConversation(prev => {
                        const next = [...prev];
                        const lastUserIdx = next.map(m => m.sender).lastIndexOf('user');
                        if (lastUserIdx !== -1) {
                            next[lastUserIdx].feedback = parsed.feedback;
                        }
                        return next;
                    });
                }

                // Add AI reply message
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

    // Quit session
    const handleQuit = async () => {
        if (await window.showConfirm('Bạn có chắc chắn muốn dừng buổi luyện tập Kaiwa này không? Lịch sử cuộc hội thoại sẽ không được lưu.', { type: 'warning' })) {
            window.speechSynthesis.cancel();
            setStep('setup');
            setConversation([]);
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-80px)] flex flex-col justify-start py-4 px-2 md:px-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {step === 'setup' ? (
                /* SETUP PANEL */
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center md:text-left space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                            <Sparkle className="w-3.5 h-3.5 animate-pulse" />
                            Độc quyền AI Agent
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white bg-clip-text bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-white">
                            Luyện KAIWA 1:1 với Giáo viên AI
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl">
                            Rèn luyện phản xạ nghe nói tiếng Nhật 2 chiều hoàn toàn miễn phí. AI đóng vai giáo viên bản xứ tương tác, chỉnh lỗi phát âm và ngữ pháp thời gian thực.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. LEVEL SELECTION */}
                        <div className="md:col-span-2 space-y-4 bg-white dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/40 shadow-xl shadow-slate-100/30 dark:shadow-none">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                1. Chọn Cấp độ JLPT
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {LEVELS.map((lvl) => {
                                    const isSelected = level === lvl.value;
                                    return (
                                        <button
                                            key={lvl.value}
                                            onClick={() => setLevel(lvl.value)}
                                            className={`p-4 rounded-2xl text-left border-2 transition-all relative overflow-hidden group cursor-pointer ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 dark:border-indigo-400' 
                                                    : 'border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-base font-black px-2.5 py-0.5 rounded-lg text-white bg-gradient-to-r ${lvl.gradient}`}>
                                                    {lvl.value}
                                                </span>
                                                {isSelected && (
                                                    <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-400 text-white flex items-center justify-center text-[10px] font-bold">
                                                        ✓
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                {lvl.label}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                                                {lvl.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. TEACHER SELECTION */}
                        <div className="space-y-4 bg-white dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/40 shadow-xl shadow-slate-100/30 dark:shadow-none">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                2. Giáo viên ảo
                            </h3>
                            <div className="flex flex-col gap-3">
                                {TEACHERS.map((tc) => {
                                    const isSelected = teacher === tc.id;
                                    return (
                                        <button
                                            key={tc.id}
                                            onClick={() => setTeacher(tc.id)}
                                            className={`p-4 rounded-2xl text-left border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 dark:border-indigo-400' 
                                                    : 'border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-300'
                                            }`}
                                        >
                                            <span className="text-3xl p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                                                {tc.avatar}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                        {tc.name}
                                                    </h4>
                                                    {isSelected && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
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
                    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/40 shadow-xl shadow-slate-100/30 dark:shadow-none space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            3. Chọn ngữ cảnh hội thoại
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {TOPICS.map((tpc) => {
                                const isSelected = topic === tpc.id;
                                return (
                                    <button
                                        key={tpc.id}
                                        onClick={() => setTopic(tpc.id)}
                                        className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10 dark:border-indigo-400 ring-2 ring-indigo-500/10' 
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                            {tpc.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                            {tpc.desc}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={handleStartConversation}
                            className="px-12 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-500 hover:scale-[1.02] active:scale-[0.98] text-white font-extrabold text-base rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:shadow-2xl transition-all cursor-pointer flex items-center gap-2 group"
                        >
                            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                            Bắt đầu Luyện Kaiwa ngay
                        </button>
                    </div>
                </div>
            ) : (
                /* CHAT PANEL */
                <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[calc(100vh-120px)] bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xl relative overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 relative z-15">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleQuit}
                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl">
                                    {TEACHERS.find(t => t.id === teacher)?.avatar}
                                </span>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                                            {TEACHERS.find(t => t.id === teacher)?.name}
                                        </h3>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online"></span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Cấp độ {level} • {TOPICS.find(t => t.id === topic)?.name.split(' ')[1] || 'Free Talk'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Controls/Settings Panel */}
                        <div className="flex items-center gap-1">
                            {/* Furigana */}
                            <button
                                onClick={() => setShowFurigana(prev => !prev)}
                                className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                    showFurigana 
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Bật/tắt Furigana"
                            >
                                Furigana
                            </button>

                            {/* Translation */}
                            <button
                                onClick={() => setShowTranslation(prev => !prev)}
                                className={`p-2 rounded-xl cursor-pointer transition-all ${
                                    showTranslation 
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Hiện/ẩn Dịch Nghĩa"
                            >
                                {showTranslation ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            {/* Speech synthesis rate (0.8x -> 1.0x -> 1.2x) */}
                            <button
                                onClick={() => setTtsRate(r => r === 1.0 ? 1.2 : r === 1.2 ? 0.8 : 1.0)}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-black cursor-pointer transition-colors"
                                title="Tốc độ đọc của AI"
                            >
                                {ttsRate}x
                            </button>

                            {/* Mute toggle */}
                            <button
                                onClick={() => setIsMuted(prev => !prev)}
                                className={`p-2 rounded-xl cursor-pointer transition-all ${
                                    isMuted 
                                        ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Bật/tắt giọng đọc AI"
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-h-[calc(100vh-280px)] custom-scrollbar">
                        {conversation.map((msg, idx) => {
                            const isAi = msg.sender === 'ai';
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
                                >
                                    {/* Avatar */}
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-xl flex-shrink-0">
                                        {isAi ? TEACHERS.find(t => t.id === teacher)?.avatar : '👤'}
                                    </div>

                                    {/* Bubble block */}
                                    <div className="space-y-1.5 max-w-[80%]">
                                        {/* Speakable Speech bubble */}
                                        <div className={`p-3.5 rounded-2xl relative group ${
                                            isAi 
                                                ? 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-100 rounded-tl-none' 
                                                : 'bg-indigo-600 text-white dark:bg-indigo-600 rounded-tr-none'
                                        }`}>
                                            {/* Japanese content with Furigana */}
                                            <p 
                                                className="text-base font-japanese leading-loose whitespace-pre-wrap font-medium"
                                                dangerouslySetInnerHTML={{ __html: formatFurigana(msg.textJa) }}
                                            />
                                            
                                            {/* AI Speak/Sound trigger */}
                                            {isAi && (
                                                <button
                                                    onClick={() => speakText(msg.textJa)}
                                                    className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer duration-200"
                                                    title="Nghe phát âm"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Vietnamese translation details */}
                                        {isAi && showTranslation && msg.textVi && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                                                {msg.textVi}
                                            </p>
                                        )}

                                        {/* User smart correction feedback */}
                                        {!isAi && msg.feedback && (
                                            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-xs text-amber-850 dark:text-amber-300 mt-2 space-y-1.5 shadow-sm">
                                                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                                    <AlertCircle className="w-4 h-4" />
                                                    AI gợi ý sửa câu lỗi:
                                                </div>
                                                <div className="space-y-1 pl-1">
                                                    <p className="line-through text-slate-400 dark:text-slate-500">
                                                        Gốc: {msg.feedback.userOriginal}
                                                    </p>
                                                    <p className="font-japanese font-semibold text-sm">
                                                        Nên nói: <span dangerouslySetInnerHTML={{ __html: formatFurigana(msg.feedback.correctedJa) }} />
                                                    </p>
                                                    {msg.feedback.explanationVi && (
                                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-1 italic">
                                                            Giải thích: {msg.feedback.explanationVi}
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
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-xl flex-shrink-0">
                                    {TEACHERS.find(t => t.id === teacher)?.avatar}
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-2xl rounded-tl-none max-w-[80%] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Footer panel: Suggestions + Microphone controls */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 relative z-10">
                        {/* 1. Quick suggestion response buttons */}
                        {conversation.length > 0 && conversation[conversation.length - 1].sender === 'ai' && conversation[conversation.length - 1].suggestions?.length > 0 && (
                            <div className="mb-4 space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                                    💡 Gợi ý phản xạ (Click để gửi):
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {conversation[conversation.length - 1].suggestions.map((sug, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                // Strip furigana markup to send clean text to AI
                                                const cleanText = sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1');
                                                handleSendUserMessage(cleanText);
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-400 cursor-pointer shadow-sm font-japanese transition-all"
                                            title="Click to send reply suggestion"
                                        >
                                            {sug.replace(/([\u4e00-\u9faf\u3005\u3400-\u4dbf]+)\[([^\]]+)\]/g, '$1')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Microphone live status / transcribing text */}
                        {(isRecording || isTranscribing) && (
                            <div className="mb-3 px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 dark:border-indigo-800/40 rounded-xl text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full bg-red-500 ${isRecording ? 'animate-ping' : 'animate-pulse'}`}></span>
                                <span className="font-semibold">{isRecording ? 'Đang ghi âm:' : 'OpenAI Whisper:'}</span> 
                                <span className="italic font-japanese">{transcript || (isRecording ? 'Hãy nói tiếng Nhật...' : 'Đang xử lý giọng nói...')}</span>
                            </div>
                        )}

                        {/* 3. Message Input controllers */}
                        <div className="flex items-center gap-3">
                            {/* Microphone recording button */}
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                onTouchCancel={stopRecording}
                                className={`p-4 rounded-2xl text-white shadow-lg cursor-pointer transition-all flex-shrink-0 select-none ${
                                    isRecording 
                                        ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20 scale-105' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200/50'
                                }`}
                                title="Nhấn giữ để nói, buông ra để gửi"
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
                                    placeholder={isRecording ? 'Đang ghi âm...' : isTranscribing ? 'OpenAI Whisper đang xử lý giọng nói...' : 'Nhập tin nhắn hoặc Nhấn giữ nút Micro để nói...'}
                                    className="w-full pl-4 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-japanese"
                                />
                                
                                {/* Manual send trigger */}
                                <button
                                    onClick={() => handleSendUserMessage()}
                                    disabled={!inputText.trim() || isGenerating}
                                    className="absolute right-2 p-2 rounded-xl text-indigo-600 hover:bg-slate-100 dark:text-indigo-400 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
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
