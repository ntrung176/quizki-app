import React from 'react';
import LoadingIndicator from './ui/LoadingIndicator';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES, ProtectedRoute, PublicOnlyRoute } from '../router';
import { SectionErrorBoundary } from './ErrorBoundary';
import { getAuth } from 'firebase/auth';
import { saveStudyCompletion } from '../utils/studyProgressService';
import UpgradeScreen from './ui/AiCreditShop';
import { shuffleArray } from '../utils/textProcessing';
import { useLanguage } from '../context/LanguageContext';

// Helper for resilient lazy loading that handles network/re-deploy chunk errors smoothly
const lazyWithRetry = (componentImport) =>
    React.lazy(async () => {
        const routeKey = 'chunk_retry_' + window.location.pathname;
        const hasRefreshed = sessionStorage.getItem(routeKey);
        try {
            const component = await componentImport();
            sessionStorage.removeItem(routeKey);
            return component;
        } catch (error) {
            console.warn('⚠️ Dynamic chunk import failed (có thể vừa deploy bản mới)...', error);
            
            // Nếu chưa tải lại trang lần nào cho route này, reload ngay để lấy bundle mới nhất
            if (!hasRefreshed) {
                sessionStorage.setItem(routeKey, 'true');
                console.log('🔄 Đang tự động làm mới trang để tải tài nguyên mới nhất...');
                window.location.reload();
                return new Promise(() => {}); // Chờ reload
            }

            // Đã reload rồi mà vẫn lỗi (mất mạng thực sự) -> thử lại lần cuối sau 1s
            sessionStorage.removeItem(routeKey);
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                return await componentImport();
            } catch (retryErr) {
                console.error('⚠️ Dynamic import retry failed:', retryErr);
                throw retryErr;
            }
        }
    });

// Core & Auth Screens (Lazy loaded for minimum initial RAM)
const HomeScreen = lazyWithRetry(() => import('./screens/HomeScreen'));
const SRSVocabScreen = lazyWithRetry(() => import('./screens/SRSVocabScreen'));
const LoginScreen = lazyWithRetry(() => import('./screens/LoginScreen'));
const AccountScreen = lazyWithRetry(() => import('./screens/AccountScreen'));
const HelpScreen = lazyWithRetry(() => import('./screens/HelpScreen'));
const ImportScreen = lazyWithRetry(() => import('./screens/ImportScreen'));
const StatsScreen = lazyWithRetry(() => import('./screens/StatsScreen'));
const LibraryScreen = lazyWithRetry(() => import('./screens/LibraryScreen'));
const StudySetDetail = lazyWithRetry(() => import('./screens/StudySetDetail'));
const ReviewScreen = lazyWithRetry(() => import('./screens/ReviewScreen'));
const StudyScreen = lazyWithRetry(() => import('./screens/StudyScreen'));
const TestScreen = lazyWithRetry(() => import('./screens/TestScreen'));
const FlashcardScreen = lazyWithRetry(() => import('./screens/FlashcardScreen'));
const SettingsScreen = lazyWithRetry(() => import('./screens/SettingsScreen'));
const FeedbackScreen = lazyWithRetry(() => import('./screens/FeedbackScreen'));
const PrivacyScreen = lazyWithRetry(() => import('./screens/PrivacyScreen'));
const TermsScreen = lazyWithRetry(() => import('./screens/TermsScreen'));
const AuthActionScreen = lazyWithRetry(() => import('./screens/AuthActionScreen'));
const ForumScreen = lazyWithRetry(() => import('./screens/ForumScreen'));
const UserProfileScreen = lazyWithRetry(() => import('./screens/UserProfileScreen'));
const SynonymQuizScreen = lazyWithRetry(() => import('./screens/SynonymQuizScreen'));
const EditSetScreen = lazyWithRetry(() => import('./screens/EditSetScreen'));
const OnboardingSurveyScreen = lazyWithRetry(() => import('./onboarding/OnboardingSurveyScreen'));

// Kanji Screens
const KanjiStudyScreen = lazyWithRetry(() => import('./screens/KanjiStudyScreen'));
const KanjiLessonScreen = lazyWithRetry(() => import('./screens/KanjiLessonScreen'));
const KanjiReviewScreen = lazyWithRetry(() => import('./screens/KanjiReviewScreen'));
const KanjiSRSListScreen = lazyWithRetry(() => import('./screens/KanjiSRSListScreen'));
const KanjiScreen = lazyWithRetry(() => import('./screens/KanjiScreen'));

// Grammar Screens
const GrammarTextbooksScreen = lazyWithRetry(() => import('./screens/GrammarTextbooksScreen'));
const GrammarLessonsScreen = lazyWithRetry(() => import('./screens/GrammarLessonsScreen'));
const GrammarPracticeScreen = lazyWithRetry(() => import('./screens/GrammarPracticeScreen'));
const GrammarReviewScreen = lazyWithRetry(() => import('./screens/GrammarReviewScreen'));
const GrammarSavedScreen = lazyWithRetry(() => import('./screens/GrammarSavedScreen'));
const GrammarListScreen = lazyWithRetry(() => import('./screens/GrammarListScreen'));
const GrammarPointsScreen = lazyWithRetry(() => import('./screens/GrammarPointsScreen'));
const GrammarDetailScreen = lazyWithRetry(() => import('./screens/GrammarDetailScreen'));
const GrammarNuancesScreen = lazyWithRetry(() => import('./screens/GrammarNuancesScreen'));
const GrammarCheatSheetsScreen = lazyWithRetry(() => import('./screens/GrammarCheatSheetsScreen'));
const GrammarCheatSheetDetailScreen = lazyWithRetry(() => import('./screens/GrammarCheatSheetDetailScreen'));
const GrammarCurriculumScreen = lazyWithRetry(() => import('./screens/GrammarCurriculumScreen'));
const GrammarTopicDetailScreen = lazyWithRetry(() => import('./screens/GrammarTopicDetailScreen'));
const GrammarNotebookListScreen = lazyWithRetry(() => import('./screens/GrammarNotebookListScreen'));
const GrammarNotebookEditScreen = lazyWithRetry(() => import('./screens/GrammarNotebookEditScreen'));
const GrammarNotebookStudyScreen = lazyWithRetry(() => import('./screens/GrammarNotebookStudyScreen'));

