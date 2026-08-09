import './App.css';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { auth, db, appId } from './config/firebase';
import { AlertTriangle, CheckCircle } from 'lucide-react';

import AppRoutes from './components/AppRoutes';
import { Sidebar } from './components/layout';
import OnboardingTour from './components/ui/OnboardingTour';
import UpdateNotification from './components/ui/UpdateNotification';
import { AuthProvider } from './contexts/AuthContext';
import { StudySetsProvider } from './contexts/StudySetsContext';
import { FocusProvider } from './context/FocusContext';
import FocusSessionModal from './components/ui/FocusSessionModal';
import GlobalModalsContainer from './components/containers/GlobalModalsContainer';
import VocabularySelectionLookup from './components/ui/VocabularySelectionLookup';
import FeedbackChatbox from './components/ui/FeedbackChatbox';
import AdminFloatingSupportChatbox from './components/ui/AdminFloatingSupportChatbox';
import CyberTechBackground from './components/ui/CyberTechBackground';
import LevelUpModal from './components/ui/LevelUpModal';
import { useAppLogic } from './hooks/useAppLogic';

const AppContent = () => {
    const location = useLocation();
    const appLogic = useAppLogic();

    const {
        updateAvailable, refreshApp, dismissUpdate, setView, authReady, userId, reviewMode,
        allCards, reviewCards, isLoading, notification, setNotification, levelUpInfo, setLevelUpInfo,
        isReviewActive, setIsReviewActive, isRealExamActive, isReviewSessionPage, editingCard,
        setEditingCard, showBatchImportModal, setShowBatchImportModal, batchVocabList, currentBatchIndex,
        isDarkMode, setIsDarkMode, isSidebarCollapsed, profile, dailyActivityLogs, isActivityLogsLoaded,
        studySessionData, setStudySessionData, setReviewCards, setReviewMode, setSavedFilters,
        setFlashcardCards, prepareReviewCards, handleUpdateCard, handleDeleteCard, handleAddCard,
        handleSaveChanges, handleGeminiAssist, handleExtractVocabFromImage, handleGenerateMoreExample,
        handleBatchImport, handleBatchSaveNext, handleBatchSkip, handleExport, handleNavigateToEdit,
        handleUpdateGoal, handleAdminDeleteUserData, handleUpdateProfileName, handleUpdateAvatar,
        handleChangePassword, playAudio, handleSaveCardAudio, shuffleArray, handleToggleSrs,
        handleUpdateVocabSrsRating, handleRevertVocabSrsRating, handleRefreshCards, awardXP,
        handleAddFolder, handleDeleteFolder, handleUpdateFolder, handleAddParentFolder,
        handleUpdateParentFolder, handleDeleteParentFolder, handleMoveStudySetToParentFolder,
        dueCounts, memoryStats, calculatedStreak, scrollToCardIdRef, flashcardCards,
        vocabCollectionPath, publicStatsCollectionPath, userHasAdminPrivileges, adminConfig,
        canUserUseAI, hasPremium, studySets, cardFolders, parentFolders, savedFilters, tourTrigger,
        activePopup, handleDismissPopup, view
    } = appLogic;

    return (
        <div className={`min-h-screen font-sans ${isDarkMode ? 'dark text-slate-100' : 'text-slate-900'} relative transition-colors duration-200`}>
            {/* Cyberpunk tech grid background animation */}
            <CyberTechBackground isDarkMode={isDarkMode} />

            {/* Selection text lookup popup for instant dictionary search */}
            <VocabularySelectionLookup
                allCards={flashcardCards}
                folders={cardFolders}
                handleAddCard={handleAddCard}
                isPremiumUnlocked={userHasAdminPrivileges || hasPremium}
            />

            {/* Version Update Popup */}
            {updateAvailable && (
                <UpdateNotification onRefresh={refreshApp} onDismiss={dismissUpdate} />
            )}

            {/* Onboarding Tour */}
            <OnboardingTour trigger={tourTrigger} />

            {/* Global Modals */}
            <GlobalModalsContainer
                activePopup={activePopup}
                handleDismissPopup={handleDismissPopup}
            />

            {/* Global Sidebar (only when authenticated) */}
            {userId && (
                <Sidebar
                    currentView={view}
                    setView={setView}
                    isReviewActive={isReviewActive}
                    isRealExamActive={isRealExamActive}
                    isAdmin={userHasAdminPrivileges}
                    userId={userId}
                    profile={profile}
                    isPremium={hasPremium}
                    allCards={allCards}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    displayName={profile?.displayName}
                    avatar={profile?.avatar}
                />
            )}

            {/* Main view container */}
            <main className={`min-h-screen transition-all duration-300 ${userId && !isReviewSessionPage ? (isSidebarCollapsed ? 'pt-16 lg:pt-0 lg:pl-20' : 'pt-16 lg:pt-0 lg:pl-64') : 'pl-0'}`}>
                {/* Admin Test Mode Banner */}
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

                <div className={`${isReviewSessionPage ? 'w-full flex-1 flex items-center justify-center bg-transparent py-4 md:py-8' : ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') || location.pathname.startsWith('/grammar') ? 'w-full flex-1' : 'w-full max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6'}`}>
                    <div className={`w-full ${isReviewSessionPage || ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') || location.pathname.startsWith('/grammar') ? 'bg-transparent' : ''}`}>
                        <div className={`w-full ${isReviewSessionPage || ['KANJI', 'KANJI_STUDY', 'KANJI_REVIEW', 'KANJI_SAVED', 'VOCAB_REVIEW', 'VOCAB_LIST', 'VOCAB_ADD', 'VOCAB_QUICK_ADD', 'BOOKS', 'JLPT_TEST', 'JLPT_ADMIN'].includes(view) || location.pathname.startsWith('/vocab/set') || location.pathname.startsWith('/vocab/edit-set') || location.pathname.startsWith('/jlpt') || location.pathname.startsWith('/grammar') ? 'bg-transparent' : ''}`}>
                            <AppRoutes
                                authReady={authReady}
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
                                isAdmin={userHasAdminPrivileges}
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
                                onRefreshCards={handleRefreshCards}
                                awardXP={awardXP}
                                isReviewActive={isReviewActive}
                                setIsReviewActive={setIsReviewActive}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Level Up Modal */}
            <LevelUpModal
                levelUpInfo={levelUpInfo}
                onClose={() => setLevelUpInfo(null)}
            />

            {/* Real-time floating support/bug feedback chatbox */}
            {userId && (
                userHasAdminPrivileges ? (
                    <AdminFloatingSupportChatbox currentUserId={userId} />
                ) : (
                    <FeedbackChatbox
                        userId={userId}
                        profile={profile}
                        isAdmin={userHasAdminPrivileges}
                    />
                )
            )}
            <FocusSessionModal />
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <StudySetsProvider>
                <FocusProvider>
                    <AppContent />
                </FocusProvider>
            </StudySetsProvider>
        </AuthProvider>
    );
};

export default App;
