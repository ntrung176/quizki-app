import React from 'react';
import LoadingIndicator from './ui/LoadingIndicator';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ROUTES, ProtectedRoute, PublicOnlyRoute } from '../router';
import UpgradeScreen from './ui/AiCreditShop';
import { shuffleArray } from '../utils/textProcessing';


import {
    HomeScreen,
    SRSVocabScreen,
    LoginScreen,
    AccountScreen,
    HelpScreen,
    ImportScreen,
    StatsScreen,
    LibraryScreen,
    StudySetDetail,
    ReviewScreen,
    KanjiScreen,
    KanjiStudyScreen,
    KanjiLessonScreen,
    KanjiReviewScreen,
    KanjiSRSListScreen,
    StudyScreen,
    TestScreen,
    AdminScreen,
    FlashcardScreen,
    BookScreen,
    SettingsScreen,
    FeedbackScreen,
    JLPTTestScreen,
    JLPTAdminScreen,
    JLPTKaiwaScreen,
    PrivacyScreen,
    TermsScreen,
    AuthActionScreen,
    ForumScreen,
    UserProfileScreen,
    SynonymQuizScreen,
    EditSetScreen,
    GrammarTextbooksScreen,
    GrammarLessonsScreen,
    GrammarPointsScreen,
    GrammarDetailScreen,
    GrammarPracticeScreen
} from './screens';

// Import card components
import {
    AddCardForm,
    QuickAddVocabForm
} from './cards';


// Wrapper for StudySetDetail
const StudySetDetailWrapper = ({ allCards, folders, cardFolders, setReviewCards, setReviewMode, setFlashcardCards, setStudySessionData, setFlashcardSetId, setReviewSetId, navigate, onDeleteFolder, handleSaveChanges, handleSaveCardAudio, handleDeleteCard, onToggleSrs, handleGeminiAssist, canUserUseAI }) => {
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
    
    const handleStudySet = (setId, customCards) => {
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        setStudySessionData({ mode: 'learn', cards: setCards, setId: targetId });
        navigate(ROUTES.STUDY);
    };

    const handleFlashcardSet = (setId, customCards) => {
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        setFlashcardCards(setCards);
        setFlashcardSetId(targetId);
        navigate(ROUTES.FLASHCARD);
    };

    const handleMeaningSet = (setId, customCards) => {
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        if (setCards.length === 0) return;
        const meaningCards = setCards.map(card => ({ ...card, reviewType: 'back' }));
        setReviewCards(shuffleArray(meaningCards));
        if (setReviewMode) setReviewMode('meaning_input');
        setReviewSetId(targetId);
        navigate(ROUTES.REVIEW);
    };

    const handleDictationSet = (setId, customCards) => {
        const targetId = setId || id;
        const setCards = customCards || (targetId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === targetId));
        if (setCards.length === 0) return;
        const dictationCards = setCards.map(card => ({ ...card, reviewType: 'dictation' }));
        setReviewCards(shuffleArray(dictationCards));
        if (setReviewMode) setReviewMode('dictation');
        setReviewSetId(targetId);
        navigate(ROUTES.REVIEW);
    };

    const handleExampleSet = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);
        const exampleCards = setCards
            .filter(card => card.example && card.example.trim() !== '')
            .map(card => ({ ...card, reviewType: 'example' }));
        
        if (exampleCards.length === 0) {
            alert('Không có từ vựng nào trong bộ này có câu ví dụ!');
            return;
        }
        setReviewCards(shuffleArray(exampleCards));
        if (setReviewMode) setReviewMode('example');
        setReviewSetId(id);
        navigate(ROUTES.REVIEW);
    };

    const handleSynonymQuiz = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);
        setFlashcardCards(setCards);
        setFlashcardSetId(id);
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
        onSaveCardAudio={handleSaveCardAudio}
        onToggleSrs={onToggleSrs}
        onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
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
    handleSaveNewCard,
    handleGeminiAssist,
    handleGenerateMoreExample,
    handleExtractVocabFromImage,
    aiCreditsRemaining,
    parentFolders
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
        onSaveNewCard={handleSaveNewCard}
        onBack={() => navigate(-1)}
        onGeminiAssist={handleGeminiAssist}
        onGenerateMoreExample={handleGenerateMoreExample}
        onExtractVocabFromImage={handleExtractVocabFromImage}
        aiCreditsRemaining={aiCreditsRemaining}
        parentFolders={parentFolders}
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

    if (isUnlocked) {
        return children;
    }

    const packageNames = {
        vocab_zen: 'Từ vựng chuyên sâu Zen',
        grammar_zen: 'Ngữ pháp chuyên sâu Zen',
        kanji_zen: 'Thư viện Kanji Zen',
        jlpt_prep: 'Luyện đề thi thử JLPT'
    };

    const pkgName = packageNames[packageId] || packageId;

    return (
        <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10 max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl dark:shadow-none border border-slate-100 dark:border-slate-700 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/10 flex items-center justify-center mx-auto shadow-sm">
                    <span className="text-3xl">🔒</span>
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tính năng Premium</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Vui lòng nâng cấp gói <strong>{pkgName}</strong> để học tập đầy đủ các kiến thức và làm bài luyện tập nâng cao.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate(ROUTES.UPGRADE)}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer text-sm"
                    >
                        Mở khóa ngay
                    </button>
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all cursor-pointer text-sm"
                    >
                        Quay lại Trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};

