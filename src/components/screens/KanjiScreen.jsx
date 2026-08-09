import React from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { TopTabBar, PremiumLockedModal } from '../ui';
import { KANJI_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
import { useKanjiData } from '../../hooks/useKanjiData';
import { ROUTES } from '../../router';

import KanjiNavHeader from '../kanji/KanjiNavHeader';
import KanjiGridList from '../kanji/KanjiGridList';
import KanjiDetailView from '../kanji/KanjiDetailView';
import KanjiFormModal from '../kanji/KanjiFormModal';

const KanjiScreen = ({
    isAdmin = false,
    onAddVocabToSRS,
    onGeminiAssist,
    allUserCards = [],
    profile = null,
    folders = [],
    userId,
    awardXP
}) => {
    const fadeWholePage = useMenuTransition();

    const kanjiData = useKanjiData({
        isAdmin,
        onAddVocabToSRS,
        allUserCards,
        profile,
        userId,
        awardXP
    });

    const {
        isUserAdmin, searchParams, params, navigate, location,
        userKanjiSRS, showFolderSelectModal, setShowFolderSelectModal,
        vocabToSave, selectedModalFolderId, setSelectedModalFolderId,
        modalSearchQuery, setModalSearchQuery, showPremiumModal, setShowPremiumModal,
        lockedPkgName, setLockedPkgName, selectedLevel, setSelectedLevel,
        searchQuery, setSearchQuery, visibleLimit, setVisibleLimit,
        selectedKanji, setSelectedKanji, showDetailModal, setShowDetailModal,
        showAddKanjiModal, setShowAddKanjiModal, showAddVocabModal, setShowAddVocabModal,
        showEditKanjiModal, setShowEditKanjiModal, showEditVocabModal, setShowEditVocabModal,
        editingKanji, setEditingKanji, editingVocab, setEditingVocab,
        syncingCDN, setSyncingCDN, migratingComponents, setMigratingComponents,
        vocabCategories, setVocabCategories, showCategoryModal, setShowCategoryModal,
        newCategoryName, setNewCategoryName, kanjiList, setKanjiList,
        vocabList, setVocabList, loading, setLoading,
        sidebarStrokeCtrl, detailStrokeCtrl, writerContainerRef, detailWriterContainerRef,
        strokeGuideRef, kanjiApiData, loadingApiData, showSearchResults, setShowSearchResults,
        showHandwritingPopup, setShowHandwritingPopup, searchInputRef, handwritingSuggestions, setHandwritingSuggestions,
        selectedStrokeCount, setSelectedStrokeCount, handwritingStrokesRef, currentStrokeRef,
        recognitionTimeoutRef, bulkSelectMode, setBulkSelectMode, selectedKanjiIds,
        setSelectedKanjiIds, selectedVocabIds, setSelectedVocabIds, diagramZoom, setDiagramZoom,
        diagramPan, setDiagramPan, addingVocabId, addedVocabIds, pitchAccentData,
        newKanji, setNewKanji, newVocab, setNewVocab, jsonKanjiInput, setJsonKanjiInput,
        jsonVocabInput, setJsonVocabInput, pureKanjiVocabList, kanjiMap,
        currentKanjiList, displayedKanjiList, filteredKanjiList, completedCount,
        searchResults, toggleKanjiSRS, openKanjiDetail, handleConfirmSaveVocab,
        handleSelectSearchResult, getKanjiDetail, getVocabForKanji, getRelatedKanji,
        handleAddKanji, handleImportKanjiJson, handleAddVocab, handleImportVocabJson, handleAutoFixVocabSinoViet, fixingSinoViet,
        handleGenerateAiVocabForSingleKanji, handleBatchGenerateAiVocabForNoVocabKanji, generatingAiVocab, handleDeleteCategory, toggleKanjiSelection,
        toggleVocabSelection, selectAllKanji, handleBulkDeleteKanji, handleEditKanji,
        handleDeleteKanji, handleSyncVocabToKanji, handleCDNSync, handleMigrateComponents,
        handleEditVocab, handleDeleteVocab, openEditKanji, openEditVocab,
        handleAddVocabToSRS, handleAddAllVocabToSRS, recognizeHandwriting
    } = kanjiData;

    // Loading screen
    if (loading) {
        if (location.state?.fromLesson) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                    <LoadingIndicator text="Đang tải chi tiết Kanji..." />
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white pb-8">
                <TopTabBar tabs={KANJI_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu Kanji..." />
                </div>
            </div>
        );
    }

    // Lesson Detail Direct Mode
    if (location.state?.fromLesson) {
        if (!selectedKanji) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                        <div className="h-4 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white animate-fade-in">
                <KanjiDetailView
                    selectedKanji={selectedKanji}
                    setSelectedKanji={setSelectedKanji}
                    setShowDetailModal={setShowDetailModal}
                    isFullPage={true}
                    navigate={navigate}
                    location={location}
                    ROUTES={ROUTES}
                    getKanjiDetail={getKanjiDetail}
                    getVocabForKanji={getVocabForKanji}
                    getRelatedKanji={getRelatedKanji}
                    kanjiMap={kanjiMap}
                    userKanjiSRS={userKanjiSRS}
                    toggleKanjiSRS={toggleKanjiSRS}
                    isAdmin={isAdmin}
                    openEditKanji={openEditKanji}
                    handleDeleteKanji={handleDeleteKanji}
                    loadingApiData={loadingApiData}
                    kanjiApiData={kanjiApiData}
                    kanjiList={kanjiList}
                    detailWriterContainerRef={detailWriterContainerRef}
                    detailStrokeCtrl={detailStrokeCtrl}
                    strokeGuideRef={strokeGuideRef}
                    onAddVocabToSRS={onAddVocabToSRS}
                    addedVocabIds={addedVocabIds}
                    allUserCards={allUserCards}
                    addingVocabId={addingVocabId}
                    handleAddVocabToSRS={handleAddVocabToSRS}
                    openEditVocab={openEditVocab}
                    handleDeleteVocab={handleDeleteVocab}
                    setShowAddVocabModal={setShowAddVocabModal}
                    diagramPan={diagramPan}
                    setDiagramPan={setDiagramPan}
                    setDiagramZoom={setDiagramZoom}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-slate-900 dark:text-white pb-12 transition-colors duration-300">
            <TopTabBar tabs={KANJI_TABS} />
            <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6 mt-6 animate-fade-in">
                {/* Header & Controls */}
                <KanjiNavHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showSearchResults={showSearchResults}
                    setShowSearchResults={setShowSearchResults}
                    searchResults={searchResults}
                    vocabList={vocabList}
                    searchInputRef={searchInputRef}
                    showHandwritingPopup={showHandwritingPopup}
                    setShowHandwritingPopup={setShowHandwritingPopup}
                    handwritingStrokesRef={handwritingStrokesRef}
                    currentStrokeRef={currentStrokeRef}
                    recognitionTimeoutRef={recognitionTimeoutRef}
                    recognizeHandwriting={recognizeHandwriting}
                    handwritingSuggestions={handwritingSuggestions}
                    setHandwritingSuggestions={setHandwritingSuggestions}
                    selectedLevel={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    isUserAdmin={isUserAdmin}
                    isAdmin={isAdmin}
                    profile={profile}
                    setLockedPkgName={setLockedPkgName}
                    setShowPremiumModal={setShowPremiumModal}
                    openKanjiDetail={openKanjiDetail}
                    handleCDNSync={handleCDNSync}
                    syncingCDN={syncingCDN}
                    handleMigrateComponents={handleMigrateComponents}
                    migratingComponents={migratingComponents}
                    setShowAddKanjiModal={setShowAddKanjiModal}
                    setShowAddVocabModal={setShowAddVocabModal}
                    setShowCategoryModal={setShowCategoryModal}
                    handleSyncVocabToKanji={handleSyncVocabToKanji}
                    handleAutoFixVocabSinoViet={handleAutoFixVocabSinoViet}
                    fixingSinoViet={fixingSinoViet}
                    handleBatchGenerateAiVocabForNoVocabKanji={handleBatchGenerateAiVocabForNoVocabKanji}
                    generatingAiVocab={generatingAiVocab}
                    bulkSelectMode={bulkSelectMode}
                    setBulkSelectMode={setBulkSelectMode}
                    selectedKanjiIds={selectedKanjiIds}
                    handleBulkDeleteKanji={handleBulkDeleteKanji}
                />

                {/* Grid List */}
                <KanjiGridList
                    selectedLevel={selectedLevel}
                    currentKanjiList={currentKanjiList}
                    displayedKanjiList={displayedKanjiList}
                    completedCount={completedCount}
                    kanjiMap={kanjiMap}
                    userKanjiSRS={userKanjiSRS}
                    toggleKanjiSRS={toggleKanjiSRS}
                    openKanjiDetail={openKanjiDetail}
                    bulkSelectMode={bulkSelectMode}
                    selectedKanjiIds={selectedKanjiIds}
                    toggleKanjiSelection={toggleKanjiSelection}
                    visibleLimit={visibleLimit}
                    setVisibleLimit={setVisibleLimit}
                />

                {/* Detail View Modal Overlay */}
                {showDetailModal && selectedKanji && (
                    <KanjiDetailView
                        selectedKanji={selectedKanji}
                        setSelectedKanji={setSelectedKanji}
                        setShowDetailModal={setShowDetailModal}
                        isFullPage={false}
                        navigate={navigate}
                        location={location}
                        ROUTES={ROUTES}
                        getKanjiDetail={getKanjiDetail}
                        getVocabForKanji={getVocabForKanji}
                        getRelatedKanji={getRelatedKanji}
                        kanjiMap={kanjiMap}
                        userKanjiSRS={userKanjiSRS}
                        toggleKanjiSRS={toggleKanjiSRS}
                        isAdmin={isAdmin}
                        openEditKanji={openEditKanji}
                        handleDeleteKanji={handleDeleteKanji}
                        loadingApiData={loadingApiData}
                        kanjiApiData={kanjiApiData}
                        kanjiList={kanjiList}
                        detailWriterContainerRef={detailWriterContainerRef}
                        detailStrokeCtrl={detailStrokeCtrl}
                        strokeGuideRef={strokeGuideRef}
                        onAddVocabToSRS={onAddVocabToSRS}
                        addedVocabIds={addedVocabIds}
                        allUserCards={allUserCards}
                        addingVocabId={addingVocabId}
                        handleAddVocabToSRS={handleAddVocabToSRS}
                        openEditVocab={openEditVocab}
                        handleDeleteVocab={handleDeleteVocab}
                        setShowAddVocabModal={setShowAddVocabModal}
                        handleGenerateAiVocabForSingleKanji={handleGenerateAiVocabForSingleKanji}
                        generatingAiVocab={generatingAiVocab}
                        diagramPan={diagramPan}
                        setDiagramPan={setDiagramPan}
                        setDiagramZoom={setDiagramZoom}
                    />
                )}

                {/* Form Modals */}
                <KanjiFormModal
                    showAddKanjiModal={showAddKanjiModal}
                    setShowAddKanjiModal={setShowAddKanjiModal}
                    handleAddKanji={handleAddKanji}
                    newKanji={newKanji}
                    setNewKanji={setNewKanji}
                    jsonKanjiInput={jsonKanjiInput}
                    setJsonKanjiInput={setJsonKanjiInput}
                    handleImportKanjiJson={handleImportKanjiJson}
                    showAddVocabModal={showAddVocabModal}
                    setShowAddVocabModal={setShowAddVocabModal}
                    handleAddVocab={handleAddVocab}
                    newVocab={newVocab}
                    setNewVocab={setNewVocab}
                    jsonVocabInput={jsonVocabInput}
                    setJsonVocabInput={setJsonVocabInput}
                    handleImportVocabJson={handleImportVocabJson}
                    vocabCategories={vocabCategories}
                    showEditKanjiModal={showEditKanjiModal}
                    setShowEditKanjiModal={setShowEditKanjiModal}
                    handleEditKanji={handleEditKanji}
                    editingKanji={editingKanji}
                    setEditingKanji={setEditingKanji}
                    showEditVocabModal={showEditVocabModal}
                    setShowEditVocabModal={setShowEditVocabModal}
                    handleEditVocab={handleEditVocab}
                    editingVocab={editingVocab}
                    setEditingVocab={setEditingVocab}
                    showCategoryModal={showCategoryModal}
                    setShowCategoryModal={setShowCategoryModal}
                    newCategoryName={newCategoryName}
                    setNewCategoryName={setNewCategoryName}
                    handleDeleteCategory={handleDeleteCategory}
                    showFolderSelectModal={showFolderSelectModal}
                    setShowFolderSelectModal={setShowFolderSelectModal}
                    handleConfirmSaveVocab={handleConfirmSaveVocab}
                    folders={folders}
                    selectedModalFolderId={selectedModalFolderId}
                    setSelectedModalFolderId={setSelectedModalFolderId}
                    modalSearchQuery={modalSearchQuery}
                    setModalSearchQuery={setModalSearchQuery}
                    vocabToSave={vocabToSave}
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

export default KanjiScreen;