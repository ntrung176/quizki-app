import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, updateDoc, serverTimestamp, deleteDoc, increment, getDoc, writeBatch } from 'firebase/firestore';
import { Loader2, Plus, Repeat2, Home, CheckCircle, XCircle, Volume2, Send, BookOpen, Clock, HeartHandshake, List, Calendar, Trash2, Mic, FileText, MessageSquare, HelpCircle, Upload, Wand2, BarChart3, Users, PieChart as PieChartIcon, Target, Save, Edit, Zap, Eye, EyeOff, AlertTriangle, Check, VolumeX, Image as ImageIcon, X, Music, FileAudio, Tag, Sparkles, Filter, ArrowDown, ArrowUp, GraduationCap, Search, Languages, RefreshCw, Settings, ChevronRight, Wrench, LayoutGrid, Flame, TrendingUp, Lightbulb, Brain, Ear, Keyboard, MousePointerClick, Layers, RotateCw } from 'lucide-react';
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
const getLevelTarget = (levelValue) => {
    const level = JLPT_LEVELS.find(l => l.value === levelValue);
    return level ? level.target : 2000;
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
    const furiganaMatch = text.match(/（([^）]+)）/); 
    if (furiganaMatch && furiganaMatch[1]) {
        return furiganaMatch[1];
    }
    return text.replace(/（[^）]*）/g, '').trim(); 
};

