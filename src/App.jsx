import './App.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, updateDoc, serverTimestamp, deleteDoc, getDoc, addDoc, getDocs, where, writeBatch, increment } from 'firebase/firestore';
import { Loader2, Plus, Repeat2, Home, CheckCircle, XCircle, Volume2, Send, BookOpen, Clock, HeartHandshake, List, Calendar, Trash2, Mic, FileText, MessageSquare, HelpCircle, Upload, Wand2, BarChart3, Users, PieChart as PieChartIcon, Target, Save, Edit, Zap, Eye, EyeOff, AlertTriangle, Check, VolumeX, Image as ImageIcon, X, Music, FileAudio, Tag, Sparkles, Filter, ArrowDown, ArrowUp, GraduationCap, Search, Languages, RefreshCw, Settings, ChevronRight, Wrench, LayoutGrid, Flame, TrendingUp, Lightbulb, Brain, Ear, Keyboard, MousePointerClick, Layers, RotateCw, Lock, LogOut, FileCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';


// --- Cấu hình và Tiện ích Firebase ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const appId = firebaseConfig.appId; // dùng chung cho đường dẫn Firestore
const initialAuthToken = null; 

let app;
let db;
let auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

// --- Cấu hình Từ Loại (POS) & Màu Sắc ---
const POS_TYPES = {
    noun: { label: 'Danh từ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ', color: 'bg-red-100 text-red-700 border-red-200' },
    adj_i: { label: 'Tính từ -i', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    adj_na: { label: 'Tính từ -na', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    adverb: { label: 'Trạng từ', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    conjunction: { label: 'Liên từ', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    grammar: { label: 'Ngữ pháp', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    phrase: { label: 'Cụm từ', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

// --- Cấu hình Cấp độ JLPT & Chỉ tiêu (Ước lượng) ---
const JLPT_LEVELS = [
    { value: 'N5', label: 'N5', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', target: 800 },
    { value: 'N4', label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200', target: 1500 },
    { value: 'N3', label: 'N3', color: 'bg-sky-100 text-sky-700 border-sky-200', target: 3750 },
    { value: 'N2', label: 'N2', color: 'bg-violet-100 text-violet-700 border-violet-200', target: 6000 },
    { value: 'N1', label: 'N1', color: 'bg-rose-100 text-rose-700 border-rose-200', target: 10000 }
];

const getPosLabel = (posKey) => POS_TYPES[posKey]?.label || 'Chưa phân loại';
const getPosColor = (posKey) => POS_TYPES[posKey]?.color || 'bg-gray-50 text-gray-500 border-gray-200';
const getLevelColor = (levelValue) => {
    const level = JLPT_LEVELS.find(l => l.value === levelValue);
    return level ? level.color : 'bg-gray-50 text-gray-500 border-gray-200';
};


// --- Cấu hình SRS (Tính bằng ngày) ---
const SRS_INTERVALS = [
    1, // Index 0: Sau 1 ngày (Cấp độ 1)
    3, // Index 1: Sau 3 ngày (Cấp độ 2)
    7, // Index 2: Sau 7 ngày (Cấp độ 3) -> Đủ điều kiện Flashcard
    30, // Index 3: Sau 30 ngày (Cấp độ 4)
    90 // Index 4: Sau 90 ngày (Cấp độ 5)
];

const getNextReviewDate = (intervalIndex) => {
    const date = new Date();
    if (intervalIndex < 0) {
        date.setHours(0, 0, 0, 0); 
        return date;
    }
    const index = Math.min(intervalIndex, SRS_INTERVALS.length - 1);
    const days = SRS_INTERVALS[index] || 1; 
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0); 
    return date;
};

const getSrsProgressText = (intervalIndex) => {
    if (intervalIndex === -1) return "Sẵn sàng";
    if (intervalIndex === -999) return "Không có dữ liệu"; 
    if (intervalIndex >= SRS_INTERVALS.length) {
        return `Dài hạn (90+)`;
    }
    const nextDays = SRS_INTERVALS[intervalIndex];
    return `Cấp độ ${intervalIndex + 1} (Chờ ${nextDays} ngày)`;
};


// --- Tiện ích Text-to-Speech (TTS) & Xử lý Ảnh ---

const base64ToArrayBuffer = (base64) => {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Lỗi giải mã Base64:", e);
        return null;
    }
};

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500; 
                const MAX_HEIGHT = 500; 
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const pcmToWav = (pcm16, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + pcm16.byteLength);
    const view = new DataView(buffer);
    let offset = 0;
    view.setUint32(offset, 0x52494646, false); // "RIFF"
    offset += 4;
    view.setUint32(offset, 36 + pcm16.byteLength, true); 
    offset += 4;
    view.setUint32(offset, 0x57415645, false); // "WAVE"
    offset += 4;
    view.setUint32(offset, 0x666d7420, false); // "fmt "
    offset += 4;
    view.setUint32(offset, 16, true); 
    offset += 4;
    view.setUint16(offset, 1, true); 
    offset += 2;
    view.setUint16(offset, numChannels, true); 
    offset += 2;
    view.setUint32(offset, sampleRate, true); 
    offset += 4;
    view.setUint32(offset, byteRate, true); 
    offset += 4;
    view.setUint16(offset, blockAlign, true); 
    offset += 2;
    view.setUint16(offset, bitsPerSample, true); 
    offset += 2;
    view.setUint32(offset, 0x64617461, false); // "data"
    offset += 4;
    view.setUint32(offset, pcm16.byteLength, true); 
    offset += 4;
    const bytes = new Uint8Array(buffer, 44);
    bytes.set(new Uint8Array(pcm16.buffer));
    return new Blob([view], { type: 'audio/wav' });
};

const getSpeechText = (text) => {
    if (!text) return '';
    // Nhận diện cả ngoặc Nhật （）và ngoặc Việt Nam ()
    const furiganaMatch = text.match(/（([^）]+)）/) || text.match(/\(([^)]+)\)/); 
    if (furiganaMatch && furiganaMatch[1]) {
        return furiganaMatch[1];
    }
    // Loại bỏ cả hai loại ngoặc
    return text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim(); 
};

const getWordForMasking = (text) => {
    if (!text) return '';
    // Nhận diện cả ngoặc Nhật （）và ngoặc Việt Nam ()
    const mainWord = text.split('（')[0].split('(')[0].trim();
    if (mainWord) {
        return mainWord;
    }
    const furiganaMatch = text.match(/（([^）]+)）/) || text.match(/\(([^)]+)\)/); 
    if (furiganaMatch && furiganaMatch[1]) {
        return furiganaMatch[1];
    }
    return text.trim(); 
};

let currentAudioObj = null;

// UPDATED: Play Audio with Fallback
const playAudio = (base64Data, textFallback = '') => {
    // 1. Thử phát file audio nếu có
    if (base64Data) {
        try {
            if (currentAudioObj) {
                currentAudioObj.pause();
                currentAudioObj.currentTime = 0;
            }

            const buffer = base64ToArrayBuffer(base64Data);
            if (buffer) {
                const view = new DataView(buffer);
                const isWavFile = buffer.byteLength > 4 && view.getUint32(0, false) === 0x52494646;
                const isMp3ID3 = buffer.byteLength > 3 && view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33;
                const isMp3Sync = buffer.byteLength > 2 && view.getUint8(0) === 0xFF && (view.getUint8(1) & 0xE0) === 0xE0;

                let audioUrl;
                
                if (isWavFile) {
                    const blob = new Blob([buffer], { type: 'audio/wav' });
                    audioUrl = URL.createObjectURL(blob);
                } else if (isMp3ID3 || isMp3Sync) {
                    const blob = new Blob([buffer], { type: 'audio/mpeg' });
                    audioUrl = URL.createObjectURL(blob);
                } else {
                    const sampleRate = 24000; 
                    const pcm16 = new Int16Array(buffer);
                    const wavBlob = pcmToWav(pcm16, sampleRate);
                    audioUrl = URL.createObjectURL(wavBlob);
                }
                
                const audio = new Audio(audioUrl);
                currentAudioObj = audio;

                audio.play().catch(e => {
                    console.error("Lỗi phát audio file, thử fallback:", e);
                    // Nếu lỗi phát file (file hỏng), thử dùng trình duyệt
                    playBrowserTts(textFallback);
                });
                
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    if (currentAudioObj === audio) {
                        currentAudioObj = null;
                    }
                };
                return; // Thành công (hoặc đang thử phát)
            }
        } catch (e) {
            console.error("Lỗi xử lý audio, chuyển sang fallback:", e);
        }
    }

    // 2. Fallback: Nếu không có file hoặc file lỗi, dùng trình duyệt
    playBrowserTts(textFallback);
};

// Helper cho Browser TTS
const playBrowserTts = (text) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop current speech
    window.speechSynthesis.cancel();

    // Clean text for TTS (remove brackets mostly)
    const cleanText = getSpeechText(text); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP'; 
    utterance.rate = 0.9; // Đọc chậm một chút cho rõ
    
    // Thử chọn giọng Google hoặc giọng tốt nhất có sẵn
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || voices.find(v => v.lang === 'ja-JP');
    if (jaVoice) utterance.voice = jaVoice;

    // Debug TTS - comment out in production
    // console.log("Using Browser TTS for:", cleanText);
    window.speechSynthesis.speak(utterance);
};


const _fetchTtsApiCall = async (text, voiceName, attempts = 0) => {
    if (!text) return null;
    const apiKey = import.meta.env.VITE_GEMINI_TTS_API_KEY; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } } 
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 429 && attempts < 1) {
                const delay = 2000; 
                await new Promise(resolve => setTimeout(resolve, delay));
                return _fetchTtsApiCall(text, voiceName, attempts + 1);
            }
            return null;
        }

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;

        return audioData || null; 
    } catch (e) {
        console.error(`Lỗi trong quá trình gọi TTS API (Giọng: ${voiceName}):`, e);
        return null;
    }
};

const fetchTtsBase64 = async (text) => {
    if (!text || text.length > 100) return null;
    
    // UPDATED: Danh sách giọng đa dạng hơn (Multi-Model simulation)
    // Chia làm các nhóm để thử lần lượt
    const VOICE_POOLS = [
        ["Aoede", "Puck", "Charon", "Kore", "Fenrir"], // Nhóm 1: Cơ bản
        ["Leda", "Orus", "Zephyr", "Iapetus", "Umbriel"], // Nhóm 2: Bổ sung
        ["Callirrhoe", "Algieba", "Despina", "Erinome", "Algenib"] // Nhóm 3: Dự phòng
    ];

    // Lấy ngẫu nhiên tối đa 4 giọng từ các pool để thử (tránh thử hết 15 cái gây chậm)
    const allVoices = VOICE_POOLS.flat();
    const shuffledVoices = allVoices.sort(() => 0.5 - Math.random()).slice(0, 4);

    for (const voice of shuffledVoices) {
        const audioData = await _fetchTtsApiCall(text, voice);
        if (audioData) {
            return audioData; 
        }
        // Delay nhẹ giữa các lần thử
        await new Promise(r => setTimeout(r, 600));
    }
    return null;
};


// --- Component Chính App ---

const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
};


