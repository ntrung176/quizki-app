import './App.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom';

import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth'
import { doc, setDoc, addDoc, onSnapshot, collection, query, updateDoc, serverTimestamp, deleteDoc, getDoc, getDocs, writeBatch, increment, collectionGroup, deleteField, where } from 'firebase/firestore'
import { auth, db, appId } from './config/firebase';
import { Loader2, CheckCircle, HelpCircle, Save, AlertTriangle, Check, X, Filter, Wrench, LogOut, Bell, Trophy } from 'lucide-react'
import { PieChart } from 'recharts'

// Route configuration
import { ROUTES, getEditRoute } from './router';
import { showToast } from './utils/toast';

// Import from refactored modules
import { normalizePosKey } from './config/constants'
import { getSharedBookGroups, getCachedBookGroups } from './utils/bookService';

import { playAudio, generateAudioSilent } from './utils/audio'
import { getNextReviewDate, DEFAULT_EASE, calculateCorrectInterval, calculateAnkiSRS } from './utils/srs'
import { shuffleArray, getSpeechText } from './utils/textProcessing'
import { callAI, parseJsonFromAI, getAIProviderInfo, generateVocabPrompt, getOpenRouterKeys, getSinoVietnamese } from './utils/aiProvider';
import { subscribeAdminConfig, hasAdminPrivileges } from './utils/adminSettings'
import { ensureFuriganaFormat } from './utils/furiganaHelper';

import { getLevelFromXp, getLevelTitle, getWeekId, generateSimulatedLeague, LEAGUES, getLeagueTierRules } from './utils/scoring';
import { playCompletionFanfare } from './utils/soundEffects';
import { initConsoleProtection, aiRateLimiter } from './utils/security';

// Import screens
import { HomeScreen, LoginScreen, AccountScreen, HelpScreen, ImportScreen, StatsScreen, ListView, ReviewScreen, ReviewCompleteScreen, KanjiScreen, StudyScreen, TestScreen, AdminScreen, FlashcardScreen } from './components/screens'

// Import layout components
import { Sidebar } from './components/layout';
import OnboardingTour from './components/ui/OnboardingTour';

// Import card components
import { AddCardForm, EditCardForm } from './components/cards'

// Import UI components

import UpdateNotification from './components/ui/UpdateNotification';
import VocabularySelectionLookup from './components/ui/VocabularySelectionLookup';
import FeedbackChatbox from './components/ui/FeedbackChatbox';

// Import hooks
import useVersionCheck from './hooks/useVersionCheck';

// Import routing component
import AppRoutes from './components/AppRoutes';

// --- Firebase configuration and utility variables are imported from config/firebase ---

// --- Component Chính App ---

const getSectionFromPath = (pathname) => {
    if (pathname === '/' || pathname === '/home') return 'home';
    if (pathname.includes('/vocab/review')) return 'vocabReview';
    if (pathname.includes('/vocab/add') || pathname.includes('/vocab/quick-add') || pathname.includes('/vocab/edit-set/')) return 'vocabAdd';
    if (pathname.includes('/vocab/list')) return 'vocabList';
    if (pathname.includes('/kanji/study')) return 'kanjiStudy';
    if (pathname.includes('/kanji/review')) return 'kanjiReview';
    if (pathname.includes('/kanji/list')) return 'kanjiList';
    if (pathname.includes('/jlpt/test')) return 'jlptTest';
    if (pathname.includes('/hub')) return 'hub';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/feedback')) return 'feedback';
    return 'home';
};

// SECURITY: Suppress sensitive console logs in production
initConsoleProtection();