const getWordForMasking = (text) => {
    if (!text) return '';
    const mainWord = text.split('（')[0].trim();
    if (mainWord) {
        return mainWord;
    }
    const furiganaMatch = text.match(/（([^）]+)）/); 
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

    console.log("Using Browser TTS for:", cleanText);
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
    const [reviewStyle, setReviewStyle] = useState('typing'); // 'typing' | 'flashcard'
    const [allCards, setAllCards] = useState([]);
    const [reviewCards, setReviewCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState('');
    const [editingCard, setEditingCard] = useState(null);

    const [profile, setProfile] = useState(null); 
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [dailyActivityLogs, setDailyActivityLogs] = useState([]); 

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

    useEffect(() => {
        if (!db || !auth) return;
        const setupAuth = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error("Lỗi xác thực Firebase:", e);
            }
        };
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setUserId(user.uid);
            else setUserId(null);
            setAuthReady(true);
        });
        setupAuth();
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authReady || !userId || !settingsDocPath) {
            setIsProfileLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, settingsDocPath), (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data());
            } else {
                setProfile(null); 
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

    // MANUAL FIX INCONSISTENT DATA
    const handleFixInconsistentData = async () => {
        if (!vocabCollectionPath || allCards.length === 0) return;
        
        setIsLoading(true);
        setNotification("Đang kiểm tra và sửa lỗi dữ liệu...");
        const now = new Date();
        const cardsToFix = [];

        allCards.forEach(card => {
             const checkFix = (prefix) => {
                const intervalKey = `intervalIndex_${prefix}`;
                const nextReviewKey = `nextReview_${prefix}`;
                const interval = card[intervalKey];
                const nextReview = card[nextReviewKey];
                
                // Condition: Interval is -1 (New/Ready) AND NextReview is more than 48 hours in the future.
                if (interval === -1 && nextReview > new Date(now.getTime() + 1000 * 60 * 60 * 48)) {
                    const diffTime = nextReview - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let newIndex = 0;
                    if (diffDays >= 90) newIndex = 4;
                    else if (diffDays >= 30) newIndex = 3;
                    else if (diffDays >= 7) newIndex = 2;
                    else if (diffDays >= 3) newIndex = 1;
                    else newIndex = 0; 

                    return newIndex;
                }
                return null;
            };

            const fixedBack = checkFix('back');
            const fixedSynonym = checkFix('synonym');
            const fixedExample = checkFix('example');

            if (fixedBack !== null || fixedSynonym !== null || fixedExample !== null) {
                const updatePayload = {};
                if (fixedBack !== null) updatePayload.intervalIndex_back = fixedBack;
                if (fixedSynonym !== null) updatePayload.intervalIndex_synonym = fixedSynonym;
                if (fixedExample !== null) updatePayload.intervalIndex_example = fixedExample;
                cardsToFix.push({ id: card.id, ...updatePayload });
            }
        });

        if (cardsToFix.length > 0) {
            const commitBatches = async () => {
                const chunkSize = 400; 
                let fixedCount = 0;
                for (let i = 0; i < cardsToFix.length; i += chunkSize) {
                    const chunk = cardsToFix.slice(i, i + chunkSize);
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const { id, ...data } = item;
                        const docRef = doc(db, vocabCollectionPath, id);
                        batch.update(docRef, data);
                    });
                    try {
                        await batch.commit();
                        fixedCount += chunk.length;
                    } catch (e) {
                        console.error("Auto-fix batch failed:", e);
                    }
                }
                setNotification(`Đã sửa lỗi ${fixedCount} thẻ.`);
                setIsLoading(false);
            };
            commitBatches();
        } else {
             setNotification("Dữ liệu đã ổn định, không tìm thấy lỗi.");
             setIsLoading(false);
        }
    };


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

        // Helper: Check eligibility for Flashcard mode (Level 3+ / Index >= 2)
        const isEligible = (card, type) => {
            if (reviewStyle === 'typing') return true;
            // Flashcard mode requires SRS Level 3+ (Index >= 2)
            const index = card[`intervalIndex_${type}`];
            return typeof index === 'number' && index >= 2;
        };
        
        const dueBack = allCards.filter(c => c.nextReview_back <= today && isEligible(c, 'back'));
        const dueSynonym = allCards.filter(c => 
            c.synonym && c.synonym.trim() !== '' && c.nextReview_synonym <= today && isEligible(c, 'synonym')
        );
        const dueExample = allCards.filter(c => 
            c.example && c.example.trim() !== '' && c.nextReview_example <= today && isEligible(c, 'example')
        );
        
        const dueMixedSet = new Set([
            ...dueBack.map(c => c.id),
            ...dueSynonym.map(c => c.id),
            ...dueExample.map(c => c.id)
        ]);

        return { 
            back: dueBack.length, 
            synonym: dueSynonym.length, 
            example: dueExample.length,
            mixed: dueMixedSet.size 
        };
    }, [allCards, reviewStyle]);


    const prepareReviewCards = useCallback((mode = 'back') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dueCards = [];

        if (mode === 'mixed') {
            const dueBackCards = allCards
                .filter(card => card.nextReview_back <= today)
                .map(card => ({ ...card, reviewType: 'back' })); 
            
            const dueSynonymCards = allCards
                .filter(card => card.synonym && card.synonym.trim() !== '' && card.nextReview_synonym <= today)
                .map(card => ({ ...card, reviewType: 'synonym' })); 
            
            const dueExampleCards = allCards
                .filter(card => card.example && card.example.trim() !== '' && card.nextReview_example <= today)
                .map(card => ({ ...card, reviewType: 'example' })); 
            
            dueCards = shuffleArray([...dueBackCards, ...dueSynonymCards, ...dueExampleCards]);

        } else if (mode === 'back') {
            dueCards = allCards
                .filter(card => card.nextReview_back <= today);
        } else if (mode === 'synonym') {
            dueCards = allCards
                .filter(card => card.synonym && card.synonym.trim() !== '' && card.nextReview_synonym <= today);
        } else if (mode === 'example') {
            dueCards = allCards
                .filter(card => card.example && card.example.trim() !== '' && card.nextReview_example <= today);
        }
        
        // --- NEW FEATURE: Flashcard Mode Restriction ---
        if (reviewStyle === 'flashcard') {
            const eligibleCards = dueCards.filter(card => {
                const currentType = card.reviewType || mode;
                let currentIndex = -1;
                
                if (currentType === 'back') currentIndex = card.intervalIndex_back;
                else if (currentType === 'synonym') currentIndex = card.intervalIndex_synonym;
                else if (currentType === 'example') currentIndex = card.intervalIndex_example;

                // Rule: Only SRS Index 2, 3, 4 (Level 3, 4, 5) allowed for Flashcard
                // Index 2 means finished 1-day and 3-day cycle.
                return currentIndex >= 2; 
            });

            if (eligibleCards.length === 0 && dueCards.length > 0) {
                 setNotification(`⚠️ Bạn có ${dueCards.length} thẻ cần ôn, nhưng chưa đủ cấp độ (Level 3+) cho chế độ Lật thẻ. Hãy dùng Tự luận!`);
                 return;
            }
            dueCards = eligibleCards;
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
    }, [allCards, reviewStyle]);


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

        let prefix = 'back'; 
        if (cardReviewType === 'synonym') prefix = 'synonym';
        else if (cardReviewType === 'example') prefix = 'example';

        const intervalKey = `intervalIndex_${prefix}`;
        const streakKey = `correctStreak_${prefix}`;
        const reviewKey = `nextReview_${prefix}`;
        
        let currentInterval = typeof cardData[intervalKey] === 'number' ? cardData[intervalKey] : -1;
        if (currentInterval === -999) currentInterval = -1;
        
        let currentStreak = typeof cardData[streakKey] === 'number' ? cardData[streakKey] : 0;
        
        let newIndex = currentInterval;
        let newStreak = currentStreak;
        let nextDate = getNextReviewDate(-1);

        if (isCorrect) {
            const isNewCard = currentInterval === -1;
            const requiredStreak = 1; 
            newStreak += 1;
            if (newStreak >= requiredStreak) {
                newIndex = (currentInterval === -1) ? 0 : currentInterval + 1;
                newStreak = 0; 
                newIndex = Math.min(newIndex, SRS_INTERVALS.length - 1);
                nextDate = getNextReviewDate(newIndex);
            } else {
                newIndex = currentInterval; 
                nextDate = getNextReviewDate(-1); 
            }
        } else {
            if (currentInterval === -1) {
                newIndex = -1;
                newStreak = 0;
            } else {
                newIndex = currentInterval; 
                newStreak = 0; 
            }
            nextDate = getNextReviewDate(-1); 
        }
        
        const updateData = {
            [intervalKey]: newIndex,
            [streakKey]: newStreak,
            [reviewKey]: nextDate,
            lastReviewed: serverTimestamp(),
        };
        try {
            await updateDoc(cardRef, updateData);
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
    
    // --- FEATURE: NORMALIZE DATA ---
    const handleNormalizeData = async () => {
        if (!vocabCollectionPath || allCards.length === 0) return;
        
        setIsLoading(true);
        setNotification(`Đang chuẩn hoá ${allCards.length} thẻ...`);
        
        let count = 0;
        const batchSize = 400;
        const regexBracket = /\s*[\[\(](.*?)[\]\)]$/; // Match [...] or (...) at end of string

        // Helper: Làm sạch văn bản Hán Việt (loại bỏ "Hán Việt:", "HV:", v.v.)
        const cleanSinoText = (text) => {
            if (!text) return '';
            return text
                .replace(/^(Hán Việt|HV|H\.V|Han Viet|H\.Việt)\s*[:\.-]?\s*/gi, '') // Xóa tiền tố
                .replace(/^[:\.-]\s*/, '') // Xóa dấu câu đầu dòng nếu còn sót
                .trim()
                .toUpperCase();
        };

        const chunks = [];
        for (let i = 0; i < allCards.length; i += batchSize) {
            chunks.push(allCards.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            let hasUpdate = false;

            chunk.forEach(card => {
                let updates = {};

                // 1. Normalize Back (Tách content -> sinoVietnamese & In hoa & Xóa tiền tố thừa)
                if (card.back) {
                    const matchBack = card.back.match(regexBracket);
                    if (matchBack) {
                        const content = matchBack[1]; // Nội dung trong ngoặc
                        
                        updates.sinoVietnamese = cleanSinoText(content); 
                        updates.back = card.back.replace(regexBracket, '').trim();
                    }
                }

                // 2. Normalize Synonym (Tách content -> synonymSinoVietnamese & In hoa & Xóa tiền tố thừa)
                if (card.synonym) {
                    const matchSyn = card.synonym.match(regexBracket);
                    if (matchSyn) {
                        const content = matchSyn[1]; // Nội dung trong ngoặc
                        
                        updates.synonymSinoVietnamese = cleanSinoText(content);
                        updates.synonym = card.synonym.replace(regexBracket, '').trim();
                    }
                }

                if (Object.keys(updates).length > 0) {
                    const ref = doc(db, vocabCollectionPath, card.id);
                    batch.update(ref, updates);
                    hasUpdate = true;
                    count++;
                }
            });

            if (hasUpdate) {
                try {
                    await batch.commit();
                } catch (e) {
                    console.error("Lỗi commit batch normalization:", e);
                }
            }
        }
        
        setNotification(`Đã chuẩn hoá thành công ${count} thẻ!`);
        setIsLoading(false);
    };


    // --- GEMINI AI ASSISTANT ---
    const handleGeminiAssist = async (frontText, contextPos = '', contextLevel = '') => {
        if (!frontText) return null;

        const apiKey = import.meta.env.VITE_GEMINI_TTS_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        // Tạo ngữ cảnh bổ sung cho AI
        let contextInfo = "";
        if (contextPos) contextInfo += `, Từ loại: ${contextPos}`;
        if (contextLevel) contextInfo += `, Cấp độ: ${contextLevel}`;

        // Prompt Updated: Ưu tiên cụm từ ngắn, tìm 2 từ đồng nghĩa, sử dụng ngữ cảnh
        const systemPrompt = `Bạn là trợ lý từ điển Nhật-Việt. Người dùng đang tìm kiếm thông tin cho từ vựng: "${frontText}"${contextInfo}.
        Trả về JSON. QUAN TRỌNG: Sử dụng dấu ngoặc đơn full-width '（' và '）' cho phần phiên âm ở từ vựng chính.
        1. 'frontWithFurigana': Từ vựng + (Phiên âm Hiragana). Ví dụ: 食べる（たべる）.
        2. 'meaning': Nghĩa Việt ngắn gọn, sát với từ loại/cấp độ đã cho (nếu có).
        3. 'pos': Từ loại (noun, verb, adj_i, adj_na, adverb, conjunction, grammar, phrase, other).
        4. 'level': Cấp độ JLPT (N5, N4, N3, N2, N1).
        5. 'sinoVietnamese': Âm Hán Việt tương ứng (Ví dụ: 食 -> Thực).
        6. 'synonym': 2 từ đồng nghĩa thông dụng nhất (ngăn cách bằng dấu phẩy). Nếu không có, để trống.
        7. 'synonymSinoVietnamese': Âm Hán Việt của các từ đồng nghĩa đó (nếu có).
        8. 'example': Cụm từ thông dụng hoặc câu ví dụ ngắn gọn. BẮT BUỘC chứa từ vựng gốc. KHÔNG kèm phiên âm.
        9. 'exampleMeaning': Nghĩa tiếng Việt của ví dụ.
        10. 'nuance': Phân biệt ngắn gọn.`;

        const payload = {
            contents: [{ parts: [{ text: frontText }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        frontWithFurigana: { type: "STRING" }, 
                        meaning: { type: "STRING" },
                        pos: { type: "STRING", enum: ["noun", "verb", "adj_i", "adj_na", "adverb", "conjunction", "grammar", "phrase", "other"] },
                        level: { type: "STRING", enum: ["N5", "N4", "N3", "N2", "N1"] },
                        sinoVietnamese: { type: "STRING" }, 
                        synonym: { type: "STRING" },
                        synonymSinoVietnamese: { type: "STRING" },
                        example: { type: "STRING" },
                        exampleMeaning: { type: "STRING" },
                        nuance: { type: "STRING" } 
                    },
                    required: ["frontWithFurigana", "meaning", "pos", "level", "synonym", "example", "exampleMeaning", "nuance"] 
                }
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Lỗi API Gemini: ${response.statusText}`); 

            const result = await response.json();
            const candidate = result.candidates?.[0];
            
            if (candidate && candidate.content?.parts?.[0]?.text) {
                const jsonText = candidate.content.parts[0].text;
                const parsedJson = JSON.parse(jsonText);
                return parsedJson; 
            } else {
                throw new Error("Phản hồi JSON không hợp lệ");
            }
        } catch (e) {
            console.error("Lỗi Gemini Assist:", e);
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
        
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        let successCount = 0;

        for (const card of cardsWithKanji) {
             try {
                const text = card.front;
                const prompt = `Từ vựng tiếng Nhật: "${text}". Hãy cho biết Âm Hán Việt tương ứng của từ này. Chỉ trả về duy nhất từ Hán Việt. Nếu là Katakana hoặc không có Hán Việt rõ ràng, hãy trả về rỗng.`;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    let sino = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    sino = sino.trim();
                    
                    if (sino && sino.toLowerCase() !== 'null' && sino.toLowerCase() !== 'none') {
                        const cardRef = doc(db, vocabCollectionPath, card.id);
                        await updateDoc(cardRef, { sinoVietnamese: sino });
                        successCount++;
                    }
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
                    lastUpdated: serverTimestamp() 
                };
                await setDoc(statsDocRef, publicData, { merge: true }); 
            } catch (e) {
                console.error("Lỗi cập nhật public stats:", e);
            }
        };

        updatePublicStats();
        
    }, [memoryStats, allCards.length, profile, userId, authReady, publicStatsCollectionPath]); 


    if (isLoading || isProfileLoading) { 
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
            </div>
        );
    }

    if (!profile) {
        return <ProfileScreen onSave={handleSaveProfile} />;
    }
    
    if (!profile.hasSeenHelp) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <Header currentView="HELP" setView={setView} />
                <main className="flex-grow p-4 md:p-8 flex justify-center items-start pt-20">
                    <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl p-6 md:p-10 border border-gray-100">
                        <HelpScreen 
                            isFirstTime={true} 
                            onConfirmFirstTime={handleConfirmHelp}
                            onBack={() => {}} 
                        />
                    </div>
                </main>
            </div>
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
            case 'REVIEW':
                if (reviewCards.length === 0) {
                    return <ReviewCompleteScreen onBack={() => setView('HOME')} />;
                }
                return <ReviewScreen 
                    cards={reviewCards} 
                    reviewMode={reviewMode}
                    reviewStyle={reviewStyle} // Pass reviewStyle prop
                    onUpdateCard={handleUpdateCard} 
                    onCompleteReview={() => {
                        setReviewCards([]);
                        setView('HOME'); 
                    }} 
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
                    onNormalizeData={handleNormalizeData}
                    onFixData={handleFixInconsistentData}
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
                    onBack={() => setView('HOME')} 
                />;
            case 'HOME':
            default:
                return <HomeScreen 
                    displayName={profile.displayName} 
                    dueCounts={dueCounts} 
                    totalCards={allCards.length}
                    reviewStyle={reviewStyle} // Pass reviewStyle prop
                    setReviewStyle={setReviewStyle} // Pass setter
                    onStartReview={prepareReviewCards} 
                    onNavigate={setView}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-800">
            <Header currentView={view} setView={setView} />
            <main className="flex-grow p-4 md:p-8 flex justify-center items-start pt-24 pb-10">
                <div className="w-full max-w-5xl">
                    {/* Modern Container for Main Content */}
                    <div className="bg-white/80 backdrop-blur-sm shadow-xl shadow-indigo-100/50 rounded-3xl border border-white/50 p-6 md:p-8 transition-all duration-300">
                        {renderContent()}
                        
                        {notification && (view === 'HOME' || view === 'STATS' || view === 'ADD_CARD' || view === 'LIST') && (
                            <div className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in flex items-center justify-center space-x-2
                                ${notification.includes('Lỗi') || notification.includes('có trong') 
                                    ? 'bg-red-50 text-red-600 border border-red-100' 
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                {notification.includes('Lỗi') ? <AlertTriangle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                                <span>{notification}</span>
                            </div>
                        )}
                        
                        <div className="mt-8 text-xs text-gray-400 text-center border-t border-gray-100 pt-4 flex flex-col items-center gap-1">
                            <span>QuizKi V1.6.3 (Enhanced TTS & Fallback)</span>
                            <span className="font-mono bg-gray-50 px-2 py-1 rounded text-[10px] text-gray-300">UID: {userId?.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>

    );
};

// --- Component Phụ Trợ ---

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

const Header = ({ currentView, setView }) => (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 h-16 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
            <div 
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => setView('HOME')}
            >
                <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    QuizKi
                </span>
            </div>
            
            <nav className="flex items-center space-x-1 sm:space-x-2">
                {[
                    { id: 'HOME', icon: Home, label: 'Home' },
                    { id: 'LIST', icon: List, label: 'List' },
                    { id: 'STATS', icon: BarChart3, label: 'Stats' },
                    { id: 'FRIENDS', icon: Users, label: 'Rank' },
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setView(item.id)} 
                        className={`p-2.5 rounded-xl transition-all duration-200 relative
                            ${currentView === item.id 
                                ? 'text-indigo-600 bg-indigo-50' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        title={item.label}
                    >
                        <item.icon className="w-5 h-5" strokeWidth={currentView === item.id ? 2.5 : 2} />
                        {currentView === item.id && (
                            <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                ))}
                
                <div className="h-6 w-px bg-gray-200 mx-2" />
                
                <button onClick={() => setView('ADD_CARD')} className={`p-2.5 rounded-xl transition-all ${currentView === 'ADD_CARD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
            </nav>
        </div>
    </header>
);

const MemoryStatCard = ({ title, count, icon: Icon, color, subtext }) => (
    <div className={`p-5 rounded-2xl border transition-all hover:shadow-md ${color.bg} ${color.border} group h-full`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-3xl font-black text-gray-800">{count}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-1">{title}</p>
                {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color.iconBg} group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${color.text}`} />
            </div>
        </div>
    </div>
);

const HomeScreen = ({ displayName, dueCounts, totalCards, onStartReview, onNavigate, reviewStyle, setReviewStyle }) => {
    const ActionCard = ({ onClick, icon: Icon, title, count, gradient, disabled = false, description }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative overflow-hidden group flex flex-col items-start justify-between p-6 h-40 rounded-3xl shadow-md transition-all duration-300 w-full text-left
                        ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : `bg-gradient-to-br ${gradient} hover:shadow-xl hover:-translate-y-1`}`}
        >
            <div className="z-10 w-full">
                <div className="flex justify-between items-start w-full mb-2">
                    <div className={`p-2 rounded-lg bg-white/20 backdrop-blur-sm`}>
                        <Icon className={`w-6 h-6 text-white`} strokeWidth={2.5} />
                    </div>
                     {typeof count !== 'undefined' && count > 0 && (
                        <span className="bg-white/25 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full">
                            {count} cần ôn
                        </span>
                    )}
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-indigo-50 text-xs font-medium mt-1 opacity-90">{description}</p>
            </div>
            
            {/* Background Decoration */}
            <Icon className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
        </button>
    );

    return (
        <div className="space-y-10">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pb-2 border-b border-gray-100">
                <div>
                    <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">
                        Chào, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{displayName}</span>! 👋
                    </h2>
                    <p className="text-gray-500 mt-2 font-medium">Bạn đã sẵn sàng chinh phục mục tiêu hôm nay chưa?</p>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-indigo-700">{totalCards} từ vựng trong kho</span>
                </div>
            </div>
            
            {/* Review Section */}
            <div>
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-amber-500" />
                        Chế độ Ôn tập
                    </h3>

                    {/* NEW: Review Style Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setReviewStyle('typing')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                reviewStyle === 'typing' 
                                ? 'bg-white text-indigo-700 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Keyboard className="w-4 h-4 mr-2" />
                            Tự luận
                        </button>
                        <button 
                            onClick={() => setReviewStyle('flashcard')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                reviewStyle === 'flashcard' 
                                ? 'bg-white text-rose-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            Lật thẻ
                        </button>
                    </div>
                </div>

                {reviewStyle === 'flashcard' && (
                     <div className="mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start text-xs text-rose-700">
                         <Target className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                         <span><b>Lưu ý:</b> Chế độ Lật thẻ chỉ áp dụng cho các thẻ đã đạt <b>Cấp độ 3 trở lên</b> (đã nhớ qua chu kỳ 7 ngày). Các thẻ mới hoặc chưa nhớ kỹ sẽ không xuất hiện trong chế độ này.</span>
                     </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard
                        onClick={() => onStartReview('mixed')}
                        icon={Zap}
                        title="Hỗn hợp"
                        description="Thử thách toàn diện"
                        count={dueCounts.mixed}
                        gradient="from-rose-500 to-orange-500"
                        disabled={dueCounts.mixed === 0}
                    />
                    <ActionCard
                        onClick={() => onStartReview('back')}
                        icon={Repeat2}
                        title="Ý nghĩa"
                        description="Nhớ nghĩa tiếng Nhật" 
                        count={dueCounts.back}
                        gradient="from-emerald-500 to-teal-500"
                        disabled={dueCounts.back === 0}
                    />
                    <ActionCard
                        onClick={() => onStartReview('synonym')}
                        icon={MessageSquare}
                        title="Đồng nghĩa"
                        description="Mở rộng vốn từ"
                        count={dueCounts.synonym}
                        gradient="from-blue-500 to-indigo-500"
                        disabled={dueCounts.synonym === 0}
                    />
                    <ActionCard
                        onClick={() => onStartReview('example')}
                        icon={FileText}
                        title="Ngữ cảnh"
                        description="Điền từ vào câu"
                        count={dueCounts.example}
                        gradient="from-violet-500 to-purple-500"
                        disabled={dueCounts.example === 0}
                    />
                </div>
            </div>
            
            {/* Management Section */}
            <div className="pt-2">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-500" />
                    Quản lý & Tiện ích
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <button
                        onClick={() => onNavigate('ADD_CARD')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                    >
                        <div className="bg-indigo-50 p-2 rounded-lg mr-3 group-hover:bg-indigo-100 transition-colors">
                            <Plus className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-gray-700 group-hover:text-indigo-700">Thêm từ mới</span>
                    </button>

                    <button
                        onClick={() => onNavigate('IMPORT')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
                    >
                        <div className="bg-teal-50 p-2 rounded-lg mr-3 group-hover:bg-teal-100 transition-colors">
                            <Upload className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-semibold text-gray-700 group-hover:text-teal-700">Nhập File</span>
                    </button>

                    <button
                        onClick={() => onNavigate('LIST')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="bg-blue-50 p-2 rounded-lg mr-3 group-hover:bg-blue-100 transition-colors">
                            <List className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-gray-700 group-hover:text-blue-700">Xem Danh sách</span>
                    </button>

                    <button
                        onClick={() => onNavigate('HELP')}
                        className="flex items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
                    >
                        <div className="bg-orange-50 p-2 rounded-lg mr-3 group-hover:bg-orange-100 transition-colors">
                            <HelpCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="font-semibold text-gray-700 group-hover:text-orange-700">Hướng dẫn</span>
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
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Thêm Từ Vựng Mới</h2>
                    <p className="text-gray-500 text-sm">Xây dựng kho tàng kiến thức của bạn</p>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl">
                    <Plus className="w-6 h-6 text-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột Trái: Thông tin chính */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-semibold text-gray-700">
                                Từ vựng (Nhật): <span className="text-rose-500">*</span>
                            </label>
                            
                        </div>
                        
                        <div className="flex gap-2">
                            <input id="front" type="text" ref={frontInputRef} value={front} onChange={(e) => setFront(e.target.value)} onKeyDown={handleKeyDown} required
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-lg" placeholder="Ví dụ: 食べる（たべる）"/>
                            
                            <button 
                                type="button" 
                                onClick={handleAiAssist} 
                                disabled={isAiLoading}
                                className="flex items-center px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all font-bold whitespace-nowrap"
                                title="Tự động điền thông tin bằng AI"
                            >
                                {isAiLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                                AI Hỗ trợ
                            </button>
                        </div>
                        
                        {/* MOVED: Classification Section (Level & POS) to below Vocabulary */}
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
                                
                                {/* POS Dropdown */}
                                <select value={pos} onChange={(e) => setPos(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-indigo-500 text-sm font-medium text-gray-700">
                                    <option value="">-- Chọn Từ Loại --</option>
                                    {Object.entries(POS_TYPES).map(([key, value]) => (<option key={key} value={key}>{value.label}</option>))}
                                </select>
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ý nghĩa (Việt): <span className="text-rose-500">*</span>
                            </label>
                            <input id="back" type="text" value={back} onChange={(e) => setBack(e.target.value)} required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Ví dụ: Ăn"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Hán Việt</label>
                                <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500" placeholder="Thực"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Đồng nghĩa</label>
                                <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500" placeholder="食事する..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột Phải: Thông tin bổ sung */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ngữ cảnh & Ví dụ</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Câu ví dụ (Nhật)</label>
                            <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 text-sm" placeholder="私は毎日ご飯を食べる。" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nghĩa ví dụ (Việt)</label>
                            <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 text-sm" placeholder="Tôi ăn cơm mỗi ngày." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sắc thái / Ghi chú</label>
                            <textarea 
                                value={nuance} 
                                onChange={(e) => setNuance(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 text-sm" 
                                placeholder="Dùng trong văn viết..." 
                            />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
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
                <button type="button" onClick={() => handleSave('continue')} disabled={isSaving || isAiLoading || !front || !back}
                    className="flex-1 flex items-center justify-center px-6 py-4 text-base font-bold rounded-xl shadow-lg shadow-indigo-200 text-white bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Lưu & Thêm Tiếp
                </button>
                <button type="button" onClick={() => handleSave('back')} disabled={isSaving || isAiLoading || !front || !back}
                    className="flex-1 flex items-center justify-center px-6 py-4 text-base font-bold rounded-xl shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:-translate-y-1 transition-all disabled:opacity-50">
                    <Check className="w-5 h-5 mr-2" />
                    Lưu & Về Home
                </button>
                <button type="button" onClick={onBack}
                    className="px-6 py-4 text-base font-medium rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
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
                            <input type="text" ref={frontInputRef} value={front} onChange={(e) => setFront(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 font-medium text-lg"/>
                            <button type="button" onClick={handleAiAssist} className="px-3 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200">{isAiLoading ? <Loader2 className="animate-spin w-5 h-5"/> : "AI"}</button>
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
                        <input type="text" value={back} onChange={(e) => setBack(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500"/>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={sinoVietnamese} onChange={(e) => setSinoVietnamese(e.target.value)} placeholder="Hán Việt" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"/>
                            <input type="text" value={synonym} onChange={(e) => setSynonym(e.target.value)} placeholder="Đồng nghĩa" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"/>
                        </div>
                     </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <textarea value={example} onChange={(e) => setExample(e.target.value)} rows="2" placeholder="Ví dụ (Nhật)" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"/>
                        <textarea value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} rows="2" placeholder="Nghĩa ví dụ" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"/>
                        <textarea value={nuance} onChange={(e) => setNuance(e.target.value)} rows="3" placeholder="Ghi chú" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"/>
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
                 <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">Lưu Thay Đổi</button>
                 <button onClick={onBack} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Hủy</button>
             </div>
        </div>
    );
};

const SrsStatusCell = ({ intervalIndex, correctStreak, nextReview, hasData }) => {
    if (!hasData || intervalIndex === -999) return <td className="px-4 py-4 text-sm text-gray-300 italic">--</td>;
    const isDue = nextReview <= new Date().setHours(0,0,0,0);
    const progressColor = intervalIndex >= 3 ? 'bg-green-100 text-green-700 border-green-200' : intervalIndex >= 1 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200';
    
    return (
        <td className="px-4 py-4">
            <div className={`inline-flex flex-col px-3 py-1.5 rounded-lg border text-xs font-medium ${progressColor}`}>
                <span>{getSrsProgressText(intervalIndex)}</span>
                {isDue ? (
                    <span className="text-red-600 font-bold mt-0.5 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Ôn ngay</span>
                ) : (
                    <span className="opacity-70 mt-0.5">{nextReview.toLocaleDateString('vi-VN')}</span>
                )}
            </div>
        </td>
    );
};

const ListView = ({ allCards, onDeleteCard, onPlayAudio, onExport, onNavigateToEdit, onAutoClassifyBatch, onAutoSinoVietnameseBatch, onNormalizeData, onFixData }) => {
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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 pb-4 border-b border-gray-100">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Danh Sách Từ Vựng</h2>
                        <p className="text-sm text-gray-500">Quản lý {allCards.length} thẻ ghi nhớ của bạn</p>
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Xem dạng danh sách"
                        >
                            <List className="w-5 h-5"/>
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Xem dạng thẻ"
                        >
                            <LayoutGrid className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center justify-between">
                     {/* Search Bar */}
                     <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm từ vựng, ý nghĩa, Hán Việt..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm shadow-sm"
                        />
                     </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={onFixData} className="px-3 py-2 text-xs font-bold rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors flex items-center border border-orange-100">
                            <Wrench className="w-3.5 h-3.5 mr-1.5" /> Sửa lỗi
                        </button>
                        <button onClick={onNormalizeData} className="px-3 py-2 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Chuẩn hoá
                        </button>
                        {cardsMissingPos.length > 0 && (
                            <button onClick={() => onAutoClassifyBatch(cardsMissingPos)} className="px-3 py-2 text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors flex items-center">
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Auto-Tags ({cardsMissingPos.length})
                            </button>
                        )}
                        <button onClick={() => onExport(allCards)} className="px-3 py-2 text-xs font-bold rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors flex items-center">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sắp xếp</label>
                    <div className="relative">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                        </select>
                        <ArrowDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cấp độ</label>
                    <div className="relative">
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="all">Tất cả</option>
                            {JLPT_LEVELS.map(l => (<option key={l.value} value={l.value}>{l.label}</option>))}
                        </select>
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Từ loại</label>
                    <div className="relative">
                         <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-indigo-500 appearance-none">
                            <option value="all">Tất cả</option>
                            {Object.entries(POS_TYPES).map(([k,v]) => (<option key={k} value={k}>{v.label}</option>))}
                        </select>
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* CONTENT AREA: LIST or GRID */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {["Hình", "Từ vựng", "Tags", "Âm thanh", "Nghĩa", "Đồng nghĩa", "Trạng thái SRS", ""].map((h, i) => (
                                        <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {filteredCards.map((card) => (
                                    <tr key={card.id} className="hover:bg-indigo-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                {card.imageBase64 ? <img src={card.imageBase64} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-4 h-4"/></div>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-800 text-base">{card.front}</div>
                                            {card.sinoVietnamese && <div className="text-[10px] font-medium text-pink-500 bg-pink-50 inline-block px-1.5 rounded mt-1">{card.sinoVietnamese}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                {card.level && <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getLevelColor(card.level)}`}>{card.level}</span>}
                                                {card.pos ? <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getPosColor(card.pos)}`}>{getPosLabel(card.pos)}</span> : <span className="text-xs text-gray-300">--</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => onPlayAudio(card.audioBase64, card.front)} className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100"><Volume2 className="w-4 h-4"/></button>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{card.back}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{card.synonym || '-'}</td>
                                        <SrsStatusCell intervalIndex={card.intervalIndex_back} correctStreak={card.correctStreak_back} nextReview={card.nextReview_back} hasData={true}/>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onNavigateToEdit(card)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"><Edit className="w-4 h-4"/></button>
                                                <button onClick={() => onDeleteCard(card.id, card.front)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredCards.map((card) => {
                        const levelColor = getLevelColor(card.level);
                        const isDue = card.nextReview_back <= new Date().setHours(0,0,0,0);
                        
                        return (
                            <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative group">
                                {/* Top colored bar */}
                                <div className={`h-2 w-full ${levelColor.replace('bg-', 'bg-gradient-to-r from-').replace(' text-', ' to-white ')}`}></div>
                                
                                <div className="p-5 flex-grow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            {card.level ? (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border self-start ${levelColor}`}>
                                                    {card.level}
                                                </span>
                                            ) : <span className="h-4"></span>}
                                        </div>
                                        {isDue && (
                                            <span className="text-red-500 bg-red-50 p-1 rounded-full" title="Cần ôn tập">
                                                <Clock className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{card.front}</h3>
                                    {card.sinoVietnamese && <p className="text-xs font-medium text-pink-500 mb-2">{card.sinoVietnamese}</p>}
                                    
                                    <div className="h-px bg-gray-100 w-full my-2"></div>
                                    
                                    <p className="text-sm text-gray-600 line-clamp-2" title={card.back}>{card.back}</p>
                                </div>
                                
                                {/* Bottom Action Bar */}
                                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
                                     <button onClick={() => onPlayAudio(card.audioBase64, card.front)} className="text-indigo-500 hover:bg-indigo-100 p-1.5 rounded-lg">
                                        <Volume2 className="w-4 h-4"/>
                                     </button>
                                     <div className="flex gap-2">
                                        <button onClick={() => onNavigateToEdit(card)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded-lg">
                                            <Edit className="w-4 h-4"/>
                                        </button>
                                        <button onClick={() => onDeleteCard(card.id, card.front)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                     </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {filteredCards.length === 0 && <div className="p-10 text-center text-gray-400">Không tìm thấy từ vựng nào.</div>}
        </div>
    );
};


const ReviewScreen = ({ cards, reviewMode, reviewStyle, onUpdateCard, onCompleteReview }) => {
    // ... Logic giữ nguyên
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // V1.6.2 Fix: Thêm biến khoá để ngăn submit 2 lần
    const inputRef = useRef(null);
    
    // Auto focus logic conditional based on style
    useEffect(() => { 
        if (reviewStyle === 'typing' && inputRef.current && !isRevealed) {
            inputRef.current.focus(); 
        }
    }, [currentIndex, isRevealed, reviewStyle]);

    useEffect(() => { if (cards.length > 0 && currentIndex >= cards.length) setCurrentIndex(cards.length - 1); }, [cards, currentIndex]);
    if (cards.length === 0 || currentIndex >= cards.length) { onCompleteReview(); return null; }

    const currentCard = cards[currentIndex];
    const cardReviewType = currentCard.reviewType || reviewMode; 
    
    // Always show full text now
    const displayFront = currentCard.front; 
    const normalizeAnswer = (text) => text.replace(/（[^）]*）/g, '').replace(/\s+/g, '').toLowerCase();
    
    const getPrompt = () => {
        switch (cardReviewType) { 
            case 'synonym': return { label: 'Từ đồng nghĩa', text: currentCard.synonym, image: currentCard.imageBase64, icon: MessageSquare, color: 'text-blue-600' };
            case 'example': 
                const wordToMask = getWordForMasking(currentCard.front);
                const maskRegex = new RegExp(wordToMask.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                return { label: 'Điền từ còn thiếu', text: currentCard.example.replace(maskRegex, '______'), meaning: currentCard.exampleMeaning || null, image: currentCard.imageBase64, icon: FileText, color: 'text-purple-600' };
            default: return { label: 'Ý nghĩa (Mặt sau)', text: currentCard.back, image: currentCard.imageBase64, icon: Repeat2, color: 'text-emerald-600' };
        }
    };
    const promptInfo = getPrompt();

    // UPDATE: Check answer logic to allow either Kanji OR Kana
    const checkAnswer = async () => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        const userAnswer = normalizeAnswer(inputValue);
        
        // Extract Kanji and Kana from format "Kanji（Kana）"
        // If no brackets, it assumes the whole string is the answer
        const rawFront = currentCard.front;
        const kanjiPart = rawFront.split('（')[0];
        const kanaPartMatch = rawFront.match(/（([^）]+)）/);
        const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

        const normalizedKanji = normalizeAnswer(kanjiPart);
        const normalizedKana = normalizeAnswer(kanaPart);
        
        // Correct if matches either Kanji part OR Kana part (if exists) OR the full string (legacy fallback)
        const isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizeAnswer(rawFront);
        
        if (isCorrect) {
            setIsProcessing(true); // V1.6.2 Fix: Khoá thao tác
            setFeedback('correct');
            setMessage(`Chính xác! ${displayFront}`);
            setIsRevealed(true); setIsLocked(false); 
            playAudio(currentCard.audioBase64, currentCard.front); // Fallback included
            await new Promise(resolve => setTimeout(resolve, 1000));
            await moveToNextCard(true); 
        } else {
            setFeedback('incorrect');
            const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
            setMessage(`Đáp án đúng: ${displayFront}${nuanceText}`);
            setIsRevealed(true); setIsLocked(true); 
            playAudio(currentCard.audioBase64, currentCard.front); // Fallback included
        }
    };

    // --- NEW: Handle Manual Flashcard grading ---
    const handleFlashcardGrade = async (isCorrect) => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        if (isCorrect) {
            setIsProcessing(true); // V1.6.2 Fix: Khoá thao tác
            setFeedback('correct');
            setMessage(`Tuyệt vời! ${displayFront}`);
            setIsRevealed(true); 
            playAudio(currentCard.audioBase64, currentCard.front); // Fallback included
            await new Promise(resolve => setTimeout(resolve, 800));
            await moveToNextCard(true);
        } else {
            setFeedback('incorrect');
            const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
            setMessage(`Đáp án đúng: ${displayFront}${nuanceText}`);
            setIsRevealed(true);
            playAudio(currentCard.audioBase64, currentCard.front); // Fallback included
            // User manually clicked "Sai", allow them to proceed immediately or review
        }
    };


    const moveToNextCard = async (isCorrect) => {
        await onUpdateCard(currentCard.id, isCorrect, cardReviewType); 
        const nextIndex = currentIndex + 1;
        if (nextIndex < cards.length) {
            setCurrentIndex(nextIndex); setInputValue(''); setIsRevealed(false); setIsLocked(false); setFeedback(null); setMessage('');
            setIsProcessing(false); // V1.6.2 Fix: Mở khoá cho thẻ tiếp theo
        } else {
            onCompleteReview();
        }
    };

    const handleNext = () => {
        if (isProcessing) return; // V1.6.2 Fix: Chặn nếu đang xử lý

        // Logic for typing mode retry or manual proceed
        if (reviewStyle === 'typing') {
            if (feedback === 'correct') { 
                setIsProcessing(true); // V1.6.2 Fix: Khoá
                moveToNextCard(true); 
            } else if (feedback === 'incorrect' && isLocked) {
                 // Re-check logic for unlocking
                const userAnswer = normalizeAnswer(inputValue);
                const rawFront = currentCard.front;
                const kanjiPart = rawFront.split('（')[0];
                const kanaPartMatch = rawFront.match(/（([^）]+)）/);
                const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

                const normalizedKanji = normalizeAnswer(kanjiPart);
                const normalizedKana = normalizeAnswer(kanaPart);

                const isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizeAnswer(rawFront);

                if (isCorrect) { 
                    setIsProcessing(true); // V1.6.2 Fix: Khoá
                    moveToNextCard(false); 
                } else { setMessage(`Hãy nhập lại: "${displayFront}"`); }
            }
        } else {
            // Flashcard mode manual proceed after wrong answer
             setIsProcessing(true); // V1.6.2 Fix: Khoá
             moveToNextCard(false);
        }
    }
    const progress = Math.round(((currentIndex) / cards.length) * 100);

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header & Progress */}
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                    <span className="flex items-center">
                        <Zap className="w-4 h-4 mr-1 text-amber-500"/> 
                        {reviewMode.toUpperCase()} - {reviewStyle === 'typing' ? 'Tự luận' : 'Lật thẻ'}
                    </span>
                    <span>{currentIndex + 1} / {cards.length}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="relative group perspective">
                 <div className="w-full bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-8 min-h-[320px] flex flex-col items-center justify-center text-center transition-all hover:shadow-2xl hover:shadow-indigo-200/50 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${reviewMode === 'mixed' ? 'bg-gradient-to-r from-rose-400 to-orange-400' : 'bg-gradient-to-r from-indigo-400 to-cyan-400'}`}></div>
                    
                    {/* Top Hints */}
                    <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
                        {currentCard.level && <span className={`text-[10px] px-2 py-1 rounded border font-bold ${getLevelColor(currentCard.level)}`}>{currentCard.level}</span>}
                        {currentCard.pos && <span className={`text-[10px] px-2 py-1 rounded border font-bold ${getPosColor(currentCard.pos)}`}>{getPosLabel(currentCard.pos)}</span>}
                    </div>

                    <div className="flex items-center gap-2 mb-6 opacity-80">
                         <promptInfo.icon className={`w-5 h-5 ${promptInfo.color}`}/>
                         <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">{promptInfo.label}</span>
                    </div>

                    {promptInfo.image && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                            <img src={promptInfo.image} alt="Hint" className="h-32 object-cover" />
                        </div>
                    )}

                    <h3 className="text-3xl md:text-4xl font-black text-gray-800 leading-tight mb-2">
                        {promptInfo.text}
                    </h3>
                    
                    {/* UPDATE: Hide SinoVietnamese in Synonym/Example Mode */}
                    {/* Only show SinoVietnamese if reviewMode is NOT 'synonym' or 'example' */}
                    {!['synonym', 'example'].includes(cardReviewType) && (currentCard.sinoVietnamese || currentCard.synonymSinoVietnamese) && (
                        <span className="text-sm font-semibold text-pink-500 bg-pink-50 px-3 py-1 rounded-full mt-2">
                            {reviewMode === 'synonym' ? currentCard.synonymSinoVietnamese : currentCard.sinoVietnamese}
                        </span>
                    )}

                    {promptInfo.meaning && <p className="text-gray-500 mt-4 italic text-sm border-t border-gray-100 pt-3 px-4">"{promptInfo.meaning}"</p>}
                 </div>
            </div>

            {/* Interaction Area */}
            <div className="space-y-4">
                
                {/* --- TYPING MODE UI --- */}
                {reviewStyle === 'typing' && (
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isRevealed ? handleNext() : checkAnswer(); }}}
                            disabled={feedback === 'correct'}
                            className={`w-full pl-6 pr-14 py-4 text-xl font-medium rounded-2xl border-2 transition-all outline-none shadow-sm
                                ${feedback === 'correct' 
                                    ? 'border-green-400 bg-green-50 text-green-800' 
                                    : feedback === 'incorrect' 
                                        ? 'border-red-400 bg-red-50 text-red-800' 
                                        : 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                            placeholder="Nhập từ vựng tiếng Nhật..."
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {!isRevealed && (
                                <button onClick={checkAnswer} disabled={!inputValue.trim()} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all">
                                    <Send className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- FLASHCARD MODE UI --- */}
                {reviewStyle === 'flashcard' && !isRevealed && (
                     <button 
                        onClick={() => setIsRevealed(true)}
                        className="w-full py-4 text-xl font-bold rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Eye className="w-6 h-6" /> Hiện Đáp Án
                    </button>
                )}


                {/* Feedback & Actions */}
                <div className={`transition-all duration-300 ease-out overflow-hidden ${isRevealed ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className={`p-4 rounded-xl border mb-4 flex items-start gap-3 ${feedback === 'correct' ? 'bg-green-50 border-green-200' : feedback === 'incorrect' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                        {reviewStyle === 'typing' && (
                            <div className={`p-1 rounded-full ${feedback === 'correct' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                {feedback === 'correct' ? <Check className="w-4 h-4" strokeWidth={3}/> : <X className="w-4 h-4" strokeWidth={3}/>}
                            </div>
                        )}
                        <div className="flex-1">
                             {/* Flashcard reveal message vs Typing feedback message */}
                             {reviewStyle === 'flashcard' && !feedback ? (
                                 <div className="text-center">
                                    <p className="text-lg font-bold text-gray-800 mb-1">{displayFront}</p>
                                    <p className="text-sm text-gray-500">{currentCard.nuance}</p>
                                 </div>
                             ) : (
                                <div>
                                    <p className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-800' : 'text-red-800'}`}>{message}</p>
                                    {feedback === 'incorrect' && reviewStyle === 'typing' && <p className="text-sm text-red-600 mt-1">Gõ lại từ đúng để tiếp tục</p>}
                                </div>
                             )}
                        </div>
                    </div>
                    
                    {/* TYPING MODE ACTIONS */}
                    {reviewStyle === 'typing' && (
                        <button
                            onClick={handleNext}
                            disabled={isProcessing || (feedback === 'incorrect' && normalizeAnswer(inputValue) !== normalizeAnswer(currentCard.front.split('（')[0]) && normalizeAnswer(inputValue) !== normalizeAnswer(currentCard.front.match(/（([^）]+)）/)?.[1] || ''))}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center
                                ${feedback === 'correct' 
                                    ? 'bg-green-500 text-white shadow-green-200 hover:bg-green-600' 
                                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none'}`}
                        >
                            {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                            <ChevronRight className="w-5 h-5 ml-2" strokeWidth={3}/>
                        </button>
                    )}

                    {/* FLASHCARD MODE ACTIONS */}
                    {reviewStyle === 'flashcard' && !feedback && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleFlashcardGrade(false)}
                                disabled={isProcessing}
                                className="flex-1 py-4 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-6 h-6"/> Quên / Sai
                            </button>
                            <button
                                onClick={() => handleFlashcardGrade(true)}
                                disabled={isProcessing}
                                className="flex-1 py-4 bg-green-100 text-green-700 font-bold rounded-xl hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-6 h-6"/> Nhớ / Đúng
                            </button>
                        </div>
                    )}
                    
                    {/* Flashcard Incorrect Proceed */}
                    {reviewStyle === 'flashcard' && feedback === 'incorrect' && (
                         <button
                            onClick={handleNext}
                            disabled={isProcessing}
                            className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center mt-2"
                        >
                            Tiếp tục <ChevronRight className="w-5 h-5 ml-2"/>
                        </button>
                    )}

                </div>
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
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [newGoal, setNewGoal] = useState(profile.dailyGoal);

    const handleSaveGoal = () => { onUpdateGoal(newGoal); setIsEditingGoal(false); };

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

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 pb-4 border-b">Thống Kê Chi Tiết</h2>
            
            {/* Top Row: Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg">
                     <div className="flex justify-between items-start mb-2"><Target className="w-5 h-5 text-indigo-200"/></div>
                     <div className="flex items-end gap-2">
                         {isEditingGoal ? <div className="flex items-center gap-2"><input type="number" value={newGoal} onChange={e=>setNewGoal(e.target.value)} className="w-16 px-1 py-0.5 text-gray-800 rounded text-lg"/><button onClick={handleSaveGoal}><Save className="w-5 h-5"/></button></div> 
                         : <div className="flex flex-col"><span className="text-3xl font-bold">{profile.dailyGoal}</span><span className="text-xs opacity-80">Mục tiêu/ngày</span><button onClick={()=>setIsEditingGoal(true)} className="absolute top-5 right-5 opacity-50 hover:opacity-100"><Edit className="w-4 h-4"/></button></div>}
                     </div>
                </div>

                <MemoryStatCard title="Trong Tuần" count={wordsAddedThisWeek} icon={TrendingUp} color={{bg:'bg-blue-50',border:'',text:'text-blue-600',iconBg:'bg-white'}} subtext="từ vựng mới" />
                <MemoryStatCard title="Chuỗi ngày" count={streak} icon={Flame} color={{bg:'bg-orange-50',border:'',text:'text-orange-600',iconBg:'bg-white'}} subtext="liên tục" />
                <MemoryStatCard title="Tổng số" count={totalCards} icon={List} color={{bg:'bg-gray-50',border:'',text:'text-gray-600',iconBg:'bg-white'}} />
            </div>

            {/* Middle Row: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart: Memory Retention */}
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 w-full text-left">Ghi nhớ Từ vựng</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        <Cell fill="#94a3b8"/><Cell fill="#f59e0b"/><Cell fill="#10b981"/><Cell fill="#22c55e"/>
                                    </Pie>
                                    <Tooltip/>
                                    <Legend/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <span className="text-gray-400">Chưa có dữ liệu</span>}
                    </div>
                 </div>

                 {/* Bar Chart: JLPT Progress */}
                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Tiến độ theo Cấp độ JLPT</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={jlptData} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide/>
                                <YAxis dataKey="name" type="category" width={30} tick={{fontWeight: 'bold'}} />
                                <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs">
                                                <p className="font-bold">{d.name}</p>
                                                <p>Đã có: {d.count}</p>
                                                <p>Yêu cầu: {d.target}</p>
                                                <p>Tiến độ: {Math.round((d.count/d.target)*100)}%</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}/>
                                <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
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
                                {/* Background Bar for Target (Simulated with stacked bar approach usually, but simple here) */}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">*Số lượng yêu cầu chỉ mang tính chất tham khảo</p>
                 </div>
            </div>

            <button onClick={onBack} className="w-full py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-600">Quay lại</button>
        </div>
    );
};