// Language Scripts
const KanaScreen = lazyWithRetry(() => import('./screens/KanaScreen'));
const HangulScreen = lazyWithRetry(() => import('./screens/HangulScreen'));
const IpaScreen = lazyWithRetry(() => import('./screens/IpaScreen'));

// Heavy Modules
const AdminScreen = lazyWithRetry(() => import('./screens/AdminScreen'));
const JLPTAdminScreen = lazyWithRetry(() => import('./screens/JLPTAdminScreen'));
const JLPTTestScreen = lazyWithRetry(() => import('./screens/JLPTTestScreen'));
const JLPTKaiwaScreen = lazyWithRetry(() => import('./screens/JLPTKaiwaScreen'));
const VideoKaiwaScreen = lazyWithRetry(() => import('./screens/VideoKaiwaScreen'));
const BookScreen = lazyWithRetry(() => import('./screens/BookScreen'));

// Import card components
import {
    AddCardForm,
    QuickAddVocabForm
} from './cards';

// Wrapper for StudySetDetail
const StudySetDetailWrapper = ({ allCards, folders, cardFolders, setReviewCards, setReviewMode, setFlashcardCards, setStudySessionData, setFlashcardSetId, setReviewSetId, setIsCustomFlashcardSubset, setIsCustomReviewSubset, navigate, onDeleteFolder, handleSaveChanges, handleSaveCardAudio, handleDeleteCard, onToggleSrs, handleGeminiAssist, canUserUseAI, awardXP, onUpdateCard }) => {
    const { id } = useParams();
    
    React.useEffect(() => {
        if (!id) return;
        try {
            const recentKey = 'recently_studied_sets';
            const recent = JSON.parse(localStorage.getItem(recentKey) || '[]');
            const filtered = recent.filter(item => item.id !== id);
            filtered.unshift({ id, timestamp: Date.now() });
            localStorage.setItem(recentKey, JSON.stringify(filtered.slice(0, 5)));
        } catch (e) {
            console.error('Error saving recently studied set:', e);
        }
    }, [id]);
    
    const handleStudySet = (setId, customCards, options = {}) => {
        if (awardXP) awardXP(25);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        try {
            sessionStorage.setItem('quizki_active_study_session', JSON.stringify({
                setId: targetId,
                isCustomSubset: Boolean(customCards),
                customType: options?.customType || null,
                cardIds: (setCards || []).map(c => c.id)
            }));
        } catch (_) {}
        setStudySessionData({ 
            mode: 'learn', 
            cards: setCards, 
            setId: targetId,
            isCustomSubset: Boolean(customCards),
            customType: options?.customType || null
        });
        navigate(ROUTES.STUDY);
    };

    const handleFlashcardSet = (setId, customCards) => {
        if (awardXP) awardXP(15);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        setFlashcardCards(setCards);
        setFlashcardSetId(targetId);
        if (setIsCustomFlashcardSubset) setIsCustomFlashcardSubset(Boolean(customCards));
        navigate(ROUTES.FLASHCARD);
    };

    const handleMeaningSet = (setId, customCards) => {
        if (awardXP) awardXP(20);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        if (setCards.length === 0) return;
        const meaningCards = setCards.map(card => ({ ...card, reviewType: 'back' }));
        setReviewCards(shuffleArray(meaningCards));
        if (setReviewMode) setReviewMode('meaning_input');
        setReviewSetId(targetId);
        if (setIsCustomReviewSubset) setIsCustomReviewSubset(Boolean(customCards));
        navigate(ROUTES.REVIEW);
    };

    const handleDictationSet = (setId, customCards) => {
        if (awardXP) awardXP(25);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        if (setCards.length === 0) return;
        const dictationCards = setCards.map(card => ({ ...card, reviewType: 'dictation' }));
        setReviewCards(shuffleArray(dictationCards));
        if (setReviewMode) setReviewMode('dictation');
        setReviewSetId(targetId);
        if (setIsCustomReviewSubset) setIsCustomReviewSubset(Boolean(customCards));
        navigate(ROUTES.REVIEW);
    };

    const handleExampleSet = (setId, customCards) => {
        if (awardXP) awardXP(20);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        const exampleCards = setCards
            .filter(card => card.example && card.example.trim() !== '')
            .map(card => ({ ...card, reviewType: 'example' }));
        
        if (exampleCards.length === 0) {
            alert(t('common.noExampleSentences', 'Không có từ vựng nào trong bộ này có câu ví dụ!'));
            return;
        }
        setReviewCards(shuffleArray(exampleCards));
        if (setReviewMode) setReviewMode('example');
        setReviewSetId(targetId);
        if (setIsCustomReviewSubset) setIsCustomReviewSubset(Boolean(customCards));
        navigate(ROUTES.REVIEW);
    };

    const handleSynonymQuiz = (setId, customCards) => {
        if (awardXP) awardXP(20);
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        setFlashcardCards(setCards);
        setFlashcardSetId(targetId);
        if (setIsCustomFlashcardSubset) setIsCustomFlashcardSubset(Boolean(customCards));
        navigate(ROUTES.SYNONYM_QUIZ);
    };

    // Bulk delete cards (used for unfiled group)
    const handleDeleteCards = async (cardIds) => {
        if (!handleDeleteCard || !cardIds?.length) return;
        for (const cardId of cardIds) {
            await handleDeleteCard(cardId);
        }
        navigate(ROUTES.VOCAB_LIST);
    };

    return <StudySetDetail 
        folderId={id} 
        folders={folders} 
        cardFolders={cardFolders} 
        allCards={allCards} 
        onBack={() => navigate(ROUTES.VOCAB_LIST)}
        onEditSet={() => navigate(`/vocab/edit-set/${id}`)}
        onStudySet={handleStudySet}
        onFlashcardSet={handleFlashcardSet}
        onMeaningSet={handleMeaningSet}
        onDictationSet={handleDictationSet}
        onExampleSet={handleExampleSet}
        onSynonymQuiz={handleSynonymQuiz}
        onNavigateToAdd={() => navigate(ROUTES.VOCAB_ADD)}
        onDeleteFolder={onDeleteFolder}
        onDeleteCard={handleDeleteCard}
        onDeleteCards={handleDeleteCards}
        onSaveChanges={handleSaveChanges}
        onUpdateCard={onUpdateCard || handleSaveChanges}
        onSaveCardAudio={handleSaveCardAudio}
        onToggleSrs={onToggleSrs}
        onGeminiAssist={handleGeminiAssist}
        canUserUseAI={canUserUseAI}
    />;
};