const App = () => {
    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [view, setView] = useState('HOME');
    const [reviewMode, setReviewMode] = useState('back');
    const [allCards, setAllCards] = useState([]);
    const [reviewCards, setReviewCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState('');
    const [editingCard, setEditingCard] = useState(null);

    const [profile, setProfile] = useState(null); 
    // Danh sách API keys cho Gemini (có thể cấu hình từ env hoặc localStorage)
    const [geminiApiKeys] = useState(() => {
        // Lấy từ localStorage nếu có, nếu không thì lấy từ env
        const savedKeys = localStorage.getItem('geminiApiKeys');
        if (savedKeys) {
            try {
                return JSON.parse(savedKeys);
            } catch (e) {
                console.error('Lỗi parse geminiApiKeys từ localStorage:', e);
            }
        }
        // Lấy từ env variables (hỗ trợ nhiều keys: VITE_GEMINI_API_KEY, VITE_GEMINI_API_KEY_2, ...)
        const keys = [];
        if (import.meta.env.VITE_GEMINI_API_KEY) keys.push(import.meta.env.VITE_GEMINI_API_KEY);
        if (import.meta.env.VITE_GEMINI_TTS_API_KEY) keys.push(import.meta.env.VITE_GEMINI_TTS_API_KEY);
        // Hỗ trợ thêm keys từ env (VITE_GEMINI_API_KEY_2, VITE_GEMINI_API_KEY_3, ...)
        let i = 2;
        while (import.meta.env[`VITE_GEMINI_API_KEY_${i}`]) {
            keys.push(import.meta.env[`VITE_GEMINI_API_KEY_${i}`]);
            i++;
        }
        return keys.length > 0 ? keys : [];
    }); 
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [dailyActivityLogs, setDailyActivityLogs] = useState([]); 
    const [studySessionData, setStudySessionData] = useState({
        learning: [], // Từ sai trong session (ưu tiên 1)
        new: [], // Từ mới chưa học (ưu tiên 2)
        reviewing: [], // Từ đã học nhưng cần review (ưu tiên 3)
        currentBatch: [], // Batch hiện tại (5 từ)
        currentPhase: 'multipleChoice', // 'multipleChoice' | 'typing'
        batchIndex: 0,
        allNoSrsCards: [] // Tất cả từ chưa có SRS
    }); 

    const vocabCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/vocabulary`;
    }, [userId]);

    const publicStatsCollectionPath = useMemo(() => `artifacts/${appId}/public/data/userStats`, []);
    
    const settingsDocPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/settings/profile`; 
    }, [userId]);
    
    const activityCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/dailyActivity`; 
    }, [userId]);

    const isAdmin = useMemo(() => {
        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
        // Loại bỏ khoảng trắng + dấu nháy bao quanh (nếu vô tình thêm trong .env)
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        return !!adminEmailEnv && !!currentEmail && currentEmail === adminEmailEnv;
    }, [authReady, userId]);

    // Debug: log trạng thái admin để dễ kiểm tra khi cấu hình
    useEffect(() => {
        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        // Debug admin check - comment out in production if needed
        // console.log('QuizKi admin check', JSON.stringify({ adminEmailEnv, currentEmail, isAdmin }));
    }, [authReady, userId, isAdmin]);

    const handleAdminDeleteUserData = useCallback(async (targetUserId) => {
        if (!db || !appId || !targetUserId) return;
        if (!isAdmin) {
            setNotification("Bạn không có quyền thực hiện chức năng này.");
            return;
        }
        try {
            const userRoot = doc(db, `artifacts/${appId}/users/${targetUserId}`);

            // Xóa vocabulary
            const vocabSnap = await getDocs(collection(db, `artifacts/${appId}/users/${targetUserId}/vocabulary`));
            const vocabBatch = writeBatch(db);
            vocabSnap.forEach(d => vocabBatch.delete(d.ref));
            await vocabBatch.commit();

            // Xóa dailyActivity
            const actSnap = await getDocs(collection(db, `artifacts/${appId}/users/${targetUserId}/dailyActivity`));
            const actBatch = writeBatch(db);
            actSnap.forEach(d => actBatch.delete(d.ref));
            await actBatch.commit();

            // Xóa settings/profile
            const profileDoc = doc(db, `artifacts/${appId}/users/${targetUserId}/settings/profile`);
            await deleteDoc(profileDoc).catch(() => {});

            // Xóa root doc (nếu có)
            await deleteDoc(userRoot).catch(() => {});

            // Xóa luôn dữ liệu trên bảng xếp hạng công khai
            const statsDocRef = doc(db, publicStatsCollectionPath, targetUserId);
            await deleteDoc(statsDocRef).catch(() => {});

            setNotification("Đã xoá toàn bộ dữ liệu của người dùng.");
        } catch (e) {
            console.error("Lỗi xoá dữ liệu người dùng bởi admin:", e);
            setNotification("Lỗi khi xoá dữ liệu người dùng.");
        }
    }, [db, appId, isAdmin, publicStatsCollectionPath]);

    useEffect(() => {
        if (!db || !auth) return;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // Chặn vào app nếu email chưa xác thực
            if (user && !user.emailVerified) {
                setNotification("Email chưa xác thực. Vui lòng kiểm tra hộp thư và bấm link xác nhận, sau đó đăng nhập lại.");
                signOut(auth);
                setUserId(null);
                setAuthReady(true);
                return;
            }
            if (user) {
                setUserId(user.uid);
                setNotification(''); // Đã xác thực và đăng nhập, xoá thông báo cũ (nếu có)
            } else {
                setUserId(null);
            }
            setAuthReady(true);
        });

        // Không còn tự động đăng nhập ẩn danh; sẽ để LoginScreen quyết định
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authReady || !userId || !settingsDocPath) {
            setIsProfileLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, settingsDocPath), async (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                // Tự động tạo profile mặc định nếu chưa có, không hiển thị màn hỏi tên riêng
                try {
                    const defaultName = auth?.currentUser?.email
                        ? auth.currentUser.email.split('@')[0]
                        : 'Người học';
                    const defaultGoal = 10;
                    const newProfile = {
                        displayName: defaultName,
                        dailyGoal: defaultGoal,
                        hasSeenHelp: true,
                        isApproved: false // yêu cầu admin duyệt trước khi dùng app
                    };
                    await setDoc(doc(db, settingsDocPath), newProfile);
                    setProfile(newProfile);
                } catch (e) {
                    console.error("Lỗi tạo hồ sơ mặc định:", e);
                    setProfile(null);
                }
            }
            setIsProfileLoading(false);
            setIsLoading(false); 
        }, (error) => {
            console.error("Lỗi khi tải hồ sơ:", error);
            setIsProfileLoading(false);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [authReady, userId, settingsDocPath]);

    useEffect(() => {
        if (!authReady || !vocabCollectionPath) return;
        
        const q = query(collection(db, vocabCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cards = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            snapshot.forEach((doc) => {
                const data = doc.data();
                cards.push({
                    id: doc.id,
                    front: data.front || '',
                    back: data.back || '',
                    synonym: data.synonym || '',
                    synonymSinoVietnamese: data.synonymSinoVietnamese || '', 
                    sinoVietnamese: data.sinoVietnamese || '', 
                    example: data.example || '',
                    exampleMeaning: data.exampleMeaning || '', 
                    nuance: data.nuance || '', 
                    pos: data.pos || '', 
                    level: data.level || '', 
                    audioBase64: data.audioBase64 || null, 
                    imageBase64: data.imageBase64 || null,
                    createdAt: data.createdAt ? data.createdAt.toDate() : today,
                    intervalIndex_back: typeof data.intervalIndex_back === 'number' ? data.intervalIndex_back : -1,
                    correctStreak_back: typeof data.correctStreak_back === 'number' ? data.correctStreak_back : 0,
                    nextReview_back: data.nextReview_back ? data.nextReview_back.toDate() : today,
                    intervalIndex_synonym: typeof data.intervalIndex_synonym === 'number' ? data.intervalIndex_synonym : -1,
                    correctStreak_synonym: typeof data.correctStreak_synonym === 'number' ? data.correctStreak_synonym : 0,
                    nextReview_synonym: data.nextReview_synonym ? data.nextReview_synonym.toDate() : today,
                    intervalIndex_example: typeof data.intervalIndex_example === 'number' ? data.intervalIndex_example : -1,
                    correctStreak_example: typeof data.correctStreak_example === 'number' ? data.correctStreak_example : 0,
                    nextReview_example: data.nextReview_example ? data.nextReview_example.toDate() : today,
                });
            });
            // Sort by createdAt desc by default initially
            cards.sort((a, b) => b.createdAt - a.createdAt);
            setAllCards(cards);
        }, (error) => {
            console.error("Lỗi khi lắng nghe Firestore:", error);
            setNotification("Lỗi kết nối dữ liệu.");
        });
        return () => unsubscribe();
    }, [authReady, vocabCollectionPath]);

    useEffect(() => {
        if (!authReady || !activityCollectionPath) return;
        
        const q = query(collection(db, activityCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort logs by date string (ID) just in case
            logs.sort((a, b) => a.id.localeCompare(b.id));
            setDailyActivityLogs(logs);
        }, (error) => {
            console.error("Lỗi khi tải hoạt động hàng ngày:", error);
        });
        
        return () => unsubscribe();
    }, [authReady, activityCollectionPath]);

    const dueCounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Logic mới: Tất cả 3 phần dùng chung nextReview_back
        // Một từ được coi là "due" nếu nextReview_back <= today
        const mixed = allCards.filter(card => {
            const isDue = card.nextReview_back <= today;
            if (!isDue) return false;
            
            // Kiểm tra xem có phần nào cần ôn không
            const hasBack = true; // Back luôn có
            const hasSynonym = card.synonym && card.synonym.trim() !== '';
            const hasExample = card.example && card.example.trim() !== '';
            
            // Nếu từ đã due, ít nhất một phần sẽ được ôn tập
            return hasBack || hasSynonym || hasExample;
        }).length;
        
        // Back: các từ đã đến chu kỳ VÀ chưa hoàn thành phần back (streak < 1)
        const back = allCards.filter(card => {
            const isDue = card.nextReview_back <= today;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            return isDue && backStreak < 1;
        }).length;
        
        // Synonym: các từ đã đến chu kỳ, có synonym VÀ chưa hoàn thành phần synonym (streak < 1)
        const synonym = allCards.filter(card => {
            if (!card.synonym || card.synonym.trim() === '') return false;
            const isDue = card.nextReview_back <= today;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            const result = isDue && synonymStreak < 1;
            // Debug: Log một vài từ để kiểm tra
            if (card.front && card.front.includes('調整')) {
                console.log(`[DueCount Synonym] ${card.front}: isDue=${isDue}, synonymStreak=${synonymStreak}, result=${result}`);
            }
            return result;
        }).length;
        
        // Example: các từ đã đến chu kỳ, có example VÀ chưa hoàn thành phần example (streak < 1)
        const example = allCards.filter(card => {
            if (!card.example || card.example.trim() === '') return false;
            const isDue = card.nextReview_back <= today;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            const result = isDue && exampleStreak < 1;
            // Debug: Log một vài từ để kiểm tra
            if (card.front && card.front.includes('調整')) {
                console.log(`[DueCount Example] ${card.front}: isDue=${isDue}, exampleStreak=${exampleStreak}, result=${result}`);
            }
            return result;
        }).length;

        // Flashcard: Luôn hiển thị số từ chưa có SRS (không phụ thuộc filter)
        const flashcard = allCards.filter(card => {
            return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
        }).length;

        // Study mode: Chỉ từ vựng chưa có SRS (intervalIndex === -1 hoặc undefined)
        const study = allCards.filter(card => {
            return (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) &&
                   (card.intervalIndex_synonym === -1 || card.intervalIndex_synonym === undefined) &&
                   (card.intervalIndex_example === -1 || card.intervalIndex_example === undefined);
        }).length;

        return { mixed, flashcard, back, synonym, example, study };
    }, [allCards]);



    const prepareReviewCards = useCallback((mode = 'back') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dueCards = [];

        // Flashcard mode: Chỉ dành cho từ vựng chưa có SRS
        if (mode === 'flashcard') {
            dueCards = allCards.filter(card => {
                return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
            });
            dueCards = shuffleArray(dueCards);
            
        } else if (mode === 'mixed') {
            // Logic mới: Tất cả 3 phần dùng chung nextReview_back
            // Chỉ lấy những phần chưa hoàn thành (streak < 1)
            const dueBackCards = allCards
                .filter(card => {
                    if (card.nextReview_back > today) return false;
                    // Chỉ lấy phần back nếu chưa hoàn thành (streak < 1)
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    return backStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'back' })); 
            
            // Synonym: chỉ lấy nếu chưa hoàn thành (streak < 1)
            const dueSynonymCards = allCards
                .filter(card => {
                    if (!card.synonym || card.synonym.trim() === '') return false;
                    if (card.nextReview_back > today) return false;
                    const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                    return synonymStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'synonym' })); 
            
            // Example: chỉ lấy nếu chưa hoàn thành (streak < 1)
            const dueExampleCards = allCards
                .filter(card => {
                    if (!card.example || card.example.trim() === '') return false;
                    if (card.nextReview_back > today) return false;
                    const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                    return exampleStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'example' })); 
            
            dueCards = shuffleArray([...dueBackCards, ...dueSynonymCards, ...dueExampleCards]);

        } else if (mode === 'back') {
            // Back: các từ đã đến chu kỳ và chưa hoàn thành (streak < 1)
            dueCards = allCards
                .filter(card => {
                    if (card.nextReview_back > today) return false;
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    return backStreak < 1;
                });
        } else if (mode === 'synonym') {
            // Synonym: các từ đã đến chu kỳ, có synonym và chưa hoàn thành (streak < 1)
            dueCards = allCards
                .filter(card => {
                    if (!card.synonym || card.synonym.trim() === '') return false;
                    if (card.nextReview_back > today) return false;
                    const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                    return synonymStreak < 1;
                });
        } else if (mode === 'example') {
            // Example: các từ đã đến chu kỳ, có example và chưa hoàn thành (streak < 1)
            dueCards = allCards
                .filter(card => {
                    if (!card.example || card.example.trim() === '') return false;
                    if (card.nextReview_back > today) return false;
                    const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                    return exampleStreak < 1;
                });
        }

        if (dueCards.length > 0) {
            if (mode !== 'mixed') {
                dueCards = shuffleArray(dueCards);
            }
            setReviewCards(dueCards);
            setReviewMode(mode); 
            setView('REVIEW');
        } else {
            setNotification(`Tuyệt vời! Bạn không còn thẻ nào cần ôn tập ở chế độ này.`);
            setView('HOME');
        }
    }, [allCards]);


    const handleExport = (cards) => {
        const headers = [
            "Front", "Back", "Synonym", "Example", "ExampleMeaning", "Nuance",
            "CreatedAt", 
            "intervalIndex_back", "correctStreak_back", "nextReview_back_timestamp", 
            "intervalIndex_synonym", "correctStreak_synonym", "nextReview_synonym_timestamp", 
            "intervalIndex_example", "correctStreak_example", "nextReview_example_timestamp", 
            "AudioBase64", "ImageBase64", "POS", "Level", "SinoVietnamese", "SynonymSinoVietnamese"
        ];
        
        const rows = cards.map(card => [
            card.front,
            card.back,
            card.synonym,
            card.example,
            card.exampleMeaning,
            card.nuance, 
            card.createdAt ? card.createdAt.toISOString() : new Date().toISOString(),
            card.intervalIndex_back || -1,
            card.correctStreak_back || 0,
            card.nextReview_back ? card.nextReview_back.getTime() : new Date().getTime(),
            card.intervalIndex_synonym || -999,
            card.correctStreak_synonym || 0,
            card.nextReview_synonym ? card.nextReview_synonym.getTime() : new Date(9999, 0, 1).getTime(),
            card.intervalIndex_example || -999,
            card.correctStreak_example || 0,
            card.nextReview_example ? card.nextReview_example.getTime() : new Date(9999, 0, 1).getTime(),
            card.audioBase64 || "",
            card.imageBase64 || "",
            card.pos || "",
            card.level || "",
            card.sinoVietnamese || "",
            card.synonymSinoVietnamese || "" // Export new field
        ].map(field => {
            if (field === null || field === undefined) {
                return '""';
            }
            const str = field.toString();
            return `"${str.replace(/"/g, '""')}"`;
        }).join('\t'));
        
        const tsvContent = [headers.join('\t'), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${tsvContent}`], { type: 'text/tab-separated-values;charset=utf-8;' }); 
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "srs_vocab_export_v1.4.tsv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const updateDailyActivity = async (count) => {
        if (!activityCollectionPath) return;
        const todayDateString = new Date().toISOString().split('T')[0]; 
        const activityRef = doc(db, activityCollectionPath, todayDateString);
        try {
            await setDoc(activityRef, { 
                newWordsAdded: increment(count) 
            }, { merge: true });
        } catch (e) {
            console.error("Lỗi cập nhật hoạt động hàng ngày:", e);
        }
    };

    const createCardObject = (front, back, synonym, example, exampleMeaning, nuance, srsData = {}, createdAtDate = null, imageBase64 = null, audioBase64 = null, pos = null, level = null, sinoVietnamese = null, synonymSinoVietnamese = null) => {
        const hasSynonym = synonym && synonym.trim() !== '';
        const hasExample = example && example.trim() !== '';
        const today = getNextReviewDate(-1);

        const parseSrsValue = (key, defaultValue) => {
            const value = srsData[key];
            if (typeof value === 'number' && !isNaN(value)) return value;
            if (typeof value === 'string') {
                if (value.trim() === '') return defaultValue;
                const num = parseInt(value);
                if (!isNaN(num)) return num;
            }
            return defaultValue;
        };

        const parseReviewDate = (key, defaultDate) => {
            const value = srsData[key];
            if (value && typeof value === 'number' && !isNaN(value)) {
                return new Date(value);
            }
            if (value && typeof value === 'string') {
                const num = parseInt(value);
                if (!isNaN(num)) return new Date(num);
            }
            if (value instanceof Date) {
                return value;
            }
            return defaultDate;
        };
        
        const intervalIndex_back = parseSrsValue('intervalIndex_back', -1);
        const correctStreak_back = parseSrsValue('correctStreak_back', 0);
        const nextReview_back = parseReviewDate('nextReview_back_timestamp', today);
        
        const defaultSynonymIndex = hasSynonym ? -1 : -999;
        const defaultSynonymDate = hasSynonym ? today : new Date(9999, 0, 1);
        const intervalIndex_synonym = parseSrsValue('intervalIndex_synonym', defaultSynonymIndex);
        const correctStreak_synonym = parseSrsValue('correctStreak_synonym', 0);
        const nextReview_synonym = parseReviewDate('nextReview_synonym_timestamp', defaultSynonymDate);
        
        const defaultExampleIndex = hasExample ? -1 : -999;
        const defaultExampleDate = hasExample ? today : new Date(9999, 0, 1);
        const intervalIndex_example = parseSrsValue('intervalIndex_example', defaultExampleIndex);
        const correctStreak_example = parseSrsValue('correctStreak_example', 0);
        const nextReview_example = parseReviewDate('nextReview_example_timestamp', defaultExampleDate);

        return {
            front: front.trim(), 
            back: back.trim(),
            synonym: synonym.trim(),
            sinoVietnamese: sinoVietnamese ? sinoVietnamese.trim() : '',
            synonymSinoVietnamese: synonymSinoVietnamese ? synonymSinoVietnamese.trim() : '', // Store new field
            example: example.trim(),
            exampleMeaning: exampleMeaning.trim(), 
            nuance: nuance.trim(), 
            pos: pos || '', 
            level: level || '', // JLPT Level
            audioBase64: audioBase64, 
            imageBase64: imageBase64, 
            createdAt: createdAtDate || serverTimestamp(), 
            userId: userId,
            intervalIndex_back: intervalIndex_back,
            correctStreak_back: correctStreak_back,
            nextReview_back: nextReview_back,
            intervalIndex_synonym: intervalIndex_synonym,
            correctStreak_synonym: correctStreak_synonym,
            nextReview_synonym: nextReview_synonym, 
            intervalIndex_example: intervalIndex_example,
            correctStreak_example: correctStreak_example,
            nextReview_example: nextReview_example,
        };
    };

    const handleAddCard = async ({ front, back, synonym, example, exampleMeaning, nuance, pos, level, action, imageBase64, audioBase64, sinoVietnamese, synonymSinoVietnamese }) => {
        if (!vocabCollectionPath) return false;
        
        const normalizedFront = front.trim();
        const isDuplicate = allCards.some(card => card.front.trim() === normalizedFront);
        
        if (isDuplicate) {
            setNotification(`⚠️ Từ vựng "${normalizedFront}" đã có trong danh sách!`);
            return false;
        }

        const newCardData = createCardObject(front, back, synonym, example, exampleMeaning, nuance, {}, null, imageBase64, audioBase64, pos, level, sinoVietnamese, synonymSinoVietnamese);

        let cardRef; 

        try {
            cardRef = doc(collection(db, vocabCollectionPath));
            await setDoc(cardRef, newCardData);
            
            setNotification(`Đã thêm thẻ mới: ${newCardData.front}`);
            await updateDailyActivity(1);

            if (action === 'back') {
                setView('HOME');
            }

            if (!audioBase64) {
                (async () => {
                    try {
                        const speechText = getSpeechText(front);
                        const fetchedAudioBase64 = await fetchTtsBase64(speechText);
                        
                        if (fetchedAudioBase64 && cardRef) {
                            await updateDoc(cardRef, { audioBase64: fetchedAudioBase64 });
                        }
                    } catch (e) {
                        console.error("Lỗi tạo âm thanh (nền):", e);
                    }
                })(); 
            }
            
            return true; 

        } catch (e) {
            console.error("Lỗi khi thêm thẻ:", e);
            setNotification("Lỗi khi lưu thẻ. Vui lòng thử lại.");
            return false;
        } 
    };

    const handleBatchImport = async (cardsArray) => {
        if (!vocabCollectionPath || cardsArray.length === 0) return;
        
        setIsLoading(true);
        setNotification(`Đang xử lý ${cardsArray.length} thẻ...`);
        
        try {
            const importedCardsLocal = [];
            const cardsForTts = []; 
            let skippedCount = 0;
            const validCardsToInsert = [];

            for (const card of cardsArray) {
                const normalizedFront = card.front.trim();
                const isDuplicate = allCards.some(c => c.front.trim() === normalizedFront);
                
                if (isDuplicate) {
                    skippedCount++;
                    continue; 
                }

                const now = new Date();
                
                const calculateCorrectInterval = (interval, nextReviewTimestamp) => {
                    const reviewDate = nextReviewTimestamp ? new Date(parseInt(nextReviewTimestamp)) : now;
                    const diffTime = reviewDate - now; 
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if ((interval === -1 || interval === '-1') && diffDays >= 2) {
                         if (diffDays >= 90) return 4;
                         if (diffDays >= 30) return 3;
                         if (diffDays >= 7) return 2;
                         if (diffDays >= 3) return 1;
                         return 0; 
                    }
                    return interval;
                };

                let intervalBack = calculateCorrectInterval(card.intervalIndex_back, card.nextReview_back_timestamp);
                let intervalSynonym = calculateCorrectInterval(card.intervalIndex_synonym, card.nextReview_synonym_timestamp);
                let intervalExample = calculateCorrectInterval(card.intervalIndex_example, card.nextReview_example_timestamp);

                const srsData = {
                    intervalIndex_back: intervalBack, 
                    correctStreak_back: card.correctStreak_back,
                    nextReview_back_timestamp: card.nextReview_back_timestamp,
                    intervalIndex_synonym: intervalSynonym,
                    correctStreak_synonym: card.correctStreak_synonym,
                    nextReview_synonym_timestamp: card.nextReview_synonym_timestamp,
                    intervalIndex_example: intervalExample,
                    correctStreak_example: card.correctStreak_example,
                    nextReview_example_timestamp: card.nextReview_example_timestamp,
                };
                
                let createdAtDate = null;
                if (card.createdAtRaw && card.createdAtRaw !== 'N/A') {
                    const parsed = new Date(card.createdAtRaw);
                    if (!isNaN(parsed.getTime())) {
                        createdAtDate = parsed;
                    }
                }

                const newCardData = createCardObject(
                    card.front, 
                    card.back, 
                    card.synonym, 
                    card.example, 
                    card.exampleMeaning, 
                    card.nuance,
                    srsData,
                    createdAtDate,
                    null, 
                    null,  
                    card.pos || '',
                    card.level || '', 
                    card.sinoVietnamese || '', // Import SinoVietnamese
                    card.synonymSinoVietnamese || '' // Import Synonym SV
                );

                if (card.audioBase64 && card.audioBase64.length > 100) { 
                    newCardData.audioBase64 = card.audioBase64;
                }
                
                if (card.imageBase64 && card.imageBase64.length > 100) {
                     newCardData.imageBase64 = card.imageBase64;
                }

                const cardRef = doc(collection(db, vocabCollectionPath));
                validCardsToInsert.push({ ref: cardRef, data: newCardData });
                
                importedCardsLocal.push({
                    id: cardRef.id,
                    ...newCardData
                });
                
                if (!newCardData.audioBase64) {
                    cardsForTts.push({ id: cardRef.id, front: newCardData.front });
                }
            }

            if (validCardsToInsert.length === 0 && skippedCount > 0) {
                setNotification(`⚠️ Tất cả ${skippedCount} thẻ đều đã tồn tại trong danh sách!`);
                setIsLoading(false);
                return;
            }

            // Batch Write (Fix payload size limit with Smart Batching)
            // Strategy: Commit batch when count >= 500 OR approximate size >= 1MB
            const BATCH_SIZE_LIMIT = 500; 
            const PAYLOAD_SIZE_LIMIT = 1 * 1024 * 1024; // 1MB Safety Limit

            let currentBatch = writeBatch(db);
            let currentBatchCount = 0;
            let currentBatchSize = 0;
            
            for (const item of validCardsToInsert) {
                // Approximate size: stringify JSON + key length overhead
                const itemSize = JSON.stringify(item.data).length + 100;

                // Check if adding this item would exceed limits
                if (currentBatchCount >= BATCH_SIZE_LIMIT || (currentBatchSize + itemSize) > PAYLOAD_SIZE_LIMIT) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    currentBatchCount = 0;
                    currentBatchSize = 0;
                }

                currentBatch.set(item.ref, item.data);
                currentBatchCount++;
                currentBatchSize += itemSize;
            }

            // Commit remaining items
            if (currentBatchCount > 0) {
                await currentBatch.commit();
            }

            await updateDailyActivity(importedCardsLocal.length);

            let message = `Đã nhập thành công ${importedCardsLocal.length} thẻ!`;
            if (skippedCount > 0) {
                message += ` (Bỏ qua ${skippedCount} thẻ trùng lặp)`;
            }

            if (cardsForTts.length > 0) {
                 setNotification(`${message} Đang tạo âm thanh cho ${cardsForTts.length} thẻ mới...`); 
            } else {
                 setNotification(`${message} (Sử dụng âm thanh có sẵn)`);
            }
           
            setIsLoading(false);
            setView('HOME');

            if (cardsForTts.length > 0) {
                (async () => {
                    const CONCURRENCY_LIMIT = 2; 
                    let currentIndex = 0;

                    const worker = async () => {
                        while (currentIndex < cardsForTts.length) {
                            const index = currentIndex++;
                            const item = cardsForTts[index];
                            if (!item) break;

                            try {
                                const speechText = getSpeechText(item.front);
                                const audioBase64 = await fetchTtsBase64(speechText);
                                if (audioBase64) {
                                    const cardRef = doc(db, vocabCollectionPath, item.id);
                                    await updateDoc(cardRef, { audioBase64: audioBase64 });
                                }
                            } catch (e) {
                                console.error(`Lỗi tạo âm thanh cho thẻ ${item.front}:`, e);
                            }
                        }
                    };

                    const workers = [];
                    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
                        workers.push(worker());
                    }

                    await Promise.all(workers);
                })();
            }

        } catch (e) {
            console.error("Lỗi khi nhập hàng loạt:", e);
            setNotification(`Lỗi khi nhập: ${e.message}. Vui lòng thử chia nhỏ file.`);
            setIsLoading(false);
        }
    };

    const handleDeleteCard = async (cardId, cardFront) => {
        if (!vocabCollectionPath || !cardId) return;
        try {
            await deleteDoc(doc(db, vocabCollectionPath, cardId));
            setReviewCards(prevCards => prevCards.filter(card => card.id !== cardId));
            if (editingCard && editingCard.id === cardId) {
                setEditingCard(null);
                setView('LIST'); 
            }
            setNotification(`Đã xoá thẻ: ${cardFront}`);
        } catch (e) {
            console.error("Lỗi khi xoá thẻ:", e);
        }
    };
    
    const handleUpdateCard = async (cardId, isCorrect, cardReviewType) => {
        if (!vocabCollectionPath) return;

        const cardRef = doc(db, vocabCollectionPath, cardId);
        let cardSnap;
        try {
            cardSnap = await getDoc(cardRef);
        } catch (e) {
            console.error("Lỗi fetch thẻ để cập nhật:", e);
            return;
        }

        if (!cardSnap.exists()) return;
        const cardData = cardSnap.data();

        // Tất cả 3 phần dùng chung intervalIndex_back và nextReview_back
        let currentInterval = typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1;
        if (currentInterval === -999) currentInterval = -1;
        
        // Lấy streak của các phần
        const backStreak = typeof cardData.correctStreak_back === 'number' ? cardData.correctStreak_back : 0;
        const synonymStreak = typeof cardData.correctStreak_synonym === 'number' ? cardData.correctStreak_synonym : 0;
        const exampleStreak = typeof cardData.correctStreak_example === 'number' ? cardData.correctStreak_example : 0;
        
        const hasSynonym = cardData.synonym && cardData.synonym.trim() !== '';
        const hasExample = cardData.example && cardData.example.trim() !== '';
        
        const updateData = {
            lastReviewed: serverTimestamp(),
        };
        
        // Cập nhật streak của phần được ôn tập
        let newBackStreak = backStreak;
        let newSynonymStreak = synonymStreak;
        let newExampleStreak = exampleStreak;
        
        if (isCorrect) {
            // Tăng streak của phần được ôn tập
            if (cardReviewType === 'back') {
                newBackStreak = backStreak + 1;
            } else if (cardReviewType === 'synonym') {
                newSynonymStreak = synonymStreak + 1;
            } else if (cardReviewType === 'example') {
                newExampleStreak = exampleStreak + 1;
            }
        } else {
            // Sai: reset streak của phần đó về 0
            if (cardReviewType === 'back') {
                newBackStreak = 0;
            } else if (cardReviewType === 'synonym') {
                newSynonymStreak = 0;
            } else if (cardReviewType === 'example') {
                newExampleStreak = 0;
            }
        }
        
        updateData.correctStreak_back = newBackStreak;
        if (hasSynonym) updateData.correctStreak_synonym = newSynonymStreak;
        if (hasExample) updateData.correctStreak_example = newExampleStreak;
        
        // Kiểm tra xem cả 3 phần đã hoàn thành chưa (streak >= 1)
        // CHỈ ĐẾM CÁC PHẦN TỒN TẠI
        const backCompleted = newBackStreak >= 1;
        const synonymCompleted = hasSynonym && newSynonymStreak >= 1; // Chỉ đếm nếu CÓ synonym
        const exampleCompleted = hasExample && newExampleStreak >= 1; // Chỉ đếm nếu CÓ example
        
        // Tính số phần đã hoàn thành và số phần cần thiết
        let completedCount = 0;
        let requiredCount = 1; // Back luôn bắt buộc
        
        if (backCompleted) completedCount++;
        
        if (hasSynonym) {
            requiredCount++;
            if (synonymCompleted) completedCount++;
        }
        
        if (hasExample) {
            requiredCount++;
            if (exampleCompleted) completedCount++;
        }
        
        const allRequiredPartsCompleted = completedCount >= requiredCount;
        
        // Tính ngày hôm nay và ngày mai
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (allRequiredPartsCompleted) {
            // Cả 3 phần đều hoàn thành: tăng interval và tính nextReview mới
            const newInterval = currentInterval < 0 ? 0 : Math.min(currentInterval + 1, SRS_INTERVALS.length - 1);
            const nextReviewDate = getNextReviewDate(newInterval);
            
            updateData.intervalIndex_back = newInterval;
            updateData.nextReview_back = nextReviewDate;
            
            // Đồng bộ interval và nextReview cho synonym và example (dùng chung)
            if (hasSynonym) {
                updateData.intervalIndex_synonym = newInterval;
                updateData.nextReview_synonym = nextReviewDate;
            }
            if (hasExample) {
                updateData.intervalIndex_example = newInterval;
                updateData.nextReview_example = nextReviewDate;
            }
            
            // Reset streaks về 0 sau khi hoàn thành một chu kỳ
            updateData.correctStreak_back = 0;
            if (hasSynonym) updateData.correctStreak_synonym = 0;
            if (hasExample) updateData.correctStreak_example = 0;
        } else {
            // Chưa hoàn thành đủ 3 phần: KHÔNG THAY ĐỔI nextReview
            // Để từ vẫn xuất hiện trong danh sách "cần ôn" cho đến khi hoàn thành đủ 3 phần
            // CHỈ cập nhật nextReview khi hoàn thành ĐỦ 3 phần (ở block if trên)
            
            // Nếu là từ mới chưa có nextReview, set về hôm nay để nó vẫn xuất hiện
            const currentNextReview = cardData.nextReview_back?.toDate ? cardData.nextReview_back.toDate() : null;
            
            if (!currentNextReview || currentInterval < 0) {
                // Từ mới: set nextReview = today để nó vẫn xuất hiện trong danh sách due
                updateData.nextReview_back = today;
                if (hasSynonym) updateData.nextReview_synonym = today;
                if (hasExample) updateData.nextReview_example = today;
            }
            // Nếu từ đã có nextReview: KHÔNG cập nhật, giữ nguyên chu kỳ cũ
            
            // Giữ nguyên interval hiện tại (không tăng)
            // Không cần cập nhật intervalIndex vì vẫn giữ nguyên giá trị cũ
        }
        
        try {
            await updateDoc(cardRef, updateData);
            
            // Debug: Log streaks sau khi cập nhật
            console.log(`[SRS Update] Card: ${cardData.front}, Type: ${cardReviewType}`);
            console.log(`  Streaks - Back: ${updateData.correctStreak_back}, Syn: ${updateData.correctStreak_synonym || 'N/A'}, Ex: ${updateData.correctStreak_example || 'N/A'}`);
            console.log(`  AllCompleted: ${allRequiredPartsCompleted}, NextReview: ${updateData.nextReview_back || 'unchanged'}`);
        } catch (e) {
            console.error("Lỗi khi cập nhật thẻ:", e);
        }
    };

    const handleNavigateToEdit = (card) => {
        setEditingCard(card);
        setView('EDIT_CARD');
    };

    const handleSaveChanges = async ({ cardId, front, back, synonym, example, exampleMeaning, nuance, pos, level, imageBase64, audioBase64, sinoVietnamese, synonymSinoVietnamese }) => {
        if (!vocabCollectionPath || !cardId) return;

        const oldCard = allCards.find(c => c.id === cardId);
        if (!oldCard) return;

        const oldSpeechText = getSpeechText(oldCard.front);
        const newSpeechText = getSpeechText(front);

        const updatedData = {
            front: front.trim(),
            back: back.trim(),
            synonym: synonym.trim(),
            sinoVietnamese: sinoVietnamese.trim(),
            synonymSinoVietnamese: synonymSinoVietnamese.trim(), // Update Synonym SV
            example: example.trim(),
            exampleMeaning: exampleMeaning.trim(),
            nuance: nuance.trim(),
            pos: pos || '',
            level: level || '', // Update Level
            imageBase64: imageBase64,
        };
        
        if (audioBase64 !== undefined) {
             updatedData.audioBase64 = audioBase64;
        }

        try {
            await updateDoc(doc(db, vocabCollectionPath, cardId), updatedData);
            setNotification(`Đã cập nhật thẻ: ${front}`);
            setView('LIST'); 
            setEditingCard(null); 

            if (oldSpeechText !== newSpeechText && !audioBase64) {
                (async () => {
                    try {
                        const newAudioBase64 = await fetchTtsBase64(newSpeechText);
                        if (newAudioBase64) {
                            await updateDoc(doc(db, vocabCollectionPath, cardId), { audioBase64: newAudioBase64 });
                        }
                    } catch (e) {
                        console.error("Lỗi tạo lại âm thanh:", e);
                    }
                })();
            }
        } catch (e) {
            console.error("Lỗi khi cập nhật thẻ:", e);
            setNotification("Lỗi khi cập nhật thẻ.");
        }
    };

    const handleSaveProfile = async (displayName) => {
        if (!settingsDocPath) return;
        const defaultGoal = 10;
        const newProfile = {
            displayName: displayName.trim(),
            dailyGoal: defaultGoal,
            hasSeenHelp: false 
        };
        try {
            await setDoc(doc(db, settingsDocPath), newProfile);
        } catch (e) {
            console.error("Lỗi lưu hồ sơ:", e);
        }
    };

    const handleConfirmHelp = async () => {
        if (!settingsDocPath) return;
        try {
            await updateDoc(doc(db, settingsDocPath), { hasSeenHelp: true });
        } catch (e) {
            console.error("Lỗi cập nhật hasSeenHelp:", e);
        }
    };

    const handleUpdateGoal = async (newGoal) => {
        if (!settingsDocPath || isNaN(newGoal) || newGoal <= 0) {
            setNotification("Mục tiêu phải là một số dương.");
            return;
        }
        try {
            await updateDoc(doc(db, settingsDocPath), { dailyGoal: Number(newGoal) });
            setNotification("Đã cập nhật mục tiêu!");
        } catch (e) {
            console.error("Lỗi cập nhật mục tiêu:", e);
            setNotification("Lỗi khi cập nhật mục tiêu.");
        }
    };

    // Tự động ẩn thông báo sau 3s
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNotification(''), 3000);
        return () => clearTimeout(t);
    }, [notification]);
    
    // --- Helper: Lấy danh sách API keys ---
    const getGeminiApiKeys = () => {
        // Ưu tiên dùng keys từ state (có thể được cấu hình từ UI)
        if (geminiApiKeys && geminiApiKeys.length > 0) {
            return geminiApiKeys;
        }
        // Fallback: lấy từ env
        const keys = [];
        if (import.meta.env.VITE_GEMINI_API_KEY) keys.push(import.meta.env.VITE_GEMINI_API_KEY);
        if (import.meta.env.VITE_GEMINI_TTS_API_KEY) keys.push(import.meta.env.VITE_GEMINI_TTS_API_KEY);
        // Hỗ trợ thêm keys từ env (VITE_GEMINI_API_KEY_2, VITE_GEMINI_API_KEY_3, ...)
        let i = 2;
        while (import.meta.env[`VITE_GEMINI_API_KEY_${i}`]) {
            keys.push(import.meta.env[`VITE_GEMINI_API_KEY_${i}`]);
            i++;
        }
        return keys;
    };

    // --- Helper: Gọi Gemini API với retry logic tự động chuyển key ---
    const callGeminiApiWithRetry = async (payload, model = 'gemini-2.5-flash-preview-09-2025') => {
        const apiKeys = getGeminiApiKeys();
        
        if (apiKeys.length === 0) {
            setNotification("Chưa cấu hình khóa API Gemini. Vui lòng thêm VITE_GEMINI_API_KEY vào file .env hoặc cấu hình trong Settings.");
            throw new Error("Không có API key nào được cấu hình");
        }

        let lastError = null;
        
        // Thử từng key một
        for (let i = 0; i < apiKeys.length; i++) {
            const apiKey = apiKeys[i];
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    // Nếu thành công, trả về kết quả
                    return result;
                }

                // Đọc body lỗi để xác định loại lỗi
                let errorBody = "";
                try {
                    errorBody = await response.text();
                    console.error(`Gemini error với key ${i + 1}/${apiKeys.length}:`, errorBody);
                } catch (_) {}

                // Các lỗi có thể retry với key khác: 401, 403, 429
                const retryableErrors = [401, 403, 429];
                if (retryableErrors.includes(response.status)) {
                    console.log(`Key ${i + 1} thất bại (${response.status}), thử key tiếp theo...`);
                    lastError = new Error(`Lỗi API Gemini với key ${i + 1}: ${response.status} ${response.statusText}`);
                    // Tiếp tục vòng lặp để thử key tiếp theo
                    continue;
                } else {
                    // Lỗi khác (400, 500, ...) không nên retry
                    if (response.status === 400) {
                        setNotification(`Lỗi yêu cầu không hợp lệ (400). Vui lòng kiểm tra lại dữ liệu đầu vào.`);
                    } else {
                        setNotification(`Lỗi từ Gemini: ${response.status} ${response.statusText}. Xem chi tiết trong console.`);
                    }
                    throw new Error(`Lỗi API Gemini: ${response.status} ${response.statusText} ${errorBody}`);
                }
            } catch (e) {
                // Lỗi network hoặc parse
                if (e.message && e.message.includes("Lỗi API Gemini")) {
                    throw e; // Re-throw lỗi không retry được
                }
                console.error(`Lỗi network với key ${i + 1}:`, e);
                lastError = e;
                // Tiếp tục thử key tiếp theo nếu còn
                if (i < apiKeys.length - 1) {
                    continue;
                }
            }
        }

        // Tất cả keys đều thất bại
        if (lastError) {
            setNotification(`Tất cả ${apiKeys.length} API key đều thất bại. Vui lòng kiểm tra lại các keys hoặc thử lại sau.`);
            throw lastError;
        }
        
        throw new Error("Không thể gọi API Gemini với bất kỳ key nào");
    };

    // --- GEMINI AI ASSISTANT ---
    const handleGeminiAssist = async (frontText, contextPos = '', contextLevel = '') => {
        if (!frontText) return null;
        
        // Tạo ngữ cảnh bổ sung cho AI
        let contextInfo = "";
        if (contextPos) contextInfo += `, Từ loại: ${contextPos}`;
        if (contextLevel) contextInfo += `, Cấp độ: ${contextLevel}`;

        // Prompt yêu cầu trả về JSON, không dùng responseSchema để tránh kén model
        const systemPrompt = `Bạn là trợ lý từ điển Nhật-Việt. Người dùng đang tìm kiếm thông tin cho từ vựng: "${frontText}"${contextInfo}.
Trả về **DUY NHẤT** một JSON hợp lệ, không kèm giải thích, theo đúng schema sau:
{
  "frontWithFurigana": "食べる（たべる）",
  "meaning": "ăn",
  "pos": "verb",
  "level": "N5",
  "sinoVietnamese": "Thực",
  "synonym": "食事する, 食う",
  "synonymSinoVietnamese": "Thực sự, Cự",
  "example": "私は毎日ご飯を食べる。",
  "exampleMeaning": "Tôi ăn cơm mỗi ngày.",
  "nuance": "Dùng phổ biến trong cả văn nói và văn viết."
}
Không được trả về markdown, không được dùng \`\`\`, không được trả lời thêm bất cứ chữ nào ngoài JSON.`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                }
            ]
        };

        try {
            // Sử dụng hàm retry tự động
            const result = await callGeminiApiWithRetry(payload);
            // Debug Gemini response
            // console.log("Gemini raw result:", result);

            const candidate = result.candidates?.[0];
            
            if (candidate && candidate.content?.parts?.[0]?.text) {
                const rawText = candidate.content.parts[0].text.trim();

                // Nếu Gemini lỡ trả về JSON kèm ``` hoặc text thừa, cố gắng cắt lấy phần JSON
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                const jsonText = jsonMatch ? jsonMatch[0] : rawText;

                try {
                    const parsedJson = JSON.parse(jsonText);
                    return parsedJson; 
                } catch (parseErr) {
                    console.error("Lỗi parse JSON từ Gemini:", parseErr, "rawText:", rawText);
                    setNotification("Gemini trả về dữ liệu không phải JSON hợp lệ. Thử lại với từ khác hoặc thử lại sau ít phút.");
                    return null;
                }
            } else {
                setNotification("Gemini trả về dữ liệu trống hoặc không đúng cấu trúc. Hãy thử lại sau ít phút.");
                throw new Error("Phản hồi JSON không hợp lệ");
            }
        } catch (e) {
            console.error("Lỗi Gemini Assist:", e);
            if (!e.message?.includes("Lỗi API Gemini")) {
                setNotification("Không gọi được Gemini. Hãy kiểm tra kết nối mạng, API key hoặc thử lại sau ít phút.");
            }
            return null;
        }
    };
    
    // --- NEW: Batch Auto-Classification for Missing POS ---
    const handleAutoClassifyBatch = async (cardsToClassify) => {
        if (!cardsToClassify || cardsToClassify.length === 0) return;
        
        setIsLoading(true);
        setNotification(`Đang tự động phân loại ${cardsToClassify.length} từ...`);
        
        let successCount = 0;
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        for (const card of cardsToClassify) {
            try {
                const text = card.front; 
                const aiData = await handleGeminiAssist(text);
                
                const updates = {};
                if (aiData && aiData.pos) updates.pos = aiData.pos;
                if (aiData && aiData.level) updates.level = aiData.level;

                if (Object.keys(updates).length > 0) {
                    const cardRef = doc(db, vocabCollectionPath, card.id);
                    await updateDoc(cardRef, updates);
                    successCount++;
                }
                
                await delay(1000); 

            } catch (e) {
                console.error(`Lỗi phân loại thẻ ${card.front}:`, e);
            }
        }
        
        setNotification(`Đã phân loại thành công ${successCount}/${cardsToClassify.length} thẻ.`);
        setIsLoading(false);
    };

    // --- NEW: Batch Auto-SinoVietnamese ---
    const handleAutoSinoVietnameseBatch = async (cardsToProcess) => {
        if (!cardsToProcess || cardsToProcess.length === 0) return;

        // Lọc: Chỉ xử lý các từ có chứa Kanji (Sử dụng Regex range cho Kanji)
        const cardsWithKanji = cardsToProcess.filter(card => /[\u4e00-\u9faf]/.test(card.front));

        if (cardsWithKanji.length === 0) {
            setNotification("Không tìm thấy từ vựng nào chứa Kanji cần cập nhật Hán Việt.");
            return;
        }
        
        setIsLoading(true);
        setNotification(`Đang tạo âm Hán Việt cho ${cardsWithKanji.length} từ chứa Kanji (Đã bỏ qua ${cardsToProcess.length - cardsWithKanji.length} từ không có Kanji)...`);
        
        const apiKeys = getGeminiApiKeys();
        if (apiKeys.length === 0) {
            setNotification("Chưa cấu hình khóa API Gemini cho Hán Việt. Vui lòng thêm VITE_GEMINI_API_KEY vào file .env.");
            setIsLoading(false);
            return;
        }
        
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        let successCount = 0;

        for (const card of cardsWithKanji) {
             try {
                const text = card.front;
                const prompt = `Từ vựng tiếng Nhật: "${text}". Hãy cho biết Âm Hán Việt tương ứng của từ này. Chỉ trả về duy nhất từ Hán Việt. Nếu là Katakana hoặc không có Hán Việt rõ ràng, hãy trả về rỗng.`;
                
                const payload = {
                        contents: [{ parts: [{ text: prompt }] }]
                };

                // Sử dụng hàm retry tự động
                const result = await callGeminiApiWithRetry(payload);
                    let sino = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    sino = sino.trim();
                    
                    if (sino && sino.toLowerCase() !== 'null' && sino.toLowerCase() !== 'none') {
                        const cardRef = doc(db, vocabCollectionPath, card.id);
                        await updateDoc(cardRef, { sinoVietnamese: sino });
                        successCount++;
                    }
                
                await delay(1000);

             } catch(e) {
                 console.error("Lỗi lấy âm Hán Việt:", e);
             }
        }
        setNotification(`Đã cập nhật Hán Việt cho ${successCount}/${cardsWithKanji.length} thẻ.`);
        setIsLoading(false);
    };


    const memoryStats = useMemo(() => {
        const stats = { shortTerm: 0, midTerm: 0, longTerm: 0, new: 0 };
        allCards.forEach(card => {
            // Liên kết chặt chẽ với SRS Interval Index
            switch (card.intervalIndex_back) {
                case -1: 
                case 0: 
                case 1: 
                    stats.new++; 
                    break;
                case 2: 
                    stats.shortTerm++;
                    break;
                case 3: 
                    stats.midTerm++;
                    break;
                default: 
                    if (card.intervalIndex_back >= 4) stats.longTerm++;
            }
        });
        return stats;
    }, [allCards]);

    useEffect(() => {
        if (!authReady || !userId || !db || !profile) return;

        const updatePublicStats = async () => {
            try {
                const statsDocRef = doc(db, publicStatsCollectionPath, userId);
                const publicData = {
                    userId: userId,
                    displayName: profile.displayName || 'Người dùng ẩn danh', 
                    totalCards: allCards.length,
                    shortTerm: memoryStats.shortTerm,
                    midTerm: memoryStats.midTerm,
                    longTerm: memoryStats.longTerm,
                    isApproved: profile.isApproved === true,
                    lastUpdated: serverTimestamp() 
                };
                await setDoc(statsDocRef, publicData, { merge: true }); 
            } catch (e) {
                console.error("Lỗi cập nhật public stats:", e);
            }
        };

        updatePublicStats();
        
    }, [memoryStats, allCards.length, profile, userId, authReady, publicStatsCollectionPath]); 


    // Nếu chưa biết trạng thái auth, show loading
    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
            </div>
        );
    }

    // Nếu chưa có userId (chưa đăng nhập), hiển thị màn Login
    if (!userId) {
        return <LoginScreen />;
    }

    if (isLoading || isProfileLoading || !profile) { 
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
            </div>
        );
    }

    // Nếu chưa được admin duyệt, hiển thị màn thanh toán/kích hoạt
    if (!isAdmin && profile && profile.isApproved !== true) {
        return (
            <PaymentScreen
                displayName={profile.displayName}
                onPaidClick={() => {
                    // Popup sẽ được hiển thị trong PaymentScreen component
                }}
                onLogout={async () => {
                    if (auth) await signOut(auth);
                }}
            />
        );
    }
    
    const renderContent = () => {
        switch (view) {
            case 'ADD_CARD':
                return <AddCardForm 
                    onSave={handleAddCard} 
                    onBack={() => setView('HOME')} 
                    onGeminiAssist={handleGeminiAssist}
                />;
            case 'EDIT_CARD':
                if (!editingCard) {
                    setView('LIST'); 
                    return null;
                }
                return <EditCardForm 
                    card={editingCard}
                    onSave={handleSaveChanges} 
                    onBack={() => { setEditingCard(null); setView('LIST'); }} 
                    onGeminiAssist={handleGeminiAssist}
                />;
            case 'STUDY':
                return <StudyScreen
                    studySessionData={studySessionData}
                    setStudySessionData={setStudySessionData}
                    allCards={allCards}
                    onUpdateCard={handleUpdateCard}
                    onCompleteStudy={() => {
                        setStudySessionData({
                            learning: [],
                            new: [],
                            reviewing: [],
                            currentBatch: [],
                            currentPhase: 'multipleChoice',
                            batchIndex: 0,
                            allNoSrsCards: []
                        });
                        setView('HOME');
                    }}
                />;
            case 'REVIEW':
                if (reviewCards.length === 0) {
                    return <ReviewCompleteScreen onBack={() => setView('HOME')} />;
                }
                return <ReviewScreen 
                    cards={reviewCards} 
                    reviewMode={reviewMode}
                    allCards={allCards}
                    onUpdateCard={handleUpdateCard} 
                    onCompleteReview={(failedCardsSet) => {
                        // Nếu có từ sai, tạo danh sách ôn lại
                        if (failedCardsSet && failedCardsSet.size > 0) {
                            // Tạo danh sách từ các từ đã sai
                            const failedCardsList = [];
                            failedCardsSet.forEach(cardKey => {
                                const [cardId, reviewType] = cardKey.split('-');
                                const card = allCards.find(c => c.id === cardId);
                                if (card) {
                                    failedCardsList.push({ ...card, reviewType });
                                }
                            });
                            
                            // Shuffle và set lại reviewCards
                            setReviewCards(shuffleArray(failedCardsList));
                            setReviewMode('mixed'); // Ôn lại tất cả các phần
                            // Không thay đổi view, tiếp tục ở REVIEW
                        } else {
                            // Không có từ sai, hoàn thành và về HOME
                            setReviewCards([]);
                            setView('HOME'); 
                        }
                    }} 
                />;
            case 'TEST':
                return <TestScreen 
                    allCards={allCards}
                    onBack={() => setView('HOME')} 
                />;
            case 'LIST':
                return <ListView 
                    allCards={allCards} 
                    onDeleteCard={handleDeleteCard}
                    onPlayAudio={playAudio} 
                    onExport={() => handleExport(allCards)} 
                    onNavigateToEdit={handleNavigateToEdit} 
                    onAutoClassifyBatch={handleAutoClassifyBatch} 
                    onAutoSinoVietnameseBatch={handleAutoSinoVietnameseBatch}
                />;
            case 'IMPORT':
                return <ImportScreen 
                    onImport={handleBatchImport} 
                    onBack={() => setView('HOME')} 
                />;
            case 'HELP':
                return <HelpScreen 
                    isFirstTime={false} 
                    onBack={() => setView('HOME')} 
                />;
            case 'STATS':
                return <StatsScreen 
                    memoryStats={memoryStats} 
                    totalCards={allCards.length}
                    profile={profile}
                    allCards={allCards}
                    dailyActivityLogs={dailyActivityLogs}
                    onUpdateGoal={handleUpdateGoal}
                    onBack={() => setView('HOME')} 
                />;
            case 'FRIENDS':
                return <FriendsScreen 
                    publicStatsPath={publicStatsCollectionPath} 
                    currentUserId={userId} 
                    isAdmin={isAdmin}
                    onAdminDeleteUserData={handleAdminDeleteUserData}
                    onBack={() => setView('HOME')} 
                />;
            case 'ACCOUNT':
                return <AccountScreen
                    profile={profile}
                    publicStatsPath={publicStatsCollectionPath}
                    currentUserId={userId}
                    onUpdateProfileName={async (newName) => {
                        if (!settingsDocPath) return;
                        await updateDoc(doc(db, settingsDocPath), { displayName: newName });
                        setProfile(prev => prev ? { ...prev, displayName: newName } : prev);
                    }}
                    onChangePassword={async (newPassword, currentPassword) => {
                        if (!auth || !auth.currentUser) throw new Error('Chưa đăng nhập.');
                        // Với Email/Password, để đổi mật khẩu an toàn bạn nên reauthenticate với currentPassword.
                        // Ở đây, để đơn giản, ta chỉ gọi updatePassword (Firebase có thể yêu cầu re-auth trong một số trường hợp).
                        await updatePassword(auth.currentUser, newPassword);
                    }}
                    onBack={() => setView('HOME')}
                />;
            case 'HOME':
            default:
                return <HomeScreen 
                    displayName={profile.displayName} 
                    dueCounts={dueCounts} 
                    totalCards={allCards.length}
                    allCards={allCards}
                    studySessionData={studySessionData}
                    setStudySessionData={setStudySessionData}
                    setNotification={setNotification}
                    setReviewMode={setReviewMode}
                    setView={setView}
                    onStartReview={prepareReviewCards} 
                    onNavigate={setView}
                />;
        }
    };

    return (
        <div className="h-screen md:min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-800 overflow-hidden w-full">
            <Header currentView={view} setView={setView} />
            <main className="flex-grow p-2 md:p-6 lg:p-8 flex justify-center items-stretch pb-2 md:pb-6 lg:pb-10 overflow-hidden main-with-header">
                <div className="w-full max-w-xl lg:max-w-2xl mx-auto flex flex-col h-full">
                    {/* Modern Container for Main Content - Padding nhỏ hơn */}
                    <div className={`flex-1 bg-white/90 backdrop-blur-sm shadow-xl shadow-indigo-100/50 rounded-xl md:rounded-2xl border border-white/50 p-3 md:p-4 transition-all duration-300 flex flex-col ${view === 'LIST' ? 'overflow-hidden' : 'overflow-y-auto'} ${view === 'REVIEW' ? 'overflow-hidden' : ''}`}>
                        <div className={`flex-1 ${view === 'LIST' ? 'overflow-y-auto overflow-x-hidden' : view === 'REVIEW' ? 'overflow-hidden' : ''}`}>
                        {renderContent()}
                        </div>
                        
                        {notification && (view === 'HOME' || view === 'STATS' || view === 'ADD_CARD' || view === 'LIST') && (
                            <div className={`mt-2 md:mt-6 p-2 md:p-4 rounded-lg md:rounded-xl text-center text-xs md:text-sm font-medium animate-fade-in flex items-center justify-center space-x-2
                                ${notification.includes('Lỗi') || notification.includes('có trong') 
                                    ? 'bg-red-50 text-red-600 border border-red-100' 
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                {notification.includes('Lỗi') ? <AlertTriangle className="w-3 h-3 md:w-4 md:h-4"/> : <CheckCircle className="w-3 h-3 md:w-4 md:h-4"/>}
                                <span>{notification}</span>
                            </div>
                        )}
                        <div className="mt-auto pt-2 md:pt-6 border-t border-gray-100 text-[10px] md:text-xs text-gray-400 text-center flex flex-col items-center gap-0.5 md:gap-1">
                            <span>QuizKi V2.0</span>
                            <span className="font-mono bg-gray-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[8px] md:text-[10px] text-gray-300">UID: {userId?.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>

    );
};

// --- Component Phụ Trợ ---

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!auth) return;
        setError('');
        setInfo('');

        if (mode === 'register') {
            if (password.length < 6) {
                setError('Mật khẩu phải có ít nhất 6 ký tự.');
                return;
            }
            if (password !== confirmPassword) {
                setError('Mật khẩu xác nhận không khớp.');
                return;
            }
        }

        setIsLoading(true);
        try {
            if (mode === 'login') {
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                if (!cred.user.emailVerified) {
                    // Gửi lại email xác thực (nếu cần) và không cho vào app
                    try {
                        await sendEmailVerification(cred.user);
                    } catch (ve) {
                        console.error('Lỗi gửi lại email xác thực:', ve);
                    }
                    setError('Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư, bấm vào link xác nhận rồi đăng nhập lại.');
                    await signOut(auth);
                    return;
                }
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                // Gửi email xác thực cho tài khoản mới
                try {
                    await sendEmailVerification(cred.user);
                    setInfo('Đăng ký thành công! Một email xác thực đã được gửi, vui lòng kiểm tra hộp thư và xác thực tài khoản.');
                } catch (ve) {
                    console.error('Lỗi gửi email xác thực:', ve);
                    setInfo('Đăng ký thành công, nhưng không gửi được email xác thực. Vui lòng thử lại chức năng quên mật khẩu hoặc liên hệ hỗ trợ.');
                }
                // Khởi tạo profile cơ bản cho user mới với tên mặc định (sẽ cho phép đổi trong app)
                if (db) {
                    const defaultName = email.trim().split('@')[0];
                    const profileRef = doc(db, `artifacts/${appId}/users/${cred.user.uid}/settings/profile`);
                    await setDoc(profileRef, {
                        displayName: defaultName,
                        dailyGoal: 10,
                        hasSeenHelp: true,
                        isApproved: false, // Chờ admin duyệt
                        createdAt: serverTimestamp()
                    }, { merge: true });
                }
                // Đăng ký xong nhưng bắt buộc xác thực email rồi mới cho đăng nhập
                await signOut(auth);
            }
        } catch (e) {
            console.error('Lỗi đăng nhập:', e);
            let msg = '';
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                msg = 'Email hoặc mật khẩu không đúng.';
            } else if (e.code === 'auth/user-not-found') {
                msg = 'Tài khoản không tồn tại. Hãy chọn Đăng ký.';
            } else if (e.code === 'auth/email-already-in-use') {
                msg = 'Email này đã được đăng ký, hãy chuyển sang Đăng nhập.';
            } else if (e.code === 'auth/weak-password') {
                msg = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.';
            } else if (e.code === 'auth/operation-not-allowed') {
                msg = 'Email/Password Auth chưa được bật trong Firebase Console.';
            }
            if (msg) setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!auth) return;
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError('Vui lòng nhập email để đặt lại mật khẩu.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setInfo('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.');
        } catch (e) {
            console.error('Lỗi quên mật khẩu:', e);
            const msg = e.code === 'auth/user-not-found'
                ? 'Không tìm thấy tài khoản với email này.'
                : 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.';
            setError(msg);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-4 md:space-y-6 border border-white/50">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">QuizKi</h2>
                    <p className="text-gray-500 text-xs md:text-sm">
                        Đăng nhập để đồng bộ kho từ vựng của bạn trên mọi thiết bị
                    </p>
                </div>

                <div className="flex bg-gray-100 rounded-xl md:rounded-2xl p-0.5 md:p-1 text-xs md:text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all ${
                            mode === 'login'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`flex-1 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all ${
                            mode === 'register'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Đăng ký
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                    <div className="space-y-1.5 md:space-y-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-xs md:text-sm outline-none"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700">Mật khẩu</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-xs md:text-sm outline-none"
                                placeholder="Tối thiểu 6 ký tự"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            </button>
                        </div>
                    </div>

                    {mode === 'register' && (
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="block text-xs md:text-sm font-semibold text-gray-700">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 md:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-xs md:text-sm outline-none"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-xs md:text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="text-xs md:text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                            {info}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl shadow-md md:shadow-lg shadow-indigo-200 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 mx-auto" />
                        ) : mode === 'login' ? (
                            'Đăng nhập'
                        ) : (
                            'Đăng ký tài khoản mới'
                        )}
                    </button>
                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            disabled={isLoading}
                            className="w-full text-[10px] md:text-xs text-indigo-600 hover:text-indigo-700 text-right mt-0.5 md:mt-1"
                        >
                            Quên mật khẩu?
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

const PaymentScreen = ({ displayName, onPaidClick, onLogout }) => {
    const [showPopup, setShowPopup] = useState(false);

    const handlePaidClick = () => {
        setShowPopup(true);
        onPaidClick();
        // Tự động đóng sau 3 giây
        setTimeout(() => {
            setShowPopup(false);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-8 md:p-10 border border-white/60 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">
                            Chào {displayName || 'bạn'} 👋
                        </h2>
                        <p className="mt-2 text-gray-500 text-sm">
                            Tài khoản của bạn đã được tạo và email đã được xác thực. Để tiếp tục sử dụng đầy đủ tính năng của QuizKi, vui lòng hoàn tất bước thanh toán kích hoạt bên phải.
                        </p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Quyền truy cập toàn bộ các tính năng học từ vựng, ôn tập SRS, thống kê.</li>
                        <li>• Dữ liệu được lưu trữ và đồng bộ giữa các thiết bị.</li>
                        <li>• Thanh toán một lần, sử dụng lâu dài cho tài khoản này.</li>
                    </ul>
                    <div className="text-xs text-gray-400">
                        Sau khi thanh toán, hãy nhấn nút <b>“Đã thanh toán”</b>. Admin sẽ kiểm tra và kích hoạt tài khoản cho bạn trong thời gian sớm nhất.
                    </div>
                </div>
                <div className="space-y-4 bg-gray-50 rounded-2xl border border-gray-100 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">Thông tin thanh toán</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                        <div>
                            <p className="text-gray-500 font-semibold">Chủ tài khoản</p>
                            <p className="text-gray-900 font-bold text-sm md:text-base">LÝ NGUYỄN NHẬT TRUNG</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold">STK MOMO / MB Bank</p>
                            <p className="text-gray-900 font-mono text-sm md:text-base font-bold">0376486121</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold">Nội dung chuyển khoản</p>
                            <p className="text-gray-900 text-[10px] md:text-xs bg-white border border-gray-200 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                                QUIZKI - {displayName || 'TEN_TAI_KHOAN'}
                            </p>
                        </div>
                    </div>
                    
                    {/* QR Codes */}
                    <div className="space-y-3 mt-4">
                        <p className="text-xs md:text-sm font-semibold text-gray-700">Quét mã QR để thanh toán:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col items-center">
                                <img 
                                    src={`${import.meta.env.BASE_URL}qr-codes/qr-momo.png`} 
                                    alt="QR Code MoMo" 
                                    className="w-full max-w-[200px] h-auto rounded-lg shadow-sm"
                                />
                                <p className="text-[10px] md:text-xs text-gray-600 mt-2 text-center">MoMo / VietQR / Napas</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <img 
                                    src={`${import.meta.env.BASE_URL}qr-codes/qr-vietqr.png`} 
                                    alt="QR Code VietQR" 
                                    className="w-full max-w-[200px] h-auto rounded-lg shadow-sm"
                                />
                                <p className="text-[10px] md:text-xs text-gray-600 mt-2 text-center">VietQR / Napas 247</p>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={handlePaidClick}
                        className="w-full mt-2 px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md"
                    >
                        Đã thanh toán
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="w-full px-4 py-2 text-[10px] md:text-xs font-semibold rounded-lg md:rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>

            {/* Popup thông báo */}
            {showPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPopup(false)}>
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-[280px] md:max-w-sm w-full p-4 md:p-5 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPopup(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800">Đã gửi yêu cầu thanh toán</h3>
                                <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">Vui lòng đợi ít phút</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AccountScreen = ({ profile, onUpdateProfileName, onChangePassword, onBack, publicStatsPath, currentUserId }) => {
    const [newDisplayName, setNewDisplayName] = useState(profile.displayName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirmNew, setShowConfirmNew] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSaveProfile = async () => {
        setError('');
        setMessage('');
        if (!newDisplayName.trim()) {
            setError('Tên hiển thị không được để trống.');
            return;
        }
        try {
            // Kiểm tra trùng tên hiển thị - query trên publicStats thay vì collectionGroup để tránh cần index
            if (db && publicStatsPath) {
                try {
                    const q = query(
                        collection(db, publicStatsPath),
                        where('displayName', '==', newDisplayName.trim())
                    );
                    const snap = await getDocs(q);
                    // Nếu có ít nhất một user khác (không phải current user) dùng tên này thì báo lỗi
                    if (!snap.empty) {
                        const conflict = snap.docs.find(d => d.id !== currentUserId);
                        if (conflict) {
                            setError('Tên hiển thị này đã được sử dụng. Vui lòng chọn tên khác.');
                            return;
                        }
                    }
                } catch (checkErr) {
                    console.error('Lỗi kiểm tra trùng tên hiển thị:', checkErr);
                    // Nếu lỗi kiểm tra, vẫn cho phép đổi tên để không chặn người dùng
                }
            }

            await onUpdateProfileName(newDisplayName.trim());
            setMessage('Đã cập nhật tên hiển thị.');
        } catch (e) {
            console.error('Lỗi cập nhật tên:', e);
            setError('Không thể cập nhật tên hiển thị. Vui lòng thử lại.');
        }
    };

    const handleChangePassword = async () => {
        setError('');
        setMessage('');
        if (!newPassword || newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        try {
            await onChangePassword(newPassword, currentPassword);
            setMessage('Đã cập nhật mật khẩu. Lần sau hãy dùng mật khẩu mới để đăng nhập.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            setError('Không thể đổi mật khẩu. Có thể bạn cần đăng nhập lại gần đây hoặc mật khẩu hiện tại không đúng.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Tài khoản của bạn</h2>
                    <p className="text-gray-500 text-sm">Quản lý thông tin cá nhân và bảo mật</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Thông tin cá nhân</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={auth?.currentUser?.email || ''}
                                readOnly
                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị</label>
                            <input
                                type="text"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none"
                                placeholder="Tên sẽ hiển thị trong app"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                        >
                            <Save className="w-4 h-4 mr-1" /> Lưu thay đổi
                        </button>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-rose-500" /> Bảo mật & mật khẩu
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showConfirmNew ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmNew(!showConfirmNew)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleChangePassword}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                        >
                            <Save className="w-4 h-4 mr-1" /> Đổi mật khẩu
                        </button>
                    </div>
                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-1">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mt-1">
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                >
                    Quay lại
                </button>
            </div>
        </div>
    );
};

const ProfileScreen = ({ onSave }) => {
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!displayName.trim()) return;
        setIsLoading(true);
        await onSave(displayName);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-10 space-y-8 border border-white/50">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200">
                         <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">QuizKi</h2>
                    <p className="text-gray-500 text-sm">Học từ vựng tiếng Nhật thông minh</p>
                </div>
                
                <div className="space-y-4">
                    <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700">
                        Bạn tên là gì?
                    </label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                        }}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-lg transition-all outline-none"
                        placeholder="Nhập tên hiển thị..."
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !displayName.trim()}
                    className="w-full px-6 py-4 text-lg font-bold rounded-xl shadow-lg shadow-indigo-200 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:translate-y-[-2px]"
                >
                    {isLoading ? <Loader2 className="animate-spin w-6 h-6 mx-auto" /> : "Bắt đầu hành trình"}
                </button>
            </div>
        </div>
    );
};

const Header = ({ currentView, setView }) => {
    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
            }
        } catch (e) {
            console.error('Lỗi đăng xuất:', e);
        }
    };

    return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 h-12 md:h-16 transition-all duration-300">
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto px-2 md:px-4 sm:px-6 h-full flex items-center justify-between">
            <div className="flex items-center space-x-1 md:space-x-2 cursor-pointer group" onClick={() => setView('HOME')}>
                <div className="bg-indigo-600 p-1 md:p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-base md:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    QuizKi
                </span>
            </div>
            
            <nav className="flex items-center space-x-0.5 md:space-x-1 sm:space-x-2">
                {[
                    { id: 'HOME', icon: Home, label: 'Home' },
                    { id: 'LIST', icon: List, label: 'List' },
                    { id: 'STATS', icon: BarChart3, label: 'Stats' },
                    { id: 'FRIENDS', icon: Users, label: 'Rank' },
                    { id: 'ACCOUNT', icon: Settings, label: 'Account' },
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setView(item.id)} 
                        className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-200 relative
                            ${currentView === item.id 
                                ? 'text-indigo-600 bg-indigo-50' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        title={item.label}
                    >
                        <item.icon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={currentView === item.id ? 2.5 : 2} />
                        {currentView === item.id && (
                            <span className="absolute bottom-0.5 md:bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 md:w-1 h-0.5 md:h-1 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                ))}
                
                <div className="h-4 md:h-6 w-px bg-gray-200 mx-1 md:mx-2" />
                
                <button
                    onClick={() => setView('ADD_CARD')}
                    className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all ${currentView === 'ADD_CARD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                </button>

                <button
                    onClick={handleLogout}
                    className="ml-0.5 md:ml-1 p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Đăng xuất"
                >
                    <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                </button>
            </nav>
        </div>
    </header>
    );
};

const MemoryStatCard = ({ title, count, icon: Icon, color, subtext }) => (
    <div className={`relative overflow-hidden p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all duration-300 ${color.bg} ${color.border} group h-full`}>
        {/* Glow background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute -inset-10 bg-gradient-to-br from-white/40 via-transparent to-white/10 blur-2xl" />
        </div>

        {/* Animated top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex items-center justify-between">
            <div>
                <p className="text-xl md:text-3xl font-black text-gray-900 drop-shadow-sm">{count}</p>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600 mt-0.5 md:mt-1">{title}</p>
                {subtext && <p className="text-[9px] md:text-[11px] text-gray-500 mt-0.5 md:mt-1">{subtext}</p>}
            </div>
            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${color.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 flex-shrink-0`}>
                <Icon className={`w-5 h-5 md:w-7 md:h-7 ${color.text}`} />
            </div>
        </div>
    </div>
);

// ActionCard component - định nghĩa bên ngoài để tránh tạo lại mỗi lần render
    const ActionCard = ({ onClick, icon: Icon, title, count, gradient, disabled = false, description, hideCount = false }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative overflow-hidden group flex items-center p-3 md:p-5 h-28 md:h-32 rounded-xl md:rounded-2xl shadow-md transition-all duration-300 w-[calc(50%-0.5rem)] md:w-[calc(50%-1rem)] max-w-xs md:max-w-sm text-left bg-gradient-to-br ${gradient}
                        ${disabled ? 'cursor-not-allowed grayscale opacity-50' : 'hover:shadow-xl hover:-translate-y-1'}`}
        >
            <div className="z-10 w-full flex items-center gap-3 md:gap-4">
                {/* Icon với tỉ lệ 2:4 (width:height = 1:2) */}
                <div className={`flex-shrink-0 w-12 h-24 md:w-16 md:h-32 rounded-xl md:rounded-2xl ${disabled ? 'bg-gray-600/30' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 md:w-8 md:h-8 ${disabled ? 'text-gray-300' : 'text-white'}`} strokeWidth={2.5} />
                    </div>
                
                {/* Text content bên phải */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between mb-1 md:mb-1.5">
                        <h3 className={`text-sm md:text-lg font-extrabold tracking-tight truncate ${disabled ? 'text-gray-300' : 'text-white'}`}>{title}</h3>
                     {!hideCount && typeof count !== 'undefined' && count > 0 && (
                            <span className={`backdrop-blur-md text-xs md:text-sm font-bold px-2 md:px-2.5 py-1 md:py-1.5 rounded-full flex-shrink-0 ml-2 ${disabled ? 'bg-gray-600/30 text-gray-300' : 'bg-white/25 text-white'}`}>
                            {count} cần ôn
                        </span>
                    )}
                </div>
                    <p className={`text-xs md:text-sm font-medium opacity-95 leading-snug ${disabled ? 'text-gray-400' : 'text-indigo-50'}`}>{description}</p>
                </div>
            </div>
            
            {/* Background Decoration */}
            <Icon className={`absolute -bottom-3 md:-bottom-4 -right-3 md:-right-4 w-24 h-24 md:w-32 md:h-32 group-hover:scale-110 transition-transform duration-500 ${disabled ? 'text-gray-400/10' : 'text-white/10'}`} />
        </button>
    );

const HomeScreen = ({ displayName, dueCounts, totalCards, allCards, studySessionData, setStudySessionData, setNotification, setReviewMode, setView, onStartReview, onNavigate }) => {
    return (
        <div className="space-y-2.5 md:space-y-5">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-2 md:gap-4 pb-2 border-b border-gray-100">
                <div className="flex-shrink-0 min-w-0">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-extrabold text-gray-800 tracking-tight break-words">
                        Chào, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{displayName || 'bạn'}</span>! 👋
                    </h2>
                    <p className="text-gray-500 mt-1 md:mt-2 text-xs md:text-sm font-medium">Bạn đã sẵn sàng chinh phục mục tiêu hôm nay chưa?</p>
                </div>
                <div className="flex items-center space-x-2 md:space-x-2.5 bg-indigo-50 px-3 md:px-5 py-2 md:py-2.5 rounded-full border border-indigo-100 flex-shrink-0">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs md:text-sm font-bold text-indigo-700 whitespace-nowrap">{totalCards} từ vựng</span>
                </div>
            </div>
            
            {/* Review Section */}
            <div className="space-y-2 md:space-y-3">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                    <h3 className="text-sm md:text-lg font-extrabold text-gray-800 flex items-center">
                        <Zap className="w-4 h-4 md:w-6 md:h-6 mr-1.5 md:mr-2 text-amber-500" />
                        Chế độ Ôn tập
                    </h3>

                </div>


                <div className="flex flex-wrap gap-2.5 md:gap-4 justify-center">
                    <ActionCard
                        onClick={() => onStartReview('mixed')}
                        icon={Zap}
                        title="Hỗn hợp"
                                description="Tất cả loại câu hỏi"
                        count={dueCounts.mixed}
                                gradient="from-amber-400 to-orange-500"
                        disabled={dueCounts.mixed === 0}
                    />
                            <ActionCard
                                onClick={() => onStartReview('flashcard')}
                                icon={Layers}
                                title="Flashcard"
                                description="Từ vựng mới"
                                count={dueCounts.flashcard}
                                gradient="from-purple-500 to-pink-500"
                                disabled={dueCounts.flashcard === 0}
                            />
                            <ActionCard
                                onClick={() => {
                                    // Prepare study cards - chỉ từ vựng chưa có SRS
                                    const noSrsCards = allCards.filter(card => {
                                        return (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) &&
                                               (card.intervalIndex_synonym === -1 || card.intervalIndex_synonym === undefined) &&
                                               (card.intervalIndex_example === -1 || card.intervalIndex_example === undefined);
                                    });
                                    
                                    if (noSrsCards.length === 0) {
                                        setNotification('Không có từ vựng nào chưa có cấp độ SRS để học.');
                                        return;
                                    }
                                    
                                    // Tạo batch đầu tiên (5 từ) - ưu tiên Learning > New > Reviewing
                                    const learning = studySessionData.learning.filter(card => 
                                        noSrsCards.some(c => c.id === card.id)
                                    );
                                    const newCards = noSrsCards.filter(card => 
                                        !learning.some(c => c.id === card.id) &&
                                        !studySessionData.reviewing.some(c => c.id === card.id)
                                    );
                                    const reviewing = studySessionData.reviewing.filter(card => 
                                        noSrsCards.some(c => c.id === card.id) &&
                                        !learning.some(c => c.id === card.id)
                                    );
                                    
                                    const firstBatch = [];
                                    firstBatch.push(...learning.slice(0, 5));
                                    if (firstBatch.length < 5) {
                                        firstBatch.push(...shuffleArray(newCards).slice(0, 5 - firstBatch.length));
                                    }
                                    if (firstBatch.length < 5) {
                                        firstBatch.push(...shuffleArray(reviewing).slice(0, 5 - firstBatch.length));
                                    }
                                    
                                    if (firstBatch.length === 0) {
                                        setNotification('Không có từ vựng nào để học.');
                                        return;
                                    }
                                    
                                    setStudySessionData({
                                        learning: learning,
                                        new: newCards,
                                        reviewing: reviewing,
                                        currentBatch: firstBatch,
                                        currentPhase: 'multipleChoice',
                                        batchIndex: 0,
                                        allNoSrsCards: noSrsCards
                                    });
                                    setReviewMode('study');
                                    setView('STUDY');
                                }}
                                icon={GraduationCap}
                                title="Học"
                                description="Học từ mới"
                                count={dueCounts.study}
                                gradient="from-teal-400 to-emerald-500"
                                disabled={dueCounts.study === 0}
                            />
                            <ActionCard
                                onClick={() => setView('TEST')}
                                icon={FileCheck}
                                title="Kiểm Tra"
                                description="Luyện thi JLPT"
                                count={allCards.length}
                                hideCount={true}
                                gradient="from-rose-500 to-red-600"
                                disabled={allCards.length === 0}
                            />
                    <ActionCard
                        onClick={() => onStartReview('back')}
                        icon={Repeat2}
                        title="Ý nghĩa"
                        description="Nhớ nghĩa từ vựng" 
                        count={dueCounts.back}
                        gradient="from-emerald-400 to-green-500"
                        disabled={dueCounts.back === 0}
                    />
                    <ActionCard
                        onClick={() => onStartReview('synonym')}
                        icon={MessageSquare}
                        title="Đồng nghĩa"
                        description="Từ tương tự"
                        count={dueCounts.synonym}
                        gradient="from-blue-400 to-cyan-500"
                        disabled={dueCounts.synonym === 0}
                    />
                    <ActionCard
                        onClick={() => onStartReview('example')}
                        icon={FileText}
                        title="Ngữ cảnh"
                        description="Điền vào chỗ trống"
                        count={dueCounts.example}
                        gradient="from-purple-400 to-pink-500"
                        disabled={dueCounts.example === 0}
                    />
                </div>
            </div>
            
            {/* Management Section */}
            <div className="pt-1.5 md:pt-2 space-y-2 md:space-y-2.5">
                <h3 className="text-sm md:text-base font-bold text-gray-700 flex items-center">
                    <Settings className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 text-gray-500" />
                    Quản lý & Tiện ích
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5">
                     <button
                        onClick={() => onNavigate('ADD_CARD')}
                        className="flex items-center p-2 md:p-3 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                    >
                        <div className="bg-indigo-50 p-1.5 md:p-2 rounded-lg mr-1.5 md:mr-2.5 group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-gray-700 group-hover:text-indigo-700 truncate">Thêm từ mới</span>
                    </button>

                    <button
                        onClick={() => onNavigate('IMPORT')}
                        className="flex items-center p-2 md:p-3 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
                    >
                        <div className="bg-teal-50 p-1.5 md:p-2 rounded-lg mr-1.5 md:mr-2.5 group-hover:bg-teal-100 transition-colors flex-shrink-0">
                            <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600" />
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-gray-700 group-hover:text-teal-700 truncate">Nhập File</span>
                    </button>

                    <button
                        onClick={() => onNavigate('LIST')}
                        className="flex items-center p-2 md:p-3 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="bg-blue-50 p-1.5 md:p-2 rounded-lg mr-1.5 md:mr-2.5 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                            <List className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-gray-700 group-hover:text-blue-700 truncate">Xem Danh sách</span>
                    </button>

                    <button
                        onClick={() => onNavigate('HELP')}
                        className="flex items-center p-2 md:p-3 bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
                    >
                        <div className="bg-orange-50 p-1.5 md:p-2 rounded-lg mr-1.5 md:mr-2.5 group-hover:bg-orange-100 transition-colors flex-shrink-0">
                            <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-600" />
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-gray-700 group-hover:text-orange-700 truncate">Hướng dẫn</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddCardForm = ({ onSave, onBack, onGeminiAssist }) => {
    // ... (State logic giữ nguyên)
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [synonym, setSynonym] = useState('');
    const [example, setExample] = useState('');
    const [exampleMeaning, setExampleMeaning] = useState(''); 
    const [nuance, setNuance] = useState('');
    const [pos, setPos] = useState(''); 
    const [level, setLevel] = useState(''); 
    const [sinoVietnamese, setSinoVietnamese] = useState(''); 
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(''); 
    const [imageFile, setImageFile] = useState(null); 
    const [imagePreview, setImagePreview] = useState(null);
    const [customAudio, setCustomAudio] = useState(''); 
    const [showAudioInput, setShowAudioInput] = useState(false); 
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false); 
    const [isFlipped, setIsFlipped] = useState(false); // State để lật card
    const frontInputRef = useRef(null);

    // ... (Helpers giữ nguyên: handleImageChange, handleRemoveImage, handleAudioFileChange, handleSave, handleAiAssist, handleKeyDown)
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setImagePreview(compressedBase64);
                setImageFile(file); 
            } catch (error) {
                console.error("Lỗi nén ảnh:", error);
                alert("Không thể xử lý ảnh này.");
            }
        }
    };
    const handleRemoveImage = () => { setImageFile(null); setImagePreview(null); };
    const handleAudioFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.match(/audio\/(wav|mpeg|mp3)/) && !file.name.match(/\.(wav|mp3)$/i)) { alert("Vui lòng chỉ tải lên file định dạng .wav hoặc .mp3"); return; }
        const reader = new FileReader();
        reader.onload = (event) => { const result = event.target.result; const base64String = result.split(',')[1]; setCustomAudio(base64String); };
        reader.readAsDataURL(file);
    };
    const handleSave = async (action) => {
        if (!front.trim() || !back.trim()) return;
        setIsSaving(true); 
        const success = await onSave({ front, back, synonym, example, exampleMeaning, nuance, pos, level, sinoVietnamese, synonymSinoVietnamese, action, imageBase64: imagePreview, audioBase64: customAudio.trim() !== '' ? customAudio.trim() : null });
        setIsSaving(false); 
        if (success && action === 'continue') {
            setFront(''); setBack(''); setSynonym(''); setExample(''); setExampleMeaning(''); setNuance(''); setPos(''); setLevel(''); setSinoVietnamese(''); setSynonymSinoVietnamese(''); setImageFile(null); setImagePreview(null); setCustomAudio(''); setShowAudioInput(false);
            if (frontInputRef.current) frontInputRef.current.focus();
        }
    };
    const handleAiAssist = async (e) => {
        e.preventDefault();
        if (!front.trim()) { if (frontInputRef.current) frontInputRef.current.focus(); return; }
        setIsAiLoading(true);
        // Pass current pos and level as context to Gemini
        const aiData = await onGeminiAssist(front, pos, level);
        if (aiData) {
            if (aiData.frontWithFurigana) setFront(aiData.frontWithFurigana);
            if (aiData.meaning) setBack(aiData.meaning);
            if (aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese);
            if (aiData.synonym) setSynonym(aiData.synonym);
            if (aiData.synonymSinoVietnamese) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese);
            if (aiData.example) setExample(aiData.example);
            if (aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning); 
            if (aiData.nuance) setNuance(aiData.nuance);
            if (aiData.pos) setPos(aiData.pos);
            if (aiData.level) setLevel(aiData.level);
        }
        setIsAiLoading(false);
    };
    const handleKeyDown = (e) => { if (e.key === 'g' && (e.altKey || e.metaKey)) { e.preventDefault(); handleAiAssist(e); } };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Thêm Từ Vựng Mới</h2>
                    <p className="text-gray-500 text-sm">Xây dựng kho tàng kiến thức của bạn</p>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl">
                    <Plus className="w-6 h-6 text-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột Trái: Thông tin chính */}
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-semibold text-gray-700">
                                Từ vựng (Nhật): <span className="text-rose-500">*</span>
                            </label>
                            
                        </div>
                        
                        <div className="flex gap-2">
                            <input 
                                id="front" 
                                type="text" 
                                ref={frontInputRef} 
                                value={front} 
                                onChange={(e) => setFront(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                required
                                className="flex-1 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm md:text-base lg:text-lg" 
                                placeholder="Ví dụ: 食べる（たべる）"
                            />
                            
                            <button 
                                type="button" 
                                onClick={handleAiAssist} 
                                disabled={isAiLoading}
                                className="flex items-center px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all font-bold whitespace-nowrap flex-shrink-0 text-xs md:text-sm"
                                title="Tự động điền thông tin bằng AI"
                            >
                                {isAiLoading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 md:mr-2" /> : <Wand2 className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />}
                                <span className="hidden sm:inline">AI Hỗ trợ</span>
                            </button>
                        </div>
                        
                        {/* MOVED: Classification Section (Level & POS) to below Vocabulary */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phân loại & Cấp độ</label>
                             <div className="flex flex-col gap-3">
                                {/* Level Buttons */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl.value}
                                            type="button"
                                            onClick={() => setLevel(lvl.value)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border ${
                                                level === lvl.value 
                                                ? `${lvl.color} shadow-sm ring-1 ring-offset-1 ring-indigo-200` 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
                                            }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* POS Dropdown */}
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-indigo-500 text-sm font-medium text-gray-700">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
                             </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ý nghĩa (Việt): <span className="text-rose-500">*</span>
                            </label>
                            <input id="back" type="text" value={back} onChange={(e) => setBack(e.target.value)} required
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm md:text-base" placeholder="Ví dụ: Ăn"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Hán Việt</label>
                                <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500" placeholder="Thực"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Đồng nghĩa</label>
                                <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)}
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500" placeholder="食事する..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột Phải: Thông tin bổ sung (luôn hiển thị nhưng bố cục gọn hơn) */}
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ngữ cảnh & Ví dụ</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Câu ví dụ (Nhật)</label>
                            <textarea 
                                value={example} 
                                onChange={(e) => setExample(e.target.value)} 
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                rows="2"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:border-indigo-500 text-xs md:text-sm" 
                                placeholder="私は毎日ご飯を食べる。" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nghĩa ví dụ (Việt)</label>
                            <textarea 
                                value={exampleMeaning} 
                                onChange={(e) => setExampleMeaning(e.target.value)} 
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                rows="2"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:border-indigo-500 text-xs md:text-sm" 
                                placeholder="Tôi ăn cơm mỗi ngày." 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sắc thái / Ghi chú</label>
                            <textarea 
                                value={nuance} 
                                onChange={(e) => setNuance(e.target.value)}
                                rows="3"
                                className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:border-indigo-500 text-xs md:text-sm" 
                                placeholder="Dùng trong văn viết..." 
                            />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Media</h3>
                        
                        {/* Image Upload */}
                        <div className="flex items-start space-x-4">
                             <div className="flex-1">
                                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                                        <p className="text-xs text-gray-500">Tải ảnh minh họa</p>
                                    </div>
                                    <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                             </div>
                             {imagePreview && (
                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Audio Upload */}
                        <div className="pt-2 border-t border-gray-100">
                            <button type="button" onClick={() => setShowAudioInput(!showAudioInput)}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center">
                                <Music className="w-4 h-4 mr-1" />
                                {showAudioInput ? 'Ẩn Audio' : 'Tùy chỉnh Audio (Mặc định tự động)'}
                            </button>
                            {showAudioInput && (
                                <div className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                     <div className="flex items-center space-x-2">
                                        <label htmlFor="audio-upload" className="cursor-pointer flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                                            <FileAudio className="w-4 h-4 mr-2 text-indigo-500" />
                                            {customAudio ? "Đổi file" : "Chọn .wav/.mp3"}
                                        </label>
                                        <input id="audio-upload" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                        {customAudio && <span className="text-xs text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Xong</span>}
                                    </div>
                                    {customAudio && (
                                        <div className="flex justify-between items-center mt-2">
                                            <button type="button" onClick={() => playAudio(customAudio)} className="text-xs text-indigo-600 font-medium hover:underline">Nghe thử</button>
                                            <button type="button" onClick={() => setCustomAudio('')} className="text-xs text-red-500 hover:text-red-600">Xóa</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                    type="button"
                    onClick={() => handleSave('continue')}
                    disabled={isSaving || isAiLoading || !front || !back}
                    className="flex-1 flex items-center justify-center px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-bold rounded-lg md:rounded-xl shadow-md md:shadow-lg shadow-indigo-200 text-white bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" /> : <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />}
                    <span className="text-xs md:text-sm lg:text-base">Lưu & Thêm Tiếp</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleSave('back')}
                    disabled={isSaving || isAiLoading || !front || !back}
                    className="flex-1 flex items-center justify-center px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-bold rounded-lg md:rounded-xl shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                    <Check className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                    <span className="text-xs md:text-sm lg:text-base">Lưu & Về Home</span>
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm lg:text-base font-medium rounded-lg md:rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

// EditCardForm có cấu trúc tương tự AddCardForm nhưng điền sẵn dữ liệu (Tôi sẽ rút gọn để giữ độ dài code hợp lý, nhưng style giống hệt AddCardForm)
const EditCardForm = ({ card, onSave, onBack, onGeminiAssist }) => {
    // ... Copy logic state từ code cũ
    const [front, setFront] = useState(card.front);
    const [back, setBack] = useState(card.back);
    const [synonym, setSynonym] = useState(card.synonym);
    const [example, setExample] = useState(card.example);
    const [exampleMeaning, setExampleMeaning] = useState(card.exampleMeaning); 
    const [nuance, setNuance] = useState(card.nuance);
    const [pos, setPos] = useState(card.pos || ''); 
    const [level, setLevel] = useState(card.level || ''); 
    const [sinoVietnamese, setSinoVietnamese] = useState(card.sinoVietnamese || ''); 
    const [synonymSinoVietnamese, setSynonymSinoVietnamese] = useState(card.synonymSinoVietnamese || ''); 
    const [imagePreview, setImagePreview] = useState(card.imageBase64 || null);
    const [customAudio, setCustomAudio] = useState(card.audioBase64 || ''); 
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false); 
    const frontInputRef = useRef(null);
    
    // ... Copy Helpers
    const handleImageChange = async (e) => { const file = e.target.files[0]; if (file) { try { const compressed = await compressImage(file); setImagePreview(compressed); } catch (error) { console.error("Lỗi ảnh:", error); } } };
    const handleRemoveImage = () => { setImagePreview(null); };
    const handleAudioFileChange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const res = event.target.result; setCustomAudio(res.split(',')[1]); }; reader.readAsDataURL(file); };
    const handleSave = async () => { if (!front.trim() || !back.trim()) return; setIsSaving(true); await onSave({ cardId: card.id, front, back, synonym, example, exampleMeaning, nuance, pos, level, sinoVietnamese, synonymSinoVietnamese, imageBase64: imagePreview, audioBase64: customAudio.trim() !== '' ? customAudio.trim() : null }); setIsSaving(false); };
    const handleAiAssist = async (e) => { e.preventDefault(); if(!front.trim()) return; setIsAiLoading(true); const aiData = await onGeminiAssist(front, pos, level); if(aiData) { if(aiData.frontWithFurigana) setFront(aiData.frontWithFurigana); if(aiData.meaning) setBack(aiData.meaning); if(aiData.sinoVietnamese) setSinoVietnamese(aiData.sinoVietnamese); if(aiData.synonym) setSynonym(aiData.synonym); if(aiData.synonymSinoVietnamese) setSynonymSinoVietnamese(aiData.synonymSinoVietnamese); if(aiData.example) setExample(aiData.example); if(aiData.exampleMeaning) setExampleMeaning(aiData.exampleMeaning); if(aiData.nuance) setNuance(aiData.nuance); if(aiData.pos) setPos(aiData.pos); if(aiData.level) setLevel(aiData.level); } setIsAiLoading(false); };
    const handleKeyDown = (e) => { if(e.key === 'g' && (e.altKey || e.metaKey)) { e.preventDefault(); handleAiAssist(e); }};

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Chỉnh Sửa Thẻ</h2>
            </div>
            {/* Tái sử dụng layout 2 cột từ AddCardForm cho đồng bộ */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                     <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <label className="block text-sm font-semibold text-gray-700">Từ vựng (Nhật)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                ref={frontInputRef} 
                                value={front} 
                                onChange={(e) => setFront(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                className="flex-1 pl-2 md:pl-3 lg:pl-4 pr-2 md:pr-12 py-1.5 md:py-2 lg:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:border-indigo-500 font-medium text-sm md:text-base lg:text-lg"
                            />
                            <button type="button" onClick={handleAiAssist} className="px-2 md:px-3 bg-indigo-100 text-indigo-700 rounded-lg md:rounded-xl font-bold hover:bg-indigo-200 flex-shrink-0 text-xs md:text-sm">{isAiLoading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5"/> : "AI"}</button>
                        </div>
                        
                        {/* UPDATE: Moved Classification & Level Buttons for Edit Form as well */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phân loại & Cấp độ</label>
                             <div className="flex flex-col gap-3">
                                {/* Level Buttons */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {JLPT_LEVELS.map((lvl) => (
                                        <button
                                            key={lvl.value}
                                            type="button"
                                            onClick={() => setLevel(lvl.value)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border ${
                                                level === lvl.value 
                                                ? `${lvl.color} shadow-sm ring-1 ring-offset-1 ring-indigo-200` 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
                                            }`}
                                        >
                                            {lvl.label}
                                        </button>
                                    ))}
                                </div>
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-indigo-500 text-sm font-medium text-gray-700">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
                             </div>
                        </div>

                        <label className="block text-sm font-semibold text-gray-700">Ý nghĩa</label>
                        <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:border-indigo-500 text-sm md:text-base"/>
                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                            <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-lg"/>
                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-lg"/>
                        </div>
                     </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder="Ví dụ (Nhật)" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm"/>
                        <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder="Nghĩa ví dụ" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm"/>
                        <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="3" placeholder="Ghi chú" className="w-full px-2 md:px-3 lg:px-4 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm"/>
                    </div>
                    {/* Media Edit Enhanced */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Media</h3>
                         
                         {/* Image Part */}
                         <div className="flex items-center justify-between">
                             <label htmlFor="img-edit" className="cursor-pointer text-indigo-600 font-medium text-sm flex items-center hover:text-indigo-800 transition-colors">
                                <ImageIcon className="w-4 h-4 mr-2"/> {imagePreview ? "Thay đổi ảnh" : "Tải ảnh lên"}
                             </label>
                             <input id="img-edit" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                             {imagePreview && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                                    <img src={imagePreview} className="w-full h-full object-cover"/>
                                    <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4"/></button>
                                </div>
                             )}
                        </div>

                        {/* Audio Part */}
                        <div className="pt-2 border-t border-gray-100">
                            <button type="button" onClick={() => setShowAudioInput(!showAudioInput)}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center w-full justify-between">
                                <div className="flex items-center"><Music className="w-4 h-4 mr-2" /> {customAudio ? "Đã có Audio tuỳ chỉnh" : "Thêm Audio tuỳ chỉnh"}</div>
                                <span className="text-xs text-gray-400">{showAudioInput ? '▲' : '▼'}</span>
                            </button>
                            
                            {showAudioInput && (
                                <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-200 animate-fade-in">
                                     <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="audio-edit" className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                                            {customAudio ? "Chọn file khác" : "Chọn file .mp3/wav"}
                                        </label>
                                        <input id="audio-edit" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioFileChange} className="hidden" />
                                    </div>
                                    
                                    {customAudio && (
                                        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                                            <span className="text-xs text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Đã lưu</span>
                                            <div className="flex gap-2">
                                                 <button type="button" onClick={() => playAudio(customAudio)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Volume2 className="w-4 h-4"/></button>
                                                 <button type="button" onClick={() => setCustomAudio('')} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    )}
                                     {!customAudio && <p className="text-[10px] text-gray-400 mt-1 text-center">Nếu trống, hệ thống sẽ tự tạo audio từ văn bản.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
             <div className="flex gap-4 pt-4 border-t">
                 <button onClick={handleSave} className="flex-1 py-2 md:py-2.5 lg:py-3 bg-indigo-600 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-sm lg:text-base shadow-md md:shadow-lg shadow-indigo-200 hover:bg-indigo-700">Lưu Thay Đổi</button>
                 <button onClick={onBack} className="px-4 md:px-5 lg:px-6 py-2 md:py-2.5 lg:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl font-medium text-xs md:text-sm lg:text-base text-gray-600 hover:bg-gray-50">Hủy</button>
             </div>
        </div>
    );
};

const SrsStatusCell = ({ intervalIndex, correctStreak, nextReview, hasData }) => {
    if (!hasData || intervalIndex === -999) return <td className="px-2 md:px-4 py-2 md:py-4 text-xs md:text-sm text-gray-300 italic">--</td>;
    const isDue = nextReview <= new Date().setHours(0,0,0,0);
    const progressColor = intervalIndex >= 3 ? 'bg-green-100 text-green-700 border-green-200' : intervalIndex >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200';
    
    return (
        <td className="px-2 md:px-4 py-2 md:py-4">
            <div className={`inline-flex flex-col px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg border text-[10px] md:text-xs font-medium ${progressColor}`}>
                <span>{getSrsProgressText(intervalIndex)}</span>
                {isDue ? (
                    <span className="text-red-600 font-bold mt-0.5 flex items-center text-[9px] md:text-xs"><AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1"/> Ôn ngay</span>
                ) : (
                    <span className="opacity-70 mt-0.5 text-[9px] md:text-xs">{nextReview.toLocaleDateString('vi-VN')}</span>
                )}
            </div>
        </td>
    );
};

const ListView = ({ allCards, onDeleteCard, onPlayAudio, onExport, onNavigateToEdit, onAutoClassifyBatch, onAutoSinoVietnameseBatch }) => {
    // ... (Filter State logic giữ nguyên)
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterPos, setFilterPos] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [searchTerm, setSearchTerm] = useState(''); // Thêm state cho Search
    const [viewMode, setViewMode] = useState('list'); // 'list' hoặc 'grid'

    const cardsMissingPos = allCards.filter(c => !c.pos || !c.level);
    const filteredCards = useMemo(() => {
        let result = [...allCards];
        // Lọc theo tìm kiếm
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase().trim();
            result = result.filter(c => 
                c.front.toLowerCase().includes(lowerTerm) || 
                c.back.toLowerCase().includes(lowerTerm) || 
                (c.synonym && c.synonym.toLowerCase().includes(lowerTerm)) ||
                (c.sinoVietnamese && c.sinoVietnamese.toLowerCase().includes(lowerTerm))
            );
        }
        if (filterLevel !== 'all') result = result.filter(c => c.level === filterLevel);
        if (filterPos !== 'all') result = result.filter(c => c.pos === filterPos);
        sortOrder === 'newest' ? result.sort((a, b) => b.createdAt - a.createdAt) : result.sort((a, b) => a.createdAt - b.createdAt);
        return result;
    }, [allCards, filterLevel, filterPos, sortOrder, searchTerm]);

    return (
        <div className="h-full flex flex-col space-y-2 md:space-y-6">
            <div className="flex flex-col gap-2 md:gap-4 pb-2 md:pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-2xl font-bold text-gray-800">Danh Sách Từ Vựng</h2>
                        <p className="text-xs md:text-sm text-gray-500">Quản lý {allCards.length} thẻ ghi nhớ của bạn</p>
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5 md:p-1">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 md:p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Xem dạng danh sách"
                        >
                            <List className="w-4 h-4 md:w-5 md:h-5"/>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 md:p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Xem dạng thẻ"
                        >
                            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5"/>
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center justify-between">
                     {/* Search Bar */}
                     <div className="relative w-full md:w-96">
                        <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 md:w-4 md:h-4" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm từ vựng, ý nghĩa, Hán Việt..." 
                            className="w-full pl-7 md:pl-9 pr-3 md:pr-4 py-1.5 md:py-2 bg-white border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-xs md:text-sm shadow-sm"
                        />
                     </div>

                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {cardsMissingPos.length > 0 && (
                            <button onClick={() => onAutoClassifyBatch(cardsMissingPos)} className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors flex items-center">
                                <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" /> Auto-Tags ({cardsMissingPos.length})
                            </button>
                        )}
                        <button onClick={() => onExport(allCards)} className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors flex items-center">
                            <Upload className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-1.5 md:gap-3 bg-gray-50 p-2 md:p-4 rounded-lg md:rounded-xl border border-gray-100 flex-shrink-0">
                <div className="space-y-0.5 md:space-y-1">
                    <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sắp xếp</label>
                    <div className="relative">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white border border-gray-200 rounded-md md:rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                        </select>
                        <ArrowDown className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    </div>
                </div>
                <div className="space-y-0.5 md:space-y-1">
                    <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cấp độ</label>
                    <div className="relative">
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white border border-gray-200 rounded-md md:rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="all">Tất cả</option>
                            {JLPT_LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                        </select>
                        <GraduationCap className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    </div>
                </div>
                <div className="space-y-0.5 md:space-y-1">
                    <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Từ loại</label>
                    <div className="relative">
                         <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="w-full pl-6 md:pl-9 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm bg-white border border-gray-200 rounded-md md:rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="all">Tất cả</option>
                            {Object.entries(POS_TYPES).map(([k,v]) => (<option key={k} value={k}>{v.label}</option>))}
                        </select>
                        <Tag className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    </div>
                </div>
            </div>

            {/* CONTENT AREA: LIST or GRID - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-100 table-fixed">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-12 md:w-16 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Hình</th>
                                    <th className="w-20 md:w-24 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Từ vựng</th>
                                    <th className="w-16 md:w-20 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</th>
                                    <th className="w-12 md:w-16 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Âm thanh</th>
                                    <th className="w-20 md:w-24 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Nghĩa</th>
                                    <th className="w-20 md:w-24 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Đồng nghĩa</th>
                                    <th className="w-20 md:w-24 px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">SRS</th>
                                    <th className="w-16 md:w-20 px-2 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {filteredCards.map((card) => (
                                    <tr key={card.id} className="hover:bg-indigo-50/50 transition-colors group">
                                        <td className="px-2 md:px-4 py-2 md:py-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                {card.imageBase64 ? <img src={card.imageBase64} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-3 h-3 md:w-4 md:h-4"/></div>}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3">
                                            <div className="font-bold text-gray-800 text-xs md:text-sm truncate" title={card.front}>{card.front}</div>
                                            {card.sinoVietnamese && <div className="text-[9px] md:text-[10px] font-medium text-pink-500 bg-pink-50 inline-block px-1 md:px-1.5 rounded mt-0.5 md:mt-1 truncate max-w-full" title={card.sinoVietnamese}>{card.sinoVietnamese}</div>}
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3">
                                            <div className="flex flex-col gap-0.5 md:gap-1 items-start">
                                                {card.level && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border font-bold ${getLevelColor(card.level)}`}>{card.level}</span>}
                                                {card.pos ? <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border font-semibold ${getPosColor(card.pos)} truncate`} title={getPosLabel(card.pos)}>{getPosLabel(card.pos)}</span> : <span className="text-[10px] md:text-xs text-gray-300">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3">
                                            <button onClick={() => onPlayAudio(card.audioBase64, card.front)} className="p-1.5 md:p-2 rounded-full text-indigo-500 hover:bg-indigo-100"><Volume2 className="w-3 h-3 md:w-4 md:h-4"/></button>
                                        </td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 truncate" title={card.back}>{card.back}</td>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-500 truncate" title={card.synonym || '-'}>{card.synonym || '-'}</td>
                                        <SrsStatusCell intervalIndex={card.intervalIndex_back} correctStreak={card.correctStreak_back} nextReview={card.nextReview_back} hasData={true}/>
                                        <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                                            <div className="flex justify-end gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onNavigateToEdit(card)} className="p-1.5 md:p-2 rounded-lg text-blue-600 hover:bg-blue-50"><Edit className="w-3 h-3 md:w-4 md:h-4"/></button>
                                                <button onClick={() => onDeleteCard(card.id, card.front)} className="p-1.5 md:p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3 md:w-4 md:h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                    {filteredCards.map((card) => {
                        const levelColor = getLevelColor(card.level);
                        const isDue = card.nextReview_back <= new Date().setHours(0,0,0,0);
                        
                        return (
                            <div key={card.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative group">
                                {/* Top colored bar */}
                                <div className={`h-1.5 md:h-2 w-full ${levelColor.replace('bg-', 'bg-gradient-to-r from-').replace(' text-', ' to-white ')}`}></div>
                                
                                <div className="p-3 md:p-5 flex-grow">
                                    <div className="flex justify-between items-start mb-2 md:mb-3">
                                        <div className="flex flex-col gap-0.5 md:gap-1">
                                            {card.level ? (
                                                <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded border self-start ${levelColor}`}>
                                                    {card.level}
                                                </span>
                                            ) : <span className="h-3 md:h-4"></span>}
                                        </div>
                                        {isDue && (
                                            <span className="text-red-500 bg-red-50 p-0.5 md:p-1 rounded-full" title="Cần ôn tập">
                                                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-base md:text-xl font-bold text-gray-800 mb-0.5 md:mb-1">{card.front}</h3>
                                    {card.sinoVietnamese && <p className="text-[10px] md:text-xs font-medium text-pink-500 mb-1.5 md:mb-2">{card.sinoVietnamese}</p>}
                                    
                                    <div className="h-px bg-gray-100 w-full my-1.5 md:my-2"></div>
                                    
                                    <p className="text-xs md:text-sm text-gray-600 line-clamp-2" title={card.back}>{card.back}</p>
                                </div>
                                
                                {/* Bottom Action Bar */}
                                <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 flex justify-between items-center border-t border-gray-100">
                                     <button onClick={() => onPlayAudio(card.audioBase64, card.front)} className="text-indigo-500 hover:bg-indigo-100 p-1 md:p-1.5 rounded-lg">
                                        <Volume2 className="w-3 h-3 md:w-4 md:h-4"/>
                                     </button>
                                     <div className="flex gap-1.5 md:gap-2">
                                        <button onClick={() => onNavigateToEdit(card)} className="text-blue-500 hover:bg-blue-100 p-1 md:p-1.5 rounded-lg">
                                            <Edit className="w-3 h-3 md:w-4 md:h-4"/>
                                        </button>
                                        <button onClick={() => onDeleteCard(card.id, card.front)} className="text-red-500 hover:bg-red-100 p-1 md:p-1.5 rounded-lg">
                                            <Trash2 className="w-3 h-3 md:w-4 md:h-4"/>
                                        </button>
                                     </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </div>

            {filteredCards.length === 0 && <div className="p-6 md:p-10 text-center text-xs md:text-sm text-gray-400">Không tìm thấy từ vựng nào.</div>}
        </div>
    );
};


const ReviewScreen = ({ cards: initialCards, reviewMode, allCards, onUpdateCard, onCompleteReview }) => {
    // ... Logic giữ nguyên
    const [cards, setCards] = useState(initialCards); // Sử dụng state để có thể cập nhật danh sách
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // V1.6.2 Fix: Thêm biến khoá để ngăn submit 2 lần
    const [isFlipped, setIsFlipped] = useState(false); // Cho flashcard mode 3D flip
    const [slideDirection, setSlideDirection] = useState(''); // 'left' | 'right' | '' for slide animation
    const [selectedAnswer, setSelectedAnswer] = useState(null); // Cho trắc nghiệm Synonym/Example
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState([]); // Cho trắc nghiệm Synonym/Example
    const [failedCards, setFailedCards] = useState(new Set()); // Lưu các từ đã sai trong lần ôn tập hiện tại: Set<cardId-reviewType>
    const inputRef = useRef(null);
    const isCompletingRef = useRef(false); // Track xem đã gọi handleCompleteReview chưa
    
    // Cập nhật cards khi initialCards thay đổi
    useEffect(() => {
        setCards(initialCards);
        setCurrentIndex(0);
        setFailedCards(new Set());
        isCompletingRef.current = false; // Reset khi bắt đầu session mới
    }, [initialCards]);
    
    // Get current card safely (trước khi dùng trong hooks)
    const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;
    const cardReviewType = currentCard ? (currentCard.reviewType || reviewMode) : null;
    const isMultipleChoice = cardReviewType === 'synonym' || cardReviewType === 'example';
    
    // Auto focus logic conditional based on style
    useEffect(() => { 
        if (cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && inputRef.current && !isRevealed) {
            inputRef.current.focus(); 
        }
    }, [currentIndex, isRevealed, cardReviewType, reviewMode, isMultipleChoice]);

    // Prevent out of bounds index
    useEffect(() => { 
        if (cards.length > 0 && currentIndex >= cards.length) {
            setCurrentIndex(cards.length - 1);
        }
    }, [cards.length]); // Only depend on cards.length, not currentIndex to avoid cascading

    // Reset flip state khi chuyển card
    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection(''); // Reset slide direction
        setSelectedAnswer(null); // Reset selected answer
        setMultipleChoiceOptions([]); // Reset options
    }, [currentIndex]);

    // Define moveToPreviousCard before useEffect that uses it
    const moveToPreviousCard = useCallback(() => {
        if (currentIndex > 0 && !isProcessing) {
            if (reviewMode === 'flashcard') {
                setSlideDirection('right'); // Slide out to right
                setTimeout(() => {
                    setCurrentIndex(currentIndex - 1);
                    setInputValue('');
                    setIsRevealed(false);
                    setIsLocked(false);
                    setFeedback(null);
                    setMessage('');
                    setSlideDirection('left'); // Slide in from left
                    setTimeout(() => setSlideDirection(''), 300);
                }, 150);
            } else {
                setCurrentIndex(currentIndex - 1);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
            }
        }
    }, [currentIndex, isProcessing, reviewMode]);

    // Keyboard event handlers for flashcard mode - Khai báo handleCompleteReview TRƯỚC
    const handleCompleteReview = useCallback(() => {
        // Tránh gọi 2 lần
        if (isCompletingRef.current) return;
        isCompletingRef.current = true;
        
        if (failedCards.size > 0) {
            // Có các từ đã sai, tạo lại danh sách để kiểm tra lại
            const failedCardsList = [];
            failedCards.forEach(cardKey => {
                const [cardId, reviewType] = cardKey.split('-');
                const card = allCards.find(c => c.id === cardId);
                if (card) {
                    failedCardsList.push({ ...card, reviewType });
                }
            });
            // Thêm các từ đã sai vào đầu danh sách để kiểm tra lại
            if (failedCardsList.length > 0) {
                const remainingCards = cards.filter(c => {
                    const cardKey = `${c.id}-${c.reviewType || reviewMode}`;
                    return !failedCards.has(cardKey);
                });
                const newCards = [...failedCardsList, ...remainingCards];
                setCards(newCards);
                setCurrentIndex(0);
                // KHÔNG reset failedCards - chỉ remove khỏi failedCards khi làm đúng lần 2
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setIsProcessing(false);
                isCompletingRef.current = false; // Reset để có thể gọi lại sau khi tạo danh sách mới
                return; // Không gọi onCompleteReview, tiếp tục với danh sách mới
            }
        }
        // Không có từ sai hoặc không còn từ nào để ôn lại, gọi onCompleteReview với failedCards
        onCompleteReview(failedCards);
    }, [failedCards, allCards, cards, reviewMode, onCompleteReview]);
    
    // Keyboard event handlers for flashcard mode
    useEffect(() => {
        if (reviewMode !== 'flashcard') return;

        const handleKeyDown = (e) => {
            // Prevent default if we're handling the key (but allow in input fields)
            if ((e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && 
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }

            // Space: Flip card (only if not in input)
            if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                setIsFlipped(prev => {
                    const newFlippedState = !prev;
                    // Phát âm thanh khi lật card (khi lật sang mặt sau)
                    if (newFlippedState && currentCard && currentCard.audioBase64) {
                        playAudio(currentCard.audioBase64, currentCard.front);
                    }
                    return newFlippedState;
                });
            }
            // Arrow Left: Previous card
            else if (e.key === 'ArrowLeft' && currentIndex > 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                moveToPreviousCard();
            }
            // Arrow Right: Next card
            else if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                if (currentIndex < cards.length - 1) {
                    setSlideDirection('left'); // Slide out to left
                    setTimeout(() => {
                        setCurrentIndex(currentIndex + 1);
                        setSlideDirection('right'); // Slide in from right
                        setTimeout(() => setSlideDirection(''), 300);
                    }, 150);
                } else {
                    handleCompleteReview();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, cards, reviewMode, handleCompleteReview, moveToPreviousCard]);
    
    // Normalize answer function - wrap in useCallback để tránh thay đổi dependency
    const normalizeAnswer = useCallback((text) => {
        return text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();
    }, []);
    
    // Generate multiple choice options cho Synonym và Example
    const generateMultipleChoiceOptions = useMemo(() => {
        if (!currentCard || !isMultipleChoice) return [];
        
        const correctAnswer = currentCard.front;
        const currentPos = currentCard.pos;
        
        // Lấy tất cả từ hợp lệ (không trùng với đáp án đúng)
        const allValidCards = (allCards || cards)
            .filter(card => 
                card.id !== currentCard.id && 
                card.front && 
                card.front.trim() !== '' &&
                normalizeAnswer(card.front) !== normalizeAnswer(correctAnswer)
            );
        
        // Ưu tiên 1: Từ cùng loại (POS)
        const samePosCards = currentPos 
            ? allValidCards.filter(card => card.pos === currentPos)
            : [];
        
        // Ưu tiên 2: Từ có độ dài tương tự (±2 ký tự)
        const correctLength = correctAnswer.length;
        const similarLengthCards = allValidCards.filter(card => 
            Math.abs(card.front.length - correctLength) <= 2
        );
        
        // Kết hợp: Ưu tiên cùng POS, sau đó độ dài tương tự
        let candidates = [];
        
        // Lấy từ cùng POS trước
        if (samePosCards.length > 0) {
            candidates.push(...samePosCards.slice(0, 3));
        }
        
        // Nếu chưa đủ, lấy từ độ dài tương tự
        if (candidates.length < 3) {
            const remaining = similarLengthCards.filter(card => 
                !candidates.find(c => c.id === card.id)
            );
            candidates.push(...remaining.slice(0, 3 - candidates.length));
        }
        
        // Nếu vẫn chưa đủ, lấy ngẫu nhiên từ còn lại
        if (candidates.length < 3) {
            const remaining = allValidCards.filter(card => 
                !candidates.find(c => c.id === card.id)
            );
            candidates.push(...remaining.slice(0, 3 - candidates.length));
        }
        
        // Trộn candidates và lấy 3 từ
        const shuffledCandidates = shuffleArray(candidates);
        const wrongOptions = shuffledCandidates
            .slice(0, 3)
            .map(card => card.front)
            .filter((front, index, self) => self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index);
        
        // Nếu không đủ 3, thêm placeholder
        while (wrongOptions.length < 3) {
            wrongOptions.push('...');
        }
        
        // Trộn ngẫu nhiên tất cả options
        const options = [correctAnswer, ...wrongOptions];
        return shuffleArray(options);
    }, [currentCard, isMultipleChoice, allCards, cards, normalizeAnswer]);
    
    // Set options khi card thay đổi - shuffle thêm 1 lần nữa để tránh pattern
    useEffect(() => {
        if (generateMultipleChoiceOptions.length > 0) {
            // Shuffle lại để tránh pattern nhận ra vị trí đáp án
            setMultipleChoiceOptions(shuffleArray([...generateMultipleChoiceOptions]));
        } else {
            setMultipleChoiceOptions([]);
        }
    }, [generateMultipleChoiceOptions, currentIndex]); // Thêm currentIndex để shuffle lại mỗi lần chuyển card
    
    // Early return check - phải đặt sau tất cả hooks
    // Sử dụng useEffect để gọi handleCompleteReview sau khi render (tránh truy cập ref trong render)
    useEffect(() => {
        if ((cards.length === 0 || currentIndex >= cards.length) && !isCompletingRef.current) {
            handleCompleteReview();
        }
    }, [cards.length, currentIndex, handleCompleteReview]);
    
    if (cards.length === 0 || currentIndex >= cards.length) { 
        return null; 
    }

    // Always show full text now
    const displayFront = currentCard.front;
    
    const getPrompt = () => {
        switch (cardReviewType) { 
            case 'synonym': 
                return { label: 'Từ đồng nghĩa', text: currentCard.synonym, image: currentCard.imageBase64, icon: MessageSquare, color: 'text-blue-600' };
            case 'example': {
                const wordToMask = getWordForMasking(currentCard.front);
                const escapedWord = wordToMask.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
                // Tạo regex match cả: từ, （từ）, (từ)
                const maskRegex = new RegExp(`(${escapedWord}|（${escapedWord}）|\\(${escapedWord}\\))`, 'g');
                return { label: 'Điền từ còn thiếu', text: currentCard.example.replace(maskRegex, '______'), meaning: currentCard.exampleMeaning || null, image: currentCard.imageBase64, icon: FileText, color: 'text-purple-600' };
            }
            default: 
                return { label: 'Ý nghĩa (Mặt sau)', text: currentCard.back, image: currentCard.imageBase64, icon: Repeat2, color: 'text-emerald-600' };
        }
    };
    const promptInfo = getPrompt();

    // UPDATE: Check answer logic to allow either Kanji OR Kana
    const checkAnswer = async () => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        const userAnswer = normalizeAnswer(inputValue);
        
        // Extract Kanji and Kana from format "Kanji（Kana）" or "Kanji(Kana)"
        // Nhận diện cả ngoặc Nhật （）và ngoặc Việt Nam ()
        // If no brackets, it assumes the whole string is the answer
        const rawFront = currentCard.front;
        const kanjiPart = rawFront.split('（')[0].split('(')[0];
        const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
        const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

        const normalizedKanji = normalizeAnswer(kanjiPart);
        const normalizedKana = normalizeAnswer(kanaPart);
        
        // Correct if matches either Kanji part OR Kana part (if exists) OR the full string (legacy fallback)
        const isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizeAnswer(rawFront);
        
        const cardKey = `${currentCard.id}-${cardReviewType}`;
        const hasFailedBefore = failedCards.has(cardKey);
        
        if (isCorrect) {
            // Nếu đã từng sai trong lần ôn tập này
            if (hasFailedBefore) {
                // Làm đúng lần này: KHÔNG remove khỏi failedCards, KHÔNG tăng streak
                // Từ này vẫn phải ôn lại sau khi kết thúc phiên ôn tập
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Đúng rồi! Nhưng bạn sẽ phải ôn lại từ này sau.`);
                setIsRevealed(true); 
                setIsLocked(false);
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 1000));
                // KHÔNG tăng streak, chỉ chuyển thẻ
                await moveToNextCard(false);
            } else {
                // Chưa từng sai, tính là hoàn thành
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Chính xác! ${displayFront}`);
                setIsRevealed(true); 
                setIsLocked(false); 
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await moveToNextCard(true); 
            }
        } else {
            // Sai: lưu vào danh sách các từ đã sai và reset streak
            setFailedCards(prev => new Set([...prev, cardKey]));
            setFeedback('incorrect');
            const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
            setMessage(`Đáp án đúng: ${displayFront}${nuanceText}. Hãy làm lại!`);
            setIsRevealed(true); 
            setIsLocked(true); // Khóa để người dùng phải nhập lại đúng mới tiếp tục
            playAudio(currentCard.audioBase64, currentCard.front);
            
            // Cập nhật streak về 0 trong local state ngay lập tức
            setCards(prevCards => {
                return prevCards.map(card => {
                    if (card.id === currentCard.id) {
                        const updatedCard = { ...card };
                        if (cardReviewType === 'back') {
                            updatedCard.correctStreak_back = 0;
                        } else if (cardReviewType === 'synonym') {
                            updatedCard.correctStreak_synonym = 0;
                        } else if (cardReviewType === 'example') {
                            updatedCard.correctStreak_example = 0;
                        }
                        return updatedCard;
                    }
                    return card;
                });
            });
            
            // Cập nhật streak về 0 trong Firestore
            await onUpdateCard(currentCard.id, false, cardReviewType);
        }
    };

    // --- NEW: Handle Manual Flashcard grading ---
    const handleFlashcardGrade = async (isCorrect) => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        const cardKey = `${currentCard.id}-${cardReviewType}`;
        const hasFailedBefore = failedCards.has(cardKey);
        
        if (isCorrect) {
            // Nếu đã từng sai trong lần ôn tập này
            if (hasFailedBefore) {
                // Làm đúng lần này: KHÔNG remove khỏi failedCards, KHÔNG tăng streak
                // Từ này vẫn phải ôn lại sau khi kết thúc phiên ôn tập
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Đúng rồi! Nhưng bạn sẽ phải ôn lại từ này sau.`);
                setIsRevealed(true);
                setIsLocked(false);
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 800));
                // KHÔNG tăng streak, chỉ chuyển thẻ
                await moveToNextCard(false);
            } else {
                // Chưa từng sai, tính là hoàn thành
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Tuyệt vời! ${displayFront}`);
                setIsRevealed(true); 
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 800));
                await moveToNextCard(true);
            }
        } else {
            // Sai: lưu vào danh sách các từ đã sai và reset streak
            setFailedCards(prev => new Set([...prev, cardKey]));
            setFeedback('incorrect');
            const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
            setMessage(`Đáp án đúng: ${displayFront}${nuanceText}. Hãy làm lại!`);
            setIsRevealed(true);
            setIsLocked(true); // Khóa để người dùng phải đánh giá lại đúng mới tiếp tục
            playAudio(currentCard.audioBase64, currentCard.front);
            
            // Cập nhật streak về 0 trong local state ngay lập tức
            setCards(prevCards => {
                return prevCards.map(card => {
                    if (card.id === currentCard.id) {
                        const updatedCard = { ...card };
                        if (cardReviewType === 'back') {
                            updatedCard.correctStreak_back = 0;
                        } else if (cardReviewType === 'synonym') {
                            updatedCard.correctStreak_synonym = 0;
                        } else if (cardReviewType === 'example') {
                            updatedCard.correctStreak_example = 0;
                        }
                        return updatedCard;
                    }
                    return card;
                });
            });
            
            // Cập nhật streak về 0 trong Firestore
            await onUpdateCard(currentCard.id, false, cardReviewType);
        }
    };


    const moveToNextCard = async (shouldUpdateStreak) => {
        // Cập nhật streak nếu cần
        if (shouldUpdateStreak) {
            await onUpdateCard(currentCard.id, true, cardReviewType);
            
            // Cập nhật streak trong cards state local
            setCards(prevCards => {
                return prevCards.map(card => {
                    if (card.id === currentCard.id) {
                        const updatedCard = { ...card };
                        if (cardReviewType === 'back') {
                            updatedCard.correctStreak_back = (card.correctStreak_back || 0) + 1;
                        } else if (cardReviewType === 'synonym') {
                            updatedCard.correctStreak_synonym = (card.correctStreak_synonym || 0) + 1;
                        } else if (cardReviewType === 'example') {
                            updatedCard.correctStreak_example = (card.correctStreak_example || 0) + 1;
                        }
                        return updatedCard;
                    }
                    return card;
                });
            });
        }
        
        // Luôn chuyển sang thẻ tiếp theo
        const nextIndex = currentIndex + 1;
        if (nextIndex < cards.length) {
            // Slide animation for flashcard mode
            if (reviewMode === 'flashcard') {
                setSlideDirection('left'); // Slide out to left
                setTimeout(() => {
                    setCurrentIndex(nextIndex);
                    setInputValue('');
                    setIsRevealed(false);
                    setIsLocked(false);
                    setFeedback(null);
                    setMessage('');
                    setIsProcessing(false);
                    setSlideDirection('right'); // Slide in from right
                    setTimeout(() => setSlideDirection(''), 300);
                }, 150);
            } else {
                setCurrentIndex(nextIndex);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setIsProcessing(false);
            }
        } else {
            // Đã hết thẻ, gọi handleCompleteReview để xử lý logic hoàn thành
            handleCompleteReview();
        }
    };

    const handleNext = () => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        // Logic for typing mode retry or manual proceed (chỉ cho Back mode)
        if (cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice) {
            if (feedback === 'correct') { 
                // Đã đúng, chuyển sang thẻ tiếp theo (đã xử lý failedCards trong checkAnswer)
                setIsProcessing(true); // V1.6.2 Fix: Khoá
                moveToNextCard(true); 
            } else if (feedback === 'incorrect' && isLocked) {
                // Đã sai, kiểm tra lại xem người dùng đã nhập đúng chưa
                const userAnswer = normalizeAnswer(inputValue);
                const rawFront = currentCard.front;
                const kanjiPart = rawFront.split('（')[0].split('(')[0];
                const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
                const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

                const normalizedKanji = normalizeAnswer(kanjiPart);
                const normalizedKana = normalizeAnswer(kanaPart);

                const isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizeAnswer(rawFront);

                if (isCorrect) { 
                    // Nhập lại đúng: không tăng streak, chỉ chuyển thẻ và chờ ôn lại sau
                    setIsProcessing(true); // V1.6.2 Fix: Khoá
                    moveToNextCard(false); // false = không tăng streak
                } else { 
                    // Vẫn sai, yêu cầu nhập lại
                    setMessage(`Hãy nhập lại: "${displayFront}"`); 
                }
            }
        } else {
            // Flashcard mode: khi sai, không chuyển sang thẻ tiếp theo
            // Chỉ reset để người dùng có thể xem lại và đánh giá lại
            if (feedback === 'correct') {
                // Đã đúng, chuyển sang thẻ tiếp theo (đã xử lý failedCards trong handleFlashcardGrade)
                setIsProcessing(true);
                moveToNextCard(true);
            } else if (feedback === 'incorrect') {
                // Đã sai, chỉ reset UI để người dùng có thể đánh giá lại
                // Không gọi moveToNextCard vì sẽ không chuyển thẻ khi sai
                setIsProcessing(false);
            }
        }
    }
    const progress = Math.round(((currentIndex) / cards.length) * 100);

    return (
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto h-full flex flex-col space-y-2 md:space-y-3">
            {/* Header & Progress */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center text-xs md:text-sm font-medium text-gray-500">
                    <span className="flex items-center">
                        <Zap className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1 text-amber-500"/> 
                        {reviewMode.toUpperCase()} - {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice ? 'Tự luận' : 'Ôn tập nhanh'}
                    </span>
                    <span>{currentIndex + 1} / {cards.length}</span>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Flashcard Area - Flexible height */}
            <div className="relative group perspective flex-shrink-0 overflow-hidden">
                {reviewMode === 'flashcard' ? (
                    // Chế độ Flashcard: Lật thẻ 3D giống thẻ bài thật
                    <div className="perspective-1000 w-full max-w-[240px] md:max-w-[280px] mx-auto relative" style={{ minHeight: '340px' }}>
                        <div 
                            className={`flip-card-container transform-style-3d cursor-pointer relative card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                            onClick={() => {
                                const newFlippedState = !isFlipped;
                                setIsFlipped(newFlippedState);
                                // Phát âm thanh khi lật card (khi lật sang mặt sau)
                                if (newFlippedState && currentCard.audioBase64) {
                                    playAudio(currentCard.audioBase64, currentCard.front);
                                }
                            }}
                            style={{ 
                                width: '100%',
                                height: '340px', // Chiều cao cố định thay vì padding
                                transition: slideDirection ? 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease' : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            }}
                        >
                            {/* Mặt trước - CÙNG kích thước */}
                            <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center w-full h-full border-4 border-white hover:shadow-3xl transition-shadow overflow-hidden">
                                    <div className="text-center flex-1 flex flex-col justify-center w-full px-2">
                                        <p className="text-xs text-indigo-200 mb-3 font-medium uppercase tracking-wide">Từ vựng</p>
                                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight break-words">{currentCard.front}</h3>
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {currentCard.level && (
                                                <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                                                    {currentCard.level}
                                                </span>
                                            )}
                                            {currentCard.pos && (
                                                <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                                    {POS_TYPES[currentCard.pos]?.label || currentCard.pos}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 right-4 text-white/30">
                                        <RotateCw className="w-4 h-4 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Mặt sau - CÙNG kích thước, Ý nghĩa ở giữa */}
                            <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl p-6 w-full h-full border-4 border-white hover:shadow-3xl transition-shadow flex flex-col overflow-y-auto">
                                    {/* Phần ý nghĩa chính - TO và ở GIỮA */}
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-emerald-200 mb-2 font-medium uppercase tracking-wide">Ý nghĩa</p>
                                        <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight break-words px-2">{currentCard.back}</h3>
                                    </div>
                                    
                                    {/* Các phần phụ - NHỎ phía dưới */}
                                    <div className="text-center space-y-1.5 mt-2 pb-8">
                                        {currentCard.sinoVietnamese && (
                                            <p className="text-emerald-100 text-[10px] leading-relaxed">
                                                <span className="font-semibold">Hán Việt:</span> {currentCard.sinoVietnamese}
                                            </p>
                                        )}
                                        {currentCard.synonym && (
                                            <p className="text-emerald-100 text-[10px] leading-relaxed">
                                                <span className="font-semibold">Đồng nghĩa:</span> {currentCard.synonym}
                                            </p>
                                        )}
                                        {currentCard.example && (
                                            <div className="pt-1.5 border-t border-white/20">
                                                <p className="text-white/90 text-[10px] italic leading-relaxed">
                                                    "{currentCard.example}"
                                                </p>
                                                {currentCard.exampleMeaning && (
                                                    <p className="text-emerald-100 text-[9px] mt-1 leading-relaxed">
                                                        {currentCard.exampleMeaning}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="absolute bottom-4 right-4 text-white/30">
                                        <RotateCw className="w-4 h-4 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[10px] md:text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                            <RotateCw className="w-3 h-3" />
                            Click vào card để lật | Space: Lật | ← →: Chuyển thẻ
                        </p>
                    </div>
                ) : (
                    // Chế độ ôn tập thông thường (mixed, back, synonym, example)
                    <div className="w-full bg-white rounded-xl md:rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-4 md:p-8 min-h-[200px] md:min-h-[280px] max-h-[40vh] md:max-h-none flex flex-col items-center justify-center text-center transition-all hover:shadow-2xl hover:shadow-indigo-200/50 relative overflow-hidden">
                    {/* Background decoration */}
                        <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${reviewMode === 'mixed' ? 'bg-gradient-to-r from-rose-400 to-orange-400' : 'bg-gradient-to-r from-indigo-400 to-cyan-400'}`}></div>
                    
                    {/* Top Hints */}
                        <div className="absolute top-2 md:top-6 right-2 md:right-6 flex flex-col gap-1 md:gap-2 items-end">
                            {currentCard.level && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border font-bold ${getLevelColor(currentCard.level)}`}>{currentCard.level}</span>}
                            {currentCard.pos && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border font-bold ${getPosColor(currentCard.pos)}`}>{getPosLabel(currentCard.pos)}</span>}
                    </div>

                        <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-6 opacity-80">
                             <promptInfo.icon className={`w-4 h-4 md:w-5 md:h-5 ${promptInfo.color}`}/>
                             <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wide">{promptInfo.label}</span>
                    </div>

                    {promptInfo.image && (
                            <div className="mb-3 md:mb-6 rounded-lg md:rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                <img src={promptInfo.image} alt="Hint" className="h-20 md:h-32 object-cover" />
                        </div>
                    )}

                        <h3 className="text-xl md:text-3xl lg:text-4xl font-black text-gray-800 leading-tight mb-1 md:mb-2 px-2">
                        {promptInfo.text}
                    </h3>
                    
                    {/* UPDATE: Hide SinoVietnamese in Synonym/Example Mode */}
                    {/* Only show SinoVietnamese if reviewMode is NOT 'synonym' or 'example' */}
                    {!['synonym', 'example'].includes(cardReviewType) && (currentCard.sinoVietnamese || currentCard.synonymSinoVietnamese) && (
                            <span className="text-xs md:text-sm font-semibold text-pink-500 bg-pink-50 px-2 md:px-3 py-0.5 md:py-1 rounded-full mt-1 md:mt-2">
                            {reviewMode === 'synonym' ? currentCard.synonymSinoVietnamese : currentCard.sinoVietnamese}
                        </span>
                    )}

                        {promptInfo.meaning && <p className="text-gray-600 mt-2 md:mt-4 italic text-xs md:text-base border-t border-gray-100 pt-2 md:pt-3 px-2 md:px-4 leading-relaxed">"{promptInfo.meaning}"</p>}
                 </div>
                )}
            </div>

            {/* Interaction Area - Fixed at bottom with space for keyboard */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0 pb-4 md:pb-0">
                
                {/* --- MULTIPLE CHOICE: Synonym và Example --- */}
                {isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && (
                    <div className="space-y-3 md:space-y-4">
                        <p className="text-sm md:text-base font-semibold text-gray-700 text-center">
                            {cardReviewType === 'synonym' 
                                ? `Từ đồng nghĩa của "${promptInfo.text}" là gì?`
                                : `Điền từ còn thiếu trong câu: "${promptInfo.text}"`
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            {multipleChoiceOptions.map((option, index) => {
                                const isSelected = selectedAnswer === option;
                                const isCorrect = option === currentCard.front;
                                let buttonClass = "px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all border-2 ";
                                
                                if (isRevealed) {
                                    if (isCorrect) {
                                        buttonClass += "bg-green-500 text-white border-green-600 shadow-lg";
                                    } else if (isSelected && !isCorrect) {
                                        buttonClass += "bg-red-500 text-white border-red-600 shadow-lg";
                                    } else {
                                        buttonClass += "bg-gray-100 text-gray-400 border-gray-200";
                                    }
                                } else {
                                    if (isSelected) {
                                        buttonClass += "bg-indigo-500 text-white border-indigo-600 shadow-md hover:bg-indigo-600";
                                    } else {
                                        buttonClass += "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300";
                                    }
                                }
                                
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (!isRevealed && !isProcessing) {
                                                setSelectedAnswer(option);
                                            }
                                        }}
                                        disabled={isRevealed || isProcessing}
                                        className={buttonClass}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedAnswer && !isRevealed && (
                            <button
                                onClick={async () => {
                                    if (isProcessing) return;
                                    const isCorrect = selectedAnswer === currentCard.front;
                                    const cardKey = `${currentCard.id}-${cardReviewType}`;
                                    const hasFailedBefore = failedCards.has(cardKey);
                                    
                                    setIsProcessing(true);
                                    
                                    if (isCorrect) {
                                        // Nếu đã từng sai trong lần ôn tập này
                                        if (hasFailedBefore) {
                                            // Làm đúng lần này: KHÔNG remove khỏi failedCards, KHÔNG tăng streak
                                            setFeedback('correct');
                                            setMessage(`Đúng rồi! Nhưng bạn sẽ phải ôn lại từ này sau.`);
                                        } else {
                                            setFeedback('correct');
                                            setMessage(`Chính xác! ${displayFront}`);
                                        }
                                    } else {
                                        // Sai: lưu vào danh sách các từ đã sai và reset streak
                                        setFailedCards(prev => new Set([...prev, cardKey]));
                                        setFeedback('incorrect');
                                        setMessage(`Đáp án đúng: ${displayFront}`);
                                        
                                        // Cập nhật streak về 0 trong local state ngay lập tức
                                        setCards(prevCards => {
                                            return prevCards.map(card => {
                                                if (card.id === currentCard.id) {
                                                    const updatedCard = { ...card };
                                                    if (cardReviewType === 'back') {
                                                        updatedCard.correctStreak_back = 0;
                                                    } else if (cardReviewType === 'synonym') {
                                                        updatedCard.correctStreak_synonym = 0;
                                                    } else if (cardReviewType === 'example') {
                                                        updatedCard.correctStreak_example = 0;
                                                    }
                                                    return updatedCard;
                                                }
                                                return card;
                                            });
                                        });
                                        
                                        // Cập nhật streak về 0 trong Firestore
                                        await onUpdateCard(currentCard.id, false, cardReviewType);
                                    }
                                    
                                    setIsRevealed(true);
                                    playAudio(currentCard.audioBase64, currentCard.front);
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    
                                    // Nếu đã từng sai, không tăng streak
                                    const shouldUpdateStreak = isCorrect && !hasFailedBefore;
                                    await moveToNextCard(shouldUpdateStreak);
                                }}
                                disabled={isProcessing}
                                className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg hover:bg-indigo-700 transition-all"
                            >
                                Xác nhận
                            </button>
                        )}
                    </div>
                )}
                
                {/* --- FLASHCARD MODE: Navigation Buttons --- */}
                {reviewMode === 'flashcard' && (
                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={moveToPreviousCard}
                            disabled={isProcessing || currentIndex === 0}
                            className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md ${
                                isProcessing || currentIndex === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-500 text-white hover:bg-gray-600 hover:shadow-lg hover:scale-105'
                            }`}
                            title="Thẻ trước (←)"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => {
                                if (currentIndex < cards.length - 1) {
                                    if (reviewMode === 'flashcard') {
                                        setSlideDirection('left'); // Slide out to left
                                        setTimeout(() => {
                                            setCurrentIndex(currentIndex + 1);
                                            setSlideDirection('right'); // Slide in from right
                                            setTimeout(() => setSlideDirection(''), 300);
                                        }, 150);
                                    } else {
                                        setCurrentIndex(currentIndex + 1);
                                    }
                                } else {
                                    handleCompleteReview();
                                }
                            }}
                            disabled={isProcessing}
                            className={`flex-1 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md ${
                                isProcessing
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                            }`}
                            title="Thẻ tiếp theo (→)"
                        >
                            {currentIndex < cards.length - 1 ? 'Thẻ tiếp theo →' : 'Hoàn thành'}
                        </button>
                    </div>
                )}
                
                {/* --- TYPING MODE UI --- (Chỉ cho Back, không cho Synonym và Example) */}
                {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isRevealed ? handleNext() : checkAnswer(); }}}
                            onFocus={(e) => {
                                // Prevent viewport shift on mobile
                                if (window.innerWidth <= 768) {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                    }, 300);
                                }
                            }}
                            disabled={feedback === 'correct'}
                            className={`w-full pl-5 md:pl-7 pr-12 md:pr-16 py-3 md:py-5 text-lg md:text-2xl font-semibold rounded-xl md:rounded-2xl border-2 transition-all outline-none shadow-md
                                ${feedback === 'correct' 
                                    ? 'border-green-400 bg-green-50 text-green-800' 
                                    : feedback === 'incorrect' 
                                        ? 'border-red-400 bg-red-50 text-red-800' 
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                            placeholder="Nhập từ vựng tiếng Nhật..."
                        />
                        <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2">
                            {!isRevealed && (
                                <button onClick={checkAnswer} disabled={!inputValue.trim()} className="p-2 md:p-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all">
                                    <Send className="w-4 h-4 md:w-6 md:h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                )}



                {/* Feedback & Actions - Only for non-flashcard modes */}
                {reviewMode !== 'flashcard' && (
                <div className={`transition-all duration-300 ease-out overflow-hidden ${isRevealed ? 'max-h-[200px] md:max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className={`p-3 md:p-5 rounded-xl md:rounded-2xl border mb-2 md:mb-4 flex items-start gap-2 md:gap-4 ${feedback === 'correct' ? 'bg-green-50 border-green-200' : feedback === 'incorrect' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                        {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                            <div className={`p-1.5 md:p-2 rounded-full flex-shrink-0 ${feedback === 'correct' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                {feedback === 'correct' ? <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3}/> : <X className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3}/>}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                             {/* Typing feedback message */}
                             <div>
                                 <p className={`font-bold text-base md:text-xl ${feedback === 'correct' ? 'text-green-800' : 'text-red-800'}`}>{message}</p>
                                 {feedback === 'incorrect' && cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && <p className="text-xs md:text-base text-red-600 mt-0.5 md:mt-1">Gõ lại từ đúng để tiếp tục</p>}
                             </div>
                        </div>
                    </div>
                    
                    {/* TYPING MODE ACTIONS (Chỉ cho Back, không cho Synonym và Example) */}
                    {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                        <button
                            onClick={handleNext}
                            disabled={isProcessing || (feedback === 'incorrect' && normalizeAnswer(inputValue) !== normalizeAnswer(currentCard.front.split('（')[0].split('(')[0]) && normalizeAnswer(inputValue) !== normalizeAnswer((currentCard.front.match(/（([^）]+)）/) || currentCard.front.match(/\(([^)]+)\)/))?.[1] || ''))}
                            className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center
                                ${feedback === 'correct' 
                                    ? 'bg-green-500 text-white shadow-green-200 hover:bg-green-600' 
                                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none'}`}
                        >
                            {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2" strokeWidth={3}/>
                        </button>
                    )}

                </div>
                )}
            </div>
        </div>
    );
};

const ReviewCompleteScreen = ({ onBack }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 animate-bounce">
                <Check className="w-8 h-8 text-white" strokeWidth={4} />
            </div>
        </div>
        <div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">Tuyệt vời!</h2>
            <p className="text-gray-500 font-medium">Bạn đã hoàn thành phiên ôn tập này.</p>
        </div>
        <button onClick={onBack} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-gray-800 hover:-translate-y-1 transition-all">
            Về Trang chủ
        </button>
    </div>
);

const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onCompleteStudy }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [multipleChoiceResults, setMultipleChoiceResults] = useState({}); // {cardId: isCorrect}
    const [completedCards, setCompletedCards] = useState(new Set()); // Track các từ đã hoàn thành (cả multiple choice và typing)
    const inputRef = useRef(null);

    const currentBatch = studySessionData.currentBatch || [];
    const currentPhase = studySessionData.currentPhase || 'multipleChoice';
    const currentCard = currentBatch[currentQuestionIndex];

    // Reset khi chuyển phase
    useEffect(() => {
        if (currentPhase === 'typing' && currentQuestionIndex === 0) {
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
            if (inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    }, [currentPhase, currentQuestionIndex]);

    // Reset completedCards khi bắt đầu batch mới
    useEffect(() => {
        if (currentPhase === 'multipleChoice' && currentQuestionIndex === 0 && studySessionData.batchIndex > 0) {
            // Giữ lại completedCards từ các batch trước
        }
    }, [currentPhase, currentQuestionIndex, studySessionData.batchIndex]);

    const normalizeAnswer = (text) => text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();

    // Generate multiple choice options
    const generateMultipleChoiceOptions = useMemo(() => {
        if (!currentCard || currentPhase !== 'multipleChoice') return [];
        
        const correctAnswer = currentCard.front;
        const currentPos = currentCard.pos;
        
        // Lấy tất cả từ hợp lệ
        const allValidCards = allCards
            .filter(card => 
                card.id !== currentCard.id && 
                card.front && 
                card.front.trim() !== '' &&
                normalizeAnswer(card.front) !== normalizeAnswer(correctAnswer)
            );
        
        // Ưu tiên 1: Từ cùng loại (POS)
        const samePosCards = currentPos 
            ? allValidCards.filter(card => card.pos === currentPos)
            : [];
        
        // Ưu tiên 2: Từ có độ dài tương tự
        const correctLength = correctAnswer.length;
        const similarLengthCards = allValidCards.filter(card => 
            Math.abs(card.front.length - correctLength) <= 2
        );
        
        // Kết hợp candidates
        let candidates = [];
        
        // Lấy từ cùng POS trước
        if (samePosCards.length > 0) {
            candidates.push(...samePosCards.slice(0, 3));
        }
        
        // Nếu chưa đủ, lấy từ độ dài tương tự
        if (candidates.length < 3) {
            const remaining = similarLengthCards.filter(card => 
                !candidates.find(c => c.id === card.id)
            );
            candidates.push(...remaining.slice(0, 3 - candidates.length));
        }
        
        // Nếu vẫn chưa đủ, lấy ngẫu nhiên
        if (candidates.length < 3) {
            const remaining = allValidCards.filter(card => 
                !candidates.find(c => c.id === card.id)
            );
            candidates.push(...remaining.slice(0, 3 - candidates.length));
        }
        
        // Trộn và lấy 3 từ
        const shuffledCandidates = shuffleArray(candidates);
        const wrongOptions = shuffledCandidates
            .slice(0, 3)
            .map(card => card.front)
            .filter((front, index, self) => self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index);
        
        // Nếu không đủ 3, thêm placeholder
        while (wrongOptions.length < 3) {
            wrongOptions.push('...');
        }
        
        const options = [correctAnswer, ...wrongOptions];
        return shuffleArray([...options]);
    }, [currentCard, currentPhase, allCards]);

    // Handle multiple choice answer
    const handleMultipleChoiceAnswer = (selectedOption) => {
        if (isProcessing || isRevealed) return;
        
        setIsProcessing(true);
        setSelectedAnswer(selectedOption);
        const isCorrect = normalizeAnswer(selectedOption) === normalizeAnswer(currentCard.front); // So sánh với front (tiếng Nhật)
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setIsRevealed(true);
        setMultipleChoiceResults(prev => ({ ...prev, [currentCard.id]: isCorrect }));
        
        playAudio(currentCard.audioBase64, currentCard.front);
        
        setTimeout(() => {
            setIsProcessing(false);
            if (currentQuestionIndex < currentBatch.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedAnswer(null);
                setIsRevealed(false);
                setFeedback(null);
            } else {
                // Chuyển sang phase typing cho cùng batch
                setStudySessionData(prev => ({
                    ...prev,
                    currentPhase: 'typing'
                }));
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
                setIsRevealed(false);
                setFeedback(null);
            }
        }, 1500);
    };

    // Handle typing answer
    const handleTypingAnswer = async () => {
        if (isProcessing || !inputValue.trim()) return;

        const userAnswer = normalizeAnswer(inputValue);
        const correctAnswer = normalizeAnswer(currentCard.front); // Đáp án đúng là từ vựng tiếng Nhật
        const isCorrect = userAnswer === correctAnswer;

        setIsProcessing(true);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setIsRevealed(true);
        playAudio(currentCard.audioBase64, currentCard.front);

        // Update card SRS
        await onUpdateCard(currentCard.id, isCorrect, 'back');

        // Cập nhật learning/reviewing lists
        if (isCorrect) {
            // Chuyển từ learning sang reviewing nếu có
            setStudySessionData(prev => ({
                ...prev,
                learning: prev.learning.filter(c => c.id !== currentCard.id),
                reviewing: [...prev.reviewing.filter(c => c.id !== currentCard.id), currentCard]
            }));
        } else {
            // Thêm vào learning nếu sai
            setStudySessionData(prev => ({
                ...prev,
                learning: [...prev.learning.filter(c => c.id !== currentCard.id), currentCard]
            }));
        }

        setTimeout(() => {
            setIsProcessing(false);
            // Đánh dấu từ này đã hoàn thành typing phase
            setCompletedCards(prev => new Set([...prev, currentCard.id]));
            
            if (currentQuestionIndex < currentBatch.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setInputValue('');
                setIsRevealed(false);
                setFeedback(null);
            } else {
                // Hoàn thành batch typing, tạo batch tiếp theo
                createNextBatch();
            }
        }, 1500);
    };

    // Function to create next batch
    const createNextBatch = () => {
        // Lấy tất cả từ chưa hoàn thành (chưa có trong completedCards)
        const remainingNoSrs = studySessionData.allNoSrsCards.filter(card => 
            !completedCards.has(card.id)
        );
        
        if (remainingNoSrs.length === 0) {
            onCompleteStudy();
            return;
        }
        
        // Phân loại theo ưu tiên: Learning > New > Reviewing
        const learning = studySessionData.learning.filter(card => 
            remainingNoSrs.some(c => c.id === card.id)
        );
        const newCards = remainingNoSrs.filter(card => 
            !learning.some(c => c.id === card.id) &&
            !studySessionData.reviewing.some(c => c.id === card.id)
        );
        const reviewing = studySessionData.reviewing.filter(card => 
            remainingNoSrs.some(c => c.id === card.id) &&
            !learning.some(c => c.id === card.id)
        );

        // Tạo batch 5 từ theo ưu tiên
        const nextBatch = [];
        nextBatch.push(...learning.slice(0, 5));
        if (nextBatch.length < 5) {
            nextBatch.push(...shuffleArray(newCards).slice(0, 5 - nextBatch.length));
        }
        if (nextBatch.length < 5) {
            nextBatch.push(...shuffleArray(reviewing).slice(0, 5 - nextBatch.length));
        }

        if (nextBatch.length === 0) {
            onCompleteStudy();
        } else {
            setStudySessionData(prev => ({
                ...prev,
                currentBatch: nextBatch,
                currentPhase: 'multipleChoice',
                batchIndex: prev.batchIndex + 1
            }));
            setCurrentQuestionIndex(0);
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
            setMultipleChoiceResults({});
        }
    };

    if (!currentCard) {
        onCompleteStudy();
        return null;
    }

    const progress = currentPhase === 'multipleChoice' 
        ? ((currentQuestionIndex + 1) / currentBatch.length) * 50
        : 50 + ((currentQuestionIndex + 1) / currentBatch.length) * 50;

    return (
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto h-full flex flex-col space-y-2 md:space-y-3">
            {/* Header & Progress */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center text-xs md:text-sm font-medium text-gray-500">
                    <span className="flex items-center">
                        <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1 text-teal-500"/> 
                        Học - {currentPhase === 'multipleChoice' ? 'Trắc nghiệm' : 'Tự luận'} - Batch {studySessionData.batchIndex + 1}
                    </span>
                    <span>{currentQuestionIndex + 1} / {currentBatch.length}</span>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 md:space-y-6">
                {currentPhase === 'multipleChoice' ? (
                    // Multiple Choice Phase - Hỏi bằng tiếng Việt, đáp án là tiếng Nhật
                    <div className="w-full bg-white rounded-xl md:rounded-3xl shadow-xl border border-gray-100 p-4 md:p-8 space-y-4 md:space-y-6">
                        <div className="text-center">
                            <h3 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-4">
                                {currentCard.back}
                            </h3>
                            <p className="text-sm md:text-base text-gray-500">Chọn từ vựng tiếng Nhật đúng:</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 md:gap-3">
                            {generateMultipleChoiceOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleMultipleChoiceAnswer(option)}
                                    disabled={isProcessing || isRevealed}
                                    className={`p-3 md:p-4 rounded-lg md:rounded-xl font-bold text-sm md:text-base transition-all text-left border-2
                                        ${selectedAnswer === option
                                            ? feedback === 'correct'
                                                ? 'bg-green-500 text-white shadow-lg border-green-600'
                                                : 'bg-red-500 text-white shadow-lg border-red-600'
                                            : isRevealed && normalizeAnswer(option) === normalizeAnswer(currentCard.front)
                                                ? 'bg-green-500 text-white shadow-lg border-green-600'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                                        }
                                        ${isProcessing || isRevealed ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                                    `}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Typing Phase - Hỏi bằng tiếng Việt, đáp án là tiếng Nhật
                    <div className="w-full bg-white rounded-xl md:rounded-3xl shadow-xl border border-gray-100 p-4 md:p-8 space-y-4 md:space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2">Từ vựng tiếng Nhật là gì?</h3>
                            <p className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-4">
                                {currentCard.back}
                            </p>
                        </div>
                        
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isRevealed) {
                                        handleTypingAnswer();
                                    }
                                }}
                                disabled={isRevealed || isProcessing}
                                className={`w-full px-4 md:px-6 py-3 md:py-4 text-lg md:text-2xl font-semibold rounded-xl md:rounded-2xl border-2 transition-all outline-none shadow-md text-center
                                    ${feedback === 'correct'
                                        ? 'border-green-400 bg-green-50 text-green-800'
                                        : feedback === 'incorrect'
                                            ? 'border-red-400 bg-red-50 text-red-800'
                                            : 'border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10'
                                    }
                                `}
                                placeholder="Nhập từ vựng tiếng Nhật..."
                            />
                        </div>

                        {isRevealed && (
                            <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl border ${
                                feedback === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}>
                                <p className={`font-bold text-base md:text-xl text-center ${
                                    feedback === 'correct' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {feedback === 'correct' ? '✓ Chính xác!' : `✗ Đáp án đúng: ${currentCard.front}`}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0 pb-4 md:pb-0">
                {currentPhase === 'typing' && !isRevealed && (
                    <button
                        onClick={handleTypingAnswer}
                        disabled={isProcessing || !inputValue.trim()}
                        className="w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                    >
                        Kiểm tra
                    </button>
                )}
                
                {currentPhase === 'typing' && isRevealed && (
                    <button
                        onClick={async () => {
                            if (isProcessing) return;
                            
                            setIsProcessing(true);
                            
                            if (currentQuestionIndex < currentBatch.length - 1) {
                                setCurrentQuestionIndex(currentQuestionIndex + 1);
                                setInputValue('');
                                setIsRevealed(false);
                                setFeedback(null);
                                setIsProcessing(false);
                            } else {
                                // Hoàn thành batch typing, tạo batch tiếp theo
                                createNextBatch();
                                setIsProcessing(false);
                            }
                        }}
                        disabled={isProcessing}
                        className="w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
                    >
                        {currentQuestionIndex < currentBatch.length - 1 ? 'Tiếp theo →' : 'Batch tiếp theo →'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ... (HelpScreen logic simplified)
const HelpScreen = ({ onBack, isFirstTime, onConfirmFirstTime }) => {
    const [isLoading, setIsLoading] = useState(false);
    const handleClick = async () => { setIsLoading(true); await onConfirmFirstTime(); };
    return (
        <div className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center">
                    <HelpCircle className="w-6 h-6 mr-2 text-indigo-600"/> Hướng dẫn nhanh
                </h2>
                <p className="text-gray-500 text-sm mt-1">Làm chủ QuizKi trong 3 phút</p>
            </div>

            {/* Mẹo thêm từ vựng */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                 <h3 className="font-bold text-blue-800 flex items-center text-lg">
                    <Plus className="w-5 h-5 mr-2" /> Thêm Từ Vựng Hiệu Quả
                 </h3>
                 <ul className="space-y-3 text-blue-900 text-sm font-medium">
                     <li className="flex items-start">
                         <Brain className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0"/>
                         <span>Với từ nhiều nghĩa, hãy <b>chọn Kanji chính xác</b> rồi mới dùng AI để lấy nghĩa chuẩn nhất.</span>
                     </li>
                     <li className="flex items-start">
                         <Filter className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0"/>
                         <span><b>Từ đồng nghĩa:</b> Nếu thấy gợi ý không quen thuộc, hãy xoá bớt để tránh bị quá tải kiến thức.</span>
                     </li>
                     <li className="flex items-start">
                         <Target className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0"/>
                         <span><b>Mới bắt đầu:</b> Chỉ nên học khoảng <b>15 từ/ngày</b>. Đừng quá tham lam kẻo dễ bị "ngộp" và nản chí.</span>
                     </li>
                 </ul>
            </div>

             {/* Mẹo học tập */}
             <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100 space-y-3">
                 <h3 className="font-bold text-amber-800 flex items-center text-lg">
                    <Zap className="w-5 h-5 mr-2" /> Mẹo Học Tập Siêu Tốc
                 </h3>
                 <ul className="space-y-3 text-amber-900 text-sm font-medium">
                     <li className="flex items-start">
                         <Repeat2 className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0"/>
                         <span>Bắt đầu ôn tập với chế độ <b>Ý nghĩa</b> trước để nắm từ gốc.</span>
                     </li>
                     <li className="flex items-start">
                         <Keyboard className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0"/>
                         <span>Nếu quên, cứ ấn <b>Enter</b> để xem đáp án, sau đó <b>nhập lại từ đúng</b> để nhớ dai hơn.</span>
                     </li>
                     <li className="flex items-start">
                         <Ear className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0"/>
                         <span><b>Đa giác quan:</b> Nghe audio, đọc to thành tiếng và nhìn kỹ Kanji.</span>
                     </li>
                     <li className="flex items-start">
                         <Lightbulb className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0"/>
                         <span>Gặp từ khó? Hãy liên tưởng đến <b>từ cùng âm tiếng Việt</b> hoặc tự bịa ra một câu chuyện thú vị cho nó!</span>
                     </li>
                 </ul>
            </div>

            {/* Quy tắc SRS (Thu gọn) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                 <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Cơ chế SRS (Lặp lại ngắt quãng)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                     <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-xs">1</span>
                        <span className="text-gray-600">Trả lời <b>Đúng</b> → Ôn lại ngày mai.</span>
                     </div>
                     <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 text-xs">2</span>
                        <span className="text-gray-600">Đúng liên tiếp → Giãn cách (3, 7, 30 ngày...).</span>
                     </div>
                     <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mr-3 text-xs">!</span>
                        <span className="text-red-700 font-medium">Trả lời <b>Sai</b> → Phải ôn lại ngay hôm nay.</span>
                     </div>
                 </div>
            </div>

            {isFirstTime ? ( <button onClick={handleClick} disabled={isLoading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:-translate-y-1 transition-all">{isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto"/> : "Đã hiểu, Bắt đầu ngay!"}</button> ) 
            : ( <button onClick={onBack} className="w-full py-4 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Quay lại trang chủ</button> )}
        </div>
    );
};

const ImportScreen = ({ onImport, onBack }) => {
     // ... (Logic giữ nguyên)
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [message, setMessage] = useState(''); 
    const [errorLines, setErrorLines] = useState(0);

    // Helpers file parsing (Copy từ code cũ)...
    const handleFileParse = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);
        setMessage('');
        setErrorLines(0);
        
        const reader = new FileReader();
        reader.onload = async (event) => { 
            try {
                const csvText = event.target.result;
                const lines = csvText.split('\n');
                const cardsToImport = [];
                let validCount = 0;
                let invalidCount = 0;
                lines.forEach((line, index) => {
                    if (index === 0) return; 
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return; 
                    const fields = trimmedLine.split('\t').map(field => field ? field.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '');
                    if (fields.length < 2 || !fields[0] || !fields[1]) { invalidCount++; return; }
                    const card = { front: fields[0], back: fields[1], synonym: fields[2] || '', example: fields[3] || '', exampleMeaning: fields[4] || '', nuance: fields[5] || '', createdAtRaw: fields[6] || '' };
                    // ... Logic parse fields SRS (Giữ nguyên)
                    if (fields.length >= 15) { 
                        let srsIndex = 7;
                        card.intervalIndex_back = parseInt(fields[srsIndex++]) || -1; card.correctStreak_back = parseInt(fields[srsIndex++]) || 0; card.nextReview_back_timestamp = parseInt(fields[srsIndex++]) || Date.now();
                        card.intervalIndex_synonym = parseInt(fields[srsIndex++]) || -999; card.correctStreak_synonym = parseInt(fields[srsIndex++]) || 0; card.nextReview_synonym_timestamp = parseInt(fields[srsIndex++]) || new Date(9999,0,1).getTime();
                        card.intervalIndex_example = parseInt(fields[srsIndex++]) || -999; card.correctStreak_example = parseInt(fields[srsIndex++]) || 0; card.nextReview_example_timestamp = parseInt(fields[srsIndex++]) || new Date(9999,0,1).getTime();
                        if (fields[16]) card.audioBase64 = fields[16]; if (fields[17]) card.imageBase64 = fields[17]; if (fields[18]) card.pos = fields[18]; if (fields[19]) card.level = fields[19]; if (fields[20]) card.sinoVietnamese = fields[20]; if (fields[21]) card.synonymSinoVietnamese = fields[21];
                    } else { card.intervalIndex_back = -1; card.nextReview_back_timestamp = Date.now(); }
                    cardsToImport.push(card); validCount++;
                });
                
                if (cardsToImport.length > 0) {
                    if (invalidCount > 0) setErrorLines(invalidCount); await onImport(cardsToImport); setMessage(`Thành công: ${validCount} thẻ.`);
                } else { setMessage("File lỗi hoặc rỗng."); setIsLoading(false); }
            } catch (error) { console.error(error); setMessage("Lỗi đọc file."); setIsLoading(false); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 pb-4 border-b">Nhập Dữ Liệu</h2>
            <div className="border-2 border-dashed border-indigo-200 rounded-3xl bg-indigo-50/50 p-10 flex flex-col items-center justify-center text-center hover:bg-indigo-50 transition-colors">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Upload className="w-8 h-8 text-indigo-500"/>
                </div>
                <label className="cursor-pointer">
                    <span className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all inline-block">Chọn File .TSV</span>
                    <input type="file" className="hidden" accept=".tsv,.txt" onChange={handleFileParse} disabled={isLoading}/>
                </label>
                {fileName && <p className="mt-4 text-sm font-medium text-gray-600">{fileName}</p>}
                {isLoading && <Loader2 className="animate-spin mt-4 text-indigo-500"/>}
                {message && <p className="mt-4 text-sm font-bold text-emerald-600">{message}</p>}
            </div>
            <button onClick={onBack} className="w-full py-4 text-gray-500 font-medium hover:text-gray-800">Quay lại</button>
        </div>
    );
};

// UPDATED: Advanced Stats
const StatsScreen = ({ memoryStats, totalCards, profile, allCards, dailyActivityLogs, onUpdateGoal, onBack }) => {
    const { shortTerm, midTerm, longTerm, new: newCards } = memoryStats;
    const [newGoal, setNewGoal] = useState(profile.dailyGoal);
    const pieChartRef = useRef(null);
    const barChartRef = useRef(null);
    const [pieChartSize, setPieChartSize] = useState({ width: 0, height: 250 });
    const [barChartSize, setBarChartSize] = useState({ width: 0, height: 250 });
    
    useEffect(() => {
        const updatePieSize = () => {
            if (pieChartRef.current) {
                const width = pieChartRef.current.offsetWidth || 0;
                if (width > 0) {
                    setPieChartSize({ width, height: 250 });
                }
            }
        };
        const updateBarSize = () => {
            if (barChartRef.current) {
                const width = barChartRef.current.offsetWidth || 0;
                if (width > 0) {
                    setBarChartSize({ width, height: 250 });
                }
            }
        };
        
        // Delay để đảm bảo DOM đã render
        const timer = setTimeout(() => {
            updatePieSize();
            updateBarSize();
        }, 100);
        
        window.addEventListener('resize', () => {
            updatePieSize();
            updateBarSize();
        });
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePieSize);
            window.removeEventListener('resize', updateBarSize);
        };
    }, []);

    const handleSaveGoal = () => { onUpdateGoal(newGoal); };

    // --- Statistics Calculations ---

    // 1. Streak Calculation
    const streak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;
        
        // Logs are assumed to be sorted by date (ID) ascending in App component
        // Need to check backwards from today
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Find today's log or yesterday's log to start streak
        // Reverse array for easier backward checking
        const reversedLogs = [...dailyActivityLogs].reverse(); 
        
        // Check if streak is active (has entry today or yesterday)
        const lastLog = reversedLogs[0];
        if (!lastLog) return 0;
        
        let currentStreak = 0;
        let checkDate = new Date();
        
        // If last log is not today, check if it's yesterday. If not even yesterday, streak broken.
        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) {
            return 0;
        }

        // If last log is today, start counting. If yesterday, start counting from yesterday.
        if (lastLog.id === todayStr) {
             // checkDate is already today
        } else {
             checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday
        }

        for (const log of reversedLogs) {
             const checkDateStr = checkDate.toISOString().split('T')[0];
             if (log.id === checkDateStr && log.newWordsAdded > 0) {
                 currentStreak++;
                 checkDate.setDate(checkDate.getDate() - 1); // Go back 1 day
             } else {
                 break; // Streak broken or date gap
             }
        }
        return currentStreak;
    }, [dailyActivityLogs]);

    // 2. Words Added This Week
    const wordsAddedThisWeek = useMemo(() => {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        // Filter cards created after sevenDaysAgo
        return allCards.filter(c => c.createdAt >= sevenDaysAgo).length;
    }, [allCards]);

    // 3. JLPT Progress Data for Bar Chart
    const jlptData = useMemo(() => {
        return JLPT_LEVELS.map(level => {
            const count = allCards.filter(c => c.level === level.value).length;
            return {
                name: level.label,
                count: count,
                target: level.target,
                fill: level.color.split(' ')[0].replace('bg-', 'var(--color-') // Simplified color mapping logic or hardcode
            };
        });
    }, [allCards]);

    const pieData = [ 
        { name: 'Mới', value: newCards, fill: '#94a3b8' }, 
        { name: 'Ngắn hạn', value: shortTerm, fill: '#f59e0b' }, 
        { name: 'Trung hạn', value: midTerm, fill: '#10b981' }, 
        { name: 'Dài hạn', value: longTerm, fill: '#22c55e' }, 
    ].filter(e => e.value > 0);

    // Debug: Log data để kiểm tra
    // useEffect(() => {
    //     console.log('StatsScreen Data:', { 
    //         pieData, 
    //         jlptData, 
    //         totalCards, 
    //         memoryStats,
    //         pieDataLength: pieData.length,
    //         jlptDataLength: jlptData?.length 
    //     });
    // }, [pieData, jlptData, totalCards, memoryStats]);

    return (
        <div className="space-y-3 md:space-y-8">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 pb-2 md:pb-4 border-b">Thống Kê Chi Tiết</h2>
            
            {/* Top Row: Summary Cards - 2 columns on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                 <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-3 md:p-5 rounded-xl md:rounded-2xl text-white shadow-lg space-y-1 md:space-y-2">
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[9px] md:text-xs uppercase tracking-wide opacity-80">Mục tiêu mỗi ngày</p>
                            <div className="flex items-end gap-1 md:gap-2 mt-0.5 md:mt-1">
                                <input
                                    type="number"
                                    min={1}
                                    value={newGoal}
                                    onChange={e => setNewGoal(e.target.value)}
                                    className="w-12 md:w-20 px-1 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg text-lg md:text-2xl font-bold text-indigo-700 bg-white"
                                />
                                <span className="text-[9px] md:text-xs opacity-90">từ/ngày</span>
                            </div>
                        </div>
                        <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-200 flex-shrink-0"/>
                     </div>
                     <button
                        onClick={handleSaveGoal}
                        className="mt-1 md:mt-2 inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-xs font-semibold rounded-md md:rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                     >
                        <Save className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> Lưu mục tiêu
                     </button>
                </div>
                <MemoryStatCard 
                    title="Trong tuần" 
                    count={wordsAddedThisWeek} 
                    icon={TrendingUp} 
                    color={{bg:'bg-gradient-to-br from-sky-50 to-sky-100',border:'border border-sky-100',text:'text-sky-600',iconBg:'bg-white/80'}} 
                    subtext="từ vựng mới" 
                />
                <MemoryStatCard 
                    title="Chuỗi ngày" 
                    count={streak} 
                    icon={Flame} 
                    color={{bg:'bg-gradient-to-br from-orange-50 to-amber-100',border:'border border-amber-100',text:'text-orange-600',iconBg:'bg-white/80'}} 
                    subtext="liên tục" 
                />
                <MemoryStatCard 
                    title="Tổng số" 
                    count={totalCards} 
                    icon={List} 
                    color={{bg:'bg-gradient-to-br from-slate-50 to-slate-100',border:'border border-slate-100',text:'text-slate-700',iconBg:'bg-white/80'}} 
                />
            </div>

            {/* Middle Row: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8">
                {/* Pie Chart: Memory Retention */}
                 <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-4">Ghi nhớ Từ vựng</h3>
                        {pieData.length > 0 ? (
                        <div ref={pieChartRef} className="chart-container">
                            {pieChartSize.width > 0 ? (
                                <ResponsiveContainer width={pieChartSize.width} height={pieChartSize.height}>
                                <PieChart>
                                    <Pie 
                                        data={pieData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={90} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip/>
                                    <Legend wrapperStyle={{fontSize: '10px'}} iconSize={8}/>
                                </PieChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Đang tải...</span>
                    </div>
                            )}
                        </div>
                    ) : (
                        <div className="chart-center">
                            <span className="text-gray-400 text-xs md:text-sm">Chưa có dữ liệu</span>
                        </div>
                    )}
                 </div>

                 {/* Bar Chart: JLPT Progress */}
                 <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm md:text-lg font-bold text-gray-700 mb-2 md:mb-4">Tiến độ theo Cấp độ JLPT</h3>
                    {jlptData && jlptData.length > 0 ? (
                        <div ref={barChartRef} className="chart-container">
                            {barChartSize.width > 0 ? (
                                <ResponsiveContainer width={barChartSize.width} height={barChartSize.height}>
                                    <BarChart data={jlptData} layout="vertical" margin={{top: 5, right: 10, left: 15, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide/>
                                    <YAxis dataKey="name" type="category" width={20} tick={{fontSize: 10, fontWeight: 'bold'}}/>
                                <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                                <div className="bg-white p-1.5 md:p-2 border border-gray-100 shadow-lg rounded-md md:rounded-lg text-[10px] md:text-xs">
                                                <p className="font-bold">{d.name}</p>
                                                <p>Đã có: {d.count}</p>
                                                <p>Yêu cầu: {d.target}</p>
                                                <p>Tiến độ: {Math.round((d.count/d.target)*100)}%</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}/>
                                    <Bar dataKey="count" barSize={15} radius={[0, 4, 4, 0]}>
                                    {jlptData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            index === 0 ? '#10b981' : 
                                            index === 1 ? '#0d9488' : 
                                            index === 2 ? '#0ea5e9' : 
                                            index === 3 ? '#8b5cf6' : 
                                            '#f43f5e'
                                        } />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Đang tải...</span>
                    </div>
                            )}
                        </div>
                    ) : (
                        <div className="chart-center">
                            <span className="text-gray-400 text-xs md:text-sm">Chưa có dữ liệu</span>
                        </div>
                    )}
                    <p className="text-[9px] md:text-xs text-gray-400 mt-1 md:mt-2 text-center">*Số lượng yêu cầu chỉ mang tính chất tham khảo</p>
                 </div>
            </div>

            <button onClick={onBack} className="w-full py-2 md:py-3 border border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 font-medium text-sm md:text-base text-gray-600">Quay lại</button>
        </div>
    );
};

const FriendsScreen = ({ publicStatsPath, currentUserId, isAdmin, onAdminDeleteUserData, onBack }) => {
    // ... Copy logic cũ
    const [friendStats, setFriendStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editGoal, setEditGoal] = useState('');
    const [editApproved, setEditApproved] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (s) => {
            const l = s.docs.map(d => d.data());
            l.sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0));
            setFriendStats(l);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);

    const handleOpenEdit = async (u) => {
        if (!db || !appId || !isAdmin) return;
        setEditError('');
        setEditingUser(u);
        setEditDisplayName(u.displayName || '');
        setEditGoal('');
        setEditApproved(u.isApproved === true);
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${u.userId}/settings/profile`);
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
                const data = snap.data();
                if (typeof data.dailyGoal === 'number') {
                    setEditGoal(String(data.dailyGoal));
                }
                if (data.isApproved === true) {
                    setEditApproved(true);
                }
            }
        } catch (e) {
            console.error("Lỗi tải profile để chỉnh sửa:", e);
        }
    };

    const handleSaveEdit = async () => {
        if (!db || !appId || !editingUser || !isAdmin) return;
        const name = editDisplayName.trim();
        if (!name) {
            setEditError('Tên hiển thị không được để trống.');
            return;
        }
        setEditError('');
        setEditSaving(true);
        try {
            // Kiểm tra trùng tên hiển thị với user khác - query ên publicStats thay vì collectionGroup
            try {
                const q = query(
                    collection(db, publicStatsPath),
                    where('displayName', '==', name)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const conflict = snap.docs.find(d => d.id !== editingUser.userId);
                    if (conflict) {
                        setEditError('Tên hiển thị này đã được sử dụng. Vui lòng chọn tên khác.');
                        setEditSaving(false);
                        return;
                    }
                }
            } catch (checkErr) {
                console.error('Lỗi kiểm tra trùng tên (admin edit):', checkErr);
                // Nếu lỗi, vẫn cho phép lưu để không chặn admin
            }

            const profileRef = doc(db, `artifacts/${appId}/users/${editingUser.userId}/settings/profile`);
            const updates = { displayName: name, isApproved: editApproved === true };
            const goalNum = editGoal ? Number(editGoal) : null;
            if (!isNaN(goalNum) && goalNum && goalNum > 0) {
                updates.dailyGoal = goalNum;
            }
            await updateDoc(profileRef, updates);

            // Cập nhật bảng xếp hạng công khai
            const statsRef = doc(db, publicStatsPath, editingUser.userId);
            await updateDoc(statsRef, { displayName: name, isApproved: editApproved === true }).catch(() => {});

            // Cập nhật UI local
            setFriendStats(prev =>
                prev.map(item =>
                    item.userId === editingUser.userId ? { ...item, displayName: name, isApproved: editApproved === true } : item
                )
            );

            setEditingUser(null);
            setEditSaving(false);
        } catch (e) {
            console.error("Lỗi admin cập nhật thông tin người dùng:", e);
            setEditError('Không thể cập nhật thông tin người dùng. Vui lòng thử lại.');
            setEditSaving(false);
        }
    };

    return (
        <div className="space-y-3 md:space-y-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 pb-2 md:pb-4 border-b">Bảng Xếp Hạng</h2>
            <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto overflow-y-visible -mx-2 md:mx-0 px-2 md:px-0">
                    <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase">Hạng</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase">Thành viên</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-amber-600 uppercase">Ngắn</th> 
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-emerald-600 uppercase">Trung</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-green-700 uppercase">Dài</th> 
                                <th className="px-3 md:px-6 py-2 md:py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 uppercase">Tổng từ</th>
                                {isAdmin && <th className="px-2 md:px-4 py-2 md:py-4 text-right text-[10px] md:text-xs font-bold text-red-500 uppercase">Admin</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {friendStats.map((u, i) => (
                            <tr key={u.userId} className={u.userId === currentUserId ? 'bg-indigo-50/50' : ''}>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold text-gray-400">#{i + 1}</td>
                                    <td className={`px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold ${u.userId === currentUserId ? 'text-indigo-600' : 'text-gray-700'}`}>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <span className="truncate max-w-[120px] md:max-w-none">{u.displayName} {u.userId === currentUserId && '(Bạn)'}</span>
                                        {isAdmin && (
                                                <span className={`px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-semibold rounded-full border flex-shrink-0 ${
                                                u.isApproved
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-yellow-50 text-amber-700 border-amber-100'
                                            }`}>
                                                {u.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-amber-600">{u.shortTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-emerald-600">{u.midTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-green-700">{u.longTerm || 0}</td>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-right text-xs md:text-sm font-bold text-emerald-600">{u.totalCards}</td>
                                {isAdmin && (
                                        <td className="px-2 md:px-4 py-2 md:py-4 text-right space-x-1 md:space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(u)}
                                                className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 whitespace-nowrap"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (u.userId === currentUserId) return;
                                                if (window.confirm(`Bạn có chắc muốn xoá toàn bộ dữ liệu của ${u.displayName || 'người dùng này'}?`)) {
                                                    onAdminDeleteUserData(u.userId);
                                                }
                                            }}
                                                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg border whitespace-nowrap ${
                                                u.userId === currentUserId
                                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                    : 'border-red-200 text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            Xoá dữ liệu
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            {isAdmin && editingUser && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800">
                        Chỉnh sửa người dùng: <span className="text-indigo-600">{editingUser.displayName || editingUser.userId}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700">Tên hiển thị</label>
                            <input
                                type="text"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700">Mục tiêu/ngày</label>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                id="edit-approved"
                                type="checkbox"
                                checked={editApproved}
                                onChange={(e) => setEditApproved(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-approved" className="text-xs text-gray-600">
                                Cho phép tài khoản này sử dụng app (Admin duyệt)
                            </label>
                        </div>
                            <input
                                type="number"
                                min={1}
                                value={editGoal}
                                onChange={(e) => setEditGoal(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                placeholder="Giữ nguyên nếu để trống"
                            />
                        </div>
                    </div>
                    {editError && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {editError}
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setEditingUser(null); setEditError(''); }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                            Huỷ
                        </button>
                        <button
                            type="button"
                            disabled={editSaving}
                            onClick={handleSaveEdit}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            )}
            <button onClick={onBack} className="w-full py-3 border border-gray-200 rounded-xl hover:bg-gray-50 mt-4">Quay lại</button>
        </div>
    );
};

// ==================== TEST SCREEN ====================
const TestScreen = ({ allCards, onBack }) => {
    const [testMode, setTestMode] = useState(null); // null | 'kanji' | 'vocab' | 'grammar'
    const [testType, setTestType] = useState(null); // 1-7
    const [showConfig, setShowConfig] = useState(false); // Hiển thị màn hình cấu hình
    const [selectedLevel, setSelectedLevel] = useState('all'); // 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
    const [questionCount, setQuestionCount] = useState(10);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [userAnswers, setUserAnswers] = useState([]);

    // Generate questions based on test type
    const generateQuestions = (mode, type, count = 10, level = 'all') => {
        let cardsWithContext = allCards.filter(card => 
            card.example && card.example.trim() !== '' &&
            card.back && card.back.trim() !== ''
        );

        // Filter by JLPT level
        if (level !== 'all') {
            cardsWithContext = cardsWithContext.filter(card => card.level === level);
        }

        if (cardsWithContext.length === 0) {
            alert('Không có đủ dữ liệu để tạo câu hỏi. Vui lòng thêm ví dụ và nghĩa cho từ vựng hoặc chọn cấp độ khác.');
            return [];
        }

        const shuffled = cardsWithContext.sort(() => Math.random() - 0.5);
        const selectedCards = shuffled.slice(0, Math.min(count, shuffled.length));
        
        let generatedQuestions = [];

        if (mode === 'kanji') {
            if (type === 1) {
                // Loại 1: Nhìn Kanji → chọn Hiragana (không hiển thị hiragana trong câu hỏi)
                generatedQuestions = selectedCards.map(card => {
                    const kanjiOnly = card.front.split('（')[0]; // Chỉ lấy phần Kanji
                    const correctAnswer = extractHiragana(card.front);
                    const wrongOptions = generateWrongHiragana(card.front, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);
                    
                    return {
                        question: `Cách đọc của "___BOLD___${kanjiOnly}___BOLD___" là:`,
                        context: card.example || '',
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: kanjiOnly
                    };
                });
            } else if (type === 2) {
                // Loại 2: Nhìn Hiragana → chọn Kanji (thay kanji bằng hiragana trong câu)
                generatedQuestions = selectedCards.map(card => {
                    const hiragana = extractHiragana(card.front);
                    const kanjiOnly = card.front.split('（')[0]; // Lấy phần Kanji
                    const correctAnswer = kanjiOnly;
                    const wrongOptions = generateWrongKanji(card, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);
                    
                    // Thay thế Kanji bằng Hiragana trong câu context
                    const contextWithHiragana = card.example.replace(kanjiOnly, hiragana);
                    
                    return {
                        question: `Kanji của "___BOLD___${hiragana}___BOLD___" là:`,
                        context: contextWithHiragana || '',
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: hiragana
                    };
                });
            }
        } else if (mode === 'vocab') {
            if (type === 3) {
                // Loại 3: Chọn từ vựng phù hợp với câu
                generatedQuestions = selectedCards.map(card => {
                    const blankSentence = card.example.replace(card.front.split('（')[0], '＿＿＿');
                    const correctAnswer = card.front;
                    const wrongOptions = generateSimilarVocab(card, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);
                    
                    return {
                        question: `Chọn từ phù hợp để điền vào chỗ trống:`,
                        context: blankSentence,
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.exampleMeaning || card.back
                    };
                });
            } else if (type === 4) {
                // Loại 4: Chọn từ đồng nghĩa (không hiển thị nghĩa tiếng Việt ngay)
                generatedQuestions = selectedCards
                    .filter(card => card.synonym && card.synonym.trim() !== '')
                    .slice(0, Math.min(count, selectedCards.length))
                    .map(card => {
                        const correctAnswer = card.synonym.split(',')[0].trim();
                        const wrongOptions = generateWrongSynonyms(card, allCards, 3);
                        const options = shuffleArray([correctAnswer, ...wrongOptions]);
                        
                        return {
                            question: `Từ đồng nghĩa với "___BOLD___${card.front}___BOLD___" là:`,
                            context: '', // Không hiển thị nghĩa tiếng Việt ngay
                            options: options,
                            correctAnswer: correctAnswer,
                            explanation: `${card.front} = ${card.synonym}. Nghĩa: ${card.back}`
                        };
                    });
            }
        } else if (mode === 'grammar') {
            // Loại 6 & 7 sẽ cần dữ liệu ngữ pháp riêng
            alert('Tính năng Ngữ pháp đang được phát triển. Vui lòng thêm dữ liệu ngữ pháp.');
            return [];
        }

        return generatedQuestions;
    };

    // Helper functions
    const extractHiragana = (word) => {
        const match = word.match(/（(.+?)）/);
        return match ? match[1] : word;
    };

    const generateWrongHiragana = (correctWord, allCards, count) => {
        const correctHira = extractHiragana(correctWord);
        const samePosCards = allCards.filter(c => 
            c.pos === allCards.find(card => card.front === correctWord)?.pos &&
            c.front !== correctWord &&
            extractHiragana(c.front) !== correctHira
        );
        
        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => extractHiragana(c.front));
        
        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const hira = extractHiragana(randomCard.front);
            if (hira !== correctHira && !options.includes(hira)) {
                options.push(hira);
            }
        }
        
        return options;
    };

    const generateWrongKanji = (correctCard, allCards, count) => {
        const correctKanji = correctCard.front.split('（')[0];
        const samePosCards = allCards.filter(c => 
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.front.split('（')[0] !== correctKanji
        );
        
        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.front.split('（')[0]);
        
        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const kanji = randomCard.front.split('（')[0];
            if (kanji !== correctKanji && !options.includes(kanji)) {
                options.push(kanji);
            }
        }
        
        return options;
    };

    const generateSimilarVocab = (correctCard, allCards, count) => {
        const correctWord = correctCard.front;
        
        // Ưu tiên từ cùng POS
        const samePosCards = allCards.filter(c => 
            c.pos === correctCard.pos &&
            c.front !== correctWord &&
            c.example && c.example.trim() !== ''
        );
        
        let options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.front);
        
        // Nếu không đủ, lấy từ có độ dài tương tự
        if (options.length < count) {
            const correctLength = correctWord.length;
            const similarLengthCards = allCards.filter(c => 
                Math.abs(c.front.length - correctLength) <= 2 &&
                c.front !== correctWord &&
                !options.includes(c.front) &&
                c.example && c.example.trim() !== ''
            );
            
            options = options.concat(
                similarLengthCards
                    .sort(() => Math.random() - 0.5)
                    .slice(0, count - options.length)
                    .map(c => c.front)
            );
        }
        
        // Nếu vẫn không đủ, lấy random
        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            if (randomCard.front !== correctWord && !options.includes(randomCard.front)) {
                options.push(randomCard.front);
            }
        }
        
        return options;
    };

    const generateWrongSynonyms = (correctCard, allCards, count) => {
        const correctSynonym = correctCard.synonym?.split(',')[0].trim();
        
        // Ưu tiên từ cùng POS
        const samePosCards = allCards.filter(c => 
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.synonym && c.synonym.trim() !== ''
        );
        
        let options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.synonym.split(',')[0].trim());
        
        // Nếu không đủ, lấy từ random có synonym
        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const syn = randomCard.synonym?.split(',')[0].trim();
            if (syn && syn !== correctSynonym && !options.includes(syn)) {
                options.push(syn);
            }
        }
        
        return options;
    };

    const shuffleArray = (array) => {
        return [...array].sort(() => Math.random() - 0.5);
    };

    const handleShowConfig = (mode, type) => {
        setTestMode(mode);
        setTestType(type);
        setShowConfig(true);
    };

    const handleStartTest = () => {
        const qs = generateQuestions(testMode, testType, questionCount, selectedLevel);
        if (qs.length === 0) return;
        
        setQuestions(qs);
        setShowConfig(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setUserAnswers([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowResult(false);
    };

    const handleAnswerSelect = (answer) => {
        if (isAnswered) return;
        
        setSelectedAnswer(answer);
        setIsAnswered(true);
        
        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = answer === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            setScore(score + 1);
        }
        
        setUserAnswers([...userAnswers, {
            question: currentQuestion.question,
            context: currentQuestion.context,
            selectedAnswer: answer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: isCorrect,
            explanation: currentQuestion.explanation
        }]);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            setShowResult(true);
        }
    };

    const handleRestart = () => {
        setTestMode(null);
        setTestType(null);
        setShowConfig(false);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setScore(0);
        setUserAnswers([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowResult(false);
    };

    const handleBackToMenu = () => {
        handleRestart();
    };

    // Helper function to render bold text
    const renderBoldText = (text) => {
        if (!text) return text;
        
        const parts = text.split('___BOLD___');
        return parts.map((part, idx) => {
            if (idx % 2 === 1) {
                return <span key={idx} className="font-bold text-indigo-700 underline decoration-2">{part}</span>;
            }
            return part;
        });
    };

    // Render result screen
    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        const passed = percentage >= 70;
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="text-center mb-8">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                                passed ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {passed ? (
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                ) : (
                                    <XCircle className="w-10 h-10 text-red-600" />
                                )}
                            </div>
                            <h2 className="text-3xl font-bold mb-2">
                                {passed ? 'Xuất sắc! 🎉' : 'Cố gắng thêm! 💪'}
                            </h2>
                            <p className="text-gray-600">
                                Bạn đạt {score}/{questions.length} câu đúng ({percentage}%)
                            </p>
                        </div>

                        {/* Review answers */}
                        <div className="space-y-4 mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Chi tiết câu trả lời:</h3>
                            {userAnswers.map((answer, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-2 ${
                                    answer.isCorrect 
                                        ? 'border-green-200 bg-green-50' 
                                        : 'border-red-200 bg-red-50'
                                }`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-bold text-gray-700">Câu {idx + 1}:</span>
                                        {answer.isCorrect ? (
                                            <Check className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <X className="w-5 h-5 text-red-600" />
                                        )}
                                    </div>
                                    <p className="text-gray-800 mb-2">{renderBoldText(answer.question)}</p>
                                    {answer.context && (
                                        <p className="text-gray-600 text-sm mb-2 italic">{renderBoldText(answer.context)}</p>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-sm">
                                            <span className="font-semibold">Câu trả lời của bạn: </span>
                                            <span className={answer.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                {answer.selectedAnswer}
                                            </span>
                                        </p>
                                        {!answer.isCorrect && (
                                            <p className="text-sm">
                                                <span className="font-semibold">Đáp án đúng: </span>
                                                <span className="text-green-600">{answer.correctAnswer}</span>
                                            </p>
                                        )}
                                        {answer.explanation && (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold">Giải thích: </span>
                                                {answer.explanation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBackToMenu}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                            >
                                Làm bài khác
                            </button>
                            <button
                                onClick={onBack}
                                className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                            >
                                Về trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render question screen
    if (testMode && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        {/* Back button */}
                        <button
                            onClick={handleBackToMenu}
                            className="mb-4 flex items-center text-gray-600 hover:text-gray-800 transition"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
                            Quay lại menu
                        </button>

                        {/* Progress bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Câu {currentQuestionIndex + 1}/{questions.length}</span>
                                <span>Điểm: {score}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Question */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                                {renderBoldText(currentQuestion.question)}
                            </h3>
                            {currentQuestion.context && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                    <p className="text-gray-800 text-lg">{renderBoldText(currentQuestion.context)}</p>
                                </div>
                            )}
                        </div>

                        {/* Options */}
                        <div className="space-y-3 mb-6">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = selectedAnswer === option;
                                const isCorrect = option === currentQuestion.correctAnswer;
                                const showCorrect = isAnswered && isCorrect;
                                const showWrong = isAnswered && isSelected && !isCorrect;
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(option)}
                                        disabled={isAnswered}
                                        className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                                            showCorrect 
                                                ? 'bg-green-100 border-2 border-green-500 text-green-800'
                                                : showWrong
                                                ? 'bg-red-100 border-2 border-red-500 text-red-800'
                                                : isSelected
                                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                                : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                        } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{option}</span>
                                            {showCorrect && <Check className="w-5 h-5" />}
                                            {showWrong && <X className="w-5 h-5" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {isAnswered && (
                            <div className={`p-4 rounded-xl mb-6 ${
                                selectedAnswer === currentQuestion.correctAnswer
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-red-50 border border-red-200'
                            }`}>
                                <p className="text-sm font-semibold mb-1">
                                    {selectedAnswer === currentQuestion.correctAnswer ? '✓ Chính xác!' : '✗ Chưa đúng'}
                                </p>
                                <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
                            </div>
                        )}

                        {/* Next button */}
                        <button
                            onClick={handleNextQuestion}
                            disabled={!isAnswered}
                            className={`w-full py-3 rounded-xl font-bold transition ${
                                isAnswered
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render config screen
    if (showConfig) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Cấu hình bài kiểm tra</h2>
                            <button onClick={handleBackToMenu} className="text-gray-600 hover:text-gray-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* JLPT Level Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Chọn cấp độ JLPT:
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`py-2 px-4 rounded-xl font-bold transition ${
                                            selectedLevel === level
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {level === 'all' ? 'Tất cả' : level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question Count Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Số lượng câu hỏi: <span className="text-indigo-600">{questionCount}</span>
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>5</span>
                                <span>25</span>
                                <span>50</span>
                            </div>
                        </div>

                        {/* Start button */}
                        <button
                            onClick={handleStartTest}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition text-lg"
                        >
                            Bắt đầu kiểm tra
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render menu screen (initial)
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                            <FileCheck className="w-8 h-8 mr-3 text-indigo-600" />
                            Luyện Thi JLPT
                        </h1>
                        <button onClick={onBack} className="text-gray-600 hover:text-gray-800">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <p className="text-gray-600 mb-8 text-center">
                        Chọn dạng bài tập bạn muốn luyện tập
                    </p>

                    {/* Kanji Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <Languages className="w-6 h-6 mr-2 text-blue-600" />
                            Kanji
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleShowConfig('kanji', 1)}
                                className="p-6 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 1: Kanji → Hiragana</h3>
                                    <p className="text-blue-100 text-sm">Nhìn Kanji, chọn cách đọc đúng</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('kanji', 2)}
                                className="p-6 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 2: Hiragana → Kanji</h3>
                                    <p className="text-cyan-100 text-sm">Nhìn Hiragana, chọn Kanji đúng</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Vocab Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <BookOpen className="w-6 h-6 mr-2 text-green-600" />
                            Từ vựng
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleShowConfig('vocab', 3)}
                                className="p-6 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 3: Điền từ vào câu</h3>
                                    <p className="text-green-100 text-sm">Chọn từ phù hợp với ngữ cảnh</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('vocab', 4)}
                                className="p-6 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 4: Từ đồng nghĩa</h3>
                                    <p className="text-emerald-100 text-sm">Tìm từ có nghĩa tương đồng</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Grammar Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                            <Wrench className="w-6 h-6 mr-2 text-purple-600" />
                            Ngữ pháp
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                disabled
                                className="p-6 bg-gray-200 text-gray-500 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 6: Chọn ngữ pháp</h3>
                                    <p className="text-gray-400 text-sm">Đang phát triển...</p>
                                </div>
                            </button>
                            <button
                                disabled
                                className="p-6 bg-gray-200 text-gray-500 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 7: Sắp xếp câu</h3>
                                    <p className="text-gray-400 text-sm">Đang phát triển...</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;