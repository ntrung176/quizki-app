import './App.css';
import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition, useDeferredValue } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, onSnapshot, collection, query, updateDoc, serverTimestamp, deleteDoc, getDoc, getDocs, where, writeBatch, increment } from 'firebase/firestore';
import { Loader2, Plus, Repeat2, Home, CheckCircle, XCircle, Volume2, Send, BookOpen, Clock, HeartHandshake, List, Calendar, Trash2, Mic, FileText, MessageSquare, HelpCircle, Upload, Wand2, BarChart3, Users, PieChart as PieChartIcon, Target, Save, Edit, Zap, Eye, EyeOff, AlertTriangle, Check, VolumeX, Image as ImageIcon, X, Music, FileAudio, Tag, Sparkles, Filter, ArrowDown, ArrowUp, GraduationCap, Search, Languages, RefreshCw, Settings, ChevronRight, Wrench, LayoutGrid, Flame, TrendingUp, Lightbulb, Brain, Ear, Keyboard, MousePointerClick, Layers, RotateCw, Lock, LogOut, FileCheck, Moon, Sun } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Route configuration
import { ROUTES, getEditRoute } from './router';

// Import from refactored modules
import {
    POS_TYPES,
    JLPT_LEVELS,
    SRS_INTERVALS,
    getPosLabel,
    getPosColor,
    getLevelColor,
    normalizePosKey
} from './config/constants';

import { playAudio, pcmToWav, base64ToArrayBuffer } from './utils/audio';
import { getNextReviewDate, getSrsProgressText, processSrsUpdate, DEFAULT_EASE, calculateCorrectInterval } from './utils/srs';
import {
    shuffleArray,
    maskWordInExample,
    getWordForMasking,
    getSpeechText,
    buildAdjNaAcceptedAnswers,
    isMobileDevice
} from './utils/textProcessing';
import { generateVocabWithAI, getAllGeminiApiKeysFromEnv } from './utils/gemini';
import { callAI, parseJsonFromAI, getAIProviderInfo } from './utils/aiProvider';
import { subscribeAdminConfig, canUseAI as checkCanUseAI, hasAdminPrivileges } from './utils/adminSettings';
import { compressImage } from './utils/image';

// Import screens
import {
    HomeScreen,
    LoginScreen,
    AccountScreen,
    ProfileScreen,
    HelpScreen,
    ImportScreen,
    StatsScreen,
    ListView,
    ReviewScreen,
    ReviewCompleteScreen,
    KanjiScreen,
    StudyScreen,
    TestScreen,
    AdminScreen,
    FlashcardScreen
} from './components/screens';

// Import layout components
import { Sidebar } from './components/layout';
import OnboardingTour from './components/ui/OnboardingTour';

// Import card components
import {
    MemoryStatCard,
    AddCardForm,
    EditCardForm
} from './components/cards';

// Import UI components
import { SearchInput, SrsStatusCell } from './components/ui';

// Import routing component
import AppRoutes from './components/AppRoutes';


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

// --- Component Chính App ---


