import React from 'react';
import LoadingIndicator from './ui/LoadingIndicator';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
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
    ReviewCompleteScreen,
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
    AddCardForm
} from './cards';


// Wrapper for StudySetDetail
const StudySetDetailWrapper = ({ allCards, folders, cardFolders, setReviewCards, setReviewMode, setFlashcardCards, setStudySessionData, navigate, onDeleteFolder, handleSaveChanges, handleSaveCardAudio, handleDeleteCard }) => {
    const { id } = useParams();
    
    const handleStudySet = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);
        setStudySessionData({ mode: 'learn', cards: setCards });
        navigate(ROUTES.STUDY);
    };

    const handleFlashcardSet = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);
        setFlashcardCards(setCards);
        navigate(ROUTES.FLASHCARD);
    };

    const handleReviewSet = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);

        // Build mixed review cards with proper reviewType for each card
        const dueBackCards = setCards
            .map(card => ({ ...card, reviewType: 'back' }));

        const dueExampleCards = setCards
            .filter(card => card.example && card.example.trim() !== '')
            .map(card => ({ ...card, reviewType: 'example' }));

        const dueDictationCards = setCards
            .map(card => ({ ...card, reviewType: 'dictation' }));

        const mixed = shuffleArray([...dueBackCards, ...dueExampleCards, ...dueDictationCards]);
        if (mixed.length > 0) {
            setReviewCards(mixed);
            if (setReviewMode) setReviewMode('mixed');
            navigate(ROUTES.REVIEW);
        }
    };

    const handleSynonymQuiz = (setId) => {
        const setCards = id === 'unfiled' 
            ? allCards.filter(c => !cardFolders[c.id]) 
            : allCards.filter(c => cardFolders[c.id] === id);
        setFlashcardCards(setCards);
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
        onReviewSet={handleReviewSet}
        onSynonymQuiz={handleSynonymQuiz}
        onNavigateToAdd={() => navigate(ROUTES.VOCAB_ADD)}
        onDeleteFolder={onDeleteFolder}
        onDeleteCards={handleDeleteCards}
        onSaveChanges={handleSaveChanges}
        onSaveCardAudio={handleSaveCardAudio}
    />;
};

const EditSetScreenWrapper = ({
    folders,
    cardFolders,
    allCards,
    onRenameFolder,
    handleUpdateCard,
    handleDeleteCard,
    handleSaveNewCard,
    handleGeminiAssist,
    handleGenerateMoreExample,
    handleExtractVocabFromImage,
    aiCreditsRemaining
}) => {
    const { id } = useParams();
    const navigate = useNavigate();
    return <EditSetScreen 
        folderId={id} 
        folders={folders} 
        cardFolders={cardFolders} 
        allCards={allCards} 
        onRenameFolder={onRenameFolder}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onSaveNewCard={handleSaveNewCard}
        onBack={() => navigate(-1)}
        onGeminiAssist={handleGeminiAssist}
        onGenerateMoreExample={handleGenerateMoreExample}
        onExtractVocabFromImage={handleExtractVocabFromImage}
        aiCreditsRemaining={aiCreditsRemaining}
    />;
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
    onRenameFolder
}) => {
    const navigate = useNavigate();
    const aiCreditsRemaining = profile?.aiCreditsRemaining;

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
                                navigate={navigate}
                                onDeleteFolder={onDeleteFolder}
                                handleDeleteCard={handleDeleteCard}
                                handleSaveChanges={handleSaveChanges}
                                handleSaveCardAudio={handleSaveCardAudio}
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
                                handleUpdateCard={handleUpdateCard}
                                handleDeleteCard={handleDeleteCard}
                                handleSaveNewCard={handleSaveNewCard}
                                handleGeminiAssist={canUserUseAI ? handleGeminiAssist : null}
                                handleGenerateMoreExample={canUserUseAI ? handleGenerateMoreExample : null}
                                handleExtractVocabFromImage={canUserUseAI ? handleExtractVocabFromImage : null}
                                aiCreditsRemaining={aiCreditsRemaining}
                                navigate={navigate}
                            />
                        </ProtectedRoute>
                    }
                />


                {/* Học Kanji - Study roadmap screen */}
                <Route
                    path={ROUTES.KANJI_STUDY}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiStudyScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Bài học Kanji - Lesson screen (flashcard + test) */}
                <Route
                    path={ROUTES.KANJI_LESSON}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiLessonScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Ôn tập Kanji - Review statistics screen */}
                <Route
                    path={ROUTES.KANJI_REVIEW}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <KanjiReviewScreen />
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
                            />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path={ROUTES.REVIEW}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {reviewCards?.length === 0 ? (
                                <ReviewCompleteScreen onBack={() => navigate(ROUTES.VOCAB_REVIEW)} allCards={allCards} />
                            ) : (
                                <ReviewScreen
                                    cards={reviewCards}
                                    reviewMode={reviewMode}
                                    allCards={allCards}
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
                                            setReviewMode('mixed');
                                        } else {
                                            setReviewCards([]);
                                            navigate(ROUTES.VOCAB_REVIEW);
                                        }
                                    }}
                                    onBack={() => navigate(-1)}
                                />
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
                                    setStudySessionData({
                                        learning: [],
                                        new: [],
                                        reviewing: [],
                                        currentBatch: [],
                                        currentPhase: 'multipleChoice',
                                        batchIndex: 0,
                                        allNoSrsCards: []
                                    });
                                    navigate(ROUTES.VOCAB_REVIEW);
                                }}
                                onBack={() => navigate(-1)}
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
                                    onUpdateCard={handleUpdateCard}
                                    onSaveCardAudio={handleSaveCardAudio}
                                    onComplete={() => {
                                        setFlashcardCards([]);
                                        navigate(ROUTES.VOCAB_REVIEW);
                                    }}
                                    onBack={() => navigate(-1)}
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
                                    onBack={() => navigate(-1)}
                                    onComplete={() => {
                                        setFlashcardCards([]);
                                        navigate(ROUTES.VOCAB_REVIEW);
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
                            <GrammarLessonsScreen isAdmin={userHasAdminPrivileges} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_LESSON}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarPointsScreen isAdmin={userHasAdminPrivileges} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_DETAIL}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarDetailScreen isAdmin={userHasAdminPrivileges} />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.GRAMMAR_PRACTICE}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GrammarPracticeScreen isAdmin={userHasAdminPrivileges} />
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
                            <JLPTTestScreen isAdmin={isAdmin} />
                        </ProtectedRoute>
                    }
                />

                {/* JLPT Admin - only for admins */}
                <Route
                    path={ROUTES.JLPT_ADMIN}
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            {isAdmin ? (
                                <JLPTAdminScreen userId={userId} />
                            ) : (
                                <Navigate to={ROUTES.JLPT_TEST} replace />
                            )}
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








