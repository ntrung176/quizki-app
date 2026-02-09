import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES, ProtectedRoute, PublicOnlyRoute } from '../router';

import {
    HomeScreen,
    LoginScreen,
    PaymentScreen,
    AccountScreen,
    HelpScreen,
    ImportScreen,
    StatsScreen,
    FriendsScreen,
    ListView,
    ReviewScreen,
    ReviewCompleteScreen,
    KanjiScreen,
    StudyScreen,
    TestScreen,
    AdminScreen,
    FlashcardScreen
} from './screens';

// Import card components
import {
    AddCardForm,
    EditCardForm
} from './cards';

const AppRoutes = ({
    // Auth state
    isAuthenticated,
    isApproved,
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
    handleNavigateToEdit,
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

            {/* Payment/Waiting for approval - requires auth but not approval */}
            <Route
                path={ROUTES.PAYMENT}
                element={
                    isAuthenticated ? (
                        <PaymentScreen
                            displayName={profile?.displayName}
                            onPaidClick={() => { }}
                            onLogout={() => { }}
                        />
                    ) : (
                        <Navigate to={ROUTES.LOGIN} replace />
                    )
                }
            />

            {/* Protected routes - require both auth and approval */}
            <Route
                path={ROUTES.HOME}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <HomeScreen
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

            <Route
                path={ROUTES.VOCABULARY}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <ListView
                            allCards={allCards}
                            onDeleteCard={handleDeleteCard}
                            onPlayAudio={playAudio}
                            onExport={() => handleExport(allCards)}
                            onNavigateToEdit={handleNavigateToEdit}
                            scrollToCardId={scrollToCardIdRef?.current}
                            onScrollComplete={() => { if (scrollToCardIdRef) scrollToCardIdRef.current = null; }}
                            savedFilters={savedFilters}
                            onFiltersChange={(filters) => setSavedFilters(filters)}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.VOCABULARY_ADD}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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

            <Route
                path={ROUTES.VOCABULARY_EDIT}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <EditCardForm
                            card={editingCard}
                            onSave={handleSaveChanges}
                            onBack={() => { setEditingCard(null); setView('LIST'); }}
                            onGeminiAssist={handleGeminiAssist}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.KANJI}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <KanjiScreen isAdmin={isAdmin} />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.REVIEW}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        {reviewCards?.length === 0 ? (
                            <ReviewCompleteScreen onBack={() => setView('HOME')} />
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
                                        setView('HOME');
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
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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
                                setView('HOME');
                            }}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.TEST}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <TestScreen
                            allCards={allCards}
                            onBack={() => setView('HOME')}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.STATS}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <StatsScreen
                            memoryStats={memoryStats}
                            totalCards={allCards?.length || 0}
                            profile={profile}
                            allCards={allCards}
                            dailyActivityLogs={dailyActivityLogs}
                            onUpdateGoal={handleUpdateGoal}
                            onBack={() => setView('HOME')}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.FRIENDS}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        <FriendsScreen
                            publicStatsPath={publicStatsCollectionPath}
                            currentUserId={userId}
                            isAdmin={isAdmin}
                            onAdminDeleteUserData={handleAdminDeleteUserData}
                            onBack={() => setView('HOME')}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path={ROUTES.ACCOUNT}
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
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
                    <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
                        {flashcardCards && flashcardCards.length > 0 ? (
                            <FlashcardScreen
                                cards={flashcardCards}
                                onComplete={() => {
                                    setFlashcardCards([]);
                                    setView('HOME');
                                }}
                            />
                        ) : (
                            <Navigate to={ROUTES.HOME} replace />
                        )}
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
    );
};

export default AppRoutes;