const FriendsScreen = ({ publicStatsPath, currentUserId, onBack }) => {
    // ... Copy logic cũ
    const [friendStats, setFriendStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { if (!db || !publicStatsPath) return; const q = query(collection(db, publicStatsPath)); const unsubscribe = onSnapshot(q, (s) => { const l = s.docs.map(d => d.data()); l.sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0)); setFriendStats(l); setIsLoading(false); }); return () => unsubscribe(); }, [publicStatsPath]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 pb-4 border-b">Bảng Xếp Hạng</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Hạng</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Thành viên</th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-amber-600 uppercase">Ngắn</th> 
                            <th className="px-4 py-4 text-center text-xs font-bold text-emerald-600 uppercase">Trung</th>
                            <th className="px-4 py-4 text-center text-xs font-bold text-green-700 uppercase">Dài</th> 
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Tổng từ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {friendStats.map((u, i) => (
                            <tr key={u.userId} className={u.userId === currentUserId ? 'bg-indigo-50/50' : ''}>
                                <td className="px-6 py-4 text-sm font-bold text-gray-400">#{i + 1}</td>
                                <td className={`px-6 py-4 text-sm font-bold ${u.userId === currentUserId ? 'text-indigo-600' : 'text-gray-700'}`}>{u.displayName} {u.userId === currentUserId && '(Bạn)'}</td>
                                <td className="px-4 py-4 text-center text-sm font-medium text-amber-600">{u.shortTerm || 0}</td>
                                <td className="px-4 py-4 text-center text-sm font-medium text-emerald-600">{u.midTerm || 0}</td>
                                <td className="px-4 py-4 text-center text-sm font-medium text-green-700">{u.longTerm || 0}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{u.totalCards}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={onBack} className="w-full py-3 border border-gray-200 rounded-xl hover:bg-gray-50">Quay lại</button>
        </div>
    );
};

export default App;