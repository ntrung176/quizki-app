import React, { useEffect } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Check, Edit, X } from 'lucide-react';
import { TopTabBar, PremiumLockedModal } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
import { useBookData } from '../../hooks/useBookData';

import BookNavHeader from '../books/BookNavHeader';
import BookGroupList from '../books/BookGroupList';
import BookView from '../books/BookView';
import LessonDetailView from '../books/LessonDetailView';
import BookFormModal from '../books/BookFormModal';

// ==================== BOOK SCREEN ====================
const BookScreen = ({ 
    isAdmin = false, 
    onAddVocabToSRS, 
    onGeminiAssist, 
    onGenerateMoreExample,
    allUserCards = [], 
    userId = null,
    folders = [],
    parentFolders = [],
    onDeleteFolder,
    onAddFolder,
    onMoveStudySetToParentFolder,
    profile = null,
    awardXP = null
}) => {
    const fadeWholePage = useMenuTransition();

    const bookData = useBookData({
        isAdmin,
        allUserCards,
        userId,
        folders,
        parentFolders,
        onDeleteFolder,
        onAddFolder,
        onMoveStudySetToParentFolder,
        awardXP
    });

    const {
        t, loading, groupId, bookId, chapterId, lessonId,
        currentGroup, currentBook, currentChapter, currentLesson, vocabWithAudio,
        activeFilter, setActiveFilter, searchQuery, setSearchQuery, filteredGroups,
        getGroupProgress, navigateTo, goBack, resetForm,
        showAddGroup, setShowAddGroup, handleAddGroup,
        showAddBook, setShowAddBook, handleAddBook,
        showAddChapter, setShowAddChapter, handleAddChapter,
        showAddLesson, setShowAddLesson, handleAddLesson,
        showJsonImport, setShowJsonImport, handleImportJson, jsonInput, setJsonInput,
        showEditGroup, setShowEditGroup, handleStartEditGroup, handleSaveEditGroup,
        showEditBook, setShowEditBook, handleStartEditBook, handleSaveEditBook,
        formName, setFormName, formSubtitle, setFormSubtitle, formColor, setFormColor,
        formDescription, setFormDescription, formWordCount, setFormWordCount, formImageUrl, setFormImageUrl,
        handleDeleteGroup, getBookProgress, handleDeleteBook, handleDeleteChapter, handleDeleteLesson,
        handleToggleLessonPremium, handleReorderChapter, handleReorderLesson,
        getLessonProgressInfo, showTOC, editingNameItem, setEditingNameItem, editingNameValue, setEditingNameValue,
        handleSaveEditName,
        linkedStudySet, syncStatus, handleSyncVocabWithStudySet, creationLoading, navigate,
        handleUnlinkStudySet, handleDeleteStudySet, setStudySetName, setStudySetDesc, setSelectedParentFolderId,
        setIsCreatingNewParentFolder, setNewParentFolderName, setSelectedVocabIndices, setShowCreateStudySetModal,
        showCreateStudySetModal, handleCreateStudySetFromLesson, studySetName, studySetDesc, selectedParentFolderId,
        isCreatingNewParentFolder, newParentFolderName, selectedVocabIndices, availableFolders,
        setSelectedExistingStudySetId, setShowLinkStudySetModal, showLinkStudySetModal, selectedExistingStudySetId,
        handleLinkToExistingStudySet, persistedRevealed, revealedCards, revealCard, blurMode, setBlurMode,
        handleReBlurAll, handleResetProgress, editingVocabIndex, setEditingVocabIndex, editingVocabData, setEditingVocabData,
        editingCardRef, handleSaveVocabEdit, handleBatchSaveLessonVocab, isVocabInUserList, addedVocabSet, fixAudioIndex, setFixAudioIndex,
        fixAudioCustomReading, setFixAudioCustomReading, fixAudioLoading, handleFixAudio, showNuanceIndex,
        setShowNuanceIndex, handleEditVocab, handleDeleteVocab,
        showPremiumModal, setShowPremiumModal, lockedPkgName, setLockedPkgName
    } = bookData;

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const scrollContainers = document.querySelectorAll('main, body, html, #root');
        scrollContainers.forEach(el => { if (el) el.scrollTop = 0; });
    }, [lessonId, bookId, chapterId, groupId]);

    // Inline edit name component helper for Admin
    const InlineEditName = ({ type, id, currentName, className = '' }) => {
        if (!isAdmin) return <span className={className}>{currentName}</span>;
        if (editingNameItem?.type === type && editingNameItem?.id === id) {
            return (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => { 
                            if (e.key === 'Enter') handleSaveEditName(); 
                            if (e.key === 'Escape') { setEditingNameItem(null); setEditingNameValue(''); } 
                        }}
                        className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-sky-400 rounded text-sm text-gray-900 dark:text-white outline-none"
                        autoFocus
                    />
                    <button onClick={handleSaveEditName} className="p-0.5 text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingNameItem(null); setEditingNameValue(''); }} className="p-0.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
            );
        }
        return (
            <span className={`${className} group/edit cursor-pointer`} onClick={e => { e.stopPropagation(); setEditingNameItem({ type, id }); setEditingNameValue(currentName); }}>
                {currentName}
                <Edit className="w-3 h-3 ml-1 inline opacity-0 group-hover/edit:opacity-50 transition-opacity" />
            </span>
        );
    };

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={VOCAB_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu Sách..." />
                </div>
            </div>
        );
    }

    const renderCurrentView = () => {
        if (lessonId && currentLesson) {
            return (
                <LessonDetailView
                    currentLesson={currentLesson}
                    currentBook={currentBook}
                    vocabWithAudio={vocabWithAudio}
                    isAdmin={isAdmin}
                    resetForm={resetForm}
                    setShowJsonImport={setShowJsonImport}
                    linkedStudySet={linkedStudySet}
                    parentFolders={parentFolders}
                    syncStatus={syncStatus}
                    handleSyncVocabWithStudySet={handleSyncVocabWithStudySet}
                    creationLoading={creationLoading}
                    navigate={navigate}
                    handleUnlinkStudySet={handleUnlinkStudySet}
                    handleDeleteStudySet={handleDeleteStudySet}
                    setStudySetName={setStudySetName}
                    setStudySetDesc={setStudySetDesc}
                    setSelectedParentFolderId={setSelectedParentFolderId}
                    setIsCreatingNewParentFolder={setIsCreatingNewParentFolder}
                    setNewParentFolderName={setNewParentFolderName}
                    setSelectedVocabIndices={setSelectedVocabIndices}
                    setShowCreateStudySetModal={setShowCreateStudySetModal}
                    setSelectedExistingStudySetId={setSelectedExistingStudySetId}
                    setShowLinkStudySetModal={setShowLinkStudySetModal}
                    persistedRevealed={persistedRevealed}
                    revealedCards={revealedCards}
                    revealCard={revealCard}
                    blurMode={blurMode}
                    setBlurMode={setBlurMode}
                    handleReBlurAll={handleReBlurAll}
                    handleResetProgress={handleResetProgress}
                    editingVocabIndex={editingVocabIndex}
                    setEditingVocabIndex={setEditingVocabIndex}
                    editingVocabData={editingVocabData}
                    setEditingVocabData={setEditingVocabData}
                    editingCardRef={editingCardRef}
                    handleSaveVocabEdit={handleSaveVocabEdit}
                    handleBatchSaveLessonVocab={handleBatchSaveLessonVocab}
                    onGeminiAssist={onGeminiAssist}
                    isVocabInUserList={isVocabInUserList}
                    addedVocabSet={addedVocabSet}
                    fixAudioIndex={fixAudioIndex}
                    setFixAudioIndex={setFixAudioIndex}
                    fixAudioCustomReading={fixAudioCustomReading}
                    setFixAudioCustomReading={setFixAudioCustomReading}
                    fixAudioLoading={fixAudioLoading}
                    handleFixAudio={handleFixAudio}
                    showNuanceIndex={showNuanceIndex}
                    setShowNuanceIndex={setShowNuanceIndex}
                    handleEditVocab={handleEditVocab}
                    handleDeleteVocab={handleDeleteVocab}
                    showTOC={showTOC}
                    groupId={groupId}
                    bookId={bookId}
                    getLessonProgressInfo={getLessonProgressInfo}
                    profile={profile}
                    setLockedPkgName={setLockedPkgName}
                    setShowPremiumModal={setShowPremiumModal}
                    navigateTo={navigateTo}
                />
            );
        }

        if (groupId) {
            return (
                <BookView
                    currentGroup={currentGroup}
                    currentBook={currentBook}
                    groupId={groupId}
                    bookId={bookId}
                    searchQuery={searchQuery}
                    getBookProgress={getBookProgress}
                    navigateTo={navigateTo}
                    isAdmin={isAdmin}
                    resetForm={resetForm}
                    setShowAddBook={setShowAddBook}
                    handleStartEditBook={handleStartEditBook}
                    handleDeleteBook={handleDeleteBook}
                    setShowAddChapter={setShowAddChapter}
                    setShowAddLesson={setShowAddLesson}
                    handleDeleteChapter={handleDeleteChapter}
                    handleDeleteLesson={handleDeleteLesson}
                    handleToggleLessonPremium={handleToggleLessonPremium}
                    handleReorderChapter={handleReorderChapter}
                    handleReorderLesson={handleReorderLesson}
                    getLessonProgressInfo={getLessonProgressInfo}
                    showTOC={showTOC}
                    profile={profile}
                    setLockedPkgName={setLockedPkgName}
                    setShowPremiumModal={setShowPremiumModal}
                    InlineEditName={InlineEditName}
                />
            );
        }

        return (
            <BookGroupList
                t={t}
                isEnglishMode={bookData.isEnglishMode}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredGroups={filteredGroups}
                loading={loading}
                getGroupProgress={getGroupProgress}
                navigateTo={navigateTo}
                isAdmin={isAdmin}
                handleStartEditGroup={handleStartEditGroup}
                handleDeleteGroup={handleDeleteGroup}
                resetForm={resetForm}
                setShowAddGroup={setShowAddGroup}
            />
        );
    };

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-6xl mx-auto space-y-4 px-4 md:px-8 mt-4 animate-fade-in">
                {(groupId || bookId || chapterId || lessonId) && (
                    <BookNavHeader
                        currentGroup={currentGroup}
                        currentBook={currentBook}
                        currentChapter={currentChapter}
                        currentLesson={currentLesson}
                        groupId={groupId}
                        bookId={bookId}
                        chapterId={chapterId}
                        lessonId={lessonId}
                        navigateTo={navigateTo}
                        goBack={goBack}
                        isAdmin={isAdmin}
                        setShowAddBook={setShowAddBook}
                        setShowAddChapter={setShowAddChapter}
                        setShowAddLesson={setShowAddLesson}
                        setShowJsonImport={setShowJsonImport}
                        setShowCreateStudySetModal={setShowCreateStudySetModal}
                        setShowLinkStudySetModal={setShowLinkStudySetModal}
                        setSelectedVocabIndices={setSelectedVocabIndices}
                        vocabWithAudio={vocabWithAudio}
                    />
                )}

                {renderCurrentView()}

                {/* Modals & Dialogs */}
                <BookFormModal
                    showAddGroup={showAddGroup}
                    setShowAddGroup={setShowAddGroup}
                    handleAddGroup={handleAddGroup}
                    showAddBook={showAddBook}
                    setShowAddBook={setShowAddBook}
                    handleAddBook={handleAddBook}
                    showAddChapter={showAddChapter}
                    setShowAddChapter={setShowAddChapter}
                    handleAddChapter={handleAddChapter}
                    showAddLesson={showAddLesson}
                    setShowAddLesson={setShowAddLesson}
                    handleAddLesson={handleAddLesson}
                    showJsonImport={showJsonImport}
                    setShowJsonImport={setShowJsonImport}
                    handleImportJson={handleImportJson}
                    jsonInput={jsonInput}
                    setJsonInput={setJsonInput}
                    showEditGroup={showEditGroup}
                    setShowEditGroup={setShowEditGroup}
                    handleSaveEditGroup={handleSaveEditGroup}
                    showEditBook={showEditBook}
                    setShowEditBook={setShowEditBook}
                    handleSaveEditBook={handleSaveEditBook}
                    formName={formName}
                    setFormName={setFormName}
                    formSubtitle={formSubtitle}
                    setFormSubtitle={setFormSubtitle}
                    formColor={formColor}
                    setFormColor={setFormColor}
                    formDescription={formDescription}
                    setFormDescription={setFormDescription}
                    formWordCount={formWordCount}
                    setFormWordCount={setFormWordCount}
                    formImageUrl={formImageUrl}
                    setFormImageUrl={setFormImageUrl}
                    resetForm={resetForm}
                    showCreateStudySetModal={showCreateStudySetModal}
                    setShowCreateStudySetModal={setShowCreateStudySetModal}
                    handleCreateStudySetFromLesson={handleCreateStudySetFromLesson}
                    studySetName={studySetName}
                    setStudySetName={setStudySetName}
                    studySetDesc={studySetDesc}
                    setStudySetDesc={setStudySetDesc}
                    selectedParentFolderId={selectedParentFolderId}
                    setSelectedParentFolderId={setSelectedParentFolderId}
                    parentFolders={parentFolders}
                    isCreatingNewParentFolder={isCreatingNewParentFolder}
                    setIsCreatingNewParentFolder={setIsCreatingNewParentFolder}
                    newParentFolderName={newParentFolderName}
                    setNewParentFolderName={setNewParentFolderName}
                    vocabWithAudio={vocabWithAudio}
                    selectedVocabIndices={selectedVocabIndices}
                    setSelectedVocabIndices={setSelectedVocabIndices}
                    creationLoading={creationLoading}
                    showLinkStudySetModal={showLinkStudySetModal}
                    setShowLinkStudySetModal={setShowLinkStudySetModal}
                    handleLinkToExistingStudySet={handleLinkToExistingStudySet}
                    availableFolders={availableFolders}
                    folders={folders}
                    selectedExistingStudySetId={selectedExistingStudySetId}
                    setSelectedExistingStudySetId={setSelectedExistingStudySetId}
                />

                {/* Premium Locked Modal */}
                {showPremiumModal && (
                    <PremiumLockedModal
                        show={showPremiumModal}
                        onClose={() => setShowPremiumModal(false)}
                        packageName={lockedPkgName}
                    />
                )}
            </div>
        </div>
    );
};

export default BookScreen;