const App = () => {
    // React Router hooks
    const navigate = useNavigate();
    const location = useLocation();

    // Helper function to navigate using route names (backward compatible with setView)
    const navigateTo = useCallback((viewName) => {
        const routeMap = {
            'HOME': ROUTES.HOME,
            'LOGIN': ROUTES.LOGIN,
            'ACCOUNT': ROUTES.ACCOUNT,
            'HELP': ROUTES.HELP,
            'LIST': ROUTES.VOCAB_REVIEW,
            'ADD_CARD': ROUTES.VOCAB_ADD,
            'REVIEW': ROUTES.REVIEW,
            'FLASHCARD': ROUTES.FLASHCARD,
            'KANJI': ROUTES.KANJI_LIST,
            'STUDY': ROUTES.STUDY,
            'TEST': ROUTES.TEST,
            'HUB': ROUTES.HUB,
            'IMPORT': ROUTES.IMPORT,
            'ADMIN': ROUTES.ADMIN,
            'SETTINGS': ROUTES.SETTINGS,
        };
        const route = routeMap[viewName] || ROUTES.HOME;
        navigate(route);
    }, [navigate]);

    // Get current view from location for backward compatibility
    const getCurrentView = useCallback(() => {
        const path = location.pathname;
        if (path === ROUTES.HOME || path === '/') return 'HOME';
        if (path === ROUTES.LOGIN) return 'LOGIN';
        if (path === ROUTES.ACCOUNT) return 'ACCOUNT';
        if (path === ROUTES.HELP) return 'HELP';
        if (path === ROUTES.VOCAB_REVIEW) return 'LIST';
        if (path === ROUTES.VOCAB_ADD) return 'ADD_CARD';
        if (path.startsWith('/vocab/edit/')) return 'EDIT_CARD';
        if (path === ROUTES.REVIEW) return 'REVIEW';
        if (path === ROUTES.FLASHCARD) return 'FLASHCARD';
        if (path === ROUTES.KANJI_LIST || path.startsWith(ROUTES.KANJI_LIST + '/')) return 'KANJI';
        if (path === ROUTES.KANJI_STUDY) return 'KANJI_STUDY';
        if (path === ROUTES.KANJI_LESSON) return 'KANJI_LESSON';
        if (path === ROUTES.KANJI_REVIEW) return 'KANJI_REVIEW';
        if (path === ROUTES.KANJI_SAVED) return 'KANJI_SAVED';
        if (path === ROUTES.STUDY) return 'STUDY';
        if (path === ROUTES.TEST) return 'TEST';
        if (path === ROUTES.HUB || path.startsWith('/hub')) return 'HUB';
        if (path === ROUTES.IMPORT) return 'IMPORT';
        if (path === ROUTES.ADMIN) return 'ADMIN';
        if (path === ROUTES.BOOKS) return 'BOOKS';
        if (path === ROUTES.SETTINGS) return 'SETTINGS';
        return 'HOME';
    }, [location.pathname]);

    // Current view derived from URL
    const view = getCurrentView();

    // Legacy setView function for backward compatibility
    const setView = useCallback((viewName) => {
        navigateTo(viewName);
    }, [navigateTo]);

    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [reviewMode, setReviewMode] = useState('back');
    const [savedFilters, setSavedFilters] = useState(null); // Lưu filter state khi edit
    const [allCards, setAllCards] = useState([]);
    const [reviewCards, setReviewCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState('');
    const [editingCard, setEditingCard] = useState(null);
    // State cho batch import từ vựng hàng loạt
    const [showBatchImportModal, setShowBatchImportModal] = useState(false);
    const [batchVocabInput, setBatchVocabInput] = useState('');
    const [batchVocabList, setBatchVocabList] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Lấy từ localStorage, mặc định là false (light mode)
        const saved = localStorage.getItem('darkMode');
        const result = saved === 'true';

        // Force remove dark class ngay lập tức nếu không phải dark mode
        if (!result) {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
            document.documentElement.style.removeProperty('background-color');
            document.body.style.removeProperty('background-color');
        }

        return result;
    });

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
        // Lấy từ env variables (VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2, ..., VITE_GEMINI_API_KEY_N)
        return getAllGeminiApiKeysFromEnv();
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
    const [flashcardCards, setFlashcardCards] = useState([]);

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
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        return !!adminEmailEnv && !!currentEmail && currentEmail === adminEmailEnv;
    }, [authReady, userId]);

    // Admin config from Firestore (AI permissions, provider selection, moderators)
    const [adminConfig, setAdminConfig] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeAdminConfig(setAdminConfig);
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    // Check if current user can use AI features
    const canUserUseAI = useMemo(() => {
        const result = checkCanUseAI(adminConfig, userId, isAdmin);
        console.log('🔑 canUserUseAI:', result, '| userId:', userId, '| isAdmin:', isAdmin, '| aiEnabled:', adminConfig?.aiEnabled, '| aiAllowAll:', adminConfig?.aiAllowAll, '| inAllowedList:', adminConfig?.aiAllowedUsers?.includes(userId));
        return result;
    }, [adminConfig, userId, isAdmin]);

    // Check if current user has admin privileges (admin or moderator)
    const userHasAdminPrivileges = useMemo(() => {
        return hasAdminPrivileges(adminConfig, userId, isAdmin);
    }, [adminConfig, userId, isAdmin]);

    // Toggle body class for review mode (hide scrollbar)
    useEffect(() => {
        if (view === 'REVIEW') {
            document.body.classList.add('review-mode');
        } else {
            document.body.classList.remove('review-mode');
        }
        return () => document.body.classList.remove('review-mode');
    }, [view]);

    const handleAdminDeleteUserData = useCallback(async (targetUserId) => {
        if (!db || !appId || !targetUserId) return;
        if (!isAdmin) {
            setNotification("Bạn không có quyền thực hiện chức năng này.");
            return;
        }
        try {
            setNotification("Đang xóa dữ liệu người dùng...");

            // Helper function to delete documents one by one (to avoid Transaction too big error)
            const deleteOneByOne = async (collectionPath) => {
                const snapshot = await getDocs(collection(db, collectionPath));
                let deleted = 0;
                for (const docSnap of snapshot.docs) {
                    await deleteDoc(docSnap.ref);
                    deleted++;
                }
                return deleted;
            };

            // Xóa vocabulary
            const vocabCount = await deleteOneByOne(`artifacts/${appId}/users/${targetUserId}/vocabulary`);
            console.log(`Deleted ${vocabCount} vocabulary items`);

            // Xóa dailyActivity
            const actCount = await deleteOneByOne(`artifacts/${appId}/users/${targetUserId}/dailyActivity`);
            console.log(`Deleted ${actCount} daily activity items`);

            // Xóa kanji SRS data
            const kanjiSrsCount = await deleteOneByOne(`artifacts/${appId}/users/${targetUserId}/kanjiSRS`);
            console.log(`Deleted ${kanjiSrsCount} kanji SRS items`);

            // Xóa settings/profile
            const profileDocRef = doc(db, `artifacts/${appId}/users/${targetUserId}/settings/profile`);
            await deleteDoc(profileDocRef).catch(e => console.log('Profile delete skipped:', e.message));

            // Xóa root doc (nếu có)
            const userRoot = doc(db, `artifacts/${appId}/users/${targetUserId}`);
            await deleteDoc(userRoot).catch(e => console.log('User root delete skipped:', e.message));

            // Xóa luôn dữ liệu trên bảng xếp hạng công khai
            const statsDocRef = doc(db, publicStatsCollectionPath, targetUserId);
            await deleteDoc(statsDocRef).catch(e => console.log('Stats delete skipped:', e.message));

            setNotification(`Đã xoá toàn bộ dữ liệu của người dùng (${vocabCount} từ vựng, ${actCount} hoạt động, ${kanjiSrsCount} kanji SRS).`);
        } catch (e) {
            console.error("Lỗi xoá dữ liệu người dùng bởi admin:", e);
            setNotification(`Lỗi khi xoá dữ liệu người dùng: ${e.message}`);
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
                // Khi đăng xuất: clear tất cả state ngay lập tức và xóa sessionStorage
                const oldUserId = userId;
                setUserId(null);
                setAllCards([]);
                setReviewCards([]);
                setProfile(null);
                setView('HOME');
                setEditingCard(null);
                setNotification('');
                // Xóa sessionStorage của user cũ
                if (oldUserId) {
                    sessionStorage.removeItem(`profile_${oldUserId}`);
                    sessionStorage.removeItem(`allCards_${oldUserId}`);
                    sessionStorage.removeItem(`dailyActivityLogs_${oldUserId}`);
                }
            }
            setAuthReady(true);
        });

        // Không còn tự động đăng nhập ẩn danh; sẽ để LoginScreen quyết định
        return () => unsubscribe();
    }, []);

    // Khởi tạo dark mode ngay khi component mount - đồng bộ với state
    useEffect(() => {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;
        const rootElement = document.getElementById('root');

        // Apply state hiện tại (đã được khởi tạo từ localStorage)
        if (isDarkMode) {
            htmlElement.classList.add('dark');
            bodyElement.classList.add('dark');
            if (rootElement) rootElement.classList.add('dark');
        } else {
            // Force light mode - chỉ remove class, không set inline styles
            htmlElement.classList.remove('dark');
            bodyElement.classList.remove('dark');
            if (rootElement) rootElement.classList.remove('dark');
            // Xóa tất cả inline styles
            htmlElement.style.removeProperty('background-color');
            bodyElement.style.removeProperty('background-color');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chạy một lần khi mount để khởi tạo, isDarkMode đã được capture từ initial state

    // Quản lý dark mode khi state thay đổi - INSTANT switch
    useEffect(() => {
        // Lưu vào localStorage
        localStorage.setItem('darkMode', isDarkMode.toString());

        // Áp dụng/xóa class dark trên documentElement - NGAY LẬP TỨC
        const htmlElement = document.documentElement;
        const bodyElement = document.body;
        const rootElement = document.getElementById('root');

        if (isDarkMode) {
            htmlElement.classList.add('dark');
            bodyElement.classList.add('dark');
            if (rootElement) rootElement.classList.add('dark');
        } else {
            // Force remove class dark
            htmlElement.classList.remove('dark');
            bodyElement.classList.remove('dark');
            if (rootElement) rootElement.classList.remove('dark');

            // XÓA inline styles
            htmlElement.style.removeProperty('background-color');
            bodyElement.style.removeProperty('background-color');
            htmlElement.style.removeProperty('color-scheme');
            bodyElement.style.removeProperty('color-scheme');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (!authReady || !userId || !settingsDocPath) {
            setIsProfileLoading(false);
            return;
        }

        // Khôi phục profile từ sessionStorage nếu có
        const cachedProfileKey = `profile_${userId}`;
        const cachedProfile = sessionStorage.getItem(cachedProfileKey);
        if (cachedProfile) {
            try {
                const parsedProfile = JSON.parse(cachedProfile);
                setProfile(parsedProfile);
                // Không set isProfileLoading = false ở đây, đợi onSnapshot
            } catch (e) {
                console.error('Lỗi parse cached profile:', e);
            }
        }

        const unsubscribe = onSnapshot(doc(db, settingsDocPath), async (docSnap) => {
            if (docSnap.exists()) {
                const profileData = docSnap.data();
                if (!profileData.email && auth?.currentUser?.email) {
                    profileData.email = auth.currentUser.email;
                }
                setProfile(profileData);
                // Lưu vào sessionStorage
                sessionStorage.setItem(cachedProfileKey, JSON.stringify(profileData));
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
                        email: auth?.currentUser?.email || ''
                    };
                    await setDoc(doc(db, settingsDocPath), newProfile);
                    setProfile(newProfile);
                    // Lưu vào sessionStorage
                    sessionStorage.setItem(cachedProfileKey, JSON.stringify(newProfile));
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

        // Khôi phục allCards từ sessionStorage nếu có
        const cachedCardsKey = `allCards_${userId}`;
        const cachedCards = sessionStorage.getItem(cachedCardsKey);
        if (cachedCards) {
            try {
                const parsedCards = JSON.parse(cachedCards);
                // Convert date strings back to Date objects và khôi phục audioBase64/imageBase64 từ Firestore
                // (chúng sẽ được cập nhật khi Firestore listener chạy)
                const cardsWithDates = parsedCards.map(card => ({
                    ...card,
                    createdAt: new Date(card.createdAt),
                    nextReview_back: new Date(card.nextReview_back),
                    nextReview_synonym: new Date(card.nextReview_synonym),
                    nextReview_example: new Date(card.nextReview_example),
                    // Khôi phục audioBase64 và imageBase64 từ cache nếu có, nếu không thì null
                    // (sẽ được cập nhật từ Firestore sau)
                    audioBase64: card.hasAudio ? null : null, // Sẽ được load từ Firestore
                    imageBase64: card.hasImage ? null : null, // Sẽ được load từ Firestore
                    // Loại bỏ các flag tạm
                    hasAudio: undefined,
                    hasImage: undefined,
                }));
                setAllCards(cardsWithDates);
            } catch (e) {
                console.error('Lỗi parse cached cards:', e);
                // Xóa cache bị lỗi
                sessionStorage.removeItem(cachedCardsKey);
            }
        }

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
                    audioBase64: data.audioBase64 !== undefined ? data.audioBase64 : null,
                    imageBase64: data.imageBase64 || null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : today),
                    intervalIndex_back: typeof data.intervalIndex_back === 'number' ? data.intervalIndex_back : -1,
                    correctStreak_back: typeof data.correctStreak_back === 'number' ? data.correctStreak_back : 0,
                    nextReview_back: data.nextReview_back?.toDate ? data.nextReview_back.toDate() : (data.nextReview_back ? new Date(data.nextReview_back) : today),
                    intervalIndex_synonym: typeof data.intervalIndex_synonym === 'number' ? data.intervalIndex_synonym : -1,
                    correctStreak_synonym: typeof data.correctStreak_synonym === 'number' ? data.correctStreak_synonym : 0,
                    nextReview_synonym: data.nextReview_synonym?.toDate ? data.nextReview_synonym.toDate() : (data.nextReview_synonym ? new Date(data.nextReview_synonym) : today),
                    intervalIndex_example: typeof data.intervalIndex_example === 'number' ? data.intervalIndex_example : -1,
                    correctStreak_example: typeof data.correctStreak_example === 'number' ? data.correctStreak_example : 0,
                    nextReview_example: data.nextReview_example?.toDate ? data.nextReview_example.toDate() : (data.nextReview_example ? new Date(data.nextReview_example) : today),
                    easeFactor: typeof data.easeFactor === 'number' ? data.easeFactor : DEFAULT_EASE,
                    totalReps: typeof data.totalReps === 'number' ? data.totalReps : 0,
                    currentInterval_back: typeof data.currentInterval_back === 'number' ? data.currentInterval_back : 0,
                    correctCount: typeof data.correctCount === 'number' ? data.correctCount : 0,
                    incorrectCount: typeof data.incorrectCount === 'number' ? data.incorrectCount : 0,
                });
            });



            // Sort by createdAt desc by default initially
            cards.sort((a, b) => b.createdAt - a.createdAt);
            setAllCards(cards);
            // Lưu vào sessionStorage (convert Date objects to ISO strings, loại bỏ audioBase64 và imageBase64 để tiết kiệm dung lượng)
            const cardsForStorage = cards.map(card => {
                const { audioBase64, imageBase64, ...cardWithoutMedia } = card;
                return {
                    ...cardWithoutMedia,
                    createdAt: card.createdAt.toISOString(),
                    nextReview_back: card.nextReview_back.toISOString(),
                    nextReview_synonym: card.nextReview_synonym.toISOString(),
                    nextReview_example: card.nextReview_example.toISOString(),
                    // Chỉ lưu flag để biết có media hay không, không lưu dữ liệu thực tế
                    hasAudio: !!audioBase64,
                    hasImage: !!imageBase64,
                };
            });
            try {
                const jsonString = JSON.stringify(cardsForStorage);
                // Kiểm tra kích thước trước khi lưu (sessionStorage thường có giới hạn ~5-10MB)
                if (jsonString.length > 4 * 1024 * 1024) { // Nếu > 4MB, không lưu
                    console.warn('Dữ liệu quá lớn, bỏ qua cache vào sessionStorage');
                    return;
                }
                sessionStorage.setItem(cachedCardsKey, jsonString);
            } catch (e) {
                // Nếu sessionStorage đầy, thử xóa cache cũ và lưu lại
                if (e.name === 'QuotaExceededError') {
                    try {
                        // Xóa tất cả cache cũ của user này
                        sessionStorage.removeItem(cachedCardsKey);
                        sessionStorage.removeItem(`profile_${userId}`);
                        sessionStorage.removeItem(`dailyActivityLogs_${userId}`);
                        // Thử lưu lại với dữ liệu đã giảm
                        const jsonString = JSON.stringify(cardsForStorage);
                        if (jsonString.length <= 4 * 1024 * 1024) {
                            sessionStorage.setItem(cachedCardsKey, jsonString);
                        }
                    } catch (e2) {
                        // Im lặng nếu vẫn không được, không cần log error
                    }
                }
            }
        }, (error) => {
            console.error("Lỗi khi lắng nghe Firestore:", error);
            setNotification("Lỗi kết nối dữ liệu.");
        });
        return () => unsubscribe();
    }, [authReady, vocabCollectionPath, userId]);

    useEffect(() => {
        if (!authReady || !activityCollectionPath) return;

        // Khôi phục dailyActivityLogs từ sessionStorage nếu có
        const cachedLogsKey = `dailyActivityLogs_${userId}`;
        const cachedLogs = sessionStorage.getItem(cachedLogsKey);
        if (cachedLogs) {
            try {
                const parsedLogs = JSON.parse(cachedLogs);
                setDailyActivityLogs(parsedLogs);
            } catch (e) {
                console.error('Lỗi parse cached logs:', e);
            }
        }

        const q = query(collection(db, activityCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort logs by date string (ID) just in case
            logs.sort((a, b) => a.id.localeCompare(b.id));
            setDailyActivityLogs(logs);
            // Lưu vào sessionStorage
            try {
                const jsonString = JSON.stringify(logs);
                // Kiểm tra kích thước trước khi lưu
                if (jsonString.length > 1 * 1024 * 1024) { // Nếu > 1MB, không lưu
                    return;
                }
                sessionStorage.setItem(cachedLogsKey, jsonString);
            } catch (e) {
                // Im lặng nếu không thể lưu, không cần log
            }
        }, (error) => {
            console.error("Lỗi khi tải hoạt động hàng ngày:", error);
        });

        return () => unsubscribe();
    }, [authReady, activityCollectionPath, userId]);

    const dueCounts = useMemo(() => {
        const now = new Date();

        // Logic mới: bao gồm cả thẻ mới (intervalIndex_back === -1) VÀ thẻ đến hạn
        const isCardAvailable = (card) => {
            if (card.intervalIndex_back === -1) return true; // Thẻ mới luôn sẵn sàng
            return card.nextReview_back <= now;
        };

        const mixed = allCards.filter(card => {
            if (!isCardAvailable(card)) return false;

            // Kiểm tra xem có phần nào chưa hoàn thành không (streak < 1)
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;

            // Có ít nhất một phần chưa hoàn thành
            return backStreak < 1 || (card.synonym && card.synonym.trim() !== '' && synonymStreak < 1) || (card.example && card.example.trim() !== '' && exampleStreak < 1);
        }).length;

        // Back: các từ sẵn sàng VÀ chưa hoàn thành phần back (streak < 1)
        const back = allCards.filter(card => {
            if (!isCardAvailable(card)) return false;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            return backStreak < 1;
        }).length;

        // Synonym: các từ sẵn sàng, có synonym VÀ chưa hoàn thành phần synonym (streak < 1)
        const synonym = allCards.filter(card => {
            if (!card.synonym || card.synonym.trim() === '') return false;
            if (!isCardAvailable(card)) return false;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            return synonymStreak < 1;
        }).length;

        // Example: các từ sẵn sàng, có example VÀ chưa hoàn thành phần example (streak < 1)
        const example = allCards.filter(card => {
            if (!card.example || card.example.trim() === '') return false;
            if (!isCardAvailable(card)) return false;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            return exampleStreak < 1;
        }).length;

        // Flashcard: Luôn hiển thị số từ chưa có SRS (không phụ thuộc filter)
        const flashcard = allCards.filter(card => {
            return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
        }).length;

        // Study mode: Chỉ từ vựng chưa có SRS (chỉ cần intervalIndex_back === -1)
        const study = allCards.filter(card => {
            return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
        }).length;

        // Tính counts cho các chế độ mới
        // Old cards (đã có SRS)
        const oldCards = allCards.filter(card =>
            card.intervalIndex_back !== -1 && card.intervalIndex_back !== undefined && card.intervalIndex_back >= 0
        );
        const oldMixed = oldCards.filter(card => {
            const isDue = card.nextReview_back <= now;
            if (!isDue) return false;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            return backStreak < 1 || (card.synonym && synonymStreak < 1) || (card.example && exampleStreak < 1);
        }).length;
        const oldBack = oldCards.filter(card => {
            const isDue = card.nextReview_back <= now;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            return isDue && backStreak < 1;
        }).length;
        const oldSynonym = oldCards.filter(card => {
            if (!card.synonym || card.synonym.trim() === '') return false;
            const isDue = card.nextReview_back <= now;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            return isDue && synonymStreak < 1;
        }).length;
        const oldExample = oldCards.filter(card => {
            if (!card.example || card.example.trim() === '') return false;
            const isDue = card.nextReview_back <= now;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            return isDue && exampleStreak < 1;
        }).length;

        // New cards (chưa có SRS)
        const newCards = allCards.filter(card =>
            card.intervalIndex_back === -1 || card.intervalIndex_back === undefined
        );
        const newMixed = newCards.length; // Tất cả từ mới đều có thể ôn
        const newBack = newCards.length;
        const newSynonym = newCards.filter(card => card.synonym && card.synonym.trim() !== '').length;
        const newExample = newCards.filter(card => card.example && card.example.trim() !== '').length;

        // Grammar cards
        const grammarCards = allCards.filter(card => card.pos === 'grammar');
        const grammarMixed = grammarCards.filter(card => {
            const isDue = card.nextReview_back <= now;
            if (!isDue && card.intervalIndex_back >= 0) return false;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            return backStreak < 1 || (card.synonym && synonymStreak < 1) || (card.example && exampleStreak < 1);
        }).length;
        const grammarBack = grammarCards.filter(card => {
            const isDue = card.nextReview_back <= now;
            if (!isDue && card.intervalIndex_back >= 0) return false;
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            return backStreak < 1;
        }).length;
        const grammarSynonym = grammarCards.filter(card => {
            if (!card.synonym || card.synonym.trim() === '') return false;
            const isDue = card.nextReview_back <= now;
            if (!isDue && card.intervalIndex_back >= 0) return false;
            const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
            return synonymStreak < 1;
        }).length;
        const grammarExample = grammarCards.filter(card => {
            if (!card.example || card.example.trim() === '') return false;
            const isDue = card.nextReview_back <= now;
            if (!isDue && card.intervalIndex_back >= 0) return false;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            return exampleStreak < 1;
        }).length;

        return {
            mixed, flashcard, back, synonym, example, study,
            old: { mixed: oldMixed, back: oldBack, synonym: oldSynonym, example: oldExample },
            new: { mixed: newMixed, back: newBack, synonym: newSynonym, example: newExample },
            grammar: { mixed: grammarMixed, back: grammarBack, synonym: grammarSynonym, example: grammarExample }
        };
    }, [allCards]);



    const prepareReviewCards = useCallback((mode = 'back', category = 'all') => {
        const today = new Date();
        let dueCards = [];

        // Filter theo category trước
        let filteredCards = allCards;
        if (category === 'old') {
            // Từ vựng cũ: đã có SRS (intervalIndex_back >= 0)
            filteredCards = allCards.filter(card =>
                card.intervalIndex_back !== -1 && card.intervalIndex_back !== undefined && card.intervalIndex_back >= 0
            );
        } else if (category === 'new') {
            // Từ vựng mới: chưa có SRS (intervalIndex_back === -1)
            filteredCards = allCards.filter(card =>
                card.intervalIndex_back === -1 || card.intervalIndex_back === undefined
            );
        } else if (category === 'grammar') {
            // Từ vựng ngữ pháp: pos === 'grammar'
            filteredCards = allCards.filter(card => card.pos === 'grammar');
        }
        // category === 'all' thì không filter

        // Kiểm tra xem có phải từ mới (chưa có SRS) không
        const isNewCategory = category === 'new';

        // Flashcard mode: Chỉ dành cho từ vựng chưa có SRS
        if (mode === 'flashcard') {
            dueCards = filteredCards.filter(card => {
                return card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;
            });
            dueCards = shuffleArray(dueCards);

        } else if (mode === 'mixed') {
            // Mixed mode: bao gồm cả thẻ mới VÀ thẻ đến hạn
            const isNew = (card) => card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;

            const dueBackCards = filteredCards
                .filter(card => {
                    if (isNew(card)) return true; // Thẻ mới luôn bao gồm
                    if (card.nextReview_back > today) return false;
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    return backStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'back' }));

            const dueSynonymCards = filteredCards
                .filter(card => {
                    if (!card.synonym || card.synonym.trim() === '') return false;
                    if (isNew(card)) return true;
                    if (card.nextReview_back > today) return false;
                    const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                    return synonymStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'synonym' }));

            const dueExampleCards = filteredCards
                .filter(card => {
                    if (!card.example || card.example.trim() === '') return false;
                    if (isNew(card)) return true;
                    if (card.nextReview_back > today) return false;
                    const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                    return exampleStreak < 1;
                })
                .map(card => ({ ...card, reviewType: 'example' }));

            dueCards = shuffleArray([...dueBackCards, ...dueSynonymCards, ...dueExampleCards]);

        } else if (mode === 'back') {
            // Back: thẻ mới (intervalIndex_back === -1) HOẶC thẻ đến hạn (nextReview <= now) + chưa hoàn thành
            dueCards = filteredCards
                .filter(card => {
                    // Thẻ mới luôn được bao gồm
                    if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) return true;
                    // Thẻ cũ: kiểm tra nextReview và streak
                    if (card.nextReview_back > today) return false;
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    return backStreak < 1;
                });
        } else if (mode === 'synonym') {
            // Synonym: thẻ mới có synonym HOẶC thẻ đến hạn + chưa hoàn thành synonym
            dueCards = filteredCards
                .filter(card => {
                    if (!card.synonym || card.synonym.trim() === '') return false;
                    // Thẻ mới luôn được bao gồm
                    if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) return true;
                    // Thẻ cũ: kiểm tra nextReview và streak
                    if (card.nextReview_back > today) return false;
                    const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                    return synonymStreak < 1;
                });
        } else if (mode === 'example') {
            // Example: thẻ mới có example HOẶC thẻ đến hạn + chưa hoàn thành example
            dueCards = filteredCards
                .filter(card => {
                    if (!card.example || card.example.trim() === '') return false;
                    // Thẻ mới luôn được bao gồm
                    if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) return true;
                    // Thẻ cũ: kiểm tra nextReview và streak
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
            "easeFactor", "totalReps", "correctCount", "incorrectCount", "currentInterval_back",
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
            card.easeFactor || 2.5,
            card.totalReps || 0,
            card.correctCount || 0,
            card.incorrectCount || 0,
            card.currentInterval_back || 0,
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

    // Import TSV file (background import - non-blocking)
    const handleImportTSV = async (file) => {
        if (!file || !vocabCollectionPath) {
            setNotification('Không thể nhập file');
            return;
        }

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                setNotification('File không có dữ liệu');
                return;
            }

            // Parse header
            const headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));

            // Expected headers mapping
            const headerMap = {
                'Front': 'front',
                'Back': 'back',
                'Synonym': 'synonym',
                'Example': 'example',
                'ExampleMeaning': 'exampleMeaning',
                'Nuance': 'nuance',
                'CreatedAt': 'createdAt',
                'intervalIndex_back': 'intervalIndex_back',
                'correctStreak_back': 'correctStreak_back',
                'nextReview_back_timestamp': 'nextReview_back',
                'intervalIndex_synonym': 'intervalIndex_synonym',
                'correctStreak_synonym': 'correctStreak_synonym',
                'nextReview_synonym_timestamp': 'nextReview_synonym',
                'intervalIndex_example': 'intervalIndex_example',
                'correctStreak_example': 'correctStreak_example',
                'nextReview_example_timestamp': 'nextReview_example',
                'easeFactor': 'easeFactor',
                'totalReps': 'totalReps',
                'correctCount': 'correctCount',
                'incorrectCount': 'incorrectCount',
                'currentInterval_back': 'currentInterval_back',
                'ImageBase64': 'imageBase64',
                'POS': 'pos',
                'Level': 'level',
                'SinoVietnamese': 'sinoVietnamese',
                'SynonymSinoVietnamese': 'synonymSinoVietnamese'
            };

            // Parse rows
            const cards = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;

                // Parse TSV with quoted fields
                const values = [];
                let current = '';
                let inQuotes = false;

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        if (inQuotes && line[j + 1] === '"') {
                            current += '"';
                            j++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === '\t' && !inQuotes) {
                        values.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current);

                // Create card object
                const card = {};
                headers.forEach((header, index) => {
                    const fieldName = headerMap[header];
                    if (fieldName && values[index] !== undefined) {
                        let value = values[index];

                        // Handle special fields
                        if (fieldName === 'createdAt') {
                            card[fieldName] = value ? new Date(value) : new Date();
                        } else if (fieldName.includes('intervalIndex')) {
                            card[fieldName] = parseInt(value) || -1;
                        } else if (fieldName.includes('correctStreak')) {
                            card[fieldName] = parseInt(value) || 0;
                        } else if (fieldName.includes('nextReview')) {
                            const timestamp = parseInt(value);
                            card[fieldName] = timestamp ? new Date(timestamp) : new Date();
                        } else {
                            card[fieldName] = value || '';
                        }
                    }
                });

                // Validate required fields
                if (card.front && card.back) {
                    cards.push(card);
                }
            }

            if (cards.length === 0) {
                setNotification('Không tìm thấy từ vựng hợp lệ trong file');
                return;
            }

            // Show immediate feedback - import starts in background
            setNotification(`⏳ Đang nhập ${cards.length} từ vựng ở nền... Bạn có thể tiếp tục thao tác.`);

            // Run imports in background (non-blocking)
            const importInBackground = async () => {
                let imported = 0;
                let skipped = 0;

                for (const card of cards) {
                    // Check if card already exists (by front)
                    const exists = allCards.some(c => c.front === card.front);

                    if (exists) {
                        skipped++;
                        continue;
                    }

                    // Add to Firestore
                    await addDoc(collection(db, vocabCollectionPath), {
                        ...card,
                        createdAt: card.createdAt || serverTimestamp()
                    });
                    imported++;
                }

                // Update daily activity
                if (imported > 0) {
                    await updateDailyActivity(imported);
                }

                setNotification(`✅ Đã nhập xong ${imported} từ vựng${skipped > 0 ? `, bỏ qua ${skipped} từ trùng lặp` : ''}`);
            };

            // Fire and forget - don't await
            importInBackground().catch(error => {
                console.error('Background import error:', error);
                setNotification('❌ Lỗi khi nhập file: ' + error.message);
            });

        } catch (error) {
            console.error('Import TSV error:', error);
            setNotification('Lỗi khi nhập file: ' + error.message);
        }
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
            easeFactor: DEFAULT_EASE,
            totalReps: 0,
        };
    };

    // ==================== SHARED VOCABULARY ====================
    const SHARED_VOCAB_COLLECTION = 'sharedVocabulary';

    // Tìm từ vựng trong kho dữ liệu chung
    const findSharedVocab = async (word) => {
        try {
            const normalized = word.split('（')[0].split('(')[0].trim();
            // Tìm bằng doc ID (normalized word)
            const docRef = doc(db, SHARED_VOCAB_COLLECTION, normalized);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (e) {
            console.warn('Error finding shared vocab:', e);
            return null;
        }
    };

    // Lưu từ vựng vào kho dữ liệu chung
    const saveSharedVocab = async (word, data) => {
        try {
            const normalized = word.split('（')[0].split('(')[0].trim();
            const docRef = doc(db, SHARED_VOCAB_COLLECTION, normalized);
            await setDoc(docRef, {
                front: data.front || data.frontWithFurigana || word,
                back: data.back || data.meaning || '',
                synonym: data.synonym || '',
                sinoVietnamese: data.sinoVietnamese || '',
                synonymSinoVietnamese: data.synonymSinoVietnamese || '',
                example: data.example || '',
                exampleMeaning: data.exampleMeaning || '',
                nuance: data.nuance || '',
                pos: data.pos || '',
                level: data.level || '',
                updatedAt: Date.now(),
            }, { merge: true });
        } catch (e) {
            console.warn('Error saving shared vocab:', e);
        }
    };

    // Lấy dữ liệu từ vựng: ưu tiên shared DB → fallback (dữ liệu đã có)
    const getVocabData = async (word, fallbackData = {}) => {
        // 1. Kiểm tra kho dữ liệu chung
        const shared = await findSharedVocab(word);
        if (shared) {
            console.log('📚 Found shared vocab for:', word);
            return {
                front: shared.front || word,
                back: shared.back || fallbackData.meaning || fallbackData.back || '',
                synonym: shared.synonym || '',
                sinoVietnamese: shared.sinoVietnamese || fallbackData.sinoVietnamese || '',
                synonymSinoVietnamese: shared.synonymSinoVietnamese || '',
                example: shared.example || fallbackData.example || '',
                exampleMeaning: shared.exampleMeaning || fallbackData.exampleMeaning || '',
                nuance: shared.nuance || fallbackData.nuance || fallbackData.note || '',
                pos: shared.pos || fallbackData.pos || '',
                level: shared.level || fallbackData.level || '',
                _source: 'shared',
            };
        }

        // 2. Dùng dữ liệu đã truyền vào (fallback) — không gọi AI
        const result = {
            front: word,
            back: fallbackData.meaning || fallbackData.back || '',
            synonym: '',
            sinoVietnamese: fallbackData.sinoVietnamese || '',
            synonymSinoVietnamese: '',
            example: fallbackData.example || '',
            exampleMeaning: fallbackData.exampleMeaning || '',
            nuance: fallbackData.nuance || fallbackData.note || '',
            pos: fallbackData.pos || '',
            level: fallbackData.level || '',
            _source: 'fallback',
        };

        // 3. Lưu vào kho dữ liệu chung cho lần sau
        if (fallbackData.meaning || fallbackData.back) {
            await saveSharedVocab(word, result);
        }

        return result;
    };

    const handleAddCard = async ({ front, back, synonym, example, exampleMeaning, nuance, pos, level, action, imageBase64, audioBase64, sinoVietnamese, synonymSinoVietnamese, folderId }) => {
        if (!vocabCollectionPath) return false;

        // Kiểm tra trùng lặp với database của user
        const normalizedFront = front.split('（')[0].split('(')[0].trim();
        const isDuplicate = allCards.some(card => {
            const cardFront = card.front.split('（')[0].split('(')[0].trim();
            return cardFront === normalizedFront;
        });

        if (isDuplicate) {
            setNotification(`⚠️ Từ vựng "${normalizedFront}" đã có trong danh sách!`);
            return false;
        }

        // Luôn tra shared DB để bổ sung dữ liệu thiếu (synonym, furigana, v.v.)
        const vocabData = await getVocabData(front, { meaning: back, example, exampleMeaning, nuance, pos, level, sinoVietnamese });

        let finalFront = vocabData.front || front;
        let finalBack = back || vocabData.back || '';
        let finalSynonym = synonym || vocabData.synonym || '';
        let finalExample = example || vocabData.example || '';
        let finalExampleMeaning = exampleMeaning || vocabData.exampleMeaning || '';
        let finalNuance = nuance || vocabData.nuance || '';
        let finalPos = pos || vocabData.pos || '';
        let finalLevel = level || vocabData.level || '';
        let finalSinoVietnamese = sinoVietnamese || vocabData.sinoVietnamese || '';
        let finalSynonymSinoVietnamese = synonymSinoVietnamese || vocabData.synonymSinoVietnamese || '';

        const newCardData = createCardObject(finalFront, finalBack, finalSynonym, finalExample, finalExampleMeaning, finalNuance, {}, null, imageBase64, audioBase64, finalPos, finalLevel, finalSinoVietnamese, finalSynonymSinoVietnamese);

        let cardRef;

        try {
            cardRef = doc(collection(db, vocabCollectionPath));
            await setDoc(cardRef, newCardData);

            setNotification(`Đã thêm thẻ mới: ${newCardData.front}`);
            await updateDailyActivity(1);

            // Save folder assignment if selected
            if (folderId && cardRef) {
                try {
                    const savedFolders = JSON.parse(localStorage.getItem('vocab_card_folders') || '{}');
                    savedFolders[cardRef.id] = folderId;
                    localStorage.setItem('vocab_card_folders', JSON.stringify(savedFolders));
                } catch (e) {
                    console.error('Lỗi lưu thư mục cho thẻ:', e);
                }
            }

            // Nếu đang trong batch mode, chuyển sang từ tiếp theo thay vì về HOME
            // (Logic này đã được xử lý trong nút lưu của AddCardForm)
            if (!batchVocabList.length || currentBatchIndex >= batchVocabList.length) {
                if (action === 'back') {
                    setView('HOME');
                }
            }



            return true;

        } catch (e) {
            console.error("Lỗi khi thêm thẻ:", e);
            setNotification("Lỗi khi lưu thẻ. Vui lòng thử lại.");
            return false;
        }
    };

    // Hàm xử lý batch import từ vựng hàng loạt từ danh sách text
    const handleBatchImportFromText = async (vocabList) => {
        if (!vocabCollectionPath || vocabList.length === 0) return;

        // Loại bỏ các từ trống và normalize
        const normalizedList = vocabList
            .map(vocab => vocab.trim())
            .filter(vocab => vocab.length > 0);

        if (normalizedList.length === 0) {
            setNotification('Không có từ vựng hợp lệ!');
            return;
        }

        // Tách thành 2 nhóm: từ mới và từ đã có
        const newVocabs = [];
        const existingVocabs = [];
        const seenInInput = new Set(); // Để loại bỏ trùng lặp trong input

        for (const vocab of normalizedList) {
            // Kiểm tra trùng lặp trong input
            if (seenInInput.has(vocab)) {
                existingVocabs.push(vocab);
                continue;
            }
            seenInInput.add(vocab);

            // Kiểm tra trùng lặp với database
            const existsInDb = allCards.some(card => {
                const cardFront = card.front.split('（')[0].split('(')[0].trim();
                return cardFront === vocab;
            });

            if (existsInDb) {
                existingVocabs.push(vocab);
            } else {
                newVocabs.push(vocab);
            }
        }

        // Hiển thị thông báo các từ đã có
        if (existingVocabs.length > 0) {
            const existingList = existingVocabs.slice(0, 10).join(', ');
            const moreText = existingVocabs.length > 10 ? ` và ${existingVocabs.length - 10} từ khác` : '';
            setNotification(`⚠️ ${existingVocabs.length} từ vựng đã có trong danh sách: ${existingList}${moreText}`);
        }

        if (newVocabs.length === 0) {
            setNotification('Tất cả từ vựng đã có trong danh sách!');
            return;
        }

        setIsProcessingBatch(true);
        setBatchVocabList(newVocabs);
        setCurrentBatchIndex(0);
        setShowBatchImportModal(false);

        // KHÔNG tạo tạm vào database, chỉ lưu danh sách vào state
        // Lấy dữ liệu từ API cho từ đầu tiên
        const firstVocab = newVocabs[0];
        const aiData = await handleGeminiAssist(firstVocab);

        // Chuyển sang view ADD_CARD với dữ liệu từ đầu tiên
        setView('ADD_CARD');
        setEditingCard({
            id: null, // Không có id vì chưa tạo trong database
            front: aiData?.frontWithFurigana || firstVocab,
            back: aiData?.meaning || '',
            synonym: aiData?.synonym || '',
            example: aiData?.example || '',
            exampleMeaning: aiData?.exampleMeaning || '',
            nuance: aiData?.nuance || '',
            pos: aiData?.pos || '',
            level: aiData?.level || '',
            sinoVietnamese: aiData?.sinoVietnamese || '',
            synonymSinoVietnamese: aiData?.synonymSinoVietnamese || '',
            imageBase64: null,
            audioBase64: null,
        });

        setIsProcessingBatch(false);

        // Thông báo kết hợp
        let finalMessage = `Đang xử lý từ vựng 1/${newVocabs.length}...`;
        if (existingVocabs.length > 0) {
            finalMessage += ` (${existingVocabs.length} từ đã có trong danh sách)`;
        }
        setNotification(finalMessage);
    };

    // Hàm xử lý khi lưu từ vựng trong batch (sau khi user check và lưu)
    const handleBatchSaveNext = async () => {
        if (currentBatchIndex >= batchVocabList.length - 1) {
            // Đã hết danh sách
            setBatchVocabList([]);
            setCurrentBatchIndex(0);
            setEditingCard(null);
            setNotification('Đã hoàn thành thêm tất cả từ vựng!');
            setView('HOME');
            return;
        }

        // Chuyển sang từ tiếp theo
        const nextIndex = currentBatchIndex + 1;
        setCurrentBatchIndex(nextIndex);
        const nextVocab = batchVocabList[nextIndex];

        // Lấy dữ liệu từ API cho từ tiếp theo
        const aiData = await handleGeminiAssist(nextVocab);

        // Hiển thị form với dữ liệu mới (chưa tạo trong database)
        setEditingCard({
            id: null, // Chưa có id vì chưa tạo trong database
            front: aiData?.frontWithFurigana || nextVocab,
            back: aiData?.meaning || '',
            synonym: aiData?.synonym || '',
            example: aiData?.example || '',
            exampleMeaning: aiData?.exampleMeaning || '',
            nuance: aiData?.nuance || '',
            pos: aiData?.pos || '',
            level: aiData?.level || '',
            sinoVietnamese: aiData?.sinoVietnamese || '',
            synonymSinoVietnamese: aiData?.synonymSinoVietnamese || '',
            imageBase64: null,
            audioBase64: null,
        });

        setView('ADD_CARD');
        setNotification(`Đang xử lý từ vựng ${nextIndex + 1}/${batchVocabList.length}...`);
    };

    // Hàm xử lý khi bỏ qua từ vựng hiện tại
    const handleBatchSkip = async () => {
        if (currentBatchIndex >= batchVocabList.length - 1) {
            // Đã hết danh sách
            setBatchVocabList([]);
            setCurrentBatchIndex(0);
            setEditingCard(null);
            setNotification('Đã hoàn thành xử lý tất cả từ vựng!');
            setView('HOME');
            return;
        }

        // Chuyển sang từ tiếp theo
        const nextIndex = currentBatchIndex + 1;
        setCurrentBatchIndex(nextIndex);
        const nextVocab = batchVocabList[nextIndex];

        // Lấy dữ liệu từ API cho từ tiếp theo
        const aiData = await handleGeminiAssist(nextVocab);

        // Hiển thị form với dữ liệu mới
        setEditingCard({
            id: null,
            front: aiData?.frontWithFurigana || nextVocab,
            back: aiData?.meaning || '',
            synonym: aiData?.synonym || '',
            example: aiData?.example || '',
            exampleMeaning: aiData?.exampleMeaning || '',
            nuance: aiData?.nuance || '',
            pos: aiData?.pos || '',
            level: aiData?.level || '',
            sinoVietnamese: aiData?.sinoVietnamese || '',
            synonymSinoVietnamese: aiData?.synonymSinoVietnamese || '',
            imageBase64: null,
            audioBase64: null,
        });

        setView('ADD_CARD');
        setNotification(`Đã bỏ qua. Đang xử lý từ vựng ${nextIndex + 1}/${batchVocabList.length}...`);
    };

    const handleBatchImport = async (cardsArray) => {
        if (!vocabCollectionPath || cardsArray.length === 0) return;

        setIsLoading(true);
        setNotification(`Đang xử lý ${cardsArray.length} thẻ...`);

        try {
            const importedCardsLocal = [];
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

            setNotification(message);

            setIsLoading(false);
            setView('HOME');

        } catch (e) {
            console.error("Lỗi khi nhập hàng loạt:", e);
            setNotification(`Lỗi khi nhập: ${e.message}. Vui lòng thử chia nhỏ file.`);
            setIsLoading(false);
        }
    };

    const handleDeleteCard = async (cardId, cardFront) => {
        if (!vocabCollectionPath || !cardId) return;

        // Add confirmation dialog
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa thẻ "${cardFront}"?`);
        if (!confirmed) return;

        // Optimistic UI update - remove from local state immediately
        setAllCards(prevCards => prevCards.filter(card => card.id !== cardId));
        setNotification(`Đang xoá thẻ: ${cardFront}...`);

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
            setNotification(`Lỗi khi xoá thẻ: ${e.message}`);
            // Reload cards from Firebase on error to restore state
            // The onSnapshot listener will automatically restore the card
        }
    };

    const handleUpdateCard = async (cardId, isCorrect, cardReviewType, activityType = 'review', responseTimeMs = null) => {
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

        // Chuẩn hóa dữ liệu trước khi xử lý
        let normalizedInterval = typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1;
        if (normalizedInterval === -999) normalizedInterval = -1;

        const normalizedCardData = {
            ...cardData,
            intervalIndex_back: normalizedInterval,
            easeFactor: typeof cardData.easeFactor === 'number' ? cardData.easeFactor : DEFAULT_EASE,
            totalReps: typeof cardData.totalReps === 'number' ? cardData.totalReps : 0,
            currentInterval_back: typeof cardData.currentInterval_back === 'number' ? cardData.currentInterval_back : 0,
            correctStreak_back: typeof cardData.correctStreak_back === 'number' ? cardData.correctStreak_back : 0,
            correctStreak_synonym: typeof cardData.correctStreak_synonym === 'number' ? cardData.correctStreak_synonym : 0,
            correctStreak_example: typeof cardData.correctStreak_example === 'number' ? cardData.correctStreak_example : 0,
        };

        // Sử dụng SRS engine mới để tính toán
        const updateData = processSrsUpdate(normalizedCardData, isCorrect, cardReviewType, activityType, responseTimeMs);

        // Thay lastReviewed bằng serverTimestamp cho Firestore
        updateData.lastReviewed = serverTimestamp();

        try {
            await updateDoc(cardRef, updateData);
        } catch (e) {
            console.error("Lỗi khi cập nhật thẻ:", e);
        }
    };

    // Lưu cardId để scroll đến sau khi save
    const scrollToCardIdRef = useRef(null);
    // Lưu view trước đó để phát hiện thay đổi view
    const prevViewRef = useRef(view);

    // Scroll về đầu trang khi chuyển view (trừ khi có scrollToCardId)
    useEffect(() => {
        // Nếu view thay đổi và không phải scroll đến card cụ thể
        if (prevViewRef.current !== view && !scrollToCardIdRef.current) {
            // Scroll về đầu trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Nếu có container chính, scroll container đó
            const mainContainer = document.querySelector('.main-with-header');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        prevViewRef.current = view;
    }, [view]);

    // Load editingCard from URL parameter when navigating to edit route
    useEffect(() => {
        // Check if we're on the edit route by looking at the pathname
        if (location.pathname.includes('/vocabulary/edit/')) {
            // Extract card ID from URL
            const pathParts = location.pathname.split('/');
            const cardId = pathParts[pathParts.length - 1];

            if (cardId && allCards.length > 0) {
                // Check if we need to load or update the editingCard
                // Load if: no editingCard OR editingCard.id doesn't match URL card ID
                if (!editingCard || editingCard.id !== cardId) {
                    // Find the card in allCards
                    const card = allCards.find(c => c.id === cardId);
                    if (card) {
                        setEditingCard(card);
                    } else {
                        // Card not found, redirect to vocabulary list
                        setNotification('Không tìm thấy thẻ này');
                        navigate(ROUTES.VOCAB_REVIEW);
                    }
                }
            }
        }
    }, [editingCard, allCards, location.pathname, navigate]);

    const handleNavigateToEdit = (card, currentFilters) => {
        // Lưu cardId để scroll đến sau khi quay lại
        scrollToCardIdRef.current = card.id;
        // Lưu filter state hiện tại
        if (currentFilters) {
            setSavedFilters(currentFilters);
        }
        // DON'T set editingCard here - let the useEffect handle it from URL
        // This avoids race conditions between state updates and navigation
        // Navigate to edit URL with card ID
        navigate(getEditRoute(card.id));
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

        // CHỈ cập nhật audioBase64 nếu có giá trị mới (không null/undefined)
        // Nếu audioBase64 là null, có nghĩa là người dùng muốn xóa audio
        // Nếu audioBase64 là undefined, giữ nguyên audio cũ (không cập nhật)
        if (audioBase64 !== undefined) {
            if (audioBase64 === null) {
                // Người dùng muốn xóa audio
                updatedData.audioBase64 = null;
            } else if (audioBase64 !== '') {
                // Có audio mới
                updatedData.audioBase64 = audioBase64;
            }
            // Nếu audioBase64 === '', không cập nhật (giữ nguyên audio cũ)
        }

        try {
            await updateDoc(doc(db, vocabCollectionPath, cardId), updatedData);
            setNotification(`Đã cập nhật thẻ: ${front}`);
            // Giữ lại cardId để scroll đến sau khi quay lại LIST
            // Không setEditingCard(null) ngay để giữ thông tin card
            setEditingCard(null);
            // KHÔNG reset savedFilters để giữ nguyên bộ lọc
            setView('LIST');
            // Scroll đến card sẽ được xử lý trong ListView component 


        } catch (e) {
            console.error("Lỗi khi cập nhật thẻ:", e);
            setNotification("Lỗi khi cập nhật thẻ.");
        }
    };

    const handleUpdateGoal = async (goalData) => {
        if (!settingsDocPath) {
            setNotification("Lỗi: Không tìm thấy cấu hình người dùng.");
            return;
        }
        try {
            // Hỗ trợ cả format cũ (number) và mới (object)
            if (typeof goalData === 'object') {
                const updateFields = {};
                if (goalData.vocabGoal !== undefined) updateFields.dailyGoal = Number(goalData.vocabGoal);
                if (goalData.kanjiGoal !== undefined) updateFields.dailyKanjiGoal = Number(goalData.kanjiGoal);
                await updateDoc(doc(db, settingsDocPath), updateFields);
            } else {
                await updateDoc(doc(db, settingsDocPath), { dailyGoal: Number(goalData) });
            }
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

    // --- Handle Update Profile Name ---
    const handleUpdateProfileName = async (newName) => {
        if (!auth?.currentUser) throw new Error('Chưa đăng nhập');
        try {
            const { updateProfile: firebaseUpdateProfile } = await import('firebase/auth');
            await firebaseUpdateProfile(auth.currentUser, { displayName: newName });
            // Also update Firestore profile
            if (settingsDocPath) {
                await updateDoc(doc(db, settingsDocPath), { displayName: newName });
            }
            setProfile(prev => ({ ...prev, displayName: newName }));
            setNotification('Đã cập nhật tên hiển thị!');
        } catch (e) {
            console.error('Lỗi cập nhật tên:', e);
            throw e;
        }
    };

    // --- Handle Change Password ---
    const handleChangePassword = async (oldPassword, newPassword) => {
        if (!auth?.currentUser) throw new Error('Chưa đăng nhập');
        try {
            const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
            if (oldPassword) {
                const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);
            }
            await updatePassword(auth.currentUser, newPassword);
            setNotification('Đã đổi mật khẩu thành công!');
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            throw e;
        }
    };

    // --- Helper: Lấy danh sách API keys ---
    const getGeminiApiKeys = () => {
        // Ưu tiên dùng keys từ state (có thể được cấu hình từ UI)
        if (geminiApiKeys && geminiApiKeys.length > 0) {
            return geminiApiKeys;
        }
        // Fallback: lấy từ env (VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2, ..., VITE_GEMINI_API_KEY_N)
        return getAllGeminiApiKeysFromEnv();
    };

    // --- Helper: Gọi Gemini API với retry logic tự động chuyển key + fallback model ---
    const GEMINI_MODELS_FALLBACK = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    const callGeminiApiWithRetry = async (payload, model = 'gemini-2.0-flash-lite', _triedModels = null) => {
        const apiKeys = getGeminiApiKeys();
        const triedModels = _triedModels || new Set();

        if (apiKeys.length === 0) {
            setNotification("Chưa cấu hình khóa API Gemini. Vui lòng thêm VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2, ... vào file .env hoặc cấu hình trong Settings.");
            throw new Error("Không có API key nào được cấu hình");
        }

        let lastError = null;
        let allKeysRateLimited = true;

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
                    return result;
                }

                let errorBody = "";
                try {
                    errorBody = await response.text();
                    console.error(`Gemini error với key ${i + 1}/${apiKeys.length} (${model}):`, errorBody);
                } catch (err) {
                    console.error('Error reading error response:', err);
                }

                // Các lỗi có thể retry với key khác: 401, 403, 429
                const retryableErrors = [401, 403, 429, 503];
                if (retryableErrors.includes(response.status)) {
                    lastError = new Error(`Lỗi API Gemini với key ${i + 1}: ${response.status} ${response.statusText}`);
                    if (response.status !== 429 && response.status !== 503) {
                        allKeysRateLimited = false;
                    }
                    continue;
                } else {
                    allKeysRateLimited = false;
                    if (response.status === 400) {
                        setNotification(`Lỗi yêu cầu không hợp lệ (400). Vui lòng kiểm tra lại dữ liệu đầu vào.`);
                    } else {
                        setNotification(`Lỗi từ Gemini: ${response.status} ${response.statusText}. Xem chi tiết trong console.`);
                    }
                    throw new Error(`Lỗi API Gemini: ${response.status} ${response.statusText} ${errorBody}`);
                }
            } catch (e) {
                if (e.message && e.message.includes("Lỗi API Gemini")) {
                    throw e;
                }
                console.error(`Lỗi network với key ${i + 1}:`, e);
                lastError = e;
                allKeysRateLimited = false;
                if (i < apiKeys.length - 1) {
                    continue;
                }
            }
        }

        // Tất cả keys bị rate limit → thử fallback model
        if (allKeysRateLimited && lastError) {
            triedModels.add(model);
            const fallbackModel = GEMINI_MODELS_FALLBACK.find(m => !triedModels.has(m));
            if (fallbackModel) {
                console.log(`⚡ Tất cả keys hết quota cho ${model}, thử model: ${fallbackModel}...`);
                setNotification(`Đang thử model ${fallbackModel}...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return callGeminiApiWithRetry(payload, fallbackModel, triedModels);
            }
        }

        // Tất cả keys + models đều thất bại
        if (lastError) {
            setNotification(`Tất cả ${apiKeys.length} API key đều hết quota. Vui lòng chờ vài phút rồi thử lại.`);
            throw lastError;
        }

        throw new Error("Không thể gọi API Gemini với bất kỳ key nào");
    };

    // --- UNIFIED AI ASSISTANT (hỗ trợ Gemini + Groq + OpenRouter) ---
    const handleGeminiAssist = async (frontText, contextPos = '', contextLevel = '') => {
        if (!frontText) return null;

        // Tạo ngữ cảnh bổ sung cho AI
        let contextInfo = "";
        if (contextPos) contextInfo += `, Từ loại: ${contextPos}`;
        if (contextLevel) contextInfo += `, Cấp độ: ${contextLevel}`;

        const prompt = `Bạn là trợ lý từ điển Nhật-Việt chuyên nghiệp. Người dùng đang tìm kiếm thông tin cho từ vựng: "${frontText}"${contextInfo}.
Trả về **DUY NHẤT** một JSON hợp lệ, không kèm giải thích, theo đúng schema sau:
{
  "frontWithFurigana": "食べる（たべる）",
  "meaning": "ăn",
  "pos": "verb",
  "level": "N5",
  "sinoVietnamese": "THỰC",
  "synonym": "食う",
  "synonymSinoVietnamese": "THỰC",
  "example": "毎日ご飯を食べます。",
  "exampleMeaning": "Tôi ăn cơm mỗi ngày.",
  "nuance": "Động từ ăn thông dụng nhất, dùng được trong mọi tình huống từ giao tiếp hàng ngày đến văn viết trang trọng. Khác với 食う（くう）mang sắc thái thô, nam tính."
}

=== QUY TẮC BẮT BUỘC ===

0. TUÂN THỦ NGHIÊM NGẶT LOẠI TỪ & CẤP ĐỘ ĐÃ CHỌN (TỐI QUAN TRỌNG):
- Nếu Người dùng có đính kèm "Từ loại" ở ngữ cảnh đầu vào (VD: grammar, noun, verb...): BẮT BUỘC trường 'pos', cách giải thích nghĩa, và câu ví dụ PHẢI thể hiện đúng chức năng của loại từ đó (VD: Yêu cầu "grammar" thì PHẢI giải thích như một TRỌNG ĐIỂM NGỮ PHÁP).
- Nếu Người dùng có đính kèm "Cấp độ" (VD: N3, N4...): BẮT BUỘC trường 'level' phải đúng y hệt như yêu cầu và nội dung kiến thức phải được giải thích ở cấp độ đó.

0.1. NHẬN DIỆN CỤM TỪ / THÀNH NGỮ:
- Nếu người dùng nhập CỤM TỪ có chứa trợ từ (を、に、が、で、と...) hoặc nhiều từ ghép nhau (VD: 迷惑をかける、気にする、手を出す、目を通す、腹が立つ), thì ĐÂY LÀ MỘT CỤM TỪ / THÀNH NGỮ, KHÔNG PHẢI TỪ ĐƠN.
- pos BẮT BUỘC là "phrase".
- frontWithFurigana: GIỮ NGUYÊN CẢ CỤM, thêm furigana cho từng kanji riêng biệt. VD: 迷惑をかける（めいわくをかける）, 気にする（きにする）.
- meaning: Nghĩa CỦA CẢ CỤM, KHÔNG phải nghĩa từng từ riêng lẻ. VD: 迷惑をかける = "gây phiền hà; làm phiền" (KHÔNG phải "rắc rối" + "treo").
- sinoVietnamese: Chỉ lấy phần Kanji trong cụm. VD: 迷惑をかける → "MÊ HOẶC".
- example: Câu ví dụ PHẢI chứa nguyên cả cụm.

1. TRƯỜNG "frontWithFurigana":
- Nếu từ là động từ hoặc tính từ đang bị chia (vd: 食べます, 食べた, 高かった), BẮT BUỘC trả về NGUYÊN DẠNG / THỂ TỪ ĐIỂN (vd: 食べる, 高い).
- Nếu từ có Kanji: viết Kanji rồi thêm cách đọc hiragana vào trong dấu ngoặc Nhật （）. Ví dụ: 食べる（たべる）
- Nếu từ chỉ có hiragana/katakana: giữ nguyên. Ví dụ: やっぱり
- LƯU Ý ĐẶC BIỆT: Nếu người dùng có nhập kèm hiragana định hướng cách đọc (VD: 開く(あく) hoặc 空(から)), BẮT BUỘC phải tôn trọng làm theo cách đọc đó thay vì lấy cách phổ biến nhất.
- TUYỆT ĐỐI KHÔNG để Kanji vào bên trong ngoặc: Sai: （食べる）, Sai: 食べる(食べる). Đúng: 食べる（たべる）.
- BẮT BUỘC dùng ngoặc Nhật full-width （）, KHÔNG dùng ngoặc đơn thường ().

2. TRƯỜNG "meaning":
- Nghĩa tiếng Việt NGẮN GỌN. Nếu có nhiều nghĩa KHÁC NHAU HOÀN TOÀN thì ngăn cách các nghĩa bằng dấu chấm phẩy ";". Ví dụ: "ăn; sống (bằng nghề)"
- TUYỆT ĐỐI KHÔNG liệt kê các nghĩa gần giống nhau.

3. TRƯỜNG "example" và "exampleMeaning":
- LUÔN LUÔN CHỈ TẠO ĐÚNG 1 CÂU VÍ DỤ DUY NHẤT. TUYỆT ĐỐI KHÔNG TẠO 2 CÂU TRỞ LÊN dù từ có bao nhiêu nghĩa.
- Người dùng sẽ TỰ chọn tạo thêm ví dụ sau, AI KHÔNG được tự ý tạo nhiều hơn 1 câu.
- Câu ví dụ BẮT BUỘC PHẢI DÙNG TỪ VỰNG GỐC: "${frontText}", NHƯNG CÓ THỂ CHIA THÌ/THỂ ĐỘNG TỪ (VD: ~ます, ~た, ~て) để câu tự nhiên nhất.
- KHÔNG đánh số. "exampleMeaning" cũng CHỈ 1 dòng duy nhất.
- ĐẶC BIỆT CHO CẤP ĐỘ N5: Nếu từ vựng thuộc cấp N5, câu ví dụ PHẢI đơn giản, VIẾT BẰNG HIRAGANA/KATAKANA là chủ yếu, TRÁNH dùng Kanji khó. Chỉ dùng Kanji rất cơ bản mà người mới học biết (như 私、人、日、大、小). VD tốt: "まいにち にほんごを べんきょうします。" VD xấu (quá nhiều kanji): "毎日日本語を勉強します。"

4. TRƯỜNG "sinoVietnamese" (Âm Hán Việt):
- BẮT BUỘC điền nếu từ có Kanji. Viết IN HOA âm Hán Việt của TỪNG Kanji, cách nhau bằng dấu cách.
- QUAN TRỌNG: PHÂN TÍCH TỪNG CHỮ KANJI MỘT ĐỂ LẤY ÂM HÁN VIỆT. TUYỆT ĐỐI KHÔNG ĐƯỢC CHẾ ÂM. Ví dụ: 奥様 gồm "奥" (ÁO/Úc) và "様" (DẠNG) → "ÁO DẠNG" (không được bịa thành ÁO THỪA). 
- CHỈ CHỌN ÂM HÁN VIỆT PHỔ BIẾN NHẤT hoặc ĐÚNG NHẤT với nghĩa. Ví dụ: 流行 → "LƯU HÀNH", 行 → "HÀNH" (hoặc "HẠNG" tùy nghĩa).
- CHỈ lấy âm Hán Việt của phần KANJI, bỏ qua phần hiragana (okurigana). VD: 新しい → "TÂN".
- Nếu KHÔNG có Kanji thì để trống "".

5. TRƯỜNG "nuance" (Sắc thái, ngữ cảnh sử dụng):
- PHẢI giải thích CHI TIẾT, DỄ HIỂU về bối cảnh sử dụng từ vựng.
- NẾU LÀ ĐỘNG TỪ: BẮT BUỘC chú thích rõ đây là Tự động từ (TĐT - thường đi với が/に) hay Tha động từ (ThaĐT - thường đi với を). Ghi rõ TĐT/ThaĐT tương ứng nếu có (Ví dụ: Tha động từ. Tự động từ tương ứng là 始まる).
- NẾU LÀ TỪ NGOẠI LAI (Katakana): Ghi chú rõ từ gốc trong ngôn ngữ mẹ đẻ (Ví dụ: Từ gốc tiếng Anh "part-time").
- Ví dụ TỐT: "Dùng trong giao tiếp hàng ngày, mức độ lịch sự trung bình. Trong văn viết trang trọng nên dùng 召し上がる. Khác với 食う mang sắc thái thô tục, chỉ nam giới dùng."
- Ví dụ XẤU (quá ngắn): "Dùng phổ biến."

6. TRƯỜNG "pos" (Từ loại):
- NẾU người dùng đã chọn từ loại ở ngữ cảnh, BẮT BUỘC DÙNG LẠI TỪ LOẠI ĐÓ.
- Nếu không, CHỈ ĐƯỢC CHỌN 1 TRONG CÁC GIÁ TRỊ SAU, viết y hệt (không viết hoa, không chỉnh sửa):
  "noun", "verb", "suru_verb", "adj_i", "adj_na", "adverb", "conjunction", "particle", "grammar", "phrase", "other".
- Tuyệt đối không tự bịa ra từ loại mới.

7. TRƯỜNG "synonym" và "synonymSinoVietnamese":
- Nếu có từ đồng nghĩa THẬT SỰ TỒN TẠI trong tiếng Nhật và phù hợp ngữ cảnh, hãy điền vào. CÓ THỂ ĐIỀN NHIỀU TỪ ĐỒNG NGHĨA cách nhau bằng dấu phẩy (,).
- QUAN TRỌNG: Từ đồng nghĩa PHẢI thuộc cấp độ JLPT TƯƠNG ĐƯƠNG HOẶC DỄ HƠN từ vựng gốc (VD: từ gốc N3 thì từ đồng nghĩa phải là N3, N4, N5). TUYỆT ĐỐI không dùng từ khó hơn (như N1, N2) vì người học chưa biết.
- ĐẶC BIỆT: Nếu từ vựng thuộc cấp N5, KHÔNG TẠO từ đồng nghĩa. BẮT BUỘC để chuỗi rỗng "". Người mới học chưa cần từ đồng nghĩa.
- LƯU Ý synonymSinoVietnamese: Nếu các từ ở mục synonym CÓ KANJI, BẮT BUỘC điền âm Hán Việt tương ứng cách nhau bằng phẩy. Nếu hoàn toàn không có Kanji thì để "".

8. TRƯỜNG "level" (JLPT):
- NẾU người dùng đã chọn cấp độ N ở ngữ cảnh, BẮT BUỘC TRẢ VỀ CẤP ĐỘ ĐÓ.
- Nếu không, CHỈ ĐƯỢC CHỌN: "N5", "N4", "N3", "N2", "N1". 
- Nếu không thuộc cấp độ nào hoặc mức độ quá khó/đặc biệt, hãy để chuỗi rỗng "". KHÔNG ghi "N0", "Unknown".

Không được trả về markdown, không được dùng backtick, không được trả lời thêm bất cứ chữ nào ngoài JSON.`;

        try {
            // Kiểm tra quyền AI
            if (!canUserUseAI) {
                setNotification('Bạn chưa được cấp quyền sử dụng AI. Liên hệ admin để được cấp quyền.');
                return null;
            }

            const providerInfo = getAIProviderInfo();
            console.log(`🤖 AI Providers: ${providerInfo.summary}`);

            // Sử dụng provider admin chỉ định (nếu có)
            const forcedProvider = adminConfig?.aiProvider || 'auto';
            const responseText = await callAI(prompt, forcedProvider);
            const parsedJson = parseJsonFromAI(responseText);

            if (parsedJson) {
                // Chuẩn hóa pos key (AI có thể trả adj_i thay vì adj-i)
                if (parsedJson.pos) parsedJson.pos = normalizePosKey(parsedJson.pos);

                // Ghi đè âm Hán Việt bằng bảng tra cứu cứng (ưu tiên hơn AI)
                try {
                    const { getSinoVietnamese } = await import('./utils/aiProvider');
                    const lookupHV = getSinoVietnamese(frontText);
                    if (lookupHV) {
                        console.log(`📘 Hán Việt lookup: "${frontText}" → "${lookupHV}" (AI: "${parsedJson.sinoVietnamese || ''}")`);
                        parsedJson.sinoVietnamese = lookupHV;
                    }
                } catch (e) { console.warn('Lookup Hán Việt error:', e); }

                return parsedJson;
            } else {
                setNotification("AI trả về dữ liệu không phải JSON hợp lệ. Thử lại.");
                return null;
            }
        } catch (e) {
            console.error("Lỗi AI Assist:", e);
            setNotification(e.message || "Không gọi được AI. Kiểm tra API key hoặc thử lại sau.");
            return null;
        }
    };

    const handleGenerateMoreExample = async (frontText, targetMeaning) => {
        if (!frontText || !targetMeaning) return null;
        try {
            if (!canUserUseAI) {
                setNotification('Bạn chưa được cấp quyền sử dụng AI. Liên hệ admin để được cấp quyền.');
                return null;
            }
            const { generateMoreExamplePrompt } = await import('./utils/aiProvider');
            const prompt = generateMoreExamplePrompt(frontText, targetMeaning);
            const forcedProvider = adminConfig?.aiProvider || 'auto';
            const responseText = await callAI(prompt, forcedProvider);
            const parsedJson = parseJsonFromAI(responseText);
            if (parsedJson) return parsedJson;
            setNotification("AI trả về dữ liệu không hợp lệ. Thử lại.");
            return null;
        } catch (e) {
            console.error("Lỗi tạo thêm ví dụ AI:", e);
            setNotification("Không thể tạo thêm ví dụ. Thử lại sau.");
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
    // Note: Function này chưa được sử dụng, có thể implement sau
    /*
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
            setNotification("Chưa cấu hình khóa API Gemini cho Hán Việt. Vui lòng thêm VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2, ... vào file .env.");
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
    */


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
                    mastered: allCards.filter(c => c.intervalIndex_back >= 4).length,
                    lastUpdated: serverTimestamp()
                };
                await setDoc(statsDocRef, publicData, { merge: true }).catch(err => {
                    // Ignore network/resource errors to prevent console spam
                    if (err?.code !== 'unavailable' && err?.code !== 'resource-exhausted' && err?.message?.includes('ERR_INSUFFICIENT_RESOURCES') === false) {
                        console.error("Lỗi cập nhật public stats:", err);
                    }
                });
            } catch (e) {
                // Ignore network/resource errors to prevent console spam
                if (e?.code !== 'unavailable' && e?.code !== 'resource-exhausted' && e?.message?.includes('ERR_INSUFFICIENT_RESOURCES') === false) {
                    console.error("Lỗi cập nhật public stats:", e);
                }
            }
        };

        // Debounce để tránh quá nhiều requests
        const timeoutId = setTimeout(() => {
            updatePublicStats();
        }, 2000); // Delay 2 giây để tránh spam requests

        return () => clearTimeout(timeoutId);

    }, [memoryStats, allCards.length, profile, userId, authReady, publicStatsCollectionPath]);


    // Nếu chưa biết trạng thái auth, show loading
    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 w-10 h-10" />
            </div>
        );
    }

    // Nếu chưa có userId (chưa đăng nhập), hiển thị màn Login
    if (!userId) {
        return <LoginScreen />;
    }

    if (isLoading || isProfileLoading || !profile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 w-10 h-10" />
            </div>
        );
    }

    // Đã bỏ PaymentScreen - người dùng vào app trực tiếp sau đăng nhập

    const renderContent = () => {
        switch (view) {
            case 'ADD_CARD':
                return <AddCardForm
                    onSave={handleAddCard}
                    onBack={() => {
                        if (batchVocabList.length > 0 && currentBatchIndex < batchVocabList.length) {
                            // Đang trong batch mode, hủy batch
                            setBatchVocabList([]);
                            setCurrentBatchIndex(0);
                        }
                        setEditingCard(null);
                        setView('HOME');
                    }}
                    onGeminiAssist={handleGeminiAssist}
                    batchMode={batchVocabList.length > 0 && currentBatchIndex < batchVocabList.length}
                    currentBatchIndex={currentBatchIndex}
                    totalBatchCount={batchVocabList.length}
                    onBatchNext={handleBatchSaveNext}
                    onBatchSkip={handleBatchSkip}
                    editingCard={editingCard}
                    onOpenBatchImport={() => setShowBatchImportModal(true)}
                />;
            case 'EDIT_CARD':
                if (!editingCard) {
                    // Show loading while useEffect loads the card from URL
                    return (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="text-center">
                                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 w-8 h-8 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Đang tải thẻ...</p>
                            </div>
                        </div>
                    );
                }
                return <EditCardForm
                    card={editingCard}
                    onSave={handleSaveChanges}
                    onBack={() => { setEditingCard(null); navigate(ROUTES.VOCAB_REVIEW); }} // Giữ filter khi quay lại
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
            case 'FLASHCARD':
                console.log('FLASHCARD case, flashcardCards:', flashcardCards.length);
                if (flashcardCards.length === 0) {
                    console.log('No flashcard cards, showing complete screen');
                    return <ReviewCompleteScreen onBack={() => setView('HOME')} />;
                }
                return <FlashcardScreen
                    cards={flashcardCards}
                    onComplete={() => {
                        setFlashcardCards([]);
                        setView('HOME');
                    }}
                />;
            case 'KANJI':
                return <KanjiScreen isAdmin={isAdmin} onAddVocabToSRS={handleSaveNewCard} onGeminiAssist={handleGeminiAssist} allUserCards={allCards} />;
            case 'REVIEW':
                if (reviewCards.length === 0) {
                    return <ReviewCompleteScreen onBack={() => setView('HOME')} />;
                }
                return <ReviewScreen
                    cards={reviewCards}
                    reviewMode={reviewMode}
                    allCards={allCards}
                    onUpdateCard={handleUpdateCard}
                    vocabCollectionPath={vocabCollectionPath}
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
                />;
            case 'LIST':
                return <ListView
                    allCards={allCards}
                    onDeleteCard={handleDeleteCard}
                    onPlayAudio={playAudio}
                    onExport={() => handleExport(allCards)}
                    onNavigateToEdit={handleNavigateToEdit}
                    onNavigateToImport={() => setView('IMPORT')}
                    scrollToCardId={scrollToCardIdRef.current}
                    onScrollComplete={() => { scrollToCardIdRef.current = null; }}
                    savedFilters={savedFilters}
                    onFiltersChange={(filters) => setSavedFilters(filters)}
                />;
            case 'IMPORT':
                return <ImportScreen
                    onImport={handleBatchImport}
                />;
            case 'HELP':
                return <HelpScreen
                    isFirstTime={false}
                />;
            case 'HUB':
                return <StatsScreen
                    memoryStats={memoryStats}
                    totalCards={allCards.length}
                    profile={profile}
                    allCards={allCards}
                    dailyActivityLogs={dailyActivityLogs}
                    onUpdateGoal={handleUpdateGoal}
                    onBack={() => setView('HOME')}
                    userId={userId}
                    publicStatsPath={publicStatsCollectionPath}
                    initialTab="stats"
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
                    onChangePassword={async (newPassword) => {
                        if (!auth || !auth.currentUser) throw new Error('Chưa đăng nhập.');
                        // Với Email/Password, để đổi mật khẩu an toàn bạn nên reauthenticate với currentPassword.
                        // Ở đây, để đơn giản, ta chỉ gọi updatePassword (Firebase có thể yêu cầu re-auth trong một số trường hợp).
                        await updatePassword(auth.currentUser, newPassword);
                    }}
                    onBack={() => setView('HOME')}
                />;
            case 'ADMIN':
                if (!isAdmin) {
                    setView('HOME');
                    return null;
                }
                return <AdminScreen
                    publicStatsPath={publicStatsCollectionPath}
                    currentUserId={userId}
                    onAdminDeleteUserData={handleAdminDeleteUserData}
                />;
            case 'HOME':
            default:
                return <HomeScreen
                    displayName={profile.displayName}
                    dueCounts={dueCounts}
                    totalCards={allCards.length}
                    allCards={allCards}
                    userId={userId}
                    studySessionData={studySessionData}
                    setStudySessionData={setStudySessionData}
                    setNotification={setNotification}
                    setReviewMode={setReviewMode}
                    setView={setView}
                    onStartReview={prepareReviewCards}
                    onNavigate={setView}
                    setFlashcardCards={setFlashcardCards}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-800 dark:selection:text-indigo-200">
            {/* Sidebar for navigation */}
            <Sidebar
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                displayName={profile?.displayName}
                isAdmin={isAdmin}
            />

            {/* Onboarding tour for new users */}
            {userId && <OnboardingTour userId={userId} />}

            {/* Modal nhập từ vựng hàng loạt */}
            {showBatchImportModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">Thêm từ vựng hàng loạt</h2>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">Mỗi từ vựng trên một dòng</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">
                            <textarea
                                value={batchVocabInput}
                                onChange={(e) => setBatchVocabInput(e.target.value)}
                                placeholder="適当&#10;高まる&#10;現れる&#10;低下&#10;真実&#10;ガム&#10;環境汚染&#10;健康&#10;沈む&#10;支払い"
                                className="w-full h-64 md:h-80 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono"
                            />
                        </div>
                        <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBatchImportModal(false);
                                    setBatchVocabInput('');
                                }}
                                className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base font-medium rounded-lg md:rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={async () => {
                                    if (!batchVocabInput.trim()) {
                                        setNotification('Vui lòng nhập danh sách từ vựng!');
                                        return;
                                    }
                                    // Parse danh sách từ vựng (tách theo xuống dòng)
                                    const vocabList = batchVocabInput
                                        .split('\n')
                                        .map(line => line.trim())
                                        .filter(line => line.length > 0);

                                    if (vocabList.length === 0) {
                                        setNotification('Không tìm thấy từ vựng nào!');
                                        return;
                                    }

                                    setBatchVocabInput('');
                                    await handleBatchImportFromText(vocabList);
                                }}
                                disabled={isProcessingBatch || !batchVocabInput.trim()}
                                className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isProcessingBatch ? (
                                    <>
                                        <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5 inline mr-2" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Nhập'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content area - responsive for sidebar */}
            <main className={`lg:ml-64 min-h-screen pt-14 lg:pt-0 ${view === 'REVIEW' || view === 'STUDY' || view === 'FLASHCARD' || view === 'KANJI' ? 'bg-transparent' : ''}`}>
                <div className={`${view === 'REVIEW' || view === 'STUDY' || view === 'FLASHCARD' ? 'w-full h-screen flex items-center justify-center bg-transparent' : view === 'KANJI' ? 'w-full min-h-screen' : 'w-full max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6'}`}>
                    {/* Main content container - transparent */}
                    <div className={`${view === 'REVIEW' || view === 'STUDY' || view === 'FLASHCARD' || view === 'KANJI' ? 'bg-transparent' : ''}`}>
                        <div className={view === 'REVIEW' || view === 'STUDY' || view === 'FLASHCARD' || view === 'KANJI' ? 'bg-transparent' : ''}>
                            <AppRoutes
                                isAuthenticated={!!userId}
                                isLoading={isLoading}
                                userId={userId}
                                profile={profile}
                                allCards={allCards}
                                reviewCards={reviewCards}
                                reviewMode={reviewMode}
                                editingCard={editingCard}
                                dueCounts={dueCounts}
                                memoryStats={memoryStats}
                                dailyActivityLogs={dailyActivityLogs}
                                studySessionData={studySessionData}
                                savedFilters={savedFilters}
                                scrollToCardId={scrollToCardIdRef?.current}
                                flashcardCards={flashcardCards}
                                vocabCollectionPath={vocabCollectionPath}
                                publicStatsCollectionPath={publicStatsCollectionPath}
                                isAdmin={isAdmin}
                                isDarkMode={isDarkMode}
                                adminConfig={adminConfig}
                                canUserUseAI={canUserUseAI}
                                userHasAdminPrivileges={userHasAdminPrivileges}
                                currentUserEmail={auth?.currentUser?.email}
                                setView={setView}
                                setEditingCard={setEditingCard}
                                setStudySessionData={setStudySessionData}
                                setReviewCards={setReviewCards}
                                setReviewMode={setReviewMode}
                                setSavedFilters={setSavedFilters}
                                setNotification={setNotification}
                                setIsDarkMode={setIsDarkMode}
                                setFlashcardCards={setFlashcardCards}
                                prepareReviewCards={prepareReviewCards}
                                handleUpdateCard={handleUpdateCard}
                                handleDeleteCard={handleDeleteCard}
                                handleSaveNewCard={handleAddCard}
                                handleSaveChanges={handleSaveChanges}
                                handleGeminiAssist={handleGeminiAssist}
                                handleGenerateMoreExample={handleGenerateMoreExample}
                                handleBatchImport={handleBatchImport}
                                handleBatchSaveNext={handleBatchSaveNext}
                                handleBatchSkip={handleBatchSkip}
                                handleExport={handleExport}
                                handleImportTSV={handleImportTSV}
                                handleNavigateToEdit={handleNavigateToEdit}
                                handleUpdateGoal={handleUpdateGoal}
                                handleAdminDeleteUserData={handleAdminDeleteUserData}
                                handleUpdateProfileName={handleUpdateProfileName}
                                handleChangePassword={handleChangePassword}
                                batchMode={batchVocabList.length > 0 && currentBatchIndex < batchVocabList.length}
                                currentBatchIndex={currentBatchIndex}
                                batchVocabList={batchVocabList}
                                setShowBatchImportModal={setShowBatchImportModal}
                                scrollToCardIdRef={scrollToCardIdRef}
                                playAudio={playAudio}
                                shuffleArray={shuffleArray}
                            />
                        </div>

                        {/* Notification */}
                        {notification && (view === 'HOME' || view === 'HUB' || view === 'ADD_CARD' || view === 'LIST') && (
                            <div className={`mt-4 md:mt-6 p-3 md:p-4 rounded-xl text-center text-sm font-medium animate-fade-in flex items-center justify-center space-x-2
                                ${notification.includes('Lỗi') || notification.includes('có trong')
                                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'}`}>
                                {notification.includes('Lỗi') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                <span>{notification}</span>
                            </div>
                        )}


                    </div>
                </div>
            </main>
        </div>

    );
};

export default App;
