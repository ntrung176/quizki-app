import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { useTargetLanguage } from '../context/TargetLanguageContext';
import { isVocabCardDue } from '../utils/srs';
import { shuffleArray } from '../utils/textProcessing';
import { initConsoleProtection } from '../utils/security';
import useVersionCheck from './useVersionCheck';
import { useAppNavigation } from './useAppNavigation';
import { useAppAuthAndProfile } from './useAppAuthAndProfile';
import { useAppStudySets } from './useAppStudySets';
import { useAppVocab } from './useAppVocab';

import { showToast } from '../utils/toast';

// SECURITY: Suppress sensitive console logs in production
initConsoleProtection();

export const useAppLogic = () => {
    // 1. Navigation & Routing
    const navigation = useAppNavigation();
    const { navigate, location, tourTrigger, setTourTrigger, navigateTo, getCurrentView, view, setView } = navigation;

    // 2. Version checking
    const { updateAvailable, refresh: refreshApp, dismiss: dismissUpdate } = useVersionCheck(60000);

    // 3. Target Language Context
    const { targetLanguage, isEnglishMode } = useTargetLanguage();

    // Local UI & Session state
    const [reviewMode, setReviewMode] = useState('back');
    const [savedFilters, setSavedFilters] = useState(null);
    const [reviewCards, setReviewCards] = useState([]);
    const [notification, setNotificationState] = useState('');
    const setNotification = useCallback((msg) => {
        if (!msg) {
            setNotificationState('');
            return;
        }
        setNotificationState(msg);
        let type = 'info';
        let text = msg;
        if (typeof msg === 'object' && msg !== null) {
            type = msg.type || 'info';
            text = msg.message || JSON.stringify(msg);
        } else if (typeof msg === 'string') {
            if (msg.includes('Lỗi') || msg.includes('không thành công') || msg.includes('thất bại') || msg.includes('Lỗi:') || msg.includes('error')) {
                type = 'error';
            } else if (msg.includes('⚠️') || msg.includes('chưa') || msg.includes('giới hạn') || msg.includes('không khớp') || msg.includes('không đúng') || msg.includes('warning')) {
                type = 'warning';
            } else if (msg.includes('thành công') || msg.includes('🎉') || msg.includes('Đã') || msg.includes('success')) {
                type = 'success';
            }
        }
        showToast(text, type);
    }, []);
    const [levelUpInfo, setLevelUpInfo] = useState(null);
    const [isReviewActive, setIsReviewActive] = useState(false);
    const [isRealExamActive, setIsRealExamActive] = useState(false);
    const [editingCard, setEditingCard] = useState(null);

    const [showBatchImportModal, setShowBatchImportModal] = useState(false);
    const [batchVocabInput, setBatchVocabInput] = useState('');
    const [batchVocabList, setBatchVocabList] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [showXpTestModal, setShowXpTestModal] = useState(false);

    const [dailyActivityLogs, setDailyActivityLogs] = useState([]);
    const [isActivityLogsLoaded, setIsActivityLogsLoaded] = useState(false);
    const [kanjiSrsPublicCount] = useState({ total: 0, mastered: 0 });
    const [studySessionData, setStudySessionData] = useState({
        learning: [],
        new: [],
        reviewing: [],
        currentBatch: [],
        currentPhase: 'multipleChoice',
        batchIndex: 0,
        allNoSrsCards: []
    });
    const [flashcardCards, setFlashcardCards] = useState([]);
    const scrollToCardIdRef = useRef(null);
    const setAllCardsRef = useRef(null);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        const result = saved === 'true';
        if (!result) {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
            document.documentElement.style.removeProperty('background-color');
            document.body.style.removeProperty('background-color');
        }
        return result;
    });

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('quizki_sidebar_collapsed') === 'true';
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        const handleCollapseChange = (e) => {
            setIsSidebarCollapsed(!!e.detail);
        };
        window.addEventListener('sidebar-collapse-toggle', handleCollapseChange);
        return () => window.removeEventListener('sidebar-collapse-toggle', handleCollapseChange);
    }, []);

    useEffect(() => {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;
        if (isDarkMode) {
            htmlElement.classList.add('dark');
            bodyElement.classList.add('dark');
        } else {
            htmlElement.classList.remove('dark');
            bodyElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', String(isDarkMode));
    }, [isDarkMode]);

    useEffect(() => {
        if (view === 'REVIEW') {
            document.body.classList.add('review-mode');
        } else {
            document.body.classList.remove('review-mode');
        }
        return () => document.body.classList.remove('review-mode');
    }, [view]);

    // 4. Auth & User Profile Hook
    const authAndProfile = useAppAuthAndProfile({
        setAllCards: (cards) => {
            if (setAllCardsRef.current) setAllCardsRef.current(cards);
        },
        setReviewCards,
        setView,
        setEditingCard,
        setNotification
    });

    const {
        authReady, userId, rawProfile, setProfile, profile, isProfileLoading,
        isAdmin, adminConfig, hasPremium, canUserUseAI, userHasAdminPrivileges,
        activePopup, handleDismissPopup, handleAdminDeleteUserData, geminiApiKeys,
        publicStatsCollectionPath
    } = authAndProfile;

    // Lắng nghe dữ liệu hoạt động hàng ngày (dailyActivity) từ Firestore
    useEffect(() => {
        if (!authReady || !userId || !db || !appId) {
            setDailyActivityLogs([]);
            setIsActivityLogsLoaded(true);
            return;
        }

        const activityPath = `artifacts/${appId}/users/${userId}/dailyActivity`;
        const q = query(collection(db, activityPath));
        const unsub = onSnapshot(q, (snapshot) => {
            const logs = [];
            snapshot.forEach((docSnap) => {
                logs.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sắp xếp ngày tăng dần
            logs.sort((a, b) => a.id.localeCompare(b.id));
            setDailyActivityLogs(logs);
            setIsActivityLogsLoaded(true);
        }, (err) => {
            console.warn('⚠️ Lỗi tải dailyActivityLogs:', err);
            setIsActivityLogsLoaded(true);
        });

        return () => unsub();
    }, [authReady, userId]);

    // 5. Vocabulary Cards Hook
    const vocab = useAppVocab({
        authReady,
        userId,
        dailyActivityLogs
    });

    const {
        allCards, setAllCards, isLoading, setIsLoading, vocabCollectionPath,
        dueCounts, memoryStats, calculatedStreak, handleUpdateCard, handleAddCard,
        handleDeleteCard, handleDeleteCards, handleSaveChanges, handleGeminiAssist, handleToggleSrs,
        handleRestoreFromLocalBackup
    } = vocab;

    // Đồng bộ streak của người dùng vào publicStats để bảng xếp hạng (Leaderboard) hiển thị chuẩn
    useEffect(() => {
        if (!userId || !publicStatsCollectionPath || !db) return;
        const statsRef = doc(db, publicStatsCollectionPath, userId);
        setDoc(statsRef, {
            streak: calculatedStreak || 0,
            lastActive: Date.now()
        }, { merge: true }).catch(() => {});
    }, [userId, publicStatsCollectionPath, calculatedStreak]);

    useEffect(() => {
        setAllCardsRef.current = setAllCards;
    }, [setAllCards]);

    // 6. Study Sets & Folders Hook
    const studySetsHook = useAppStudySets({
        authReady,
        userId,
        targetLanguage,
        allCards,
        setAllCards
    });

    const {
        folders, setFolders, studySetsCollectionPath, activeFolders, parentFolders,
        studySets, cardFolders, handleAddFolder, handleDeleteFolder, handleUpdateFolder,
        handleAddParentFolder, handleUpdateParentFolder, handleDeleteParentFolder,
        handleMoveStudySetToParentFolder
    } = studySetsHook;

    const isReviewSessionPage = ['REVIEW', 'STUDY', 'FLASHCARD'].includes(view) || (location.pathname.startsWith('/vocab/review/') && location.pathname !== '/vocab/review');

    const prepareReviewCards = useCallback((mode = 'back', targetCards = null, setId = null) => {
        setReviewMode(mode);
        const cardList = targetCards || allCards;
        const now = Date.now();

        const filteredCards = cardList.filter(card => {
            if (setId && card.folderId !== setId) return false;
            return isVocabCardDue(card, mode, now);
        });

        if (filteredCards.length === 0) {
            setNotification('Không có từ vựng nào cần ôn tập ở chế độ này!');
            return false;
        }

        const shuffledCards = shuffleArray(filteredCards);
        setReviewCards(shuffledCards);
        setView('REVIEW');
        return true;
    }, [allCards, setView]);

    // Real handlers from hooks
    const handleExtractVocabFromImage = vocab.handleExtractVocabFromImage;
    const handleGenerateMoreExample = useCallback(async (word) => { }, []);
    const handleBatchImport = useCallback(async (vocabText) => { }, []);
    const handleBatchSaveNext = useCallback(async () => { }, []);
    const handleBatchSkip = useCallback(() => { }, []);
    const handleExport = useCallback(() => { }, []);
    const handleNavigateToEdit = useCallback((card) => { }, []);
    const handleUpdateGoal = useCallback(async (newGoal) => { }, []);
    const handleUpdateProfileName = authAndProfile.handleUpdateProfileName;
    const handleUpdateAvatar = authAndProfile.handleUpdateAvatar;
    const handleChangePassword = authAndProfile.handleChangePassword;
    const handleSaveCardAudio = vocab.handleSaveCardAudio;
    const handleUpdateVocabSrsRating = vocab.handleUpdateVocabSrsRating;
    const handleRevertVocabSrsRating = vocab.handleRevertVocabSrsRating;
    const handleRefreshCards = useCallback(async () => { }, []);
    const awardXP = authAndProfile.awardXP;

    return {
        navigate, location, tourTrigger, setTourTrigger, updateAvailable, refreshApp, dismissUpdate,
        navigateTo, getCurrentView, view, setView, authReady, userId, reviewMode, setReviewMode,
        savedFilters, setSavedFilters, allCards, setAllCards, reviewCards, setReviewCards, isLoading,
        setIsLoading, notification, setNotification, levelUpInfo, setLevelUpInfo, isReviewActive,
        setIsReviewActive, isRealExamActive, setIsRealExamActive, isReviewSessionPage, editingCard,
        setEditingCard, showBatchImportModal, setShowBatchImportModal, batchVocabInput, setBatchVocabInput,
        batchVocabList, setBatchVocabList, currentBatchIndex, setCurrentBatchIndex, isProcessingBatch,
        setIsProcessingBatch, isDarkMode, setIsDarkMode, isSidebarCollapsed, setIsSidebarCollapsed,
        rawProfile, setProfile, profile, geminiApiKeys, isProfileLoading, dailyActivityLogs,
        isActivityLogsLoaded, kanjiSrsPublicCount, studySessionData, setStudySessionData, flashcardCards,
        setFlashcardCards, folders, setFolders, studySetsCollectionPath, activePopup, handleDismissPopup, targetLanguage,
        isEnglishMode, activeFolders, parentFolders, studySets, cardFolders, vocabCollectionPath,
        publicStatsCollectionPath, isAdmin, adminConfig, showXpTestModal, setShowXpTestModal, hasPremium,
        canUserUseAI, userHasAdminPrivileges, handleAdminDeleteUserData, prepareReviewCards, dueCounts,
        memoryStats, calculatedStreak, scrollToCardIdRef, handleUpdateCard, handleDeleteCard, handleDeleteCards, handleAddCard,
        handleSaveChanges, handleGeminiAssist, handleExtractVocabFromImage, handleGenerateMoreExample,
        handleBatchImport, handleBatchSaveNext, handleBatchSkip, handleExport, handleNavigateToEdit,
        handleUpdateGoal, handleUpdateProfileName, handleUpdateAvatar, handleChangePassword,
        handleSaveCardAudio, handleToggleSrs, handleUpdateVocabSrsRating, handleRevertVocabSrsRating,
        handleRefreshCards, awardXP, handleAddFolder, handleDeleteFolder, handleUpdateFolder,
        handleAddParentFolder, handleUpdateParentFolder, handleDeleteParentFolder, handleMoveStudySetToParentFolder,
        handleRestoreFromLocalBackup
    };
};