const App = () => {
    // React Router hooks
    const navigate = useNavigate();
    const location = useLocation();
    const [tourTrigger, setTourTrigger] = useState(0);

    // Version check for auto-update notification (check every 60s)
    const { updateAvailable, refresh: refreshApp, dismiss: dismissUpdate } = useVersionCheck(60000);

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
        if (path === ROUTES.VOCAB_REVIEW) return 'VOCAB_REVIEW';
        if (path === ROUTES.VOCAB_LIST || path.startsWith('/vocab/list')) return 'VOCAB_LIST';
        if (path === ROUTES.VOCAB_ADD) return 'VOCAB_ADD';
        if (path === ROUTES.VOCAB_QUICK_ADD) return 'VOCAB_QUICK_ADD';
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
        if (path === ROUTES.JLPT_TEST) return 'JLPT_TEST';
        if (path === ROUTES.JLPT_ADMIN) return 'JLPT_ADMIN';
        return 'HOME';
    }, [location.pathname]);

    // Current view derived from URL
    const view = getCurrentView();

    // Legacy setView function for backward compatibility
    const setView = useCallback((viewName) => {
        navigateTo(viewName);
    }, [navigateTo]);

    const activityQueue = useRef({});
    const activityTimeout = useRef(null);
    const xpQueue = useRef(0);
    const xpTimeout = useRef(null);
    const vocabXpLogRef = useRef({});
    const srsToggleClicksRef = useRef({});

    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [reviewMode, setReviewMode] = useState('back');
    const [savedFilters, setSavedFilters] = useState(null); // Lưu filter state khi edit
    const [allCards, setAllCards] = useState([]);
    const [reviewCards, setReviewCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState('');
    const [levelUpInfo, setLevelUpInfo] = useState(null);
    const [isReviewActive, setIsReviewActive] = useState(false);
    const [isRealExamActive, setIsRealExamActive] = useState(false);
    const isReviewSessionPage = ['REVIEW', 'STUDY', 'FLASHCARD'].includes(view) || (location.pathname.startsWith('/vocab/review/') && location.pathname !== '/vocab/review');
    const lastPlayedLevelRef = useRef(null);
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


    const [rawProfile, setProfile] = useState(null);
    const profile = useMemo(() => {
        if (!rawProfile) return null;

        const overrides = {};

        // 1. Check expiration for real purchases
        if (rawProfile.premiumExpiresAt) {
            const expiryTime = rawProfile.premiumExpiresAt.toDate ? rawProfile.premiumExpiresAt.toDate().getTime() : Number(rawProfile.premiumExpiresAt || 0);
            if (expiryTime && expiryTime < Date.now()) {
                overrides.isPremiumUnlocked = false;
                overrides.unlockedSpecializedPackages = (rawProfile.unlockedSpecializedPackages || []).filter(
                    pkg => !['premium_1m', 'premium_1y', 'premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'].includes(pkg)
                );
            }
        }

        // 2. Apply admin simulation overrides if active
        const tier = rawProfile.trialPricingTier;
        if (tier) {
            if (tier === 'free') {
                overrides.isPremiumUnlocked = false;
                overrides.unlockedSpecializedPackages = [];
            } else if (tier === 'premium_1m') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_1m', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            } else if (tier === 'premium_1y') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_1y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            } else if (tier === 'premium_3y') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            }
        }
        return { ...rawProfile, ...overrides };
    }, [rawProfile]);

    // Danh sách API keys cho OpenRouter
    const [geminiApiKeys] = useState(() => {
        return getOpenRouterKeys();
    });
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [dailyActivityLogs, setDailyActivityLogs] = useState([]);
    const [isActivityLogsLoaded, setIsActivityLogsLoaded] = useState(false);
    const [kanjiSrsPublicCount, setKanjiSrsPublicCount] = useState({ total: 0, mastered: 0 });
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

    const [folders, setFolders] = useState([]);

    const studySetsCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/studySets`;
    }, [userId]);

    useEffect(() => {
        if (!authReady || !studySetsCollectionPath) return;

        const q = query(collection(db, studySetsCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedFolders = [];
            snapshot.forEach((doc) => {
                fetchedFolders.push({ id: doc.id, ...doc.data() });
            });
            setFolders(fetchedFolders);
        }, (error) => {
            console.error("Lỗi tải học phần:", error);
        });
        return () => unsubscribe();
    }, [authReady, studySetsCollectionPath]);

    const [activePopup, setActivePopup] = useState(null);

    // Listen to Global Notifications for Popup display
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return bTime - aTime;
            });

            // Find the latest popup notification
            const popupNotif = list.find(n => n.type === 'popup');
            if (popupNotif) {
                // Check if user has dismissed this popup before
                let dismissed = [];
                try {
                    dismissed = JSON.parse(localStorage.getItem('quizki_dismissed_popups') || '[]');
                } catch (e) {
                    dismissed = [];
                }
                if (!dismissed.includes(popupNotif.id)) {
                    setActivePopup(popupNotif);
                }
            } else {
                setActivePopup(null);
            }
        }, (error) => {
            console.error('Error loading global notifications for popup:', error);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleDismissPopup = () => {
        if (!activePopup) return;
        let dismissed = [];
        try {
            dismissed = JSON.parse(localStorage.getItem('quizki_dismissed_popups') || '[]');
        } catch (e) {
            dismissed = [];
        }
        if (!dismissed.includes(activePopup.id)) {
            dismissed.push(activePopup.id);
            localStorage.setItem('quizki_dismissed_popups', JSON.stringify(dismissed));
        }
        setActivePopup(null);
    };

    const parentFolders = useMemo(() => {
        return folders.filter(f => f.type === 'folder');
    }, [folders]);

    const studySets = useMemo(() => {
        return folders.filter(f => f.type !== 'folder');
    }, [folders]);

    const cardFolders = useMemo(() => {
        const mapping = {};
        allCards.forEach(card => {
            if (card.folderId) {
                mapping[card.id] = card.folderId;
            }
        });
        return mapping;
    }, [allCards]);

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
        if (!userId) return; // Chờ đăng nhập rồi mới subscribe (Firestore rules yêu cầu auth)
        const unsubscribe = subscribeAdminConfig(setAdminConfig);
        return () => { if (unsubscribe) unsubscribe(); };
    }, [userId]);

    // Computed premium state checking multiple DB flags
    const hasPremium = useMemo(() => {
        if (!profile) return false;
        const isPremiumUser = (profile.unlockedSpecializedPackages && (
            profile.unlockedSpecializedPackages.includes('premium') ||
            profile.unlockedSpecializedPackages.includes('premium_1m') ||
            profile.unlockedSpecializedPackages.includes('premium_1y') ||
            profile.unlockedSpecializedPackages.includes('premium_3y') ||
            profile.unlockedSpecializedPackages.includes('vocab_zen') ||
            profile.unlockedSpecializedPackages.includes('grammar_zen') ||
            profile.unlockedSpecializedPackages.includes('kanji_zen') ||
            profile.unlockedSpecializedPackages.includes('jlpt_prep')
        )) || false;

        return (
            profile.isPremiumUnlocked === true ||
            profile.isPremium === true ||
            isPremiumUser ||
            (profile.premiumExpiresAt && (() => {
                try {
                    const exp = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                    return exp > new Date();
                } catch (e) {
                    return false;
                }
            })())
        ) || false;
    }, [profile]);

    // AI giờ yêu cầu tài khoản Premium (1 năm / 3 năm) để sử dụng không giới hạn
    const canUserUseAI = useMemo(() => {
        if (!userId) return false;
        if (isAdmin || adminConfig?.moderators?.includes(userId)) return true;
        return hasPremium;
    }, [userId, isAdmin, adminConfig, hasPremium]);

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
        // SECURITY: Verify admin at call time (not just render time)
        // Prevents: React DevTools tampering with isAdmin state
        if (!isAdmin || !verifyAdminAtCallTime(auth, import.meta.env.VITE_ADMIN_EMAIL)) {
            setNotification("Bạn không có quyền thực hiện chức năng này.");
            return;
        }
        try {
            setNotification("Đang xóa dữ liệu người dùng...");

            // Helper function to delete documents in batches (to avoid Transaction too big error)
            const deleteInBatches = async (collectionPath) => {
                const snapshot = await getDocs(collection(db, collectionPath));
                const docsArray = snapshot.docs;
                const batchSize = 500;
                for (let i = 0; i < docsArray.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = docsArray.slice(i, i + batchSize);
                    chunk.forEach(docSnap => {
                        batch.delete(docSnap.ref);
                    });
                    await batch.commit();
                }
                return docsArray.length;
            };

            // Xóa vocabulary
            const vocabCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/vocabulary`);
            console.log(`Deleted ${vocabCount} vocabulary items`);

            // Xóa dailyActivity
            const actCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/dailyActivity`);
            console.log(`Deleted ${actCount} daily activity items`);

            // Xóa kanji SRS data
            const kanjiSrsCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/kanjiSRS`);
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
        getSharedBookGroups().catch(() => { });
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

    // Capture referral code from URL search query on mount
    useEffect(() => {
        let refCode = new URLSearchParams(window.location.search).get('ref');
        if (!refCode && window.location.hash.includes('?')) {
            const hashQuery = window.location.hash.split('?')[1];
            refCode = new URLSearchParams(hashQuery).get('ref');
        }
        if (refCode) {
            localStorage.setItem('pendingReferralCode', refCode.trim().toUpperCase());
            // Clean URL query parameters
            const urlWithoutParams = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, urlWithoutParams);
            console.log("Captured pending referral code:", refCode);
        }
    }, []);

    // Auto-apply referral code if stored in localStorage
    useEffect(() => {
        if (!userId || !profile || profile.referredBy) return;

        const pendingCode = localStorage.getItem('pendingReferralCode');
        if (pendingCode) {
            // Remove from localStorage first to prevent duplicate trigger loops
            localStorage.removeItem('pendingReferralCode');

            const applyReferral = async () => {
                try {
                    const { submitReferralCode } = await import('./utils/referralService');
                    console.log(`Auto-submitting referral code ${pendingCode} for user ${userId}...`);
                    const res = await submitReferralCode(userId, profile.displayName, pendingCode);
                    if (res.success) {
                        showToast(`Áp dụng mã giới thiệu thành công! Bạn nhận được 15 ngày Premium miễn phí từ ${res.referrerName || 'bạn bè'}.`, 'success');
                    } else {
                        console.warn('Auto-submit referral code failed:', res.error);
                    }
                } catch (err) {
                    console.error('Error auto-submitting referral code:', err);
                }
            };

            applyReferral();
        }
    }, [userId, profile]);

    // Listen to custom window events for tour trigger
    useEffect(() => {
        const handleTriggerTour = () => {
            setTourTrigger(prev => prev + 1);
        };
        window.addEventListener('trigger-tour', handleTriggerTour);
        return () => {
            window.removeEventListener('trigger-tour', handleTriggerTour);
        };
    }, []);

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
        const canShow = levelUpInfo && !isReviewActive && !isReviewSessionPage && !isRealExamActive;
        if (canShow) {
            if (lastPlayedLevelRef.current !== levelUpInfo.level) {
                lastPlayedLevelRef.current = levelUpInfo.level;
                try {
                    playCompletionFanfare();
                } catch (e) {
                    console.warn('Fanfare sound error:', e);
                }
            }
        } else if (!levelUpInfo) {
            lastPlayedLevelRef.current = null;
        }
    }, [levelUpInfo, isReviewActive, isReviewSessionPage, isRealExamActive]);

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
                // Khởi tạo AI credits cho user cũ chưa có trường này
                if (profileData.aiCreditsRemaining === undefined || profileData.aiCreditsRemaining === null) {
                    profileData.aiCreditsRemaining = 100;
                    try {
                        await updateDoc(doc(db, settingsDocPath), { aiCreditsRemaining: 100 });
                    } catch (e) { console.warn('Init AI credits for existing user:', e); }
                }

                // --- Gamification Level Calculations ---
                const currentXp = profileData.xp || 0;
                const lvlInfo = getLevelFromXp(currentXp);
                const calculatedLevel = lvlInfo.level;
                const calculatedTitle = getLevelTitle(calculatedLevel);

                if (profileData.level !== undefined && calculatedLevel > profileData.level) {
                    // Level up celebration!
                    setLevelUpInfo({ level: calculatedLevel, title: calculatedTitle });

                    try {
                        await updateDoc(doc(db, settingsDocPath), {
                            level: calculatedLevel,
                            title: calculatedTitle
                        });
                    } catch (e) {
                        console.error("Lỗi cập nhật thăng cấp:", e);
                    }
                } else if (profileData.level === undefined || profileData.title === undefined || profileData.xp === undefined || profileData.league === undefined) {
                    // Initialize fields if they don't exist
                    try {
                        await updateDoc(doc(db, settingsDocPath), {
                            xp: currentXp,
                            level: calculatedLevel,
                            title: calculatedTitle,
                            league: profileData.league || 'Sắt',
                            lastLeagueWeekId: profileData.lastLeagueWeekId || getWeekId()
                        });
                    } catch (e) {
                        console.error("Lỗi khởi tạo gamification fields:", e);
                    }
                }

                // --- League Weekly Evaluation ---
                const currentWeekId = getWeekId();
                let userLeague = profileData.league || 'Sắt';
                let lastLeagueWeekId = profileData.lastLeagueWeekId;
                let leagueNotification = '';

                if (lastLeagueWeekId && lastLeagueWeekId !== currentWeekId) {
                    const prevScore = profileData.score || 0;
                    const prevLeague = userLeague;
                    const isBotEnabledForPrevLeague = prevLeague === 'Sắt' || prevLeague === 'Đồng';

                    let allParticipants = [{ id: userId, computedScore: prevScore }];

                    if (isBotEnabledForPrevLeague) {
                        const simulatedPrevBots = generateSimulatedLeague(userId, lastLeagueWeekId, prevScore);
                        allParticipants = [...allParticipants, ...simulatedPrevBots];
                    } else {
                        // For Bạc and above: only compare against real users in the same league
                        try {
                            const q = query(
                                collection(db, publicStatsCollectionPath),
                                where('league', '==', prevLeague)
                            );
                            const snap = await getDocs(q);
                            snap.docs.forEach(d => {
                                if (d.id !== userId) {
                                    const data = d.data();
                                    allParticipants.push({
                                        id: d.id,
                                        computedScore: data.score || 0
                                    });
                                }
                            });
                        } catch (e) {
                            console.error("Lỗi lấy dữ liệu người dùng thực để xếp hạng giải đấu:", e);
                        }
                    }

                    allParticipants.sort((a, b) => b.computedScore - a.computedScore);

                    const myRank = allParticipants.findIndex(p => p.id === userId) + 1;
                    const currentIdx = LEAGUES.indexOf(userLeague);

                    const tierRules = getLeagueTierRules(prevLeague, allParticipants.length);

                    const qualifiesForPromotion = prevScore >= tierRules.minScoreForPromotion;
                    const isInPromotionRank = myRank <= tierRules.promoteCount;
                    const isPromoted = isInPromotionRank && qualifiesForPromotion && currentIdx < LEAGUES.length - 1;

                    const isUnderSafetyScore = prevScore < tierRules.minScoreForSafety;
                    const isInDemotionRank = tierRules.demoteCount > 0 && myRank > allParticipants.length - tierRules.demoteCount;
                    const isDemoted = (prevLeague !== 'Sắt' && currentIdx > 0) && (isUnderSafetyScore || isInDemotionRank);

                    if (isPromoted) {
                        userLeague = LEAGUES[currentIdx + 1];
                        leagueNotification = `🎉 Tuyệt vời! Tuần trước bạn đạt Hạng ${myRank} ở League ${LEAGUES[currentIdx]} và được THĂNG HẠNG lên League ${userLeague}!`;
                    } else if (isDemoted) {
                        userLeague = LEAGUES[currentIdx - 1];
                        if (isUnderSafetyScore) {
                            leagueNotification = `⚠️ Bạn bị XUỐNG HẠNG xuống League ${userLeague} do điểm số tuần trước dưới mức tối thiểu (${prevScore}/${tierRules.minScoreForSafety} điểm). Cố gắng học đều đặn tuần này nhé!`;
                        } else {
                            leagueNotification = `⚠️ Rất tiếc! Tuần trước bạn đứng Hạng ${myRank}/${allParticipants.length} và đã bị XUỐNG HẠNG xuống League ${userLeague}. Hãy cố gắng thêm tuần này nhé!`;
                        }
                    } else if (isInPromotionRank && !qualifiesForPromotion) {
                        leagueNotification = `📅 Tuần mới bắt đầu! Dù đứng Hạng ${myRank} nhưng điểm vinh danh của bạn (${prevScore}) chưa đủ tối thiểu (${tierRules.minScoreForPromotion} điểm) để thăng hạng. Bạn tiếp tục ở lại League ${userLeague}.`;
                    } else {
                        leagueNotification = `📅 Tuần mới đã bắt đầu! Bạn tiếp tục tranh tài tại League ${userLeague} (Xếp hạng tuần trước: ${myRank}/${allParticipants.length}).`;
                    }

                    lastLeagueWeekId = currentWeekId;

                    try {
                        await updateDoc(doc(db, settingsDocPath), {
                            league: userLeague,
                            lastLeagueWeekId: lastLeagueWeekId
                        });
                    } catch (e) {
                        console.error("Lỗi cập nhật thăng/xuống hạng tuần mới:", e);
                    }
                    if (leagueNotification) {
                        setNotification(leagueNotification);
                    }
                } else if (!lastLeagueWeekId) {
                    lastLeagueWeekId = currentWeekId;
                    try {
                        await updateDoc(doc(db, settingsDocPath), {
                            league: userLeague,
                            lastLeagueWeekId: lastLeagueWeekId
                        });
                    } catch (e) {
                        console.error("Lỗi khởi tạo fields giải đấu:", e);
                    }
                }

                profileData.xp = currentXp;
                profileData.level = calculatedLevel;
                profileData.title = calculatedTitle;
                profileData.league = userLeague;
                profileData.lastLeagueWeekId = lastLeagueWeekId;

                // Tự động sinh mã giới thiệu nếu chưa có
                if (!profileData.referralCode) {
                    const { generateReferralCode } = await import('./utils/referralService');
                    const code = generateReferralCode(userId);
                    profileData.referralCode = code;
                    updateDoc(doc(db, settingsDocPath), { referralCode: code }).catch(err => console.error("Lỗi cập nhật mã giới thiệu:", err));
                    setDoc(doc(db, publicStatsCollectionPath, userId), { referralCode: code }, { merge: true }).catch(err => console.error("Lỗi đồng bộ mã giới thiệu:", err));
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
                    const { generateReferralCode } = await import('./utils/referralService');
                    const code = generateReferralCode(userId);
                    const newProfile = {
                        displayName: defaultName,
                        dailyGoal: defaultGoal,
                        hasSeenHelp: true,
                        email: auth?.currentUser?.email || '',
                        aiCreditsRemaining: 100,
                        xp: 0,
                        level: 1,
                        title: getLevelTitle(1),
                        referralCode: code
                    };
                    await setDoc(doc(db, settingsDocPath), newProfile);
                    setProfile(newProfile);
                    // Lưu vào sessionStorage
                    sessionStorage.setItem(cachedProfileKey, JSON.stringify(newProfile));
                    // Đồng bộ lên public stats
                    await setDoc(doc(db, publicStatsCollectionPath, userId), {
                        displayName: defaultName,
                        referralCode: code,
                        xp: 0,
                        level: 1,
                        league: 'Sắt'
                    }, { merge: true });
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
                    nextReview_dictation: card.nextReview_dictation ? new Date(card.nextReview_dictation) : new Date(),
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

                // Legacy migration and formatting sanitization for SM-2 spaced repetition
                const legacyIndex = typeof data.intervalIndex_back === 'number' ? data.intervalIndex_back : -1;
                let srsEnabled = data.srsEnabled !== false;
                let srsInterval = typeof data.srsInterval === 'number' ? data.srsInterval : 0;
                let srsEase = typeof data.srsEase === 'number' ? data.srsEase : 2.5;
                let srsReps = typeof data.srsReps === 'number' ? data.srsReps : 0;
                let srsLearningStep = data.srsLearningStep !== undefined ? data.srsLearningStep : null;
                let srsIsLapsed = data.srsIsLapsed === true;
                let srsLapseCount = typeof data.srsLapseCount === 'number' ? data.srsLapseCount : 0;
                let srsPrelapseInterval = typeof data.srsPrelapseInterval === 'number' ? data.srsPrelapseInterval : null;
                let srsState = data.srsState || null;

                let nextReviewBack = data.nextReview_back?.toDate ? data.nextReview_back.toDate() : (data.nextReview_back ? new Date(data.nextReview_back) : today);

                // 1. Migration for legacy Leitner cards that were reviewed but have no new SRS progress
                if (srsEnabled && srsReps === 0 && srsState === null) {
                    const isLegacy = legacyIndex >= 0;
                    if (isLegacy) {
                        const isMastered = legacyIndex >= 4;
                        if (isMastered) {
                            srsState = 'REVIEW';
                            srsInterval = 30; // 30 days
                            srsReps = 5; // Mastered (stats check reps >= 5)
                            srsEase = 2.5;
                            srsLearningStep = null;

                            const lastReviewedDate = data.lastReviewed?.toDate ? data.lastReviewed.toDate() : (data.lastReviewed ? new Date(data.lastReviewed) : null);
                            const baseTime = lastReviewedDate ? lastReviewedDate.getTime() : today.getTime();
                            nextReviewBack = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);
                        } else {
                            srsState = 'NEW';
                            srsInterval = 0;
                            srsReps = 0;
                            srsEase = 2.5;
                            srsLearningStep = null;
                            nextReviewBack = today;
                        }
                    }
                }

                // 2. Fix the minute-to-day mismatch bug (e.g. 5760 mins interpreted as 5760 days in REVIEW state)
                // If the state is REVIEW, then srsInterval is in DAYS. If it is >= 1000, it's definitely stored in minutes (legacy)
                // and should be converted to days by dividing by 1440.
                const resolvedState = srsState || (srsReps === 0 && (srsLearningStep === null || srsLearningStep === undefined) ? 'NEW' : (srsReps > 0 ? 'REVIEW' : 'LEARNING'));
                if (resolvedState === 'REVIEW' && srsInterval >= 1000) {
                    srsInterval = Math.max(1, Math.round(srsInterval / 1440));
                }
                if (resolvedState === 'REVIEW' && srsPrelapseInterval && srsPrelapseInterval >= 1000) {
                    srsPrelapseInterval = Math.max(1, Math.round(srsPrelapseInterval / 1440));
                }

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
                    folderId: data.folderId || null,
                    audioBase64: data.audioBase64 !== undefined ? data.audioBase64 : null,
                    imageBase64: data.imageBase64 || null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : today),
                    intervalIndex_back: legacyIndex,
                    correctStreak_back: typeof data.correctStreak_back === 'number' ? data.correctStreak_back : 0,
                    nextReview_back: nextReviewBack,
                    intervalIndex_synonym: typeof data.intervalIndex_synonym === 'number' ? data.intervalIndex_synonym : -1,
                    correctStreak_synonym: typeof data.correctStreak_synonym === 'number' ? data.correctStreak_synonym : 0,
                    nextReview_synonym: data.nextReview_synonym?.toDate ? data.nextReview_synonym.toDate() : (data.nextReview_synonym ? new Date(data.nextReview_synonym) : today),
                    intervalIndex_example: typeof data.intervalIndex_example === 'number' ? data.intervalIndex_example : -1,
                    correctStreak_example: typeof data.correctStreak_example === 'number' ? data.correctStreak_example : 0,
                    nextReview_example: data.nextReview_example?.toDate ? data.nextReview_example.toDate() : (data.nextReview_example ? new Date(data.nextReview_example) : today),
                    intervalIndex_dictation: typeof data.intervalIndex_dictation === 'number' ? data.intervalIndex_dictation : -1,
                    correctStreak_dictation: typeof data.correctStreak_dictation === 'number' ? data.correctStreak_dictation : 0,
                    nextReview_dictation: data.nextReview_dictation?.toDate ? data.nextReview_dictation.toDate() : (data.nextReview_dictation ? new Date(data.nextReview_dictation) : today),
                    easeFactor: typeof data.easeFactor === 'number' ? data.easeFactor : DEFAULT_EASE,
                    totalReps: typeof data.totalReps === 'number' ? data.totalReps : 0,
                    currentInterval_back: typeof data.currentInterval_back === 'number' ? data.currentInterval_back : 0,
                    correctCount: typeof data.correctCount === 'number' ? data.correctCount : 0,
                    incorrectCount: typeof data.incorrectCount === 'number' ? data.incorrectCount : 0,
                    lastReviewed: data.lastReviewed?.toDate ? data.lastReviewed.toDate() : (data.lastReviewed ? new Date(data.lastReviewed) : null),
                    seenCount: typeof data.seenCount === 'number' ? data.seenCount : 0,
                    masteryState: data.masteryState || 'not_learned',
                    needsMistakeReview: data.needsMistakeReview === true,
                    // Vocabulary SRS (SM-2) fields
                    srsEnabled: srsEnabled,
                    srsInterval: srsInterval,
                    srsEase: srsEase,
                    srsReps: srsReps,
                    srsLearningStep: srsLearningStep,
                    srsIsLapsed: srsIsLapsed,
                    srsLapseCount: srsLapseCount,
                    srsPrelapseInterval: srsPrelapseInterval,
                    srsState: resolvedState,
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
                    nextReview_dictation: card.nextReview_dictation ? card.nextReview_dictation.toISOString() : new Date().toISOString(),
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
        if (!authReady || !activityCollectionPath) {
            setIsActivityLogsLoaded(false);
            setDailyActivityLogs([]);
            return;
        }

        // Khôi phục dailyActivityLogs từ sessionStorage nếu có
        const cachedLogsKey = `dailyActivityLogs_${userId}`;
        const cachedLogs = sessionStorage.getItem(cachedLogsKey);
        if (cachedLogs) {
            try {
                const parsedLogs = JSON.parse(cachedLogs);
                setDailyActivityLogs(parsedLogs);
                setIsActivityLogsLoaded(true);
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
            setIsActivityLogsLoaded(true);
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
            setIsActivityLogsLoaded(true);
        });

        return () => unsubscribe();
    }, [authReady, activityCollectionPath, userId]);

    const calculatedStreak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;
        const activeLogs = dailyActivityLogs.filter(log =>
            (log.newWordsAdded || 0) > 0 ||
            (log.newKanjiAdded || 0) > 0 ||
            (log.reviewsDone || 0) > 0
        );
        if (activeLogs.length === 0) return 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const reversedLogs = [...activeLogs].reverse();
        const lastLog = reversedLogs[0];
        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) return 0;

        let currentStreak = 0;
        let checkDate = new Date();
        if (lastLog.id !== todayStr) checkDate.setDate(checkDate.getDate() - 1);
        for (const log of reversedLogs) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (log.id === checkDateStr) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        return currentStreak;
    }, [dailyActivityLogs]);

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
            // Synonym KHÔNG tham gia vào chu kỳ chính nữa
            const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;

            // Có ít nhất một phần chưa hoàn thành (trừ synonym)
            return backStreak < 1 || (card.example && card.example.trim() !== '' && exampleStreak < 1) || dictationStreak < 1;
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
            const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
            const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
            return backStreak < 1 || (card.example && exampleStreak < 1) || dictationStreak < 1;
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
            const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
            return backStreak < 1 || (card.synonym && synonymStreak < 1) || (card.example && exampleStreak < 1) || dictationStreak < 1;
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
            // Mixed mode: bao gồm cả thẻ mới VÀ thẻ đến hạn (KHÔNG bao gồm synonym — đã tách riêng)
            const isNew = (card) => card.intervalIndex_back === -1 || card.intervalIndex_back === undefined;

            const dueBackCards = filteredCards
                .filter(card => {
                    const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
                    if (backStreak >= 1) return false;
                    if (isNew(card)) return true;
                    return card.nextReview_back <= today;
                })
                .map(card => ({ ...card, reviewType: 'back' }));

            const dueExampleCards = filteredCards
                .filter(card => {
                    if (!card.example || card.example.trim() === '') return false;
                    const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
                    if (exampleStreak >= 1) return false;
                    if (isNew(card)) return true;
                    return card.nextReview_back <= today;
                })
                .map(card => ({ ...card, reviewType: 'example' }));

            // Dictation: tất cả thẻ mới hoặc đến hạn + chưa hoàn thành dictation streak
            const dueDictationCards = filteredCards
                .filter(card => {
                    const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
                    if (dictationStreak >= 1) return false;
                    if (isNew(card)) return true;
                    return card.nextReview_back <= today;
                })
                .map(card => ({ ...card, reviewType: 'dictation' }));

            dueCards = shuffleArray([...dueBackCards, ...dueExampleCards, ...dueDictationCards]);

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
            // Synonym (Advanced): all cards with synonyms, sorted by SRS level desc (long-term first → new last)
            // Synonym review does NOT affect main SRS cycle
            dueCards = filteredCards
                .filter(card => {
                    if (!card.synonym || card.synonym.trim() === '') return false;
                    const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
                    return synonymStreak < 1;
                })
                .sort((a, b) => {
                    // Sort by intervalIndex_synonym descending (long-term first)
                    const aIdx = typeof a.intervalIndex_synonym === 'number' ? a.intervalIndex_synonym : -1;
                    const bIdx = typeof b.intervalIndex_synonym === 'number' ? b.intervalIndex_synonym : -1;
                    return bIdx - aIdx;
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
        } else if (mode === 'dictation') {
            // Dictation: thẻ mới HOẶC thẻ đến hạn + chưa hoàn thành dictation streak
            dueCards = filteredCards
                .filter(card => {
                    // Thẻ mới luôn được bao gồm
                    if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) return true;
                    // Thẻ cũ: kiểm tra nextReview và streak
                    if (card.nextReview_back > today) return false;
                    const dictationStreak = typeof card.correctStreak_dictation === 'number' ? card.correctStreak_dictation : 0;
                    return dictationStreak < 1;
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

    const updateDailyActivity = useCallback((count, field = 'newWordsAdded') => {
        if (!activityCollectionPath) return Promise.resolve();

        // Add to queue
        activityQueue.current[field] = (activityQueue.current[field] || 0) + count;

        // Clear existing timeout
        if (activityTimeout.current) {
            clearTimeout(activityTimeout.current);
        }

        // Set timeout to write to database after 1 second
        activityTimeout.current = setTimeout(async () => {
            const todayDateString = new Date().toISOString().split('T')[0];
            const activityRef = doc(db, activityCollectionPath, todayDateString);

            const updates = {};
            Object.keys(activityQueue.current).forEach(k => {
                updates[k] = increment(activityQueue.current[k]);
            });

            // Clear queue before async call to avoid race conditions
            activityQueue.current = {};

            try {
                await setDoc(activityRef, updates, { merge: true });
                console.log("📈 Consolidated daily activity updated successfully:", updates);
            } catch (e) {
                console.error("Lỗi cập nhật hoạt động hàng ngày:", e);
            }
        }, 1000);

    }, [activityCollectionPath]);

    const awardXP = useCallback((count) => {
        if (!settingsDocPath || !userId) return;
        if (count === 0) return;

        // Add to queue
        xpQueue.current = (xpQueue.current || 0) + count;

        // Clear existing timeout
        if (xpTimeout.current) {
            clearTimeout(xpTimeout.current);
        }

        // Set timeout to write to database after 1 second
        xpTimeout.current = setTimeout(async () => {
            const addedXp = xpQueue.current;
            xpQueue.current = 0; // Reset queue

            try {
                const docRef = doc(db, settingsDocPath);
                await updateDoc(docRef, {
                    xp: increment(addedXp)
                });
                console.log(`✨ Awarded ${addedXp} XP to user`);
            } catch (e) {
                console.error("Lỗi cập nhật XP:", e);
            }
        }, 1000);
    }, [settingsDocPath, userId]);

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
            srsEnabled: true,
        };
    };
    // ==================== SHARED VOCABULARY ====================
    const SHARED_VOCAB_COLLECTION = 'sharedVocabulary';

    // Tìm từ vựng trong kho dữ liệu chung
    const findSharedVocab = async (word) => {
        try {
            if (!word) return null;
            const normalized = word.split('（')[0].split('(')[0].trim();
            const normalizedLower = normalized.toLowerCase();

            // 1. Tìm theo ID normalized chính xác (phân biệt hoa thường)
            let docRef = doc(db, SHARED_VOCAB_COLLECTION, normalized);
            let docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }

            // 2. Tìm theo ID normalized chữ thường (nếu khác biệt)
            if (normalized !== normalizedLower) {
                docRef = doc(db, SHARED_VOCAB_COLLECTION, normalizedLower);
                docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                }
            }

            // 3. Tìm theo ID nguyên bản đầy đủ (chứa cả ngoặc đọc nếu có)
            const originalTrimmed = word.trim();
            if (originalTrimmed !== normalized) {
                docRef = doc(db, SHARED_VOCAB_COLLECTION, originalTrimmed);
                docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                }
            }

            // 4. Tìm bằng câu lệnh truy vấn range (prefix) để khớp các từ có ngoặc cách đọc (ví dụ: "段目" khớp "段目（だんめ）")
            const q = query(
                collection(db, SHARED_VOCAB_COLLECTION),
                where('front', '>=', normalized),
                where('front', '<=', normalized + '\uf8ff')
            );
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
                const matchedDoc = querySnap.docs.find(doc => {
                    const dbFront = doc.data().front || doc.data().frontWithFurigana || '';
                    const dbNormalized = dbFront.split('（')[0].split('(')[0].trim().toLowerCase();
                    return dbNormalized === normalizedLower;
                });
                if (matchedDoc) {
                    return { id: matchedDoc.id, ...matchedDoc.data() };
                }
            }

            return null;
        } catch (e) {
            console.warn('Error finding shared vocab:', e);
            return null;
        }
    };

    // Lưu từ vựng vào kho dữ liệu chung
    const saveSharedVocab = async (word, data, force = false) => {
        try {
            const normalized = word.split('（')[0].split('(')[0].trim();
            const existing = await findSharedVocab(word);

            if (!existing) {
                // Từ vựng CHƯA có trong sharedVocabulary -> Lưu mới hoàn toàn
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
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                console.log(`✅ saveSharedVocab: Đã tạo mới từ vựng "${word}" trong sharedVocabulary.`);
            } else {
                // Từ vựng ĐÃ có trong sharedVocabulary -> Chỉ cập nhật khi force = true
                if (force) {
                    const docRef = doc(db, SHARED_VOCAB_COLLECTION, existing.id);
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
                    console.log(`✅ saveSharedVocab: Đã cập nhật (force) từ vựng "${word}" vào sharedVocabulary.`);
                } else {
                    console.log(`ℹ️ saveSharedVocab: Từ vựng "${word}" đã tồn tại trong sharedVocabulary. Không cần lưu đè.`);
                }
            }
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

            const rawFront = shared.front || word;
            const formattedFront = await ensureFuriganaFormat(rawFront);
            const formattedSynonym = shared.synonym ? await ensureFuriganaFormat(shared.synonym) : '';

            let sino = shared.sinoVietnamese || fallbackData.sinoVietnamese || '';
            if (!sino && formattedFront) {
                const lookupHV = getSinoVietnamese(formattedFront);
                if (lookupHV) sino = lookupHV;
            }

            const result = {
                front: formattedFront,
                back: shared.back || fallbackData.meaning || fallbackData.back || '',
                synonym: formattedSynonym,
                sinoVietnamese: sino,
                synonymSinoVietnamese: shared.synonymSinoVietnamese || '',
                example: shared.example || fallbackData.example || '',
                exampleMeaning: shared.exampleMeaning || fallbackData.exampleMeaning || '',
                nuance: shared.nuance || fallbackData.nuance || fallbackData.note || '',
                pos: shared.pos || fallbackData.pos || '',
                level: shared.level || fallbackData.level || '',
                _source: 'shared',
            };

            // Lưu ngược lại nếu có thay đổi trong quá trình chuẩn hoá
            if (formattedFront !== (shared.front || '') || formattedSynonym !== (shared.synonym || '') || sino !== (shared.sinoVietnamese || '')) {
                saveSharedVocab(word, result, true).catch(e => console.warn('Error updating standardized shared vocab:', e));
            }

            return result;
        }

        // 2. Dùng dữ liệu đã truyền vào (fallback) — không gọi AI
        const rawFrontFallback = word;
        const formattedFrontFallback = await ensureFuriganaFormat(rawFrontFallback);
        const rawSynonymFallback = fallbackData.synonym || '';
        const formattedSynonymFallback = rawSynonymFallback ? await ensureFuriganaFormat(rawSynonymFallback) : '';

        let sinoFallback = fallbackData.sinoVietnamese || '';
        if (!sinoFallback && formattedFrontFallback) {
            const lookupHV = getSinoVietnamese(formattedFrontFallback);
            if (lookupHV) sinoFallback = lookupHV;
        }

        const result = {
            front: formattedFrontFallback,
            back: fallbackData.meaning || fallbackData.back || '',
            synonym: formattedSynonymFallback,
            sinoVietnamese: sinoFallback,
            synonymSinoVietnamese: fallbackData.synonymSinoVietnamese || '',
            example: fallbackData.example || '',
            exampleMeaning: fallbackData.exampleMeaning || '',
            nuance: fallbackData.nuance || fallbackData.note || '',
            pos: fallbackData.pos || '',
            level: fallbackData.level || '',
            _source: 'fallback',
        };

        // 3. Lưu vào kho dữ liệu chung cho lần sau (chạy ngầm không chặn)
        if (result.back) {
            saveSharedVocab(word, result).catch(e => console.warn('Error saving shared vocab:', e));
        }

        return result;
    };

    const handleAddFolder = async (name, description = '', coverImage = null, parentId = null) => {
        if (!studySetsCollectionPath) return null;

        // Kiểm tra giới hạn 3 học phần của gói Miễn phí
        const isRestricted = profile?.trialPricingTier === 'free' || !hasPremium;
        if (isRestricted && studySets.length >= 3) {
            setNotification('⚠️ Bạn đã đạt giới hạn 3 học phần của gói Miễn phí. Vui lòng nâng cấp gói!');
            return null;
        }

        try {
            const folderRef = await addDoc(collection(db, studySetsCollectionPath), {
                name,
                description,
                parentId: parentId || null,
                coverImage,
                createdAt: serverTimestamp()
            });
            return folderRef.id;
        } catch (e) {
            console.error('Lỗi khi tạo học phần:', e);
            setNotification('Lỗi khi tạo học phần');
            return null;
        }
    };

    const handleUpdateFolder = async (folderId, updates) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await updateDoc(doc(db, studySetsCollectionPath, folderId), updates);
        } catch (e) {
            console.error('Lỗi khi cập nhật học phần:', e);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            // Remove folder
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));

            // Delete all cards inside this folder directly from Firestore
            const q = query(collection(db, vocabCollectionPath), where("folderId", "==", folderId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            if (!snapshot.empty) {
                await batch.commit();
            }

            // Clean up card-to-folder mapping cache in local storage
            try {
                const folderKey = userId ? `vocab_card_folders_${userId}` : 'vocab_card_folders';
                const savedFolders = JSON.parse(localStorage.getItem(folderKey) || '{}');
                let localChanged = false;
                Object.keys(savedFolders).forEach(cardId => {
                    if (savedFolders[cardId] === folderId) {
                        delete savedFolders[cardId];
                        localChanged = true;
                    }
                });
                if (localChanged) {
                    localStorage.setItem(folderKey, JSON.stringify(savedFolders));
                }
            } catch (localErr) {
                console.error('Lỗi khi xoá local storage mapping:', localErr);
            }
        } catch (e) {
            console.error('Lỗi khi xoá học phần:', e);
        }
    };

    const handleMoveCardToFolder = async (cardId, folderId) => {
        if (!vocabCollectionPath || !cardId) return;

        // Kiểm tra giới hạn 20 từ vựng của gói Miễn phí
        const isRestricted = profile?.trialPricingTier === 'free' || !hasPremium;
        if (isRestricted && folderId && folderId !== 'unfiled') {
            const folderCards = allCards.filter(c => c.folderId === folderId);
            if (folderCards.length >= 20) {
                setNotification('⚠️ Học phần mục tiêu đã đạt giới hạn 20 từ vựng của gói Miễn phí!');
                return;
            }
        }

        try {
            const val = folderId === 'unfiled' || !folderId ? null : folderId;
            await updateDoc(doc(db, vocabCollectionPath, cardId), { folderId: val });
        } catch (e) {
            console.error('Lỗi di chuyển thẻ:', e);
        }
    };

    const handleAddParentFolder = async (name) => {
        if (!studySetsCollectionPath) return null;
        try {
            const docRef = await addDoc(collection(db, studySetsCollectionPath), {
                name,
                type: 'folder',
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (e) {
            console.error("Lỗi tạo thư mục:", e);
            return null;
        }
    };

    const handleUpdateParentFolder = async (folderId, name) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await updateDoc(doc(db, studySetsCollectionPath, folderId), { name });
        } catch (e) {
            console.error("Lỗi cập nhật thư mục:", e);
        }
    };

    const handleDeleteParentFolder = async (folderId) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));

            // Set parentId to null for all study sets inside this folder
            const batch = writeBatch(db);
            let hasUpdates = false;
            folders.forEach(set => {
                if (set.type !== 'folder' && set.parentId === folderId) {
                    batch.update(doc(db, studySetsCollectionPath, set.id), { parentId: null });
                    hasUpdates = true;
                }
            });
            if (hasUpdates) await batch.commit();
        } catch (e) {
            console.error("Lỗi xóa thư mục:", e);
        }
    };

    const handleMoveStudySetToParentFolder = async (setId, parentFolderId) => {
        if (!studySetsCollectionPath || !setId) return;
        try {
            const targetParentId = parentFolderId === 'root' || !parentFolderId ? null : parentFolderId;
            await updateDoc(doc(db, studySetsCollectionPath, setId), { parentId: targetParentId });
        } catch (e) {
            console.error("Lỗi di chuyển học phần vào thư mục:", e);
        }
    };

    const handleAddCard = async ({ front, back, synonym, example, exampleMeaning, nuance, pos, level, action, imageBase64, audioBase64, exampleAudioBase64, sinoVietnamese, synonymSinoVietnamese, folderId }) => {
        if (!vocabCollectionPath) return false;

        // Kiểm tra giới hạn 20 từ vựng của gói Miễn phí
        const isRestricted = profile?.trialPricingTier === 'free' || !hasPremium;
        if (isRestricted && folderId && folderId !== 'unfiled') {
            const folderCards = allCards.filter(c => c.folderId === folderId);
            if (folderCards.length >= 20) {
                setNotification('⚠️ Học phần này đã đạt giới hạn 20 từ vựng của gói Miễn phí. Vui lòng nâng cấp gói!');
                return false;
            }
        }

        // Kiểm tra trùng lặp với database của user trong cùng học phần
        const normalizedFront = front.split('（')[0].split('(')[0].trim().toLowerCase();
        const isDuplicate = allCards.some(card => {
            const sameFolder = (folderId === 'unfiled' || !folderId)
                ? (!card.folderId || card.folderId === 'unfiled')
                : (card.folderId === folderId);

            if (!sameFolder) return false;

            const cardFront = card.front.split('（')[0].split('(')[0].trim().toLowerCase();
            return cardFront === normalizedFront;
        });

        if (isDuplicate) {
            setNotification(`⚠️ Từ vựng "${front.split('（')[0]}" đã có trong học phần này!`);
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

        if (folderId && folderId !== 'unfiled') {
            newCardData.folderId = folderId;
        }

        // Add example audio if provided (from book audio trimmer)
        if (exampleAudioBase64) {
            newCardData.exampleAudioBase64 = exampleAudioBase64;
        }

        let cardRef;

        try {
            cardRef = doc(collection(db, vocabCollectionPath));
            await setDoc(cardRef, newCardData);

            setNotification(`Đã thêm thẻ mới: ${newCardData.front}`);
            await updateDailyActivity(1);

            // Award XP
            const cardLevel = finalLevel || 'N5';
            let multiplier = 1.0;
            if (cardLevel) {
                const lvlUpper = String(cardLevel).toUpperCase();
                if (lvlUpper.includes('N3')) multiplier = 1.2;
                else if (lvlUpper.includes('N2')) multiplier = 1.4;
                else if (lvlUpper.includes('N1')) multiplier = 1.6;
            }
            const xpAmount = Math.round(10 * multiplier);
            awardXP(xpAmount);

            // Save folder assignment if selected
            if (folderId && cardRef) {
                try {
                    const folderKey = userId ? `vocab_card_folders_${userId}` : 'vocab_card_folders';
                    const savedFolders = JSON.parse(localStorage.getItem(folderKey) || '{}');
                    savedFolders[cardRef.id] = folderId;
                    localStorage.setItem(folderKey, JSON.stringify(savedFolders));
                    window.dispatchEvent(new Event('study_sets_updated'));
                } catch (e) {
                    console.error('Lỗi lưu thư mục cho thẻ:', e);
                }
            }

            // Tự động tạo audio mới chạy ngầm (không chặn UI để lưu nhanh hơn)
            if (!newCardData.audioBase64) {
                (async () => {
                    try {
                        const result = await generateAudioSilent(finalFront);
                        if (result && result.base64) {
                            await updateDoc(cardRef, {
                                audioBase64: result.base64,
                                audioVoiceId: result.voiceId || null
                            });
                            console.log("🔊 Generated and updated audio in background for", finalFront);
                        }
                    } catch (e) {
                        console.warn('⚠️ Lỗi tự động tạo audio chạy ngầm:', e);
                    }
                })();
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

    // Lưu audio TTS đã tạo vào card trong Firestore và cập nhật state local
    const handleSaveCardAudio = async (cardId, audioBase64, voiceId) => {
        if (!vocabCollectionPath || !cardId || !audioBase64) return;

        // Cập nhật local state ngay lập tức để đồng bộ UI
        setAllCards(prevCards => prevCards.map(card => {
            if (card.id === cardId) {
                return {
                    ...card,
                    audioBase64,
                    audioVoiceId: voiceId || null
                };
            }
            return card;
        }));

        try {
            await updateDoc(doc(db, vocabCollectionPath, cardId), {
                audioBase64,
                audioVoiceId: voiceId || null, // Lưu giọng đã dùng để tạo
            });
            console.log(`✅ Đã lưu audio (${voiceId}) cho card:`, cardId);
        } catch (e) {
            console.warn('⚠️ Lỗi lưu audio vào card:', e.message);
        }
    };

    // ============== BACKGROUND AUDIO GENERATION ==============
    // Tự động tạo audio ngầm đã bị tắt để tránh lãng phí API quota SpeechGen.
    // Audio sẽ được tạo tự động 1 lần duy nhất khi thêm/sửa card hoặc tạo lười (on-demand) khi học/ôn tập.

    const handleDeleteCard = async (cardId, cardFront) => {
        if (!vocabCollectionPath || !cardId) return;

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
        if (!vocabCollectionPath || !cardId) return;

        const cardRef = doc(db, vocabCollectionPath, cardId);

        // Chỉnh sửa/cập nhật tất cả các trường từ màn hình EditSetScreen
        if (isCorrect === 'all' && typeof cardReviewType === 'object' && cardReviewType !== null) {
            const fields = cardReviewType;
            const updatedData = {
                front: (fields.front || '').trim(),
                back: (fields.back || '').trim(),
                synonym: (fields.synonym || '').trim(),
                sinoVietnamese: (fields.sinoVietnamese || '').trim(),
                synonymSinoVietnamese: (fields.synonymSinoVietnamese || '').trim(),
                example: (fields.example || '').trim(),
                exampleMeaning: (fields.exampleMeaning || '').trim(),
                nuance: (fields.nuance || '').trim(),
                pos: fields.pos || '',
                level: fields.level || '',
            };

            if (fields.imageBase64 !== undefined) {
                updatedData.imageBase64 = fields.imageBase64;
            }

            if (fields.audioBase64 !== undefined) {
                updatedData.audioBase64 = fields.audioBase64;
            }

            if (fields.folderId !== undefined) {
                updatedData.folderId = fields.folderId;
            }

            // Tự động tạo audio mới nếu đổi front text hoặc chưa có audio (chạy ngầm)
            const oldCard = allCards.find(c => c.id === cardId);
            const oldSpeechText = oldCard ? getSpeechText(oldCard.front) : '';
            const newSpeechText = getSpeechText(updatedData.front);

            try {
                await updateDoc(cardRef, updatedData);
            } catch (e) {
                console.error("Lỗi khi cập nhật thẻ từ EditSetScreen:", e);
            }

            if (newSpeechText !== oldSpeechText || (oldCard && !oldCard.audioBase64)) {
                (async () => {
                    try {
                        const result = await generateAudioSilent(updatedData.front);
                        if (result && result.base64) {
                            await updateDoc(cardRef, {
                                audioBase64: result.base64,
                                audioVoiceId: result.voiceId || null
                            });
                            console.log("🔊 Generated and updated audio in background for edited card", updatedData.front);
                        }
                    } catch (e) {
                        console.warn('⚠️ Lỗi tự động tạo audio chạy ngầm khi cập nhật thẻ:', e);
                    }
                })();
            }

            return;
        }

        // Cập nhật tiến trình ôn tập / thống kê thông thường
        let cardSnap;
        try {
            cardSnap = await getDoc(cardRef);
        } catch (e) {
            console.error("Lỗi fetch thẻ để cập nhật:", e);
            return;
        }

        if (!cardSnap.exists()) return;
        const cardData = cardSnap.data();

        const currentMastery = cardData.masteryState || 'not_learned';
        const newMastery = isCorrect
            ? (currentMastery === 'not_learned' ? 'learning' : 'memorized')
            : (currentMastery === 'memorized' ? 'learning' : 'not_learned');

        const updateData = {
            correctCount: typeof cardData.correctCount === 'number' ? cardData.correctCount + (isCorrect ? 1 : 0) : (isCorrect ? 1 : 0),
            incorrectCount: typeof cardData.incorrectCount === 'number' ? cardData.incorrectCount + (isCorrect ? 0 : 1) : (isCorrect ? 0 : 1),
            seenCount: typeof cardData.seenCount === 'number' ? cardData.seenCount + 1 : 1,
            lastReviewed: serverTimestamp(),
            needsMistakeReview: !isCorrect,
            masteryState: newMastery
        };

        try {
            await updateDoc(cardRef, updateData);
            if (activityType === 'review') {
                await updateDailyActivity(1, 'reviewsDone');
            }
        } catch (e) {
            console.error("Lỗi khi cập nhật thẻ:", e);
        }
    };
    const handleToggleSrs = async (cardId, srsEnabled) => {
        if (!vocabCollectionPath) return;
        const cardRef = doc(db, vocabCollectionPath, cardId);

        // Detect 3 rapid clicks to reset SRS parameters to new
        const now = Date.now();
        const clicks = srsToggleClicksRef.current[cardId] || [];
        const recentClicks = clicks.filter(t => now - t < 1500);
        recentClicks.push(now);
        srsToggleClicksRef.current[cardId] = recentClicks;

        if (recentClicks.length >= 3) {
            srsToggleClicksRef.current[cardId] = [];
            try {
                await updateDoc(cardRef, {
                    srsEnabled: true,
                    srsInterval: 0,
                    srsEase: 2.5,
                    srsLearningStep: null,
                    srsIsLapsed: false,
                    srsReps: 0,
                    srsLapseCount: 0,
                    srsPrelapseInterval: null,
                    nextReview_back: new Date(),
                    lastReviewed: serverTimestamp(),
                    srsState: 'NEW',
                    intervalIndex_back: -1
                });
                showToast("⚡ Đã reset chu kỳ SRS của từ vựng về trạng thái Mới!", "success");
            } catch (e) {
                console.error("Lỗi reset chu kỳ SRS:", e);
                showToast("Lỗi reset chu kỳ: " + e.message, "error");
            }
            return;
        }

        try {
            if (srsEnabled) {
                await updateDoc(cardRef, {
                    srsEnabled: true,
                    srsInterval: 0,
                    srsEase: 2.5,
                    srsLearningStep: null,
                    srsIsLapsed: false,
                    srsReps: 0,
                    srsLapseCount: 0,
                    srsPrelapseInterval: null,
                    nextReview_back: new Date(),
                    lastReviewed: serverTimestamp()
                });
            } else {
                await updateDoc(cardRef, {
                    srsEnabled: false,
                    srsInterval: deleteField(),
                    srsEase: deleteField(),
                    srsLearningStep: deleteField(),
                    srsIsLapsed: deleteField(),
                    srsReps: deleteField(),
                    srsLapseCount: deleteField(),
                    srsPrelapseInterval: deleteField(),
                    nextReview_back: deleteField()
                });
            }
        } catch (e) {
            console.error("Lỗi khi chuyển trạng thái SRS:", e);
        }
    };

    const handleUpdateVocabSrsRating = (cardId, rating, isSessionMode = false) => {
        if (!vocabCollectionPath) return 0;
        const cardRef = doc(db, vocabCollectionPath, cardId);

        // Find the card synchronously in allCards to calculate XP and update state
        const cardData = allCards.find(c => c.id === cardId);
        let totalXp = 0;

        if (cardData) {
            const srsState = {
                interval: cardData.srsInterval || 0,
                ease: cardData.srsEase || 2.5,
                learningStep: cardData.srsLearningStep !== undefined ? cardData.srsLearningStep : null,
                isLapsed: cardData.srsIsLapsed || false,
                reps: cardData.srsReps || 0,
                lapseCount: cardData.srsLapseCount || 0,
                prelapseInterval: cardData.srsPrelapseInterval || null,
                state: cardData.srsState || null,
                intervalIndex_back: typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1,
                masteryState: cardData.masteryState || 'not_learned',
                seenCount: typeof cardData.seenCount === 'number' ? cardData.seenCount : 0,
                lastReviewed: cardData.lastReviewed || null
            };

            const result = calculateAnkiSRS(srsState, rating);

            // Award XP synchronously
            let basePoints = 0;
            if (rating === 'again') basePoints = 8;
            else if (rating === 'hard') basePoints = 25;
            else if (rating === 'good') basePoints = 45;
            else if (rating === 'easy') basePoints = 60;

            let promotionBonus = 0;
            const oldState = srsState.state || 'NEW';
            const newState = result.state;
            if (oldState === 'NEW' && newState === 'LEARNING') {
                promotionBonus = 10;
            } else if ((oldState === 'LEARNING' || oldState === 'RELEARNING') && newState === 'REVIEW') {
                promotionBonus = 100;
            }

            let multiplier = 1.0;
            const cardLevel = cardData.level || 'N5';
            if (cardLevel) {
                const lvlUpper = String(cardLevel).toUpperCase();
                if (lvlUpper.includes('N3')) multiplier = 1.2;
                else if (lvlUpper.includes('N2')) multiplier = 1.4;
                else if (lvlUpper.includes('N1')) multiplier = 1.6;
            }
            totalXp = Math.round((basePoints + promotionBonus) * multiplier);
            if (totalXp > 0) {
                if (!isSessionMode) {
                    awardXP(totalXp);
                }
                if (!vocabXpLogRef.current) {
                    vocabXpLogRef.current = {};
                }
                vocabXpLogRef.current[cardId] = totalXp;
            }
        }

        // 1. Optimistically update allCards state immediately
        setAllCards(prevCards => {
            const nextCards = [...prevCards];
            const cardIdx = nextCards.findIndex(c => c.id === cardId);
            if (cardIdx !== -1) {
                const cardData = nextCards[cardIdx];
                const srsState = {
                    interval: cardData.srsInterval || 0,
                    ease: cardData.srsEase || 2.5,
                    learningStep: cardData.srsLearningStep !== undefined ? cardData.srsLearningStep : null,
                    isLapsed: cardData.srsIsLapsed || false,
                    reps: cardData.srsReps || 0,
                    lapseCount: cardData.srsLapseCount || 0,
                    prelapseInterval: cardData.srsPrelapseInterval || null,
                    state: cardData.srsState || null,
                    intervalIndex_back: typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1,
                    masteryState: cardData.masteryState || 'not_learned',
                    seenCount: typeof cardData.seenCount === 'number' ? cardData.seenCount : 0,
                    lastReviewed: cardData.lastReviewed || null
                };

                const result = calculateAnkiSRS(srsState, rating);
                const nextReviewOffset = result.nextReviewOffsetMs !== undefined ? result.nextReviewOffsetMs : (result.interval * 60000);
                const nextReviewDate = new Date(Date.now() + nextReviewOffset);

                const isCorrect = rating !== 'again';
                const currentMastery = cardData.masteryState || 'not_learned';
                const newMastery = isCorrect
                    ? (currentMastery === 'not_learned' ? 'learning' : 'memorized')
                    : (currentMastery === 'memorized' ? 'learning' : 'not_learned');

                nextCards[cardIdx] = {
                    ...cardData,
                    srsInterval: result.interval,
                    srsEase: result.ease,
                    srsLearningStep: result.learningStep,
                    srsIsLapsed: result.isLapsed,
                    srsReps: result.reps,
                    srsLapseCount: result.lapseCount,
                    srsPrelapseInterval: result.prelapseInterval,
                    srsState: result.state,
                    intervalIndex_back: result.state === 'NEW' ? -1 : (result.state === 'REVIEW' ? 2 : 0),
                    nextReview_back: nextReviewDate,
                    lastReviewed: new Date(),
                    needsMistakeReview: rating === 'again',
                    masteryState: newMastery
                };
            }
            return nextCards;
        });

        // 2. Perform Firestore update asynchronously in background
        (async () => {
            try {
                const cardSnap = await getDoc(cardRef);
                if (!cardSnap.exists()) return;
                const cardData = cardSnap.data();

                const srsState = {
                    interval: cardData.srsInterval || 0,
                    ease: cardData.srsEase || 2.5,
                    learningStep: cardData.srsLearningStep !== undefined ? cardData.srsLearningStep : null,
                    isLapsed: cardData.srsIsLapsed || false,
                    reps: cardData.srsReps || 0,
                    lapseCount: cardData.srsLapseCount || 0,
                    prelapseInterval: cardData.srsPrelapseInterval || null,
                    state: cardData.srsState || null,
                    intervalIndex_back: typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1,
                    masteryState: cardData.masteryState || 'not_learned',
                    seenCount: typeof cardData.seenCount === 'number' ? cardData.seenCount : 0,
                    lastReviewed: cardData.lastReviewed || null
                };

                const result = calculateAnkiSRS(srsState, rating);
                const nextReviewOffset = result.nextReviewOffsetMs !== undefined ? result.nextReviewOffsetMs : (result.interval * 60000);
                const nextReviewDate = new Date(Date.now() + nextReviewOffset);

                const isCorrect = rating !== 'again';
                const currentMastery = cardData.masteryState || 'not_learned';
                const newMastery = isCorrect
                    ? (currentMastery === 'not_learned' ? 'learning' : 'memorized')
                    : (currentMastery === 'memorized' ? 'learning' : 'not_learned');

                await updateDoc(cardRef, {
                    srsInterval: result.interval,
                    srsEase: result.ease,
                    srsLearningStep: result.learningStep,
                    srsIsLapsed: result.isLapsed,
                    srsReps: result.reps,
                    srsLapseCount: result.lapseCount,
                    srsPrelapseInterval: result.prelapseInterval,
                    srsState: result.state,
                    intervalIndex_back: result.state === 'NEW' ? -1 : (result.state === 'REVIEW' ? 2 : 0),
                    nextReview_back: nextReviewDate,
                    lastReviewed: serverTimestamp(),
                    needsMistakeReview: rating === 'again',
                    masteryState: newMastery
                });

                await updateDailyActivity(1, 'reviewsDone');
            } catch (e) {
                console.error("Lỗi cập nhật đánh giá SRS từ vựng:", e);
            }
        })();

        return totalXp;
    };

    const handleRevertVocabSrsRating = (cardId, prevFields, isSessionMode = false) => {
        if (!vocabCollectionPath) return 0;
        const cardRef = doc(db, vocabCollectionPath, cardId);

        const rawFields = { ...prevFields };
        if (rawFields.nextReview_back && !(rawFields.nextReview_back instanceof Date)) {
            rawFields.nextReview_back = new Date(rawFields.nextReview_back);
        }
        if (rawFields.lastReviewed && !(rawFields.lastReviewed instanceof Date)) {
            rawFields.lastReviewed = new Date(rawFields.lastReviewed);
        }

        // 1. Revert allCards state immediately
        setAllCards(prevCards => {
            const nextCards = [...prevCards];
            const idx = nextCards.findIndex(c => c.id === cardId);
            if (idx !== -1) {
                nextCards[idx] = {
                    ...nextCards[idx],
                    ...rawFields
                };
            }
            return nextCards;
        });

        const awardedXp = vocabXpLogRef.current ? vocabXpLogRef.current[cardId] : 0;
        if (awardedXp > 0) {
            if (!isSessionMode) {
                awardXP(-awardedXp);
            }
            delete vocabXpLogRef.current[cardId];
        }
        updateDailyActivity(-1, 'reviewsDone');

        // 2. Revert in Firestore doc in background
        (async () => {
            try {
                const updatePayload = {
                    srsInterval: rawFields.srsInterval,
                    srsEase: rawFields.srsEase,
                    srsLearningStep: rawFields.srsLearningStep !== null ? rawFields.srsLearningStep : deleteField(),
                    srsIsLapsed: rawFields.srsIsLapsed,
                    srsReps: rawFields.srsReps,
                    srsLapseCount: rawFields.srsLapseCount,
                    srsPrelapseInterval: rawFields.srsPrelapseInterval !== null ? rawFields.srsPrelapseInterval : deleteField(),
                    srsState: rawFields.srsState !== null ? rawFields.srsState : deleteField(),
                    intervalIndex_back: rawFields.intervalIndex_back,
                    nextReview_back: rawFields.nextReview_back !== null ? rawFields.nextReview_back : deleteField(),
                    lastReviewed: rawFields.lastReviewed !== null ? rawFields.lastReviewed : deleteField(),
                    needsMistakeReview: rawFields.needsMistakeReview,
                    masteryState: rawFields.masteryState
                };
                await updateDoc(cardRef, updatePayload);
            } catch (e) {
                console.error("Lỗi khi khôi phục SRS từ vựng:", e);
            }
        })();
    };

    // Lưu cardId để scroll đến sau khi save
    const scrollToCardIdRef = useRef(null);
    // Lưu view trước đó để phát hiện thay đổi view
    const prevViewRef = useRef(view);
    const prevPathnameRef = useRef(location.pathname);

    // Scroll về đầu trang khi chuyển view hoặc route (trừ khi có scrollToCardId)
    useEffect(() => {
        // Nếu view hoặc pathname thay đổi và không phải scroll đến card cụ thể
        if ((prevViewRef.current !== view || prevPathnameRef.current !== location.pathname) && !scrollToCardIdRef.current) {
            const resetScroll = () => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                document.body.scrollTo(0, 0);
                document.documentElement.scrollTo(0, 0);

                const mainContainer = document.querySelector('.main-with-header');
                if (mainContainer) {
                    mainContainer.scrollTo(0, 0);
                }

                const mainEl = document.querySelector('main');
                if (mainEl) {
                    mainEl.scrollTo(0, 0);
                }

                const elements = document.querySelectorAll('*');
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    if (el.scrollTop > 0) {
                        el.scrollTop = 0;
                    }
                }
            };

            // Thực hiện cuộn ngay lập tức
            resetScroll();

            // Tiếp tục cuộn ở frame tiếp theo và sau đó để ghi đè cơ chế phục hồi scroll mặc định của trình duyệt
            requestAnimationFrame(resetScroll);
            const t1 = setTimeout(resetScroll, 50);
            const t2 = setTimeout(resetScroll, 150);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
        prevViewRef.current = view;
        prevPathnameRef.current = location.pathname;
    }, [view, location.pathname]);

    // Tracks if Real Exam mode is active to disable vocabulary lookup
    useEffect(() => {
        const checkExamMode = () => {
            setIsRealExamActive(sessionStorage.getItem('realExamModeActive') === 'true');
        };
        checkExamMode();
        window.addEventListener('realExamModeChange', checkExamMode);
        return () => window.removeEventListener('realExamModeChange', checkExamMode);
    }, []);

    // Tracks if fullscreen mode is active to hide menu sidebar
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        handleFSChange();
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

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
        } else if (newSpeechText !== oldSpeechText || !oldCard.audioBase64) {
            // Tự động tạo audio mới nếu đổi front text hoặc chưa có audio
            try {
                const result = await generateAudioSilent(front.trim());
                if (result && result.base64) {
                    updatedData.audioBase64 = result.base64;
                    updatedData.audioVoiceId = result.voiceId || null;
                }
            } catch (e) {
                console.warn('⚠️ Lỗi tự động tạo audio khi cập nhật thẻ:', e);
            }
        }

        try {
            await updateDoc(doc(db, vocabCollectionPath, cardId), updatedData);
            setNotification(`Đã cập nhật thẻ: ${front}`);
            setEditingCard(null);
            // KHÔNG navigate — giữ nguyên trang hiện tại (ListView, ReviewScreen, v.v.)

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

    const handleUpdateAvatar = async (avatarValue) => {
        if (!auth?.currentUser) throw new Error('Chưa đăng nhập');
        try {
            let finalAvatarValue = avatarValue;

            // Nếu là ảnh base64, kiểm tra và nén nếu cần
            if (typeof avatarValue === 'string' && avatarValue.startsWith('data:image/')) {
                // Nén ảnh xuống tối đa ~150KB để tránh vượt giới hạn Firestore (1MB/doc)
                const MAX_SIZE = 150 * 1024; // 150KB in chars
                if (avatarValue.length > MAX_SIZE) {
                    // Nén thêm bằng Canvas với quality thấp hơn
                    finalAvatarValue = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const SIZE = 150; // output size 150x150
                            canvas.width = SIZE;
                            canvas.height = SIZE;
                            const ctx = canvas.getContext('2d');
                            ctx.beginPath();
                            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
                            ctx.clip();
                            ctx.drawImage(img, 0, 0, SIZE, SIZE);
                            resolve(canvas.toDataURL('image/jpeg', 0.72));
                        };
                        img.src = avatarValue;
                    });
                }
            }

            if (settingsDocPath) {
                await updateDoc(doc(db, settingsDocPath), { avatar: finalAvatarValue });
            }
            setProfile(prev => ({ ...prev, avatar: finalAvatarValue }));
            setNotification('Đã cập nhật ảnh đại diện!');
        } catch (e) {
            console.error('Lỗi cập nhật avatar:', e);
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

    // --- BOOK VOCABULARY LOOKUP ---
    // Cache các bài học trong phiên làm việc để tránh query db liên tục
    const cachedLessonsRef = useRef(null);
    const cachedLessonsErrorRef = useRef(false);
    const lastAssistedRef = useRef({ word: '', timestamp: 0 });

    // Tìm từ vựng trong bộ sách (books/chapters/lessons) thay vì sharedVocab
    const lookupBookVocab = async (frontText) => {
        try {
            const key = frontText.trim();
            if (!key) return null;

            // Nếu đã từng bị lỗi quyền hoặc có lỗi khác, bỏ qua query tĩnh để đỡ lỗi Firebase
            if (cachedLessonsErrorRef.current) return null;

            let lessonsDocs = cachedLessonsRef.current;

            if (!lessonsDocs) {
                // Check in-memory book groups cache first
                const cachedGroups = getCachedBookGroups();
                if (cachedGroups) {
                    const lessons = [];
                    for (const group of cachedGroups) {
                        for (const book of group.books || []) {
                            for (const chapter of book.chapters || []) {
                                for (const lesson of chapter.lessons || []) {
                                    lessons.push(lesson);
                                }
                            }
                        }
                    }
                    lessonsDocs = lessons;
                    cachedLessonsRef.current = lessonsDocs;
                } else {
                    // Fallback to fetch from service
                    try {
                        const groups = await getSharedBookGroups();
                        const lessons = [];
                        for (const group of groups) {
                            for (const book of group.books || []) {
                                for (const chapter of book.chapters || []) {
                                    for (const lesson of chapter.lessons || []) {
                                        lessons.push(lesson);
                                    }
                                }
                            }
                        }
                        lessonsDocs = lessons;
                        cachedLessonsRef.current = lessonsDocs;
                    } catch (err) {
                        console.warn('Fallback loading shared book groups failed, falling back to collectionGroup:', err);
                        // Lấy tất cả vocab từ tất cả các lessons bằng collectionGroup
                        const lessonsQuery = query(collectionGroup(db, 'lessons'));
                        const lessonsSnap = await getDocs(lessonsQuery);
                        lessonsDocs = lessonsSnap.docs.map(doc => ({
                            id: doc.id,
                            _docPath: doc.ref.path,
                            ...doc.data()
                        }));
                        cachedLessonsRef.current = lessonsDocs;
                    }
                }
            }

            for (const lessonData of lessonsDocs) {
                if (lessonData.vocab && Array.isArray(lessonData.vocab)) {
                    const match = lessonData.vocab.find(v => {
                        const word = v.word || v.front || '';
                        // So sánh từ vựng cơ bản (Bỏ ngoặc kép và furigana)
                        const normalizedWord = word.split('（')[0].split('(')[0].trim();
                        return normalizedWord === key;
                    });

                    if (match) {
                        console.log(`📚 Tìm thấy "${key}" trong sách bài học!`);

                        const rawFront = match.word || match.front || key;
                        const formattedFront = await ensureFuriganaFormat(rawFront, match.reading);
                        const formattedSynonym = match.synonym ? await ensureFuriganaFormat(match.synonym) : '';

                        // Chuyển đổi format của sách sang format của thẻ User
                        return {
                            front: formattedFront,
                            frontWithFurigana: formattedFront,
                            meaning: match.meaning || match.back || match.meaningVi || match.vietnamese || '',
                            synonym: formattedSynonym,
                            example: match.example || '',
                            exampleMeaning: match.exampleMeaning || '',
                            nuance: match.nuance || match.note || '',
                            pos: match.pos || '',
                            level: match.level || '',
                            sinoVietnamese: match.sinoVietnamese || '',
                            synonymSinoVietnamese: '',
                            imageBase64: match.imageUrl || null,
                            audioBase64: match.audioBase64 || null,
                            exampleAudioBase64: match.exampleAudioBase64 || null,
                            _fromBook: true,
                            _docPath: lessonData._docPath || null,
                            _originalWord: match.word || match.front || key
                        };
                    }
                }
            }

            console.log(`📚 Không tìm thấy "${key}" trong sách - Gọi AI`);
            return null;
        } catch (e) {
            if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
                console.error("🔥 Lỗi quyền Firebase khi đọc sách (collectionGroup 'lessons'). Bạn cần cập nhật Rules trên Firebase Console. Tính năng đọc sách tạm tắt.");
                cachedLessonsErrorRef.current = true;
            } else {
                console.warn('Book vocab lookup error:', e);
            }
            return null;
        }
    };

    const deductOneAiCredit = async () => {
        // AI credits are unlimited now, no deduction needed
    };

    const updateBookVocabInFirestore = async (docPath, originalWord, updatedFields) => {
        if (!docPath || !originalWord) return;
        try {
            const docRef = doc(db, docPath);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.vocab && Array.isArray(data.vocab)) {
                    let changed = false;
                    const updatedVocab = data.vocab.map(v => {
                        const word = v.word || v.front || '';
                        if (word === originalWord) {
                            changed = true;
                            return {
                                ...v,
                                word: updatedFields.front || v.word,
                                front: updatedFields.front || v.front,
                                synonym: updatedFields.synonym !== undefined ? updatedFields.synonym : (v.synonym || ''),
                                pos: updatedFields.pos || v.pos || '',
                                sinoVietnamese: updatedFields.sinoVietnamese || v.sinoVietnamese || '',
                                meaning: updatedFields.meaning || v.meaning || '',
                                example: updatedFields.example || v.example || '',
                                exampleMeaning: updatedFields.exampleMeaning || v.exampleMeaning || '',
                                nuance: updatedFields.nuance || v.nuance || '',
                            };
                        }
                        return v;
                    });

                    if (changed) {
                        await updateDoc(docRef, { vocab: updatedVocab });
                        console.log(`✅ Automatically updated/standardized book vocabulary in Firestore path: ${docPath} for "${originalWord}"`);
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to update book vocabulary in Firestore:`, e);
        }
    };

    // --- UNIFIED AI ASSISTANT (OpenRouter only) ---
    const handleGeminiAssist = async (frontText, contextPos = '', contextLevel = '', contextBack = '', isRetry = false) => {
        if (!frontText) return null;

        let actualBack = '';
        let actualRetry = isRetry;
        if (typeof contextBack === 'boolean') {
            actualRetry = contextBack;
            actualBack = '';
        } else {
            actualBack = contextBack || '';
            actualRetry = isRetry || false;
        }

        const now = Date.now();
        if (lastAssistedRef.current.word === frontText && (now - lastAssistedRef.current.timestamp) < 15000) {
            actualRetry = true;
            console.log(`🔄 [handleGeminiAssist] Same word "${frontText}" requested again within 15s. Forcing AI generation (Retry/Recreate mode).`);
        }
        lastAssistedRef.current = { word: frontText, timestamp: now };

        if (!actualRetry) {
            // === BƯỚC 1: Luôn kiểm tra Book Vocabulary database trước ===
            try {
                const cachedVocab = await lookupBookVocab(frontText);
                if (cachedVocab) {
                    const result = { ...cachedVocab };

                    if (result.pos) result.pos = normalizePosKey(result.pos);

                    if (contextPos && contextPos !== result.pos) {
                        console.log(`📚 Book HIT: ghi đè pos="${result.pos}" → "${contextPos}" theo user chọn`);
                        result.pos = contextPos;
                    }
                    if (contextLevel && contextLevel !== result.level) {
                        console.log(`📚 Book HIT: ghi đè level="${result.level}" → "${contextLevel}" theo user chọn`);
                        result.level = contextLevel;
                    }

                    // Tự động kiểm tra và điền từ loại nếu thiếu
                    if (!result.pos || result.pos.trim() === '') {
                        console.log(`🤖 Từ loại (POS) bị thiếu cho từ sách - Gọi AI xác định từ loại cho "${result.front || frontText}"`);
                        try {
                            const model = adminConfig?.aiFeatureModels?.vocab_gen || 'google/gemini-2.5-flash';
                            const posPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật.
Hãy xác định từ loại (Part of Speech - POS) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Ví dụ: "${result.example || ''}"

Lưu ý: Từ loại (pos) BẮT BUỘC phải là một trong các chuỗi sau:
- "noun" (nếu là danh từ hoặc đại từ)
- "verb" (nếu là động từ thường)
- "suru_verb" (nếu là danh động từ)
- "adj-i" (nếu là tính từ đuôi -i)
- "adj-na" (nếu là tính từ đuôi -na)
- "adverb" (nếu là trạng từ)
- "conjunction" (nếu là liên từ)
- "particle" (nếu là trợ từ)
- "grammar" (nếu là cấu trúc ngữ pháp)
- "phrase" (nếu là cụm từ hoặc câu)
- "other" (nếu không thuộc các nhóm trên)

Chỉ trả về JSON định dạng sau (không giải thích, không markdown):
{"pos": "..."}`;
                            const responseText = await callAI(posPrompt, model);
                            const parsedJson = parseJsonFromAI(responseText);
                            if (parsedJson && parsedJson.pos) {
                                result.pos = normalizePosKey(parsedJson.pos);
                                console.log(`🤖 AI generated pos (Book): "${result.pos}"`);
                            }
                        } catch (e) {
                            console.warn('AI POS generation for book vocab failed:', e);
                        }
                    }

                    // Tự động kiểm tra và điền âm Hán Việt nếu thiếu
                    if (!result.sinoVietnamese || result.sinoVietnamese.trim() === '') {
                        const lookupHV = getSinoVietnamese(result.front || frontText);
                        if (lookupHV) {
                            console.log(`📘 Hán Việt lookup (Book): "${result.front || frontText}" → "${lookupHV}"`);
                            result.sinoVietnamese = lookupHV;
                        } else {
                            // Nếu tra cứu cứng không có (ví dụ từ không ghi kanji dạng như かける, てんぷら), gọi AI để tạo âm Hán Việt
                            console.log(`🤖 Hán Việt không có Kanji trong từ gốc hoặc thiếu - Gọi AI tạo âm Hán Việt cho "${result.front || frontText}"`);
                            try {
                                const model = adminConfig?.aiFeatureModels?.vocab_sino_viet || 'google/gemini-3.1-flash-lite';
                                const hvPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và Hán Việt.
Hãy tìm chữ Hán (Kanji) tương ứng và dịch sang âm Hán Việt (IN HOA) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Từ loại: "${result.pos || ''}"
Ví dụ: "${result.example || ''}"

Lưu ý:
1. Xác định đúng từ Hán tương ứng dựa vào ngữ cảnh nghĩa và từ loại.
2. Trả về âm Hán Việt IN HOA, ngăn cách bằng dấu cách (Ví dụ: "HỌC SINH"). BẮT BUỘC phải dịch ĐẦY ĐỦ tất cả các chữ Kanji tương ứng có trong cụm từ, tuyệt đối không được bỏ sót hay rút gọn bất kỳ chữ Kanji nào.
3. Nếu từ vựng hoàn toàn là từ thuần Nhật (wago) hoặc từ mượn ngoại lai (katakana) không có chữ Hán tương ứng (ví dụ: "てんぷら", "パン", "カメラ"), hãy trả về chuỗi rỗng "". Tuyệt đối không bịa đặt âm Hán Việt không có thực.

Chỉ trả về JSON định dạng sau (không giải thích, không markdown):
{"sinoVietnamese": "..."}`;
                                const responseText = await callAI(hvPrompt, model);
                                const parsedJson = parseJsonFromAI(responseText);
                                if (parsedJson && parsedJson.sinoVietnamese) {
                                    result.sinoVietnamese = parsedJson.sinoVietnamese;
                                    console.log(`🤖 AI generated sinoVietnamese (Book): "${result.sinoVietnamese}"`);
                                }
                            } catch (e) {
                                console.warn('AI Sino-Vietnamese generation for book vocab failed:', e);
                            }
                        }
                    }

                    // Nếu có bất kỳ trường nào được cập nhật/thêm mới hoặc được định dạng chuẩn, cập nhật ngược lại Firestore sách
                    let isBookVocabUpdated = false;
                    const updatedFields = {};

                    if (result.pos !== cachedVocab.pos) {
                        updatedFields.pos = result.pos;
                        isBookVocabUpdated = true;
                    }
                    if (result.sinoVietnamese !== cachedVocab.sinoVietnamese) {
                        updatedFields.sinoVietnamese = result.sinoVietnamese;
                        isBookVocabUpdated = true;
                    }
                    if (result.front !== cachedVocab.front) {
                        updatedFields.front = result.front;
                        isBookVocabUpdated = true;
                    }
                    if (result.synonym !== cachedVocab.synonym) {
                        updatedFields.synonym = result.synonym;
                        isBookVocabUpdated = true;
                    }

                    if (isBookVocabUpdated && cachedVocab._docPath && cachedVocab._originalWord) {
                        updateBookVocabInFirestore(cachedVocab._docPath, cachedVocab._originalWord, updatedFields)
                            .catch(e => console.warn('Error updating book vocab back:', e));
                    }

                    // Đồng thời lưu bản ghi đã chuẩn hoá vào sharedVocabulary để lưu trữ chung
                    saveSharedVocab(frontText, result, true)
                        .catch(e => console.warn('Error syncing book vocab to shared vocab:', e));

                    // Luôn trừ credit mỗi khi bấm nút theo yêu cầu của user
                    if (!isRetry && settingsDocPath) {
                        await deductOneAiCredit();
                    }

                    console.log(`📚 ✅ Dùng dữ liệu từ sách cho "${frontText}"`);
                    return result;
                }
            } catch (e) {
                console.warn('Book vocab lookup error:', e);
            }

            // === BƯỚC 1.5: Kiểm tra sharedVocabulary trước khi gọi AI ===
            try {
                const shared = await findSharedVocab(frontText);
                if (shared) {
                    console.log(`📚 sharedVocabulary HIT: Dùng dữ liệu dùng chung cho "${frontText}"`);
                    const result = {
                        front: shared.front || frontText,
                        frontWithFurigana: shared.front || shared.frontWithFurigana || frontText,
                        meaning: shared.back || shared.meaning || '',
                        synonym: shared.synonym || '',
                        example: shared.example || '',
                        exampleMeaning: shared.exampleMeaning || '',
                        nuance: shared.nuance || '',
                        pos: shared.pos || '',
                        level: shared.level || '',
                        sinoVietnamese: shared.sinoVietnamese || '',
                        synonymSinoVietnamese: shared.synonymSinoVietnamese || '',
                        _fromShared: true
                    };

                    if (result.pos) result.pos = normalizePosKey(result.pos);

                    if (contextPos && contextPos !== result.pos) {
                        console.log(`📚 Shared HIT: ghi đè pos="${result.pos}" → "${contextPos}" theo user chọn`);
                        result.pos = contextPos;
                    }
                    if (contextLevel && contextLevel !== result.level) {
                        console.log(`📚 Shared HIT: ghi đè level="${result.level}" → "${contextLevel}" theo user chọn`);
                        result.level = contextLevel;
                    }

                    let isSharedVocabUpdated = false;

                    // Chuẩn hóa Hiragana brackets cho front và synonym
                    const oldFront = result.frontWithFurigana;
                    const oldSynonym = result.synonym;
                    result.front = await ensureFuriganaFormat(result.front);
                    result.frontWithFurigana = result.front;
                    if (result.synonym) {
                        result.synonym = await ensureFuriganaFormat(result.synonym);
                    }

                    if (result.frontWithFurigana !== oldFront || result.synonym !== oldSynonym) {
                        isSharedVocabUpdated = true;
                    }

                    // Tự động kiểm tra và điền từ loại nếu thiếu
                    if (!result.pos || result.pos.trim() === '') {
                        console.log(`🤖 Từ loại (POS) bị thiếu cho từ shared - Gọi AI xác định từ loại cho "${result.front || frontText}"`);
                        try {
                            const model = adminConfig?.aiFeatureModels?.vocab_gen || 'google/gemini-2.5-flash';
                            const posPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật.
Hãy xác định từ loại (Part of Speech - POS) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Ví dụ: "${result.example || ''}"

Lưu ý: Từ loại (pos) BẮT BUỘC phải là một trong các chuỗi sau:
- "noun" (nếu là danh từ hoặc đại từ)
- "verb" (nếu là động từ thường)
- "suru_verb" (nếu là danh động từ)
- "adj-i" (nếu là tính từ đuôi -i)
- "adj-na" (nếu là tính từ đuôi -na)
- "adverb" (nếu là trạng từ)
- "conjunction" (nếu là liên từ)
- "particle" (nếu là trợ từ)
- "grammar" (nếu là cấu trúc ngữ pháp)
- "phrase" (nếu là cụm từ hoặc câu)
- "other" (nếu không thuộc các nhóm trên)

Chỉ trả về JSON định dạng sau (không giải thích, không markdown):
{"pos": "..."}`;
                            const responseText = await callAI(posPrompt, model);
                            const parsedJson = parseJsonFromAI(responseText);
                            if (parsedJson && parsedJson.pos) {
                                result.pos = normalizePosKey(parsedJson.pos);
                                console.log(`🤖 AI generated pos (Shared): "${result.pos}"`);
                                isSharedVocabUpdated = true;
                            }
                        } catch (e) {
                            console.warn('AI POS generation for shared vocab failed:', e);
                        }
                    }

                    // Tự động kiểm tra và điền âm Hán Việt nếu thiếu
                    if (!result.sinoVietnamese || result.sinoVietnamese.trim() === '') {
                        const lookupHV = getSinoVietnamese(result.front || frontText);
                        if (lookupHV) {
                            console.log(`📘 Hán Việt lookup (Shared): "${result.front || frontText}" → "${lookupHV}"`);
                            result.sinoVietnamese = lookupHV;
                            isSharedVocabUpdated = true;
                        } else {
                            console.log(`🤖 Hán Việt không có Kanji trong từ gốc hoặc thiếu - Gọi AI tạo âm Hán Việt cho "${result.front || frontText}"`);
                            try {
                                const model = adminConfig?.aiFeatureModels?.vocab_sino_viet || 'google/gemini-3.1-flash-lite';
                                const hvPrompt = `Bạn là một chuyên gia ngôn ngữ tiếng Nhật và Hán Việt.
Hãy tìm chữ Hán (Kanji) tương ứng và dịch sang âm Hán Việt (IN HOA) cho từ vựng tiếng Nhật dưới đây.
Từ gốc: "${result.front || frontText}"
Nghĩa: "${result.meaning}"
Từ loại: "${result.pos || ''}"
Ví dụ: "${result.example || ''}"

Lưu ý:
1. Xác định đúng từ Hán tương ứng dựa vào ngữ cảnh nghĩa và từ loại.
2. Trả về âm Hán Việt IN HOA, ngăn cách bằng dấu cách (Ví dụ: "HỌC SINH"). BẮT BUỘC phải dịch ĐẦY ĐỦ tất cả các chữ Kanji tương ứng có trong cụm từ, tuyệt đối không được bỏ sót hay rút gọn bất kỳ chữ Kanji nào.
3. Nếu từ vựng hoàn toàn là từ thuần Nhật (wago) hoặc từ mượn ngoại lai (katakana) không có chữ Hán tương ứng (ví dụ: "てんぷら", "パン", "カメラ"), hãy trả về chuỗi rỗng "". Tuyệt đối không bịa đặt âm Hán Việt không có thực.

Chỉ trả về JSON định dạng sau (không giải thích, không markdown):
{"sinoVietnamese": "..."}`;
                                const responseText = await callAI(hvPrompt, model);
                                const parsedJson = parseJsonFromAI(responseText);
                                if (parsedJson && parsedJson.sinoVietnamese) {
                                    result.sinoVietnamese = parsedJson.sinoVietnamese;
                                    console.log(`🤖 AI generated sinoVietnamese (Shared): "${result.sinoVietnamese}"`);
                                    isSharedVocabUpdated = true;
                                }
                            } catch (e) {
                                console.warn('AI Sino-Vietnamese generation for shared vocab failed:', e);
                            }
                        }
                    }

                    // Nếu có bất kỳ trường nào được cập nhật/thêm mới, lưu ngược lại sharedVocabulary
                    if (isSharedVocabUpdated) {
                        saveSharedVocab(frontText, result, true)
                            .then(() => console.log(`✅ Automatically updated/standardized sharedVocabulary for "${frontText}"`))
                            .catch(e => console.warn('Error updating shared vocab:', e));
                    }

                    // Luôn trừ credit mỗi khi bấm nút theo yêu cầu của user
                    if (!isRetry && settingsDocPath) {
                        await deductOneAiCredit();
                    }

                    return result;
                }
            } catch (e) {
                console.warn('Shared vocab lookup error:', e);
            }
        }

        // === BƯỚC 2: Tạo prompt thống nhất từ aiProvider ===
        const prompt = generateVocabPrompt(frontText, contextPos, contextLevel, actualBack);

        try {
            // SECURITY: Rate limiting — max 10 AI calls per minute
            if (!aiRateLimiter.canProceed()) {
                const waitSec = Math.ceil(aiRateLimiter.getTimeUntilNext() / 1000);
                setNotification(`Bạn đang gọi AI quá nhanh. Vui lòng đợi ${waitSec} giây.`);
                return null;
            }

            // Kiểm tra quyền AI
            if (!canUserUseAI) {
                setNotification('Bạn cần nâng cấp tài khoản Premium để sử dụng tính năng AI.');
                return null;
            }

            const providerInfo = getAIProviderInfo();
            console.log(`🤖 AI Provider: ${providerInfo.summary}`);

            const featureId = contextPos === 'grammar' ? 'grammar_gen' : 'vocab_gen';
            const forcedModel = adminConfig?.aiFeatureModels?.[featureId] || (featureId === 'grammar_gen' ? 'google/gemini-2.5-flash' : 'openai/gpt-4o-mini');
            const responseText = await callAI(prompt, forcedModel, featureId);
            const parsedJson = parseJsonFromAI(responseText);

            if (parsedJson) {
                if (parsedJson.pos) parsedJson.pos = normalizePosKey(parsedJson.pos);

                // Đảm bảo có frontWithFurigana
                if (!parsedJson.frontWithFurigana) {
                    parsedJson.frontWithFurigana = parsedJson.frontText || parsedJson.front || frontText;
                }

                // Định dạng chuẩn hiragana brackets cho từ vựng và từ đồng nghĩa
                try {
                    if (parsedJson.frontWithFurigana) {
                        parsedJson.frontWithFurigana = await ensureFuriganaFormat(parsedJson.frontWithFurigana);
                    }
                    if (parsedJson.synonym) {
                        parsedJson.synonym = await ensureFuriganaFormat(parsedJson.synonym);
                    }
                } catch (e) {
                    console.error("Failed to ensure furigana format:", e);
                }

                // Ghi đè âm Hán Việt bằng bảng tra cứu cứng
                try {
                    const lookupHV = getSinoVietnamese(frontText);
                    if (lookupHV) {
                        console.log(`📘 Hán Việt lookup: "${frontText}" → "${lookupHV}" (AI: "${parsedJson.sinoVietnamese || ''}")`); parsedJson.sinoVietnamese = lookupHV;
                    }
                } catch (e) { console.warn('Lookup Hán Việt error:', e); }

                // Trừ 1 credit: CHỈ trừ khi lần đầu (không phải retry), trừ cho TẤT CẢ (gồm cả admin) để hiển thị số đúng
                if (!isRetry && settingsDocPath) {
                    await deductOneAiCredit();
                } else if (isRetry) {
                    console.log(`🔄 Retry mode: KHÔNG trừ credit`);
                }

                // Lưu ngược lại sharedVocabulary để lần sau người dùng khác không cần gọi AI nữa
                try {
                    saveSharedVocab(frontText, parsedJson, actualRetry)
                        .then(() => console.log(`✅ Automatically saved AI-generated vocab to sharedVocabulary for "${frontText}"`))
                        .catch(e => console.warn('Error saving AI-generated vocab to sharedVocabulary:', e));
                } catch (e) {
                    console.warn('Error scheduling saveSharedVocab:', e);
                }

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

    const handleGenerateMoreExample = async (frontText, targetMeaning, level = '') => {
        if (!frontText || !targetMeaning) return null;
        try {
            // SECURITY: Rate limiting
            if (!aiRateLimiter.canProceed()) {
                const waitSec = Math.ceil(aiRateLimiter.getTimeUntilNext() / 1000);
                setNotification(`Bạn đang gọi AI quá nhanh. Vui lòng đợi ${waitSec} giây.`);
                return null;
            }
            if (!canUserUseAI) {
                setNotification('Bạn chưa được cấp quyền sử dụng AI. Liên hệ admin để được cấp quyền.');
                return null;
            }
            const { generateMoreExamplePrompt } = await import('./utils/aiProvider');
            const prompt = generateMoreExamplePrompt(frontText, targetMeaning);

            const forcedModel = adminConfig?.aiFeatureModels?.more_examples || 'openai/gpt-4o-mini';
            const responseText = await callAI(prompt, forcedModel);
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

    const handleExtractVocabFromImage = async (imageBase64) => {
        if (!imageBase64) return null;

        try {
            // SECURITY: Rate limiting
            if (!aiRateLimiter.canProceed()) {
                const waitSec = Math.ceil(aiRateLimiter.getTimeUntilNext() / 1000);
                setNotification(`Bạn đang gọi AI quá nhanh. Vui lòng đợi ${waitSec} giây.`);
                return null;
            }

            // Kiểm tra quyền AI
            if (!canUserUseAI) {
                setNotification('Bạn cần nâng cấp tài khoản Premium để sử dụng tính năng AI.');
                return null;
            }

            // Call extractVocabFromImage
            const { extractVocabFromImage } = await import('./utils/aiProvider');
            const result = await extractVocabFromImage(imageBase64);

            if (result && Array.isArray(result)) {
                return result;
            } else {
                setNotification("Không thể trích xuất từ vựng từ ảnh này. Thử lại với ảnh rõ hơn.");
                return null;
            }
        } catch (e) {
            console.error("Lỗi trích xuất từ ảnh:", e);
            setNotification(e.message || "Không gọi được AI. Kiểm tra API key hoặc thử lại sau.");
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

    // Fetch kanji SRS counts for public stats
    useEffect(() => {
        if (!authReady || !userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
        const unsub = onSnapshot(q, (snap) => {
            let total = 0, mastered = 0;
            snap.docs.forEach(d => {
                total++;
                if (d.data().reps >= 5) mastered++;
            });
            setKanjiSrsPublicCount({ total, mastered });
        }, () => { });
        return () => unsub();
    }, [authReady, userId]);

    useEffect(() => {
        if (!authReady || !userId || !db || !profile) return;

        const updatePublicStats = async () => {
            try {
                const statsDocRef = doc(db, publicStatsCollectionPath, userId);
                const vocabMastered = allCards.filter(c => c.intervalIndex_back >= 4).length;

                const currentStreak = calculatedStreak;

                // Tính tổng ôn tập và ngày hoạt động
                const totalReviews = (dailyActivityLogs || []).reduce((s, l) => s + (l.reviewsDone || 0), 0);
                const activeDays = (dailyActivityLogs || []).filter(l => (l.newWordsAdded || 0) > 0 || (l.newKanjiAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

                // Tính số liệu hoạt động trong 7 ngày qua
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const last7DaysLogs = (dailyActivityLogs || []).filter(log => {
                    try {
                        const logDate = new Date(log.id);
                        logDate.setHours(0, 0, 0, 0);
                        const diffTime = today.getTime() - logDate.getTime();
                        const diffDays = diffTime / (1000 * 60 * 60 * 24);
                        return diffDays >= 0 && diffDays < 7;
                    } catch (e) {
                        return false;
                    }
                });

                const addedLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newWordsAdded || 0), 0);
                const kanjiLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newKanjiAdded || 0), 0);
                const reviewsLast7Days = last7DaysLogs.reduce((s, l) => s + (l.reviewsDone || 0), 0);
                const activeDaysLast7Days = last7DaysLogs.filter(l => (l.newWordsAdded || 0) > 0 || (l.newKanjiAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

                // === CÔNG THỨC TÍNH ĐIỂM VINH DANH MỚI (CHĂM CHỈ) ===
                // Điểm vinh danh được tính dựa trên hoạt động tích cực trong 7 ngày gần nhất và streak hiện tại:
                // - Từ vựng mới thêm trong tuần: +10 điểm/từ
                // - Kanji mới thêm trong tuần: +15 điểm/chữ
                // - Ôn tập trong tuần: +20 điểm/lượt
                // - Số ngày học tích cực trong tuần (max 7 ngày): +50 điểm/ngày
                // - Chuỗi ngày học liên tục (streak): +20 điểm/ngày streak
                const score = Math.round(
                    (addedLast7Days * 10) +
                    (kanjiLast7Days * 15) +
                    (reviewsLast7Days * 20) +
                    (activeDaysLast7Days * 50) +
                    (currentStreak * 20)
                );

                const publicData = {
                    userId: userId,
                    displayName: profile.displayName || 'Người dùng ẩn danh',
                    avatar: (profile.avatar && !profile.avatar.startsWith('data:image/')) ? profile.avatar : '',
                    email: auth?.currentUser?.email || '',
                    totalCards: allCards.length,
                    shortTerm: memoryStats.shortTerm,
                    midTerm: memoryStats.midTerm,
                    longTerm: memoryStats.longTerm,
                    mastered: vocabMastered,
                    // Gamification
                    level: profile.level || 1,
                    title: profile.title || getLevelTitle(1),
                    league: profile.league || 'Sắt',
                    // Dữ liệu Kanji
                    kanjiTotal: kanjiSrsPublicCount.total,
                    kanjiMastered: kanjiSrsPublicCount.mastered,
                    // Dữ liệu hoạt động
                    totalReviews: totalReviews,
                    activeDays: activeDays,
                    streak: currentStreak,
                    // Dữ liệu hoạt động 7 ngày qua
                    addedLast7Days: addedLast7Days,
                    kanjiAddedLast7Days: kanjiLast7Days,
                    reviewsLast7Days: reviewsLast7Days,
                    activeDaysLast7Days: activeDaysLast7Days,
                    // Điểm vinh danh năng động mới
                    score: score,
                    isPremium: (profile.unlockedSpecializedPackages && (
                        profile.unlockedSpecializedPackages.includes('premium') ||
                        profile.unlockedSpecializedPackages.includes('premium_1m') ||
                        profile.unlockedSpecializedPackages.includes('premium_1y') ||
                        profile.unlockedSpecializedPackages.includes('premium_3y') ||
                        profile.unlockedSpecializedPackages.includes('vocab_zen') ||
                        profile.unlockedSpecializedPackages.includes('grammar_zen') ||
                        profile.unlockedSpecializedPackages.includes('kanji_zen') ||
                        profile.unlockedSpecializedPackages.includes('jlpt_prep')
                    )) || false,
                    unlockedSpecializedPackages: profile.unlockedSpecializedPackages || [],
                    premiumExpiresAt: profile.premiumExpiresAt || null,
                    trialPricingTier: profile.trialPricingTier || null,
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

    }, [memoryStats, allCards.length, profile, userId, authReady, publicStatsCollectionPath, dailyActivityLogs, kanjiSrsPublicCount, calculatedStreak]);

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
                    batchVocabList={batchVocabList}
                    currentBatchIndex={currentBatchIndex}
                    totalBatchCount={batchVocabList.length}
                    onBatchNext={handleBatchSaveNext}
                    onBatchSkip={handleBatchSkip}
                    editingCard={editingCard}
                    userId={userId}
                    onGenerateMoreExample={handleGenerateMoreExample}
                    aiCreditsRemaining={userProfile?.aiCredits}
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
                    allCards={allCards}
                />;
            case 'STUDY':
                return <StudyScreen
                    studySessionData={studySessionData}
                    setStudySessionData={setStudySessionData}
                    allCards={allCards}
                    onUpdateCard={handleUpdateCard}
                    onSaveCardAudio={handleSaveCardAudio}
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
                    onSaveCardAudio={handleSaveCardAudio}
                    onComplete={() => {
                        setFlashcardCards([]);
                        setView('HOME');
                    }}
                />;
            case 'KANJI':
                return <KanjiScreen isAdmin={isAdmin} onAddVocabToSRS={handleAddCard} onGeminiAssist={handleGeminiAssist} allUserCards={allCards} folders={folders} userId={userId} />;
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
                    onSaveCardAudio={handleSaveCardAudio}
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
                    onSaveCardAudio={handleSaveCardAudio}
                    onExport={() => handleExport(allCards)}
                    onNavigateToEdit={handleNavigateToEdit}
                    onNavigateToImport={() => setView('IMPORT')}
                    scrollToCardId={scrollToCardIdRef.current}
                    onScrollComplete={() => { scrollToCardIdRef.current = null; }}
                    savedFilters={savedFilters}
                    onFiltersChange={(filters) => setSavedFilters(filters)}
                    userId={userId}
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
                    dailyActivityLogs={dailyActivityLogs}
                    calculatedStreak={calculatedStreak}
                    isActivityLogsLoaded={isActivityLogsLoaded}
                />;
        }
    };

    // Check if maintenance mode is active for non-admins
    const isLoginPage = location.pathname === ROUTES.LOGIN || location.pathname === '/login';
    if (adminConfig?.maintenanceMode && !isAdmin && userId && !isLoginPage) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col items-center">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                        <Wrench className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-3">
                        Hệ thống đang bảo trì
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                        QuizKi đang thực hiện nâng cấp và bảo trì định kỳ để mang lại trải nghiệm tốt nhất cho bạn. Chúng tôi sẽ trở lại trong thời gian sớm nhất.
                    </p>
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6"></div>

                    <div className="flex flex-col items-center gap-4 w-full">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            Cảm ơn bạn đã kiên nhẫn và thông cảm!
                        </p>

                        <button
                            onClick={async () => {
                                try {
                                    await signOut(auth);
                                    window.location.reload();
                                } catch (error) {
                                    console.error("Lỗi đăng xuất:", error);
                                }
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:border-rose-100 dark:hover:border-rose-950/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Đăng xuất / Chuyển tài khoản
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-800 dark:selection:text-indigo-200">
            {/* Sidebar for navigation */}
            {!isFullscreen && (
                <Sidebar
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    displayName={profile?.displayName}
                    isAdmin={isAdmin}
                    userId={userId}
                    allCards={allCards}
                    isPremium={isAdmin || hasPremium}
                    avatar={profile?.avatar}
                    profile={profile}
                />
            )}

            {/* Global text selection vocabulary lookup tool */}
            <VocabularySelectionLookup
                allCards={allCards}
                folders={folders}
                handleAddCard={handleAddCard}
                setNotification={setNotification}
                disabled={isRealExamActive}
                isPremiumUnlocked={isAdmin || hasPremium}
            />

            {/* Onboarding tour for new users */}
            {userId && (
                <OnboardingTour
                    userId={userId}
                    isAdmin={isAdmin}
                    section={getSectionFromPath(location.pathname)}
                    forceTrigger={tourTrigger}
                />
            )}

            {/* Restart onboarding guide button */}
            {userId && location.pathname !== ROUTES.LOGIN && location.pathname !== '/login' && location.pathname !== '/privacy' && location.pathname !== '/terms' && (
                <button
                    onClick={() => setTourTrigger(prev => prev + 1)}
                    className="hidden lg:flex fixed bottom-6 left-6 lg:left-[18rem] z-55 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 active:scale-95 opacity-50 hover:opacity-100 focus:opacity-100 active:opacity-100 cursor-pointer bg-[#2E5B70] shadow-[#2E5B70]/30 border border-slate-100/10"
                    title="Xem hướng dẫn trang này"
                >
                    <HelpCircle className="w-6 h-6" />
                </button>
            )}

            {/* Update notification when new version is deployed */}
            {updateAvailable && (
                <UpdateNotification onRefresh={refreshApp} onDismiss={dismissUpdate} />
            )}

            {/* Modal thông báo khẩn cấp / Popup */}
            {activePopup && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white/95 dark:bg-slate-900/95 border border-indigo-100/50 dark:border-slate-800/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 transform scale-100 relative">
                        {/* Header with decorative background */}
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white text-center relative overflow-hidden">
                            {/* Decorative ambient blobs */}
                            <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>

                            <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner animate-bounce">
                                <Bell className="w-6 h-6 text-white" />
                            </div>

                            <h2 className="text-xl font-black tracking-wide uppercase drop-shadow-md">Thông Báo Hệ Thống</h2>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 space-y-4">
                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-slate-100 text-center leading-tight">
                                {activePopup.title}
                            </h3>
                            <div className="text-sm text-gray-600 dark:text-slate-350 leading-relaxed max-h-[40vh] overflow-y-auto whitespace-pre-wrap pr-1 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                                {activePopup.message}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center">
                            <button
                                id="btn-close-popup-notification"
                                onClick={handleDismissPopup}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm rounded-2xl transition-all duration-300 transform active:scale-95 shadow-md shadow-indigo-600/10 dark:shadow-none hover:shadow-indigo-600/20 cursor-pointer min-w-[140px] text-center"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            <main className={`${isFullscreen ? 'ml-0 lg:ml-0 pt-0' : 'lg:ml-64 pt-14 lg:pt-0'} min-h-screen flex flex-col ${isReviewSessionPage || ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') ? 'bg-transparent' : ''}`}>
                {profile?.trialPricingTier && (
                    <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between shadow-md relative z-40">
                        <div className="flex items-center gap-2">
                            <span className="bg-white/25 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">TEST MODE</span>
                            <span>Đang giả lập gói: <strong className="underline">{profile.trialPricingTier.toUpperCase()}</strong>. {profile.trialPricingTier === 'free' ? 'Giới hạn: 3 học phần, 20 từ/học phần' : 'Không giới hạn học phần/từ vựng'}</span>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    const { doc, updateDoc } = await import('firebase/firestore');
                                    const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
                                    await updateDoc(profileRef, { trialPricingTier: null, simulatedCredits: null });
                                    alert('Đã tắt giả lập, quay về tài khoản thực tế!');
                                } catch (e) { console.error(e); }
                            }}
                            className="bg-white text-indigo-700 font-bold px-2 py-0.5 rounded hover:bg-gray-100 transition-all text-[10px]"
                        >
                            Tắt giả lập
                        </button>
                    </div>
                )}
                <div className={`${isReviewSessionPage ? 'w-full flex-1 flex items-center justify-center bg-transparent py-4 md:py-8' : ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') ? 'w-full flex-1' : 'w-full max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6'}`}>
                    {/* Main content container - transparent */}
                    <div className={`w-full ${isReviewSessionPage || ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') ? 'bg-transparent' : ''}`}>
                        <div className={`w-full ${isReviewSessionPage || ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') ? 'bg-transparent' : ''}`}>
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
                                calculatedStreak={calculatedStreak}
                                isActivityLogsLoaded={isActivityLogsLoaded}
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
                                folders={studySets}
                                cardFolders={cardFolders}
                                onAddFolder={handleAddFolder}
                                onDeleteFolder={handleDeleteFolder}
                                onRenameFolder={handleUpdateFolder}
                                parentFolders={parentFolders}
                                onAddParentFolder={handleAddParentFolder}
                                onRenameParentFolder={handleUpdateParentFolder}
                                onDeleteParentFolder={handleDeleteParentFolder}
                                onMoveStudySetToParentFolder={handleMoveStudySetToParentFolder}
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
                                handleExtractVocabFromImage={handleExtractVocabFromImage}
                                handleGenerateMoreExample={handleGenerateMoreExample}
                                handleBatchImport={handleBatchImport}
                                handleBatchSaveNext={handleBatchSaveNext}
                                handleBatchSkip={handleBatchSkip}
                                handleExport={handleExport}

                                handleNavigateToEdit={handleNavigateToEdit}
                                handleUpdateGoal={handleUpdateGoal}
                                handleAdminDeleteUserData={handleAdminDeleteUserData}
                                handleUpdateProfileName={handleUpdateProfileName}
                                handleUpdateAvatar={handleUpdateAvatar}
                                handleChangePassword={handleChangePassword}
                                batchMode={batchVocabList.length > 0 && currentBatchIndex < batchVocabList.length}
                                currentBatchIndex={currentBatchIndex}
                                batchVocabList={batchVocabList}
                                setShowBatchImportModal={setShowBatchImportModal}
                                scrollToCardIdRef={scrollToCardIdRef}
                                playAudio={playAudio}
                                handleSaveCardAudio={handleSaveCardAudio}
                                shuffleArray={shuffleArray}
                                onToggleSrs={handleToggleSrs}
                                onUpdateVocabSrsRating={handleUpdateVocabSrsRating}
                                onRevertVocabSrsRating={handleRevertVocabSrsRating}
                                awardXP={awardXP}
                                isReviewActive={isReviewActive}
                                setIsReviewActive={setIsReviewActive}
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

            {/* Modal thăng cấp Level Up với hiệu ứng 3D */}
            {levelUpInfo && !isReviewActive && !isReviewSessionPage && !isRealExamActive && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.4),_inset_0_1px_0_rgba(255,255,255,0.1)] max-w-sm w-full p-8 text-center overflow-visible scale-100 animate-scale-up">

                        {/* Floating/rotating glow element behind */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-500 rounded-[26px] blur-2xl opacity-40 animate-pulse -z-10" />

                        {/* Celebration sparkles */}
                        <div className="absolute inset-0 pointer-events-none opacity-40">
                            <span className="absolute top-4 left-6 text-2xl animate-bounce">✨</span>
                            <span className="absolute top-12 right-6 text-xl animate-ping">⭐</span>
                            <span className="absolute bottom-12 left-4 text-2xl animate-bounce">🎉</span>
                            <span className="absolute bottom-6 right-8 text-xl animate-pulse">✨</span>
                        </div>

                        {/* Trophy Container */}
                        <div className="relative flex justify-center mb-8">
                            <div className="relative">
                                {/* Glow ring */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full blur-2xl opacity-75 animate-ping" />
                                <div className="relative bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-500 p-6 rounded-full border-4 border-yellow-300 shadow-[0_15px_30px_rgba(245,158,11,0.5)] transform hover:scale-110 hover:rotate-6 transition-all duration-300">
                                    <Trophy className="w-16 h-16 text-white stroke-[2.5] drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
                                </div>
                            </div>
                        </div>

                        {/* Level badge circle */}
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-950/90 border-4 border-yellow-400 shadow-[0_10px_25px_rgba(0,0,0,0.5),_inset_0_2px_4px_rgba(255,255,255,0.1)] mb-6">
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">CẤP ĐỘ</span>
                                <span className="block text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                    {levelUpInfo.level}
                                </span>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-3 mb-8">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 tracking-wide uppercase drop-shadow-md">
                                Thăng Cấp!
                            </h2>
                            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest leading-none">
                                Danh hiệu mới của bạn:
                            </p>
                            <div className="relative inline-block mt-2">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 animate-pulse" />
                                <h3 className="relative text-xl font-extrabold text-emerald-400 bg-slate-950/80 border border-emerald-500/30 px-6 py-2.5 rounded-2xl tracking-wide">
                                    🛡️ {levelUpInfo.title}
                                </h3>
                            </div>
                            <p className="text-slate-400 text-xs mt-4 leading-relaxed px-2">
                                Chúc mừng bạn đã chinh phục cột mốc mới! Tiếp tục tích lũy XP để mở khóa thêm nhiều đặc quyền hấp dẫn.
                            </p>
                        </div>

                        {/* Button */}
                        <button
                            onClick={() => setLevelUpInfo(null)}
                            className="w-full py-4 px-6 font-black text-sm uppercase tracking-wider rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.5)] transform hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 outline-none cursor-pointer border border-yellow-400/20"
                        >
                            Tuyệt vời! Tiếp tục
                        </button>
                    </div>
                </div>
            )}

            {/* Real-time floating support/bug feedback chatbox */}
            {userId && !isAdmin && (
                <FeedbackChatbox
                    userId={userId}
                    profile={profile}
                    isAdmin={isAdmin}
                />
            )}
        </div>

    );
};

export default App;

