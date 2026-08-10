import React, { useState, useEffect } from 'react';
import { 
    Upload, Folder, RefreshCw, X, Trash2, Plus, Layers, 
    Languages, EyeOff, RotateCcw, FileText, Edit, Save, 
    Volume2, Wrench, Lightbulb, Mic, AlertTriangle, Sparkles, Loader2, CloudUpload
} from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { accentNumberToPitchParts } from '../../utils/pitchAccent';
import { speakJapanese, playAudio } from '../../utils/audio';
import { showToast, showConfirm } from '../../utils/toast';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';
import { syncBooksToCDN } from '../../utils/bookService';

const LessonDetailView = ({
    currentLesson,
    currentBook,
    vocabWithAudio,
    isAdmin,
    resetForm,
    setShowJsonImport,
    linkedStudySet,
    parentFolders,
    syncStatus,
    handleSyncVocabWithStudySet,
    creationLoading,
    navigate,
    handleUnlinkStudySet,
    handleDeleteStudySet,
    setStudySetName,
    setStudySetDesc,
    setSelectedParentFolderId,
    setIsCreatingNewParentFolder,
    setNewParentFolderName,
    setSelectedVocabIndices,
    setShowCreateStudySetModal,
    setSelectedExistingStudySetId,
    setShowLinkStudySetModal,
    persistedRevealed,
    revealedCards,
    revealCard,
    blurMode,
    setBlurMode,
    handleReBlurAll,
    handleResetProgress,
    editingVocabIndex,
    setEditingVocabIndex,
    editingVocabData,
    setEditingVocabData,
    editingCardRef,
    handleSaveVocabEdit,
    handleBatchSaveLessonVocab,
    onGeminiAssist,
    isVocabInUserList,
    addedVocabSet,
    fixAudioIndex,
    setFixAudioIndex,
    fixAudioCustomReading,
    setFixAudioCustomReading,
    fixAudioLoading,
    handleFixAudio,
    showNuanceIndex,
    setShowNuanceIndex,
    handleEditVocab,
    handleDeleteVocab,
    showTOC,
    groupId,
    bookId,
    getLessonProgressInfo,
    profile,
    setLockedPkgName,
    setShowPremiumModal,
    navigateTo
}) => {
    const [filterMissingSino, setFilterMissingSino] = useState(false);
    const [isAiFillingSino, setIsAiFillingSino] = useState(false);
    const [isSyncingCDN, setIsSyncingCDN] = useState(false);
    const vocab = vocabWithAudio;

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const scrollContainers = document.querySelectorAll('main, body, html, #root');
        scrollContainers.forEach(el => { if (el) el.scrollTop = 0; });
    }, [currentLesson?.id]);

    const handleSyncCDN = async () => {
        if (!isAdmin || isSyncingCDN) return;
        const confirm = await showConfirm(
            'Bạn có muốn xuất toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN cho học viên không?',
            { type: 'info', confirmText: 'Bắt đầu đồng bộ CDN' }
        );
        if (!confirm) return;

        setIsSyncingCDN(true);
        showToast('Đang tải dữ liệu Kho sách và đẩy lên CDN Cloud Storage...', 'info', 5000);
        try {
            await syncBooksToCDN();
            showToast('Đã đồng bộ Kho sách lên Cloud Storage CDN thành công! 🎉', 'success');
        } catch (e) {
            console.error('Error syncing books to CDN:', e);
            showToast('Lỗi khi đồng bộ CDN: ' + (e?.message || e), 'error');
        } finally {
            setIsSyncingCDN(false);
        }
    };

    const isMissingSino = (v) => {
        if (!v) return false;
        const word = v.word || v.front || '';
        const displayWord = word.split('（')[0].split('(')[0].trim();
        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(displayWord);
        const sino = (v.sinoVietnamese || '').trim();
        return hasKanji && !sino;
    };

    const missingSinoCount = vocab.filter(isMissingSino).length;

    const handleAutoFillMissingSino = async () => {
        if (!isAdmin || isAiFillingSino) return;

        const missingIndices = [];
        vocab.forEach((v, idx) => {
            if (isMissingSino(v)) {
                missingIndices.push(idx);
            }
        });

        if (missingIndices.length === 0) {
            showToast('Tất cả từ vựng có chữ Hán trong bài đều đã có âm Hán Việt!', 'info');
            return;
        }

        const confirmMsg = `Tìm thấy ${missingIndices.length} từ vựng chứa chữ Hán chưa có âm Hán Việt. Bạn có muốn dùng AI để tự động tra cứu và bổ sung không?`;
        if (!(await showConfirm(confirmMsg, { type: 'info', confirmText: 'Bắt đầu thêm bằng AI' }))) {
            return;
        }

        setIsAiFillingSino(true);
        showToast(`Đang tự động bổ sung âm Hán Việt cho ${missingIndices.length} từ vựng...`, 'info', 4000);

        const updatedVocab = (currentLesson?.vocab || vocab).map(v => ({ ...v }));
        let filledCount = 0;

        for (const idx of missingIndices) {
            const item = updatedVocab[idx];
            if (!item) continue;
            const word = item.word || item.front || '';
            const displayWord = word.split('（')[0].split('(')[0].trim();

            let sino = getSinoVietnamese(displayWord);
            if (!sino && onGeminiAssist) {
                try {
                    const aiRes = await onGeminiAssist(displayWord, item.pos || '', item.level || '', item.meaning || item.back || '', false);
                    if (aiRes && aiRes.sinoVietnamese) {
                        sino = aiRes.sinoVietnamese;
                    }
                } catch (e) {
                    console.warn('Gemini Sino-HV lookup error:', displayWord, e);
                }
            }

            if (sino) {
                updatedVocab[idx].sinoVietnamese = sino;
                filledCount++;
            }
        }

        if (filledCount > 0 && handleBatchSaveLessonVocab) {
            const success = await handleBatchSaveLessonVocab(updatedVocab);
            if (success) {
                showToast(`Thành công! Đã tự động bổ sung âm Hán Việt cho ${filledCount} từ vựng! 🎉`, 'success');
            } else {
                showToast('Không thể lưu cập nhật Hán Việt vào cơ sở dữ liệu.', 'error');
            }
        } else if (filledCount === 0) {
            showToast('Không thể tra cứu âm Hán Việt cho các từ vựng này.', 'warning');
        }

        setIsAiFillingSino(false);
    };

    const displayedVocab = vocab
        .map((v, i) => ({ ...v, originalIndex: i }))
        .filter(item => {
            if (isAdmin && filterMissingSino) {
                return isMissingSino(item);
            }
            return true;
        });

    return (
        <div className="flex gap-6">
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{currentLesson?.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{vocab.length} từ vựng</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && (
                            <button onClick={() => { resetForm(); setShowJsonImport(true); }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium cursor-pointer shadow-sm">
                                <Upload className="w-4 h-4" /> Import JSON
                            </button>
                        )}
                    </div>
                </div>

                {/* STUDY SET CONTROL PANEL */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 shadow-sm">
                    {linkedStudySet ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Đang liên kết học phần</span>
                                </div>
                                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    <Folder className="w-4 h-4 text-sky-500 shrink-0" />
                                    {linkedStudySet.name}
                                </h3>
                                {linkedStudySet.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{linkedStudySet.description}</p>
                                )}
                                {linkedStudySet.parentId && (
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <span>Thư mục cha:</span>
                                        <span className="font-semibold text-slate-500 dark:text-slate-300">
                                            {parentFolders.find(pf => pf.id === linkedStudySet.parentId)?.name || 'Thư mục'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {syncStatus && !syncStatus.isSynced && (
                                    <button
                                        onClick={handleSyncVocabWithStudySet}
                                        disabled={creationLoading}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                        title={`Có ${syncStatus.missingCount} từ vựng mới trong sách chưa được thêm vào học phần. Click để đồng bộ.`}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${creationLoading ? 'animate-spin' : ''}`} />
                                        Đồng bộ ({syncStatus.missingCount} từ mới)
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/vocab/set/${linkedStudySet.id}`)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg cursor-pointer"
                                >
                                    Học Ngay 🚀
                                </button>
                                <div className="relative group">
                                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer">
                                        <Wrench className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 hidden group-hover:block z-20">
                                        <button
                                            onClick={handleUnlinkStudySet}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5 text-slate-400" /> Hủy liên kết bài học
                                        </button>
                                        <button
                                            onClick={handleDeleteStudySet}
                                            className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-semibold cursor-pointer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Xóa học phần
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa tạo học phần cho bài này</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tạo học phần mới hoặc liên kết bài học này với một học phần đã có để lưu trữ và học tập.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => {
                                        setStudySetName(`${currentBook?.name || ''} - ${currentLesson?.name || ''}`);
                                        setStudySetDesc(`Học phần từ ${currentLesson?.name || ''} của sách ${currentBook?.name || ''}`);
                                        setSelectedParentFolderId('');
                                        setIsCreatingNewParentFolder(false);
                                        setNewParentFolderName('');
                                        setSelectedVocabIndices(new Set(vocab.map((_, i) => i)));
                                        setShowCreateStudySetModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tạo học phần mới
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedExistingStudySetId('');
                                        setSelectedVocabIndices(new Set(vocab.map((_, i) => i)));
                                        setShowLinkStudySetModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <Layers className="w-3.5 h-3.5" /> Liên kết học phần
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress bar + Study controls */}
                {vocab.length > 0 && (() => {
                    const totalWords = vocab.length;
                    const learnedWords = persistedRevealed.size;
                    const progressPct = Math.round((learnedWords / totalWords) * 100);
                    return (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Tiến độ</span>
                                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{learnedWords}/{totalWords} ({progressPct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 ease-out"
                                            style={{
                                                width: `${progressPct}%`,
                                                background: progressPct === 100
                                                    ? 'linear-gradient(90deg, #10B981, #059669)'
                                                    : 'linear-gradient(90deg, #38BDF8, #0EA5E9)',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setBlurMode(prev => prev === 'vn' ? 'jp' : 'vn')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${blurMode === 'vn'
                                        ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                        }`}
                                    title={blurMode === 'vn' ? 'Đang ẩn: Tiếng Việt' : 'Đang ẩn: Kanji + Cách đọc'}
                                >
                                    <Languages className="w-3.5 h-3.5" />
                                    {blurMode === 'vn' ? 'Ẩn: Tiếng Việt' : 'Ẩn: Kanji + Đọc'}
                                </button>
                                <button
                                    onClick={handleReBlurAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer"
                                    title="Làm mờ lại tất cả (giữ tiến độ)"
                                >
                                    <EyeOff className="w-3.5 h-3.5" /> Mờ lại
                                </button>
                                {persistedRevealed.size > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (await showConfirm('Xóa toàn bộ tiến độ bài này?', { type: 'danger', confirmText: 'Xóa' })) handleResetProgress();
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-800/30 cursor-pointer"
                                        title="Xóa tiến độ và bắt đầu lại"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Reset tiến độ
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => setFilterMissingSino(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            filterMissingSino
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                        }`}
                                        title="Lọc danh sách từ vựng chứa chữ Hán nhưng chưa có âm Hán Việt (Chỉ Admin nhìn thấy)"
                                    >
                                        <AlertTriangle className={`w-3.5 h-3.5 ${filterMissingSino ? 'text-white' : 'text-amber-500'}`} />
                                        Thiếu Hán Việt ({missingSinoCount})
                                    </button>
                                )}
                                {isAdmin && missingSinoCount > 0 && (
                                    <button
                                        onClick={handleAutoFillMissingSino}
                                        disabled={isAiFillingSino}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                                        title="Dùng AI & Từ điển tự động tra cứu và điền âm Hán Việt cho tất cả từ vựng bị thiếu trong bài"
                                    >
                                        {isAiFillingSino ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3.5 h-3.5" />
                                        )}
                                        AI Thêm Hán Việt ({missingSinoCount})
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={handleSyncCDN}
                                        disabled={isSyncingCDN}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                                        title="Đẩy toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN"
                                    >
                                        {isSyncingCDN ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <CloudUpload className="w-3.5 h-3.5" />
                                        )}
                                        Đồng bộ CDN
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {displayedVocab.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                        {isAdmin && filterMissingSino ? (
                            <div>
                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">Tất cả từ vựng có chữ Hán trong bài này đã có âm Hán Việt! 🎉</p>
                                <p className="text-xs text-gray-400 mt-1">Không còn từ vựng nào bị thiếu âm Hán Việt.</p>
                            </div>
                        ) : (
                            <>
                                <p>Chưa có từ vựng</p>
                                {isAdmin && <p className="text-sm mt-1">Import JSON để thêm từ vựng</p>}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayedVocab.map((item) => {
                            const v = item;
                            const i = item.originalIndex;
                            const word = v.word || v.front || '';
                            const displayWord = word.split('（')[0].split('(')[0].trim();
                            const isRevealed = revealedCards.has(i);

                            return (
                                <div key={i} ref={editingVocabIndex === i ? editingCardRef : null} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 transition-colors overflow-hidden shadow-sm">
                                    {editingVocabIndex === i && editingVocabData ? (
                                        /* EDIT MODE */
                                        <div className="p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Edit className="w-4 h-4 text-sky-500" /> Chỉnh sửa từ #{i + 1}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleSaveVocabEdit} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                    <button onClick={() => { setEditingVocabIndex(null); setEditingVocabData(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer"><X className="w-3.5 h-3.5" /> Hủy</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Từ vựng</label>
                                                    <input value={editingVocabData.word || editingVocabData.front || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, word: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cách đọc (reading)</label>
                                                    <input value={editingVocabData.reading || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, reading: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="かんじ" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nghĩa</label>
                                                    <input value={editingVocabData.meaning || editingVocabData.back || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, meaning: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Hán Việt</label>
                                                    <input value={editingVocabData.sinoVietnamese || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Từ loại</label>
                                                        <input value={editingVocabData.pos || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, pos: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="verb..." />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cấp độ</label>
                                                        <input value={editingVocabData.level || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, level: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="N5..." />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Accent</label>
                                                        <input value={editingVocabData.accent || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, accent: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="0" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Đồng nghĩa</label>
                                                    <input value={editingVocabData.synonym || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, synonym: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Ghi chú / Sắc thái</label>
                                                    <input value={editingVocabData.nuance || editingVocabData.note || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, nuance: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div className="flex items-center gap-2 col-span-full">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={editingVocabData.specialReading || false} onChange={e => setEditingVocabData(prev => ({ ...prev, specialReading: e.target.checked }))}
                                                            className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500" />
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">Cách đọc đặc biệt (specialReading)</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Câu ví dụ</label>
                                                <textarea value={editingVocabData.example || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, example: e.target.value }))}
                                                    rows={2} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nghĩa câu ví dụ</label>
                                                <textarea value={editingVocabData.exampleMeaning || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                                    rows={2} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">URL hình ảnh (tùy chọn)</label>
                                                <input value={editingVocabData.imageUrl || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, imageUrl: e.target.value }))}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="https://..." />
                                                {editingVocabData.imageUrl && (
                                                    <img src={editingVocabData.imageUrl} alt="preview" className="mt-2 max-h-20 rounded-lg object-contain border border-gray-200 dark:border-gray-600" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* VIEW MODE */
                                        <div className="flex cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => {
                                            revealCard(i);
                                            if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                            else { speakJapanese(word); }
                                        }}>
                                            <div className="w-10 shrink-0 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center gap-1 border-r border-gray-100 dark:border-gray-700">
                                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                                                {persistedRevealed.has(i) && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Đã lật" />
                                                )}
                                            </div>
                                            <div className="w-[30%] p-4 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                                                <div className="flex-1 flex flex-col justify-center">
                                                    {(() => {
                                                        const blurJP = blurMode === 'jp' && !isRevealed;
                                                        const blurVN = blurMode === 'vn' && !isRevealed;
                                                        const blurClass = 'blur-[4px] opacity-40 select-none';
                                                        return (<>
                                                            <div className="flex items-center gap-2">
                                                                <p className={`text-xl font-bold text-gray-900 dark:text-white leading-tight transition-all duration-300 ${blurJP ? blurClass : ''}`}>{displayWord}</p>
                                                                {v.specialReading && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded font-bold" title="Cách đọc đặc biệt">特</span>
                                                                )}
                                                                {isAdmin && isMissingSino(v) && (
                                                                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full font-bold border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 shrink-0" title="Từ vựng chứa chữ Hán nhưng chưa nhập âm Hán Việt">
                                                                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Thiếu Hán Việt
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                                        else { speakJapanese(word); }
                                                                    }}
                                                                    className={`p-1 rounded-lg transition-all hover:scale-110 shrink-0 cursor-pointer ${v.audioBase64
                                                                        ? 'text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600'
                                                                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500'
                                                                        }`}
                                                                    title={v.audioBase64 ? 'Phát audio đã cắt' : 'Phát TTS'}
                                                                >
                                                                    <Volume2 className="w-4 h-4" />
                                                                </button>
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setFixAudioIndex(i); setFixAudioCustomReading(''); }}
                                                                        className="p-1 rounded-lg transition-all hover:scale-110 shrink-0 text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500 cursor-pointer"
                                                                        title="Sửa audio"
                                                                    >
                                                                        <Wrench className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {v.reading && (() => {
                                                                const pitchParts = (v.accent !== undefined && v.accent !== '' && v.accent !== null)
                                                                    ? accentNumberToPitchParts(v.reading, v.accent)
                                                                    : null;
                                                                if (pitchParts && pitchParts.length > 0) {
                                                                    const readingChars = [...v.reading];
                                                                    const charPitchMap = [];
                                                                    for (const pp of pitchParts) {
                                                                        for (const c of [...pp.part]) {
                                                                            charPitchMap.push({ char: c, high: pp.high });
                                                                        }
                                                                    }
                                                                    return (
                                                                        <span className={`inline-flex items-end gap-0 mt-0.5 transition-all duration-300 ${blurJP ? blurClass : ''}`}>
                                                                            {readingChars.map((char, ci) => {
                                                                                const pm = charPitchMap[ci];
                                                                                const isHigh = pm ? pm.high : false;
                                                                                const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                                                                                const showDrop = isHigh && !nextHigh && ci < readingChars.length - 1;
                                                                                const showRise = !isHigh && nextHigh && ci < readingChars.length - 1;
                                                                                return (
                                                                                    <span key={ci} className="relative inline-block text-xs text-gray-500 dark:text-gray-400">
                                                                                        <span className="block" style={{
                                                                                            borderTop: isHigh ? '1.5px solid rgba(249, 115, 22, 0.6)' : '1.5px solid transparent',
                                                                                            paddingTop: '1px', paddingLeft: '1px', paddingRight: '1px',
                                                                                        }}>
                                                                                            {char}
                                                                                        </span>
                                                                                        {showDrop && <span className="absolute -right-[1px] top-0 w-[1.5px] bg-orange-500/60" style={{ height: '100%' }}></span>}
                                                                                        {showRise && <span className="absolute -right-[1px] top-0 w-[1.5px] bg-orange-500/60" style={{ height: '100%' }}></span>}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </span>
                                                                    );
                                                                }
                                                                return <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 transition-all duration-300 ${blurJP ? blurClass : ''}`}>{v.reading}</p>;
                                                            })()}
                                                            {v.sinoVietnamese && (
                                                                <p className={`text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 transition-all duration-300 ${blurVN ? blurClass : ''}`}>{v.sinoVietnamese}</p>
                                                            )}
                                                            <p className={`text-sm text-sky-600 dark:text-sky-400 mt-2 font-medium transition-all duration-300 ${blurVN ? blurClass : ''}`}>{v.meaning || v.back || ''}</p>
                                                            {v.synonym && (
                                                                <p className={`text-xs text-sky-500 dark:text-sky-400 mt-1 transition-all duration-300 ${blurVN ? blurClass : ''}`}>🔄 {v.synonym}</p>
                                                            )}
                                                        </>);
                                                    })()}
                                                </div>
                                            </div>

                                            {/* RIGHT: Ví dụ */}
                                            <div className="flex-1 p-4 flex items-stretch gap-3">
                                                <div className="flex-1 flex flex-col justify-center">
                                                    {v.example ? (
                                                        <div className="space-y-2">
                                                            {v.example.split('\n').map((ex, ei) => {
                                                                const blurJP = blurMode === 'jp' && !isRevealed;
                                                                const blurVN = blurMode === 'vn' && !isRevealed;
                                                                const blurClass = 'blur-[4px] opacity-40 select-none';
                                                                return (
                                                                    <div key={ei}>
                                                                        <p className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed transition-all duration-300 ${blurJP ? blurClass : ''}`}><FuriganaText text={ex.trim()} /></p>
                                                                        {v.exampleMeaning && (() => {
                                                                            const meanings = v.exampleMeaning.split('\n');
                                                                            return meanings[ei] ? (
                                                                                <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic transition-all duration-300 ${blurVN ? blurClass : ''}`}>{meanings[ei].trim()}</p>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-300 dark:text-gray-600 italic">Chưa có ví dụ</p>
                                                    )}
                                                    {(v.nuance || v.note) && showNuanceIndex === i && (
                                                        <p className="text-xs text-orange-500 dark:text-orange-400 mt-2 italic animate-fadeIn">💡 {v.nuance || v.note}</p>
                                                    )}
                                                </div>
                                                {v.imageUrl && (
                                                    <div className="shrink-0 flex items-center">
                                                        <img src={v.imageUrl} alt={word} className="w-28 h-28 rounded-xl object-cover border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); window.open(v.imageUrl, '_blank', 'noopener,noreferrer'); }} title="Click để phóng to" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACTION buttons */}
                                            <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 border-l border-gray-100 dark:border-gray-700">
                                                {(v.nuance || v.note) && (
                                                    <button onClick={(e) => { e.stopPropagation(); setShowNuanceIndex(showNuanceIndex === i ? null : i); }}
                                                        className={`p-1.5 transition-colors cursor-pointer ${showNuanceIndex === i ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                                                        title="Xem sắc thái">
                                                        <Lightbulb className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditVocab(i); }}
                                                        className="p-1.5 text-gray-300 hover:text-sky-500 transition-colors cursor-pointer" title="Chỉnh sửa">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteVocab(i); }}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer" title="Xóa">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Fix Audio Modal */}
            {fixAudioIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFixAudioIndex(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-amber-500" /> Sửa audio cho từ vựng #{fixAudioIndex + 1}
                            </h3>
                            <button onClick={() => setFixAudioIndex(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tự động đọc theo cách đọc trong ngoặc đơn <code>（...）</code> hoặc trường reading của từ vựng này.</p>
                                <button
                                    onClick={() => handleFixAudio(fixAudioIndex)}
                                    disabled={fixAudioLoading}
                                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {fixAudioLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                    Tạo audio tự động theo cách đọc
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">HOẶC</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                                        <Mic className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Nhập cách đọc thủ công</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={fixAudioCustomReading}
                                        onChange={e => setFixAudioCustomReading(e.target.value)}
                                        placeholder="Nhập hiragana/katakana... (VD: たべる)"
                                        className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-sky-400 outline-none"
                                        disabled={fixAudioLoading}
                                        onKeyDown={e => { if (e.key === 'Enter' && fixAudioCustomReading.trim()) handleFixAudio(fixAudioIndex, fixAudioCustomReading); }}
                                    />
                                    <button
                                        onClick={() => handleFixAudio(fixAudioIndex, fixAudioCustomReading)}
                                        disabled={fixAudioLoading || !fixAudioCustomReading.trim()}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${fixAudioLoading || !fixAudioCustomReading.trim()
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm'
                                            }`}
                                    >
                                        {fixAudioLoading && fixAudioCustomReading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Tạo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonDetailView;
