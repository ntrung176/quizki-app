import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES, ProtectedRoute, PublicOnlyRoute } from '../router';

import {
    HomeScreen,
    SRSVocabScreen,
    LoginScreen,
    AccountScreen,
    HelpScreen,
    ImportScreen,
    StatsScreen,
    FriendsScreen,
    ListView,
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
    SettingsScreen
} from './screens';

// Import card components
import {
    AddCardForm
} from './cards';


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
    handleBatchImport,
    handleBatchSaveNext,
    handleBatchSkip,
    handleExport,
    handleImportTSV,
    handleUpdateGoal,
    handleAdminDeleteUserData,
    handleUpdateProfileName,
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

    // Shuffle utility
    shuffleArray,
}) => {
    // Loading state
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
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



            {/* Protected routes - require both auth and approval */}

            {/* Trang chủ mới - Landing page */}
            <Route
                path={ROUTES.HOME}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <HomeScreen
                            displayName={profile?.displayName}
                            totalCards={allCards?.length || 0}
                            allCards={allCards}
                        />
                    </ProtectedRoute>
                }
            />

            {/* Ôn tập từ vựng - SRSVocabScreen */}
            <Route
                path={ROUTES.VOCAB_REVIEW}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <SRSVocabScreen
                            displayName={profile?.displayName}
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

            {/* Danh sách từ vựng - ListView */}
            <Route
                path={ROUTES.VOCAB_LIST}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <ListView
                            allCards={allCards}
                            onDeleteCard={handleDeleteCard}
                            onPlayAudio={playAudio}
                            onExport={() => handleExport(allCards)}
                            onImportTSV={handleImportTSV}
                            onSaveChanges={handleSaveChanges}
                            onGeminiAssist={handleGeminiAssist}
                            scrollToCardId={scrollToCardIdRef?.current}
                            onScrollComplete={() => { if (scrollToCardIdRef) scrollToCardIdRef.current = null; }}
                            savedFilters={savedFilters}
                            onFiltersChange={(filters) => setSavedFilters(filters)}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.VOCAB_ADD}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <AddCardForm
                            onSave={handleSaveNewCard}
                            onBack={() => setView('LIST')}
                            onGeminiAssist={handleGeminiAssist}
                            batchMode={batchMode}
                            currentBatchIndex={currentBatchIndex}
                            totalBatchCount={batchVocabList?.length || 0}
                            onBatchNext={handleBatchSaveNext}
                            onBatchSkip={handleBatchSkip}
                            editingCard={editingCard}
                            onOpenBatchImport={() => setShowBatchImportModal(true)}
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
                            isAdmin={isAdmin}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={handleGeminiAssist}
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
                            isAdmin={isAdmin}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={handleGeminiAssist}
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
                            <ReviewCompleteScreen onBack={() => setView('LIST')} />
                        ) : (
                            <ReviewScreen
                                cards={reviewCards}
                                reviewMode={reviewMode}
                                allCards={allCards}
                                onUpdateCard={handleUpdateCard}
                                vocabCollectionPath={vocabCollectionPath}
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
                                        setView('LIST');
                                    }
                                }}
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
                                setView('LIST');
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
                            onBack={() => setView('LIST')}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.STATS}
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
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.FRIENDS}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <FriendsScreen
                            publicStatsPath={publicStatsCollectionPath}
                            currentUserId={userId}
                            onBack={() => setView('HOME')}
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
                                onComplete={() => {
                                    setFlashcardCards([]);
                                    setView('LIST');
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
                            isAdmin={isAdmin}
                            onAddVocabToSRS={handleSaveNewCard}
                            onGeminiAssist={handleGeminiAssist}
                            allUserCards={allCards}
                        />
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
                            onChangePassword={handleChangePassword}
                        />
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
    );
};

export default AppRoutes;