const EditSetScreenWrapper = ({
    folders,
    cardFolders,
    allCards,
    onRenameFolder,
    onAddFolder,
    handleUpdateCard,
    handleDeleteCard,
    handleDeleteCards,
    handleSaveNewCard,
    handleGeminiAssist,
    handleGenerateMoreExample,
    handleExtractVocabFromImage,
    aiCreditsRemaining,
    parentFolders,
    canUserUseAI
}) => {
    const { id } = useParams();
    const navigate = useNavigate();
    return <EditSetScreen 
        folderId={id} 
        folders={folders} 
        cardFolders={cardFolders} 
        allCards={allCards} 
        onRenameFolder={onRenameFolder}
        onAddFolder={onAddFolder}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onDeleteCards={handleDeleteCards}
        onSaveNewCard={handleSaveNewCard}
        onBack={() => navigate(-1)}
        onGeminiAssist={handleGeminiAssist}
        onGenerateMoreExample={handleGenerateMoreExample}
        onExtractVocabFromImage={handleExtractVocabFromImage}
        aiCreditsRemaining={aiCreditsRemaining}
        parentFolders={parentFolders}
        canUserUseAI={canUserUseAI}
    />;
};

const ZenProtectedRoute = ({ children, packageId, profile, isAdmin }) => {
    const isUnlocked = React.useMemo(() => {
        if (isAdmin && !profile?.trialPricingTier) return true;
        if (!profile) return false;
        
        // Premium unlock package or Combo Ultimate overrides all individual Zen packages
        if (profile.isPremiumUnlocked) return true;
        
        const unlockedList = profile.unlockedSpecializedPackages || [];
        return unlockedList.includes(packageId);
    }, [profile, isAdmin, packageId]);

    const navigate = useNavigate();
    const { t } = useLanguage();

    if (isUnlocked) {
        return children;
    }

    const pkgName = t(`premium.packages.${packageId}`, packageId);

    return (
        <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10 max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl dark:shadow-none border border-slate-100 dark:border-slate-700 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 flex items-center justify-center mx-auto shadow-sm">
                    <span className="text-3xl">🔒</span>
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('premium.title', 'Tính năng Premium')}</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        {(t('premium.upgradePrompt', 'Vui lòng nâng cấp gói {pkg} để học tập đầy đủ các kiến thức và làm bài luyện tập nâng cao.') || '').replace('{pkg}', pkgName)}
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate(ROUTES.UPGRADE)}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-500 hover:from-emerald-700 hover:to-sky-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none cursor-pointer text-sm"
                    >
                        {t('premium.unlockNow', 'Mở khóa ngay')}
                    </button>
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all cursor-pointer text-sm"
                    >
                        {t('common.backToHome', 'Quay lại Trang chủ')}
                    </button>
                </div>
            </div>
        </div>
    );
};


const GrammarProtectedRoute = ({ children }) => {
    return children;
};