const AppRoutes = ({
    // Auth state
    isAuthenticated,
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
    awardXP,
    isReviewActive,
    setIsReviewActive
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const aiCreditsRemaining = profile?.aiCreditsRemaining;

    const [flashcardSetId, setFlashcardSetId] = React.useState(null);
    const [reviewSetId, setReviewSetId] = React.useState(null);

    // Dynamically update document title based on current path
    React.useEffect(() => {
        const path = location.pathname;
        let title = 'QUIZKI - HỌC TẬP HIỆN ĐẠI';

        if (path === '/') {
            title = 'QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/login') {
            title = 'Đăng nhập | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/account') {
            title = 'Tài khoản | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/help') {
            title = 'Trợ giúp & Hướng dẫn | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/privacy') {
            title = 'Chính sách bảo mật | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/terms') {
            title = 'Điều khoản dịch vụ | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review') {
            title = 'Ôn tập Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/list') {
            title = 'Thư viện Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/set/')) {
            title = 'Chi tiết Học phần | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/add') {
            title = 'Thêm Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/edit-set/')) {
            title = 'Sửa Học phần | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/vocab/edit/')) {
            title = 'Sửa Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/study') {
            title = 'Lộ trình học Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/study/lesson') {
            title = 'Bài học Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/review') {
            title = 'Ôn tập Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/saved') {
            title = 'Thư viện Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/kanji/list') {
            title = 'Tra cứu Kanji | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/quiz') {
            title = 'Trắc nghiệm Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/flashcard') {
            title = 'Flashcard | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/study') {
            title = 'Học từ mới | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/synonym') {
            title = 'Trắc nghiệm Đồng nghĩa | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/vocab/review/test') {
            title = 'Kiểm tra Từ vựng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/jlpt/test') {
            title = 'Luyện thi JLPT | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/jlpt/admin') {
            title = 'Quản trị JLPT | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/grammar') {
            title = 'Ngữ pháp Tiếng Nhật | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/grammar/textbook/')) {
            if (path.includes('/lesson/')) {
                title = 'Bài học Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
            } else {
                title = 'Giáo trình Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
            }
        } else if (path.startsWith('/grammar/detail/')) {
            title = 'Chi tiết mẫu câu | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/grammar/practice/')) {
            title = 'Luyện tập Ngữ pháp | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/hub') {
            title = 'Trung tâm Cộng đồng | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/forum') {
            title = 'Diễn đàn thảo luận | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path.startsWith('/profile/')) {
            title = 'Trang cá nhân | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/import') {
            title = 'Nhập dữ liệu | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/admin') {
            title = 'Quản trị viên | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/books') {
            title = 'Kho sách | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/settings') {
            title = 'Cài đặt | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/feedback') {
            title = 'Góp ý & Báo lỗi | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        } else if (path === '/upgrade') {
            title = 'Nâng cấp Premium | QUIZKI - HỌC TẬP HIỆN ĐẠI';
        }

        document.title = title;
    }, [location.pathname]);

    const handleStudySet = (setId, customCards) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        setStudySessionData({ mode: 'learn', cards: setCards, setId });
        navigate(ROUTES.STUDY);
    };

    const handleFlashcardSet = (setId, customCards) => {
        const setCards = customCards || (setId === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === setId));
        setFlashcardCards(setCards);
        setFlashcardSetId(setId);
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

    // Loading state
    if (isLoading) {
        return <LoadingIndicator text="Đang tải..." />;
    }

    return (
        <>
            <Routes>
                {/* Public routes */}
                <Route
                    path={ROUTES.LOGIN}
                    element={
                        <PublicOnlyRoute isAuthenticated={isAuthenticated}>
                            <LoginScreen />
                        </PublicOnlyRoute>
                    }
                />

                {/* Legal public routes */}
                <Route path={ROUTES.PRIVACY} element={<PrivacyScreen />} />
                <Route path={ROUTES.TERMS} element={<TermsScreen />} />

                {/* Firebase Auth action handler (email verification, password reset) */}
                <Route path={ROUTES.AUTH_ACTION} element={<AuthActionScreen />} />
                <Route path={ROUTES.AUTH_ACTION_FIREBASE_DEFAULT} element={<AuthActionScreen />} />

                {/* Protected routes - require both auth and approval */}

                {/* Trang chủ mới - Landing page */}
                <Route
                    path={ROUTES.HOME}
                    element={
                        isAuthenticated ? (
                            <HomeScreen
                                displayName={profile?.displayName}
                                totalCards={allCards?.length || 0}
                                allCards={allCards}
                                userId={userId}
                                vocabCollectionPath={vocabCollectionPath}
                                dailyActivityLogs={dailyActivityLogs}
                                calculatedStreak={calculatedStreak}
                                isActivityLogsLoaded={isActivityLogsLoaded}
                            />
                        ) : (
                            <LoginScreen />
                        )
                    }
                />

                {/* Ôn tập từ vựng - SRSVocabScreen */}
                <Route
                    path={ROUTES.VOCAB_REVIEW}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <SRSVocabScreen
                                displayName={profile?.displayName}
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
                                awardXP={awardXP}
                                setIsReviewActive={setIsReviewActive}
                                playAudio={playAudio}
                                onSaveCardAudio={handleSaveCardAudio}
                                dailyActivityLogs={dailyActivityLogs}
                                onStudySet={handleStudySet}
                                onFlashcardSet={handleFlashcardSet}
                                onMeaningSet={handleMeaningSet}
                                onDictationSet={handleDictationSet}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Thư viện Học phần */}
                <Route
                    path={ROUTES.VOCAB_LIST}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Chi tiết Học phần */}
                <Route
                    path={ROUTES.VOCAB_SET_DETAIL}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                                navigate={navigate}
                                onDeleteFolder={onDeleteFolder}
                                handleDeleteCard={handleDeleteCard}
                                handleSaveChanges={handleSaveChanges}
                                handleSaveCardAudio={handleSaveCardAudio}
                                onToggleSrs={onToggleSrs}
                                handleGeminiAssist={handleGeminiAssist}
                                canUserUseAI={canUserUseAI}
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.VOCAB_ADD}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <AddCardForm
                                onAddFolder={onAddFolder}
                                onSave={handleSaveNewCard}
                                onBack={() => setView('LIST')}
                                onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                                onGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                                onExtractVocabFromImage={canUserUseAI ? handleExtractVocabFromImage : null}
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
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.VOCAB_QUICK_ADD}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <QuickAddVocabForm
                                folders={folders}
                                parentFolders={parentFolders}
                                cardFolders={cardFolders}
                                allCards={allCards}
                                onSave={handleSaveNewCard}
                                onBack={() => navigate('/')}
                                onGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                                onGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                                aiCreditsRemaining={aiCreditsRemaining}
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.VOCAB_EDIT_SET}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <EditSetScreenWrapper
                                folders={folders}
                                cardFolders={cardFolders}
                                allCards={allCards}
                                onRenameFolder={onRenameFolder}
                                onAddFolder={onAddFolder}
                                handleUpdateCard={handleUpdateCard}
                                handleDeleteCard={handleDeleteCard}
                                handleSaveNewCard={handleSaveNewCard}
                                handleGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                                handleGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                                handleExtractVocabFromImage={canUserUseAI ? handleExtractVocabFromImage : null}
                                aiCreditsRemaining={aiCreditsRemaining}
                                navigate={navigate}
                                parentFolders={parentFolders}
                            />
                        </ProtectedRoute>
                    }
                />


                {/* Học Kanji - Study roadmap screen */}
                <Route
                    path={ROUTES.KANJI_STUDY}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiStudyScreen profile={profile} isAdmin={isAdmin} />
                        </ProtectedRoute>
                    }
                />

                {/* Bài học Kanji - Lesson screen (flashcard + test) */}
                <Route
                    path={ROUTES.KANJI_LESSON}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiLessonScreen awardXP={awardXP} />
                        </ProtectedRoute>
                    }
                />

                {/* Ôn tập Kanji - Review statistics screen */}
                <Route
                    path={ROUTES.KANJI_REVIEW}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiReviewScreen awardXP={awardXP} setIsReviewActive={setIsReviewActive} />
                        </ProtectedRoute>
                    }
                />

                {/* Danh sách Kanji đã lưu - SRS management */}
                <Route
                    path={ROUTES.KANJI_SAVED}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiSRSListScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Danh sách Kanji */}
                <Route
                    path={ROUTES.KANJI_LIST}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        </ProtectedRoute>
                    }
                />

                {/* Kanji detail with character in URL path */}
                <Route
                    path={`${ROUTES.KANJI_LIST}/:char`}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.REVIEW}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {reviewCards?.length > 0 ? (
                                <ReviewScreen
                                    cards={reviewCards}
                                    reviewMode={reviewMode}
                                    allCards={allCards}
                                    setId={reviewSetId}
                                    onUpdateCard={handleUpdateCard}
                                    vocabCollectionPath={vocabCollectionPath}
                                    onSaveCardAudio={handleSaveCardAudio}
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
                                            if (reviewSetId && reviewMode) {
                                                localStorage.removeItem(`study_progress_${reviewSetId}_${reviewMode}`);
                                                localStorage.setItem(`study_completed_${reviewSetId}_${reviewMode}`, 'true');
                                            }
                                            if (reviewSetId && reviewSetId !== 'mistakes') {
                                                navigate(`/vocab/set/${reviewSetId}`);
                                            } else {
                                                navigate(ROUTES.VOCAB_REVIEW);
                                            }
                                            setTimeout(() => {
                                                setReviewCards([]);
                                                setReviewSetId(null);
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
                                        }, 50);
                                    }}
                                />
                            ) : (
                                <Navigate to={ROUTES.VOCAB_REVIEW} replace />
                            )}
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.STUDY}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <StudyScreen
                                studySessionData={studySessionData}
                                setStudySessionData={setStudySessionData}
                                allCards={allCards}
                                onUpdateCard={handleUpdateCard}
                                onSaveCardAudio={handleSaveCardAudio}
                                onCompleteStudy={() => {
                                    const setId = studySessionData?.setId;
                                    if (setId) {
                                        localStorage.removeItem(`study_progress_${setId}_study`);
                                        localStorage.setItem(`study_completed_${setId}_study`, 'true');
                                    }
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
                                    if (setId && setId !== 'mistakes') {
                                        navigate(`/vocab/set/${setId}`);
                                    } else {
                                        navigate(ROUTES.VOCAB_REVIEW);
                                    }
                                }}
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.TEST}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <TestScreen
                                allCards={allCards}
                                onBack={() => navigate(ROUTES.VOCAB_REVIEW)}
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.HUB}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.ACCOUNT}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <AccountScreen
                                profile={profile}
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
                    path={ROUTES.HELP}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <HelpScreen
                                isFirstTime={false}
                                onBack={() => setView('HOME')}
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.IMPORT}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <ImportScreen
                                onImport={handleBatchImport}
                                onBack={() => setView('HOME')}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Admin route - only for admins */}
                <Route
                    path={ROUTES.ADMIN}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {isAdmin ? (
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {flashcardCards && flashcardCards.length > 0 ? (
                                <FlashcardScreen
                                    cards={flashcardCards}
                                    setId={flashcardSetId}
                                    onUpdateCard={handleUpdateCard}
                                    onSaveCardAudio={handleSaveCardAudio}
                                    onComplete={() => {
                                        if (flashcardSetId) {
                                            localStorage.removeItem(`study_progress_${flashcardSetId}_flashcard`);
                                            localStorage.setItem(`study_completed_${flashcardSetId}_flashcard`, 'true');
                                        }
                                        if (flashcardSetId && flashcardSetId !== 'mistakes') {
                                            navigate(`/vocab/set/${flashcardSetId}`);
                                        } else {
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                        setTimeout(() => {
                                            setFlashcardCards([]);
                                            setFlashcardSetId(null);
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {flashcardCards && flashcardCards.length > 0 ? (
                                <SynonymQuizScreen
                                    cards={flashcardCards}
                                    setId={flashcardSetId}
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
                                        }, 50);
                                    }}
                                    onComplete={() => {
                                        if (flashcardSetId) {
                                            localStorage.removeItem(`study_progress_${flashcardSetId}_synonym`);
                                            localStorage.setItem(`study_completed_${flashcardSetId}_synonym`, 'true');
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                            />
                        </ProtectedRoute>
                    }
                />

                {/* ==================== GRAMMAR MODULE ==================== */}
                <Route
                    path={ROUTES.GRAMMAR}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarTextbooksScreen isAdmin={userHasAdminPrivileges} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_TEXTBOOK}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarLessonsScreen isAdmin={userHasAdminPrivileges} profile={profile} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_LESSON}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarPointsScreen isAdmin={userHasAdminPrivileges} profile={profile} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_DETAIL}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarDetailScreen isAdmin={userHasAdminPrivileges} profile={profile} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_PRACTICE}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarPracticeScreen isAdmin={userHasAdminPrivileges} profile={profile} />
                        </ProtectedRoute>
                    }
                />

                {/* Cài đặt */}
                <Route
                    path={ROUTES.SETTINGS}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <ForumScreen
                                userId={userId}
                                profile={profile}
                                isAdmin={isAdmin}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* Trang cá nhân */}
                <Route
                    path={ROUTES.PROFILE}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <JLPTTestScreen 
                                isAdmin={isAdmin} 
                                allCards={allCards} 
                                profile={profile} 
                                userId={userId}
                            />
                        </ProtectedRoute>
                    }
                />

                {/* JLPT Kaiwa */}
                <Route
                    path={ROUTES.JLPT_KAIWA}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {isAdmin ? (
                                <JLPTKaiwaScreen 
                                    profile={profile} 
                                    isAdmin={isAdmin} 
                                />
                            ) : (
                                <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                                    <div className="relative z-10 max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl dark:shadow-none border border-slate-100 dark:border-slate-700 text-center space-y-6">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 flex items-center justify-center mx-auto shadow-sm">
                                            <span className="text-3xl">🛠️</span>
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tính năng đang phát triển</h2>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                                Tính năng <strong>Luyện hội thoại KAIWA 1:1</strong> hiện đang trong quá trình thử nghiệm và phát triển. Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập thử nghiệm.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => navigate(ROUTES.HOME)}
                                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer text-sm"
                                            >
                                                Quay lại Trang chủ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ProtectedRoute>
                    }
                />

                {/* JLPT Admin - only for admins */}
                <Route
                    path={ROUTES.JLPT_ADMIN}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
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
        </>
    );
};

export default AppRoutes;