const AppRoutes = ({
    // Auth state
    isAuthenticated,
    authReady = true,
    isLoading,

    // User data
    userId,
    profile,
    allCards,
    reviewCards,
    reviewMode,
    editingCard,
    dueCounts,
    memoryStats,
    dailyActivityLogs,
    calculatedStreak,
    isActivityLogsLoaded,
    studySessionData,
    savedFilters,
    scrollToCardId,
    flashcardCards,

    // Paths
    vocabCollectionPath,
    publicStatsCollectionPath,

    // Flags
    isAdmin,
    isDarkMode,
    adminConfig,
    canUserUseAI,
    userHasAdminPrivileges,


    // Auth info
    currentUserEmail,

    // Handlers
    setView,
    setEditingCard,
    setStudySessionData,
    setReviewCards,
    setReviewMode,
    setSavedFilters,
    setNotification,
    setIsDarkMode,
    setFlashcardCards,

    prepareReviewCards,
    handleUpdateCard,
    handleDeleteCard,
    handleDeleteCards,
    handleSaveNewCard,
    handleSaveChanges,
    handleGeminiAssist,
    handleGenerateMoreExample,
    handleExtractVocabFromImage,
    handleBatchImport,
    handleBatchSaveNext,
    handleBatchSkip,
    handleExport,

    handleUpdateGoal,
    handleAdminDeleteUserData,
    handleUpdateProfileName,
    handleUpdateAvatar,
    handleChangePassword,

    // Batch import
    batchMode,
    currentBatchIndex,
    batchVocabList,
    setShowBatchImportModal,

    // Refs
    scrollToCardIdRef,

    // Audio
    playAudio,
    handleSaveCardAudio,

    // Shuffle utility
    shuffleArray,
    folders,
    cardFolders,
    onAddFolder,
    onDeleteFolder,
    onRenameFolder,
    parentFolders,
    onAddParentFolder,
    onRenameParentFolder,
    onDeleteParentFolder,
    onMoveStudySetToParentFolder,
    onToggleSrs,
    onUpdateVocabSrsRating,
    onRevertVocabSrsRating,
    onRefreshCards,
    awardXP,
    isReviewActive,
    setIsReviewActive
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const aiCreditsRemaining = profile?.aiCreditsRemaining;

    const [flashcardSetId, setFlashcardSetId] = React.useState(null);
    const [isCustomFlashcardSubset, setIsCustomFlashcardSubset] = React.useState(false);
    const [reviewSetId, setReviewSetId] = React.useState(null);
    const [isCustomReviewSubset, setIsCustomReviewSubset] = React.useState(false);

    // Dynamically update document title based on current path
    React.useEffect(() => {
        const path = location.pathname;
        const isEn = language === 'en';
        const brand = isEn ? 'QUIZKI - Modern Learning' : 'QUIZKI - HỌC TẬP HIỆN ĐẠI';

        let title = brand;

        if (path === '/') {
            title = brand;
        } else if (path === '/login') {
            title = isEn ? `Login | ${brand}` : 'Đăng nhập | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/account') {
            title = isEn ? `Account | ${brand}` : 'Tài khoản | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/help') {
            title = isEn ? `Help & Guides | ${brand}` : 'Trợ giúp & Hướng dẫn | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/privacy') {
            title = isEn ? `Privacy Policy | ${brand}` : 'Chính sách bảo mật | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/terms') {
            title = isEn ? `Terms of Service | ${brand}` : 'Điều khoản dịch vụ | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review') {
            title = isEn ? `Vocabulary Review | ${brand}` : 'Ôn tập Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/list') {
            title = isEn ? `Vocabulary Library | ${brand}` : 'Thư viện Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/set/')) {
            title = isEn ? `Study Set Details | ${brand}` : 'Chi tiết Học phần | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/add') {
            title = isEn ? `Add Vocabulary | ${brand}` : 'Thêm Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/edit-set/')) {
            title = isEn ? `Edit Study Set | ${brand}` : 'Sửa Học phần | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/edit/')) {
            title = isEn ? `Edit Vocabulary | ${brand}` : 'Sửa Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/study') {
            title = isEn ? `Kanji Roadmap | ${brand}` : 'Lộ trình học Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/study/lesson') {
            title = isEn ? `Kanji Lesson | ${brand}` : 'Bài học Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/review') {
            title = isEn ? `Kanji Review | ${brand}` : 'Ôn tập Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/saved') {
            title = isEn ? `Saved Kanji | ${brand}` : 'Thư viện Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/list') {
            title = isEn ? `Kanji Lookup | ${brand}` : 'Tra cứu Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/quiz') {
            title = isEn ? `Vocabulary Quiz | ${brand}` : 'Trắc nghiệm Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/flashcard') {
            title = isEn ? `Flashcards | ${brand}` : 'Flashcard | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/study') {
            title = isEn ? `Study New Words | ${brand}` : 'Học từ mới | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/synonym') {
            title = isEn ? `Synonyms Quiz | ${brand}` : 'Trắc nghiệm Đồng nghĩa | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/test') {
            title = isEn ? `Vocabulary Test | ${brand}` : 'Kiểm tra Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/jlpt/test') {
            title = isEn ? `JLPT Exam Prep | ${brand}` : 'Luyện thi JLPT | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/jlpt/admin') {
            title = isEn ? `JLPT Admin | ${brand}` : 'Quản trị JLPT | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/grammar') {
            title = isEn ? `Japanese Grammar | ${brand}` : 'Ngữ pháp Tiếng Nhật | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/grammar/review') {
            title = isEn ? `Grammar Review | ${brand}` : 'Ôn tập Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/grammar/saved') {
            title = isEn ? `Saved Grammar | ${brand}` : 'Thư viện Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/grammar/list') {
            title = isEn ? `Grammar Lookup | ${brand}` : 'Tra cứu Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/grammar/textbook/')) {
            if (path.includes('/lesson/')) {
                title = isEn ? `Grammar Lesson | ${brand}` : 'Bài học Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
            } else {
                title = isEn ? `Grammar Textbook | ${brand}` : 'Giáo trình Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
            }
        } else if (path.startsWith('/grammar/detail/')) {
            title = isEn ? `Grammar Detail | ${brand}` : 'Chi tiết mẫu câu | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/grammar/practice/')) {
            title = isEn ? `Grammar Practice | ${brand}` : 'Luyện tập Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/hub') {
            title = isEn ? `Community Hub | ${brand}` : 'Trung tâm Cộng đồng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/forum') {
            title = isEn ? `Discussion Forum | ${brand}` : 'Diễn đàn thảo luận | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/profile/')) {
            title = isEn ? `User Profile | ${brand}` : 'Trang cá nhân | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/import') {
            title = isEn ? `Data Import | ${brand}` : 'Nhập dữ liệu | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/admin') {
            title = isEn ? `Administrator | ${brand}` : 'Quản trị viên | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/books') {
            title = isEn ? `Book Library | ${brand}` : 'Kho sách | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/settings') {
            title = isEn ? `Settings | ${brand}` : 'Cài đặt | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/feedback') {
            title = isEn ? `Feedback & Bug Report | ${brand}` : 'Góp ý & Báo lỗi | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/upgrade') {
            title = isEn ? `Upgrade Premium | ${brand}` : 'Nâng cấp Premium | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        }

        document.title = title;
    }, [location.pathname, language]);

    const handleStudySet = (setId, customCards, options = {}) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        try {
            sessionStorage.setItem('quizki_active_study_session', JSON.stringify({
                setId,
                isCustomSubset: Boolean(customCards),
                customType: options?.customType || null,
                cardIds: (setCards || []).map(c => c.id)
            }));
        } catch (_) {}
        setStudySessionData({ 
            mode: 'learn', 
            cards: setCards, 
            setId,
            isCustomSubset: Boolean(customCards),
            customType: options?.customType || null
        });
        navigate(ROUTES.STUDY);
    };

    const handleFlashcardSet = (setId, customCards) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        setFlashcardCards(setCards);
        setFlashcardSetId(setId);
        setIsCustomFlashcardSubset(Boolean(customCards));
        navigate(ROUTES.FLASHCARD);
    };

    const handleMeaningSet = (setId, customCards) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        if (setCards.length === 0) return;
        const meaningCards = setCards.map(card => ({ ...card, reviewType: 'back' }));
        setReviewCards(shuffleArray(meaningCards));
        if (setReviewMode) setReviewMode('meaning_input');
        setReviewSetId(setId);
        setIsCustomReviewSubset(Boolean(customCards));
        navigate(ROUTES.REVIEW);
    };

    const handleDictationSet = (setId, customCards) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        if (setCards.length === 0) return;
        const dictationCards = setCards.map(card => ({ ...card, reviewType: 'dictation' }));
        setReviewCards(shuffleArray(dictationCards));
        if (setReviewMode) setReviewMode('dictation');
        setReviewSetId(setId);
        setIsCustomReviewSubset(Boolean(customCards));
        navigate(ROUTES.REVIEW);
    };

    // Handle auth action redirect from static /auth/action/index.html page
    // GitHub Pages can't do SPA routing for /auth/action, so the static page
    // stores params in sessionStorage and redirects to /?authRedirect=true
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('authRedirect') === 'true') {
            const savedParams = sessionStorage.getItem('authActionParams');
            sessionStorage.removeItem('authActionParams');
            sessionStorage.removeItem('authActionPath');
            if (savedParams) {
                navigate(`/auth/action${savedParams}`, { replace: true });
            }
        }
    }, [navigate]);

    // Redirect unauthenticated visitors trying to access tool routes to Home (Landing Page)
    const isPublicPath = [
        ROUTES.HOME,
        ROUTES.LOGIN,
        ROUTES.ONBOARDING,
        ROUTES.TERMS,
        ROUTES.PRIVACY,
        ROUTES.HELP,
        ROUTES.AUTH_ACTION,
        ROUTES.AUTH_ACTION_FIREBASE_DEFAULT
    ].includes(location.pathname) || location.pathname.startsWith('/auth');

    if (authReady && !isAuthenticated && !isPublicPath) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><LoadingIndicator text={t('common.loadingFeatures', 'Đang nạp tính năng...')} /></div>}>
            <SectionErrorBoundary name={t('common.appScreen', 'Màn hình ứng dụng')} resetKeys={[location.pathname, location.search]}>
                <Routes>
                    {/* Public routes */}
                    <Route
                        path={ROUTES.LOGIN}
                        element={
                            <PublicOnlyRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                                <LoginScreen />
                            </PublicOnlyRoute>
                        }
                    />

                {/* Duolingo-styled Onboarding Survey */}
                <Route path={ROUTES.ONBOARDING} element={<OnboardingSurveyScreen />} />

                {/* Legal & Help public routes (accessible without login) */}
                <Route path={ROUTES.PRIVACY} element={<PrivacyScreen />} />
                <Route path={ROUTES.TERMS} element={<TermsScreen />} />
                <Route path={ROUTES.HELP} element={<HelpScreen />} />

                {/* Firebase Auth action handler (email verification, password reset) */}
                <Route path={ROUTES.AUTH_ACTION} element={<AuthActionScreen />} />
                <Route path={ROUTES.AUTH_ACTION_FIREBASE_DEFAULT} element={<AuthActionScreen />} />

                {/* Protected routes - require both auth and approval */}

                {/* Trang chủ mới - Landing page & Dashboard */}
                <Route
                    path={ROUTES.HOME}
                    element={
                        !authReady ? (
                            <LoadingIndicator fullScreen message={t('common.checkingLogin', 'Đang kiểm tra đăng nhập...')} />
                        ) : (
                            <HomeScreen
                                displayName={profile?.displayName}
                                totalCards={allCards?.length || 0}
                                allCards={allCards}
                                userId={userId}
                                vocabCollectionPath={vocabCollectionPath}
                                dailyActivityLogs={dailyActivityLogs}
                                calculatedStreak={calculatedStreak}
                                isActivityLogsLoaded={isActivityLogsLoaded}
                                awardXP={awardXP}
                            />
                        )
                    }
                />

                <Route
                    path="/vocab"
                    element={<Navigate to={ROUTES.VOCAB_REVIEW} replace />}
                />

                {/* Ôn tập từ vựng - SRSVocabScreen */}
                <Route
                    path={ROUTES.VOCAB_REVIEW}
                    element={
                        <SRSVocabScreen
                            displayName={profile?.displayName}
                            userId={userId}
                            isAdmin={isAdmin}
                            folders={folders}
                            cardFolders={cardFolders}
                            setReviewCards={setReviewCards}
                            dueCounts={dueCounts}
                            totalCards={allCards?.length || 0}
                            allCards={allCards}
                            studySessionData={studySessionData}
                            setStudySessionData={setStudySessionData}
                            setNotification={setNotification}
                            setReviewMode={setReviewMode}
                            setView={setView}
                            onStartReview={prepareReviewCards}
                            onNavigate={setView}
                            setFlashcardCards={setFlashcardCards}
                            onToggleSrs={onToggleSrs}
                            onUpdateVocabSrsRating={onUpdateVocabSrsRating}
                            onRevertVocabSrsRating={onRevertVocabSrsRating}
                            onRefreshCards={onRefreshCards}
                            awardXP={awardXP}
                            setIsReviewActive={setIsReviewActive}
                            playAudio={playAudio}
                            onSaveCardAudio={handleSaveCardAudio}
                            dailyActivityLogs={dailyActivityLogs}
                            onStudySet={handleStudySet}
                            onFlashcardSet={handleFlashcardSet}
                            onMeaningSet={handleMeaningSet}
                            onDictationSet={handleDictationSet}
                            onUpdateCard={handleUpdateCard}
                            onSaveChanges={handleSaveChanges}
                            vocabCollectionPath={vocabCollectionPath}
                        />
                    }
                />

                {/* Thư viện Học phần */}
                <Route
                    path={ROUTES.VOCAB_LIST}
                    element={
                        <LibraryScreen
                            allCards={allCards}
                            folders={folders}
                            cardFolders={cardFolders}
                            onOpenStudySet={(id) => navigate('/vocab/set/' + id)}
                            onNavigateToAdd={() => navigate(ROUTES.VOCAB_ADD)}
                            onDeleteFolder={onDeleteFolder}
                            onRenameFolder={onRenameFolder}
                            parentFolders={parentFolders}
                            onAddParentFolder={onAddParentFolder}
                            onRenameParentFolder={onRenameParentFolder}
                            onDeleteParentFolder={onDeleteParentFolder}
                            onMoveStudySetToParentFolder={onMoveStudySetToParentFolder}
                            onSaveChanges={handleSaveChanges}
                            onUpdateCard={handleUpdateCard}
                            onGeminiAssist={handleGeminiAssist}
                            canUserUseAI={canUserUseAI}
                        />
                    }
                />

                {/* Chi tiết Học phần */}
                <Route
                    path={ROUTES.VOCAB_SET_DETAIL}
                    element={
                        <StudySetDetailWrapper 
                            allCards={allCards}
                            folders={folders}
                            cardFolders={cardFolders}
                            setReviewCards={setReviewCards}
                            setReviewMode={setReviewMode}
                            setFlashcardCards={setFlashcardCards}
                            setStudySessionData={setStudySessionData}
                            setFlashcardSetId={setFlashcardSetId}
                            setReviewSetId={setReviewSetId}
                            setIsCustomFlashcardSubset={setIsCustomFlashcardSubset}
                            setIsCustomReviewSubset={setIsCustomReviewSubset}
                            navigate={navigate}
                            onDeleteFolder={onDeleteFolder}
                            handleDeleteCard={handleDeleteCard}
                            handleSaveChanges={handleSaveChanges}
                            handleSaveCardAudio={handleSaveCardAudio}
                            onToggleSrs={onToggleSrs}
                            handleGeminiAssist={handleGeminiAssist}
                            canUserUseAI={canUserUseAI}
                            awardXP={awardXP}
                            onUpdateCard={handleUpdateCard}
                        />
                    }
                />

                <Route
                    path={ROUTES.VOCAB_ADD}
                    element={
                        <AddCardForm
                            allCards={allCards}
                            cardFolders={cardFolders}
                            folders={folders}
                            onAddFolder={onAddFolder}
                            onSave={handleSaveNewCard}
                            onBack={() => setView('LIST')}
                            onGeminiAssist={handleGeminiAssist}
                            onGenerateMoreExample={handleGenerateMoreExample}
                            onExtractVocabFromImage={handleExtractVocabFromImage}
                            canUserUseAI={canUserUseAI}
                            batchMode={batchMode}
                            currentBatchIndex={currentBatchIndex}
                            totalBatchCount={batchVocabList?.length || 0}
                            onBatchNext={handleBatchSaveNext}
                            onBatchSkip={handleBatchSkip}
                            editingCard={editingCard}
                            onOpenBatchImport={() => setShowBatchImportModal(true)}
                            aiCreditsRemaining={aiCreditsRemaining}
                            parentFolders={parentFolders}
                        />
                    }
                />

                <Route
                    path={ROUTES.VOCAB_QUICK_ADD}
                    element={
                        <QuickAddVocabForm
                            folders={folders}
                            parentFolders={parentFolders}
                            cardFolders={cardFolders}
                            allCards={allCards}
                            onSave={handleSaveNewCard}
                            onBack={() => navigate('/')}
                            onGeminiAssist={handleGeminiAssist}
                            onGenerateMoreExample={handleGenerateMoreExample}
                            canUserUseAI={canUserUseAI}
                            aiCreditsRemaining={aiCreditsRemaining}
                        />
                    }
                />

                <Route
                    path={ROUTES.VOCAB_EDIT_SET}
                    element={
                        <EditSetScreenWrapper
                            folders={folders}
                            cardFolders={cardFolders}
                            allCards={allCards}
                            onRenameFolder={onRenameFolder}
                            onAddFolder={onAddFolder}
                            handleUpdateCard={handleUpdateCard}
                            handleDeleteCard={handleDeleteCard}
                            handleDeleteCards={handleDeleteCards}
                            handleSaveNewCard={handleSaveNewCard}
                            handleGeminiAssist={handleGeminiAssist}
                            handleGenerateMoreExample={handleGenerateMoreExample}
                            handleExtractVocabFromImage={handleExtractVocabFromImage}
                            canUserUseAI={canUserUseAI}
                            aiCreditsRemaining={aiCreditsRemaining}
                            navigate={navigate}
                            parentFolders={parentFolders}
                        />
                    }
                />

                <Route
                    path="/kanji"
                    element={<Navigate to={ROUTES.KANJI_REVIEW} replace />}
                />

                {/* Bảng chữ cái Hiragana & Katakana */}
                <Route
                    path={ROUTES.KANA}
                    element={<KanaScreen awardXP={awardXP} />}
                />

                {/* Bảng chữ cái tiếng Hàn (Hangul) */}
                <Route
                    path={ROUTES.HANGUL}
                    element={<HangulScreen awardXP={awardXP} />}
                />

                {/* Bảng phiên âm tiếng Anh (IPA) */}
                <Route
                    path={ROUTES.IPA}
                    element={<IpaScreen awardXP={awardXP} />}
                />

                {/* Học Kanji - Study roadmap screen */}
                <Route
                    path={ROUTES.KANJI_STUDY}
                    element={<KanjiStudyScreen profile={profile} isAdmin={isAdmin} />}
                />

                {/* Bài học Kanji - Lesson screen (flashcard + test) */}
                <Route
                    path={ROUTES.KANJI_LESSON}
                    element={<KanjiLessonScreen awardXP={awardXP} profile={profile} isAdmin={isAdmin} />}
                />

                {/* Ôn tập Kanji - Review statistics screen */}
                <Route
                    path={ROUTES.KANJI_REVIEW}
                    element={<KanjiReviewScreen awardXP={awardXP} setIsReviewActive={setIsReviewActive} isAdmin={isAdmin} />}
                />

                {/* Danh sách Kanji đã lưu - SRS management */}
                <Route
                    path={ROUTES.KANJI_SAVED}
                    element={<KanjiSRSListScreen />}
                />

                {/* Danh sách Kanji */}
                <Route
                    path={ROUTES.KANJI_LIST}
                    element={
                        <KanjiScreen
                            isAdmin={userHasAdminPrivileges}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                            onGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                            allUserCards={allCards}
                            profile={profile}
                            folders={[...(parentFolders || []), ...(folders || [])]}
                            userId={userId}
                            awardXP={awardXP}
                        />
                    }
                />

                {/* Kanji detail with character in URL path */}
                <Route
                    path={`${ROUTES.KANJI_LIST}/:char`}
                    element={
                        <KanjiScreen
                            isAdmin={userHasAdminPrivileges}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                            onGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                            allUserCards={allCards}
                            profile={profile}
                            folders={[...(parentFolders || []), ...(folders || [])]}
                            userId={userId}
                            awardXP={awardXP}
                        />
                    }
                />

                <Route
                    path={ROUTES.REVIEW}
                    element={
                        reviewCards?.length > 0 ? (
                            <ReviewScreen
                                cards={reviewCards}
                                reviewMode={reviewMode}
                                allCards={allCards}
                                setId={reviewSetId}
                                isCustomSubset={isCustomReviewSubset}
                                onUpdateCard={handleUpdateCard}
                                vocabCollectionPath={vocabCollectionPath}
                                onSaveCardAudio={handleSaveCardAudio}
                                awardXP={awardXP}
                                onCompleteReview={(failedCardsSet) => {
                                    if (failedCardsSet && failedCardsSet.size > 0) {
                                        const failedCardsList = [];
                                        failedCardsSet.forEach(cardKey => {
                                            const [cardId, reviewType] = cardKey.split('-');
                                            const card = allCards.find(c => c.id === cardId);
                                            if (card) {
                                                failedCardsList.push({ ...card, reviewType });
                                            }
                                        });
                                        setReviewCards(shuffleArray(failedCardsList));
                                        setReviewMode(reviewMode || 'mixed');
                                    } else {
                                        if (reviewSetId && reviewMode && !isCustomReviewSubset) {
                                            const userId = getAuth().currentUser?.uid;
                                            saveStudyCompletion(userId, reviewSetId, reviewMode);
                                        }
                                        if (reviewSetId && reviewSetId !== 'mistakes') {
                                            navigate(`/vocab/set/${reviewSetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setReviewCards([]);
                                            setReviewSetId(null);
                                            setIsCustomReviewSubset(false);
                                        }, 50);
                                    }
                                }}
                                onBack={() => {
                                    if (reviewSetId && reviewSetId !== 'mistakes') {
                                        navigate(`/vocab/set/${reviewSetId}`);
                                    } else {
                                        navigate(ROUTES.VOCAB_REVIEW);
                                    }
                                    setTimeout(() => {
                                        setReviewCards([]);
                                        setReviewSetId(null);
                                        setIsCustomReviewSubset(false);
                                    }, 50);
                                }}
                            />
                        ) : (
                            <Navigate to={ROUTES.VOCAB_REVIEW} replace />
                        )
                    }
                />

                <Route
                    path={ROUTES.STUDY}
                    element={
                        <StudyScreen
                            studySessionData={studySessionData}
                            setStudySessionData={setStudySessionData}
                            allCards={allCards}
                            onUpdateCard={handleUpdateCard}
                            onSaveCardAudio={handleSaveCardAudio}
                            awardXP={awardXP}
                            onCompleteStudy={() => {
                                if (awardXP) awardXP(50);
                                const setId = studySessionData?.setId;
                                const isCustom = studySessionData?.isCustomSubset;
                                if (setId && !isCustom) {
                                    const userId = getAuth().currentUser?.uid;
                                    saveStudyCompletion(userId, setId, 'study');
                                }
                                try {
                                    sessionStorage.removeItem('quizki_active_study_session');
                                } catch (_) {}
                                setStudySessionData({
                                    learning: [],
                                    new: [],
                                    reviewing: [],
                                    currentBatch: [],
                                    currentPhase: 'multipleChoice',
                                    batchIndex: 0,
                                    allNoSrsCards: []
                                });
                                if (setId && setId !== 'mistakes') {
                                    navigate(`/vocab/set/${setId}`);
                                } else {
                                    navigate(ROUTES.VOCAB_REVIEW);
                                }
                            }}
                            onBack={() => {
                                const setId = studySessionData?.setId;
                                try {
                                    sessionStorage.removeItem('quizki_active_study_session');
                                } catch (_) {}
                                if (setId && setId !== 'mistakes') {
                                    navigate(`/vocab/set/${setId}`);
                                } else {
                                    navigate(ROUTES.VOCAB_REVIEW);
                                }
                            }}
                        />
                    }
                />

                <Route
                    path={ROUTES.TEST}
                    element={
                        <TestScreen
                            allCards={allCards}
                            onBack={() => navigate(ROUTES.VOCAB_REVIEW)}
                        />
                    }
                />

                <Route
                    path={ROUTES.HUB}
                    element={
                        <StatsScreen
                            memoryStats={memoryStats}
                            totalCards={allCards?.length || 0}
                            profile={profile}
                            allCards={allCards}
                            dailyActivityLogs={dailyActivityLogs}
                            onUpdateGoal={handleUpdateGoal}
                            onBack={() => setView('HOME')}
                            userId={userId}
                            publicStatsPath={publicStatsCollectionPath}
                            initialTab="stats"
                        />
                    }
                />

                <Route
                    path={ROUTES.ACCOUNT}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <AccountScreen
                                profile={profile}
                                awardXP={awardXP}
                                isAdmin={userHasAdminPrivileges}
                                publicStatsPath={publicStatsCollectionPath}
                                currentUserId={userId}
                                onUpdateProfileName={handleUpdateProfileName}
                                onChangePassword={handleChangePassword}
                                onBack={() => setView('HOME')}
                            />
                        </ProtectedRoute>
                    }
                />



                <Route
                    path={ROUTES.IMPORT}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <ImportScreen
                                onImport={handleBatchImport}
                                onBack={() => setView('HOME')}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Admin route - only for admins and moderators */}
                <Route
                    path={ROUTES.ADMIN}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            {userHasAdminPrivileges ? (
                                <AdminScreen
                                    publicStatsPath={publicStatsCollectionPath}
                                    currentUserId={userId}
                                    onAdminDeleteUserData={handleAdminDeleteUserData}
                                    adminConfig={adminConfig}
                                    isAdmin={isAdmin}
                                  />
                            ) : (
                                <Navigate to={ROUTES.HOME} replace />
                            )}
                        </ProtectedRoute>
                    }
                />

                {/* Flashcard route */}
                <Route
                    path={ROUTES.FLASHCARD}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            {flashcardCards && flashcardCards.length > 0 ? (
                                <FlashcardScreen
                                    cards={flashcardCards}
                                    setId={flashcardSetId}
                                    isCustomSubset={isCustomFlashcardSubset}
                                    onUpdateCard={handleUpdateCard}
                                    onSaveCardAudio={handleSaveCardAudio}
                                    onComplete={() => {
                                        if (flashcardSetId && !isCustomFlashcardSubset) {
                                            const userId = getAuth().currentUser?.uid;
                                            saveStudyCompletion(userId, flashcardSetId, 'flashcard');
                                        }
                                        if (flashcardSetId && flashcardSetId !== 'mistakes') {
                                            navigate(`/vocab/set/${flashcardSetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setFlashcardCards([]);
                                            setFlashcardSetId(null);
                                            setIsCustomFlashcardSubset(false);
                                        }, 50);
                                    }}
                                    onBack={() => {
                                        const targetId = flashcardSetId;
                                        if (targetId && targetId !== 'mistakes') {
                                            navigate(`/vocab/set/${targetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setFlashcardCards([]);
                                            setFlashcardSetId(null);
                                            setIsCustomFlashcardSubset(false);
                                        }, 50);
                                    }}
                                />
                            ) : (
                                <Navigate to={ROUTES.VOCAB_REVIEW} replace />
                            )}
                        </ProtectedRoute>
                    }
                />


                {/* Synonym Quiz route */}
                <Route
                    path={ROUTES.SYNONYM_QUIZ}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            {flashcardCards && flashcardCards.length > 0 ? (
                                <SynonymQuizScreen
                                    cards={flashcardCards}
                                    setId={flashcardSetId}
                                    isCustomSubset={isCustomFlashcardSubset}
                                    onUpdateCard={handleUpdateCard}
                                    onBack={() => {
                                        const targetId = flashcardSetId;
                                        if (targetId && targetId !== 'mistakes') {
                                            navigate(`/vocab/set/${targetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setFlashcardCards([]);
                                            setFlashcardSetId(null);
                                            setIsCustomFlashcardSubset(false);
                                        }, 50);
                                    }}
                                    onComplete={() => {
                                        if (flashcardSetId && !isCustomFlashcardSubset) {
                                            const userId = getAuth().currentUser?.uid;
                                            saveStudyCompletion(userId, flashcardSetId, 'synonym');
                                        }
                                        const targetId = flashcardSetId;
                                        if (targetId && targetId !== 'mistakes') {
                                            navigate(`/vocab/set/${targetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setFlashcardCards([]);
                                            setFlashcardSetId(null);
                                            setIsCustomFlashcardSubset(false);
                                        }, 50);
                                    }}
                                />
                            ) : (
                                <Navigate to={ROUTES.VOCAB_REVIEW} replace />
                            )}
                        </ProtectedRoute>
                    }
                />

                {/* Học theo sách */}
                <Route
                    path={ROUTES.BOOKS}
                    element={
                        <BookScreen
                            isAdmin={userHasAdminPrivileges}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                            onGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                            allUserCards={allCards}
                            userId={userId}
                            folders={folders}
                            parentFolders={parentFolders}
                            onDeleteFolder={onDeleteFolder}
                            onAddFolder={onAddFolder}
                            onMoveStudySetToParentFolder={onMoveStudySetToParentFolder}
                            profile={profile}
                            awardXP={awardXP}
                        />
                    }
                />

                {/* ==================== GRAMMAR MODULE ==================== */}
                <Route
                    path={ROUTES.GRAMMAR}
                    element={<Navigate to={ROUTES.GRAMMAR_REVIEW} replace />}
                />
                <Route
                    path={ROUTES.GRAMMAR_TEXTBOOK}
                    element={<GrammarLessonsScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_LESSON}
                    element={<GrammarPointsScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_DETAIL}
                    element={<GrammarDetailScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_PRACTICE}
                    element={<GrammarPracticeScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_REVIEW}
                    element={<GrammarReviewScreen awardXP={awardXP} setIsReviewActive={setIsReviewActive} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_SAVED}
                    element={<GrammarSavedScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_CHEATSHEETS}
                    element={<GrammarCheatSheetsScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_NUANCES}
                    element={<GrammarNuancesScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_CHEATSHEET_DETAIL}
                    element={<GrammarCheatSheetDetailScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_CURRICULUM}
                    element={<GrammarCurriculumScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_TOPIC_DETAIL}
                    element={<GrammarTopicDetailScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_LIST}
                    element={<GrammarListScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_STUDY}
                    element={<GrammarTextbooksScreen isAdmin={isAdmin} profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_NOTEBOOK}
                    element={<GrammarNotebookListScreen profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_NOTEBOOK_CREATE}
                    element={<GrammarNotebookEditScreen profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_NOTEBOOK_EDIT}
                    element={<GrammarNotebookEditScreen profile={profile} />}
                />
                <Route
                    path={ROUTES.GRAMMAR_NOTEBOOK_STUDY}
                    element={<GrammarNotebookStudyScreen profile={profile} />}
                />

                {/* Cài đặt */}
                <Route
                    path={ROUTES.SETTINGS}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <SettingsScreen
                                profile={profile}
                                isDarkMode={isDarkMode}
                                setIsDarkMode={setIsDarkMode}
                                userId={userId}
                                isAdmin={isAdmin}
                                onUpdateProfileName={handleUpdateProfileName}
                                onUpdateAvatar={handleUpdateAvatar}
                                onChangePassword={handleChangePassword}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Phản hồi */}
                <Route
                    path={ROUTES.FEEDBACK}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <FeedbackScreen
                                userId={userId}
                                profile={profile}
                                isAdmin={isAdmin}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Diễn đàn */}
                <Route
                    path={ROUTES.FORUM}
                    element={
                        <ForumScreen
                            userId={userId}
                            profile={profile}
                            isAdmin={isAdmin}
                        />
                    }
                />

                {/* Trang cá nhân */}
                <Route
                    path={ROUTES.PROFILE}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <UserProfileScreen
                                userId={userId}
                                profile={profile}
                                isAdmin={isAdmin}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* JLPT Test */}
                <Route
                    path={ROUTES.JLPT_TEST}
                    element={
                        <JLPTTestScreen 
                            isAdmin={isAdmin} 
                            allCards={allCards} 
                            profile={profile} 
                            userId={userId}
                            awardXP={awardXP}
                        />
                    }
                />

                {/* JLPT Kaiwa */}
                <Route
                    path={ROUTES.JLPT_KAIWA}
                    element={
                        <JLPTKaiwaScreen 
                            profile={profile} 
                            isAdmin={isAdmin} 
                            awardXP={awardXP}
                        />
                    }
                />

                {/* Video Kaiwa & Shadowing */}
                <Route
                    path={ROUTES.VIDEO_KAIWA}
                    element={
                        <VideoKaiwaScreen 
                            profile={profile} 
                            isAdmin={isAdmin} 
                            awardXP={awardXP}
                        />
                    }
                />

                {/* JLPT Admin - only for admins */}
                <Route
                    path={ROUTES.JLPT_ADMIN}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <ZenProtectedRoute packageId="jlpt_prep" profile={profile} isAdmin={isAdmin}>
                                {isAdmin ? (
                                    <JLPTAdminScreen userId={userId} />
                                ) : (
                                    <Navigate to={ROUTES.JLPT_TEST} replace />
                                )}
                            </ZenProtectedRoute>
                        </ProtectedRoute>
                    }
                />
                {/* Nâng cấp */}
                <Route
                    path={ROUTES.UPGRADE}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated} authReady={authReady}>
                            <UpgradeScreen
                                creditsRemaining={aiCreditsRemaining ?? 0}
                                adminConfig={adminConfig}
                                userId={userId}
                                userName={profile?.displayName}
                                userEmail={currentUserEmail}
                                profile={profile}
                                isAdmin={isAdmin}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
            </Routes>
        </SectionErrorBoundary>
    </React.Suspense>
);
};

export default AppRoutes;








