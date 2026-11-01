import React, { useState, useEffect } from 'react';
import { 
    Upload, Folder, RefreshCw, X, Trash2, Plus, Layers, 
    Languages, EyeOff, RotateCcw, FileText, Edit, Save, 
    Volume2, Wrench, Lightbulb, Mic, AlertTriangle, Wand2, Loader2, CloudUpload, Search, Sparkles, ArrowRight
} from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { accentNumberToPitchParts } from '../../utils/pitchAccent';
import { speakJapanese, playAudio, speakExampleSentence } from '../../utils/audio';
import { showToast, showConfirm } from '../../utils/toast';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';
import { syncBooksToCDN } from '../../utils/bookService';
import { aiFillExampleBlanks } from '../../utils/aiProvider';
import BookTableOfContents from './BookTableOfContents';

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
    exampleUpdateStatus,
    handleUpdateLessonExamples,
    isUpdatingExamples,
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
    const [filterMissingInfo, setFilterMissingInfo] = useState(false);
    const [filterBlankExamples, setFilterBlankExamples] = useState(false);
    const [isAiFillingSino, setIsAiFillingSino] = useState(false);
    const [isAiFillingBlanks, setIsAiFillingBlanks] = useState(false);
    const [isAiLoadingSingle, setIsAiLoadingSingle] = useState(false);
    const [isSyncingCDN, setIsSyncingCDN] = useState(false);
    const [lessonSearchQuery, setLessonSearchQuery] = useState('');
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
        const sino = (v.sinoVietnamese || v.sinoViet || '').trim();
        return hasKanji && !sino;
    };

    const isMissingExample = (v) => {
        if (!v) return false;
        const ex = (v.example || v.exampleSentence || '').trim();
        return !ex;
    };

    const hasBlankInExample = (v) => {
        if (!v) return false;
        const ex = (v.example || v.exampleSentence || '').trim();
        return /_{2,}|（\s*）|\(\s*\)|\[\s*\]/.test(ex);
    };

    const isCardIncomplete = (v) => {
        return isMissingSino(v) || isMissingExample(v);
    };

    const incompleteCount = vocab.filter(isCardIncomplete).length;
    const missingSinoCount = vocab.filter(isMissingSino).length;
    const missingExampleCount = vocab.filter(isMissingExample).length;
    const blankExamplesCount = vocab.filter(hasBlankInExample).length;

    const handleAutoFillMissingWithAi = async () => {
        if (!isAdmin || isAiFillingSino) return;

        const missingIndices = [];
        vocab.forEach((v, idx) => {
            if (isCardIncomplete(v)) {
                missingIndices.push(idx);
            }
        });

        if (missingIndices.length === 0) {
            showToast('Tất cả từ vựng trong bài đều đã có câu ví dụ và âm Hán Việt đầy đủ! 🎉', 'info');
            return;
        }

        const confirmMsg = `Tìm thấy ${missingIndices.length} từ vựng còn thiếu câu ví dụ hoặc âm Hán Việt. Bạn có muốn dùng AI để tự động tạo và bổ sung đầy đủ không?`;
        if (!(await showConfirm(confirmMsg, { type: 'info', confirmText: 'Bắt đầu thêm bằng AI' }))) {
            return;
        }

        setIsAiFillingSino(true);
        showToast(`Đang tự động bổ sung câu ví dụ & Hán Việt cho ${missingIndices.length} từ vựng...`, 'info', 5000);

        const updatedVocab = (currentLesson?.vocab || vocab).map(v => ({ ...v }));
        let filledCount = 0;

        for (const idx of missingIndices) {
            const item = updatedVocab[idx];
            if (!item) continue;
            const word = item.word || item.front || '';
            const displayWord = word.split('（')[0].split('(')[0].trim();

            let sino = item.sinoVietnamese || item.sinoViet || getSinoVietnamese(displayWord);
            let ex = item.example || item.exampleSentence || '';
            let exMeaning = item.exampleMeaning || item.exampleTranslation || '';

            if ((!sino || !ex) && onGeminiAssist) {
                try {
                    const aiRes = await onGeminiAssist(
                        displayWord, 
                        item.pos || '', 
                        item.level || currentBook?.name || '', 
                        item.meaning || item.back || item.definition || '', 
                        false
                    );
                    if (aiRes) {
                        if (!sino && aiRes.sinoVietnamese) sino = aiRes.sinoVietnamese;
                        if (!ex && aiRes.example) {
                            ex = aiRes.example;
                            exMeaning = aiRes.exampleMeaning || '';
                        }
                        if (!item.pos && aiRes.pos) item.pos = aiRes.pos;
                        if (!item.nuance && aiRes.nuance) item.nuance = aiRes.nuance;
                        if (!item.reading && aiRes.reading) item.reading = aiRes.reading;
                    }
                } catch (e) {
                    console.warn('Gemini assist lookup error:', displayWord, e);
                }
            }

            let changed = false;
            if (sino && (!item.sinoVietnamese || !item.sinoViet)) {
                item.sinoVietnamese = sino;
                item.sinoViet = sino;
                changed = true;
            }
            if (ex && (!item.example || !item.exampleSentence)) {
                item.example = ex;
                item.exampleSentence = ex;
                item.exampleMeaning = exMeaning;
                item.exampleTranslation = exMeaning;
                changed = true;
            }
            if (changed) filledCount++;
        }

        if (filledCount > 0 && handleBatchSaveLessonVocab) {
            const success = await handleBatchSaveLessonVocab(updatedVocab);
            if (success) {
                showToast(`Thành công! Đã tự động bổ sung câu ví dụ & Hán Việt cho ${filledCount} từ vựng! 🎉`, 'success');
            } else {
                showToast('Không thể lưu cập nhật vào cơ sở dữ liệu.', 'error');
            }
        } else if (filledCount === 0) {
            showToast('Không thể tra cứu thêm thông tin cho các từ vựng này.', 'warning');
        }

        setIsAiFillingSino(false);
    };

    const handleAutoFillBlanksWithAi = async () => {
        if (!isAdmin || isAiFillingBlanks) return;

        const blankItemsWithIndex = [];
        vocab.forEach((v, idx) => {
            if (hasBlankInExample(v)) {
                blankItemsWithIndex.push({ item: v, index: idx });
            }
        });

        if (blankItemsWithIndex.length === 0) {
            showToast('Tất cả câu ví dụ trong bài đều đã có đầy đủ từ vựng! 🎉', 'info');
            return;
        }

        const confirmMsg = `Tìm thấy ${blankItemsWithIndex.length} từ vựng có câu ví dụ chứa chỗ trống (______). Bạn có muốn dùng AI để tự động lắp từ vựng vào và chia đúng thể ngữ pháp không?`;
        if (!(await showConfirm(confirmMsg, { type: 'info', confirmText: 'Bắt đầu điền từ bằng AI' }))) {
            return;
        }

        setIsAiFillingBlanks(true);
        showToast(`Đang dùng AI điền từ vào câu ví dụ cho ${blankItemsWithIndex.length} từ vựng...`, 'info', 6000);

        const updatedVocab = (currentLesson?.vocab || vocab).map(v => ({ ...v }));
        let filledCount = 0;

        const BATCH_SIZE = 6;
        for (let b = 0; b < blankItemsWithIndex.length; b += BATCH_SIZE) {
            const batch = blankItemsWithIndex.slice(b, b + BATCH_SIZE);
            try {
                const aiResults = await aiFillExampleBlanks(batch.map(bItem => bItem.item));
                if (Array.isArray(aiResults)) {
                    aiResults.forEach(res => {
                        const localItemObj = batch[res.index];
                        if (localItemObj && res.example) {
                            const target = updatedVocab[localItemObj.index];
                            if (target) {
                                target.example = res.example;
                                target.exampleSentence = res.example;
                                if (res.exampleMeaning) {
                                    target.exampleMeaning = res.exampleMeaning;
                                    target.exampleTranslation = res.exampleMeaning;
                                }
                                filledCount++;
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn('Batch fill blanks error:', e);
            }
        }

        if (filledCount > 0 && handleBatchSaveLessonVocab) {
            const success = await handleBatchSaveLessonVocab(updatedVocab);
            if (success) {
                showToast(`Thành công! Đã dùng AI điền từ & chia thể cho ${filledCount} câu ví dụ! 🎉`, 'success');
            } else {
                showToast('Không thể lưu cập nhật vào cơ sở dữ liệu.', 'error');
            }
        } else if (filledCount === 0) {
            showToast('Không thể hoàn tất điền từ cho các câu ví dụ này.', 'warning');
        }

        setIsAiFillingBlanks(false);
    };

    const handleFillBlankSingle = async () => {
        if (!editingVocabData || isAiLoadingSingle) return;
        setIsAiLoadingSingle(true);
        try {
            const res = await aiFillExampleBlanks([editingVocabData]);
            if (res && res[0] && res[0].example) {
                setEditingVocabData(prev => ({
                    ...prev,
                    example: res[0].example,
                    exampleSentence: res[0].example,
                    exampleMeaning: res[0].exampleMeaning || prev.exampleMeaning,
                    exampleTranslation: res[0].exampleMeaning || prev.exampleTranslation
                }));
                showToast('Đã dùng AI lắp từ vào chỗ trống và chia đúng thể! 🎉', 'success');
            }
        } catch (e) {
            showToast('Lỗi AI: ' + (e?.message || e), 'error');
        } finally {
            setIsAiLoadingSingle(false);
        }
    };

    const handleAiFillSingle = async () => {
        if (!editingVocabData || !onGeminiAssist || isAiLoadingSingle) return;
        const word = editingVocabData.word || editingVocabData.front || '';
        const displayWord = word.split('（')[0].split('(')[0].trim();
        if (!displayWord) return;

        setIsAiLoadingSingle(true);
        try {
            const aiRes = await onGeminiAssist(
                displayWord, 
                editingVocabData.pos || '', 
                editingVocabData.level || currentBook?.name || '', 
                editingVocabData.meaning || editingVocabData.back || '', 
                false
            );
            if (aiRes) {
                setEditingVocabData(prev => ({
                    ...prev,
                    word: prev.word || aiRes.word || aiRes.front || displayWord,
                    reading: prev.reading || aiRes.reading || '',
                    meaning: prev.meaning || aiRes.meaning || aiRes.back || '',
                    sinoVietnamese: prev.sinoVietnamese || aiRes.sinoVietnamese || getSinoVietnamese(displayWord) || '',
                    sinoViet: prev.sinoViet || aiRes.sinoVietnamese || getSinoVietnamese(displayWord) || '',
                    pos: prev.pos || aiRes.pos || '',
                    level: prev.level || aiRes.level || '',
                    accent: prev.accent !== undefined ? prev.accent : aiRes.accent,
                    example: prev.example || aiRes.example || '',
                    exampleMeaning: prev.exampleMeaning || aiRes.exampleMeaning || '',
                    exampleSentence: prev.example || aiRes.example || '',
                    exampleTranslation: prev.exampleMeaning || aiRes.exampleMeaning || '',
                    synonym: prev.synonym || aiRes.synonym || '',
                    nuance: prev.nuance || aiRes.nuance || ''
                }));
                showToast('AI đã tạo và điền câu ví dụ cùng các thông tin còn thiếu! 🎉', 'success');
            }
        } catch (e) {
            showToast('Lỗi AI: ' + (e?.message || e), 'error');
        } finally {
            setIsAiLoadingSingle(false);
        }
    };

    const displayedVocab = vocab
        .map((v, i) => ({ ...v, originalIndex: i }))
        .filter(item => {
            if (isAdmin && filterMissingInfo) {
                if (!isCardIncomplete(item)) return false;
            }
            if (isAdmin && filterBlankExamples) {
                if (!hasBlankInExample(item)) return false;
            }
            if (lessonSearchQuery.trim()) {
                const q = lessonSearchQuery.trim().toLowerCase();
                const word = (item.word || item.front || '').toLowerCase();
                const reading = (item.reading || '').toLowerCase();
                const meaning = (item.meaning || item.back || '').toLowerCase();
                const sino = (item.sinoVietnamese || item.sinoViet || '').toLowerCase();
                const synonym = (item.synonym || '').toLowerCase();
                if (!word.includes(q) && !reading.includes(q) && !meaning.includes(q) && !sino.includes(q) && !synonym.includes(q)) {
                    return false;
                }
            }
            return true;
        });

    return (
        <div className="flex gap-6">
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white tracking-tight">{currentLesson?.name}</h1>
                        <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-sky-300 dark:border-sky-800/80 rounded-full px-3.5 py-1 text-xs font-black shadow-2xs">
                            {vocab.length} từ vựng
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isAdmin && (
                            <button onClick={() => { resetForm(); setShowJsonImport(true); }}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs select-none">
                                <Upload className="w-4 h-4 stroke-[2.5]" /> Import JSON
                            </button>
                        )}
                    </div>
                </div>

                {/* STUDY SET CONTROL PANEL */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
                    {linkedStudySet ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Đang liên kết học phần</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-sky-500 shrink-0" />
                                    {linkedStudySet.name}
                                </h3>
                                {linkedStudySet.description && (
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 line-clamp-1">{linkedStudySet.description}</p>
                                )}
                                {linkedStudySet.parentId && (
                                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                        <span className="font-bold">Thư mục cha:</span>
                                        <span className="font-black text-slate-600 dark:text-slate-300">
                                            {parentFolders.find(pf => pf.id === linkedStudySet.parentId)?.name || 'Thư mục'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {exampleUpdateStatus && exampleUpdateStatus.needsUpdate && (
                                    <button
                                        onClick={handleUpdateLessonExamples}
                                        disabled={isUpdatingExamples}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-amber-300 dark:border-amber-800 disabled:opacity-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                                        title={`Có ${exampleUpdateStatus.count} từ vựng đã được bổ sung câu ví dụ mới trong bài học. Nhấn để cập nhật vào học phần.`}
                                    >
                                        <Sparkles className={`w-4 h-4 ${isUpdatingExamples ? 'animate-spin' : ''}`} />
                                        <span>{isUpdatingExamples ? 'Đang cập nhật ví dụ...' : `Cập nhật ví dụ (${exampleUpdateStatus.count} từ)`}</span>
                                    </button>
                                )}
                                {syncStatus && !syncStatus.isSynced && (
                                    <button
                                        onClick={handleSyncVocabWithStudySet}
                                        disabled={creationLoading}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer select-none"
                                        title={`Có ${syncStatus.missingCount} từ vựng mới trong sách chưa được thêm vào học phần. Click để đồng bộ.`}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${creationLoading ? 'animate-spin' : ''}`} />
                                        Đồng bộ ({syncStatus.missingCount} từ mới)
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/vocab/set/${linkedStudySet.id}`)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer select-none"
                                >
                                    <span>Học ngay</span>
                                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                                </button>
                                <div className="relative group">
                                    <button className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border-2 border-slate-200 dark:border-slate-700 cursor-pointer">
                                        <Wrench className="w-4 h-4" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-slate-200 dark:border-slate-700 py-1.5 hidden group-hover:block z-20">
                                        <button
                                            onClick={handleUnlinkStudySet}
                                            className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <X className="w-4 h-4 text-slate-400" /> Hủy liên kết bài học
                                        </button>
                                        <button
                                            onClick={handleDeleteStudySet}
                                            className="w-full text-left px-3.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4 text-rose-400" /> Xóa học phần
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <h3 className="text-sm sm:text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                                    <Folder className="w-4 h-4 text-amber-500 shrink-0" /> Chưa liên kết học phần
                                </h3>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    Tạo mới hoặc liên kết bài học này để lưu & ôn tập.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                {exampleUpdateStatus && exampleUpdateStatus.needsUpdate && (
                                    <button
                                        onClick={handleUpdateLessonExamples}
                                        disabled={isUpdatingExamples}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-amber-300 dark:border-amber-800 disabled:opacity-50 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                                        title={`Có ${exampleUpdateStatus.count} từ vựng bạn đã lưu trước đây có câu ví dụ mới. Nhấn để cập nhật.`}
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${isUpdatingExamples ? 'animate-spin' : ''}`} />
                                        <span>{isUpdatingExamples ? 'Đang cập nhật...' : `Cập nhật ví dụ (${exampleUpdateStatus.count})`}</span>
                                    </button>
                                )}
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
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer select-none"
                                >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Tạo học phần mới
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedExistingStudySetId('');
                                        setSelectedVocabIndices(new Set(vocab.map((_, i) => i)));
                                        setShowLinkStudySetModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none"
                                >
                                    <Layers className="w-3.5 h-3.5 stroke-[2.5]" /> Liên kết học phần
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
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Tiến độ bài học</span>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                                        {learnedWords}/{totalWords} từ ({progressPct}%)
                                    </span>
                                </div>
                                <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700 p-0.5 overflow-hidden shadow-inner">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden shadow-xs"
                                        style={{
                                            width: `${progressPct}%`,
                                            background: progressPct === 100
                                                ? 'linear-gradient(90deg, #10B981, #059669)'
                                                : 'linear-gradient(90deg, #0EA5E9, #0284C7)',
                                        }}
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-full pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                <button
                                    onClick={() => setBlurMode(prev => prev === 'vn' ? 'jp' : 'vn')}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-2 border-b-4 cursor-pointer select-none shadow-xs ${blurMode === 'vn'
                                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                        }`}
                                    title={blurMode === 'vn' ? 'Đang ẩn: Tiếng Việt' : 'Đang ẩn: Kanji + Cách đọc'}
                                >
                                    <Languages className="w-4 h-4 stroke-[2.5]" />
                                    {blurMode === 'vn' ? 'Ẩn: Tiếng Việt' : 'Ẩn: Kanji + Đọc'}
                                </button>
                                <button
                                    onClick={handleReBlurAll}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer select-none shadow-xs"
                                    title="Làm mờ lại tất cả (giữ tiến độ)"
                                >
                                    <EyeOff className="w-4 h-4 stroke-[2.5]" /> Mờ lại
                                </button>
                                {persistedRevealed.size > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (await showConfirm('Xóa toàn bộ tiến độ bài này?', { type: 'danger', confirmText: 'Xóa' })) handleResetProgress();
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer select-none shadow-xs"
                                        title="Xóa tiến độ và bắt đầu lại"
                                    >
                                        <RotateCcw className="w-4 h-4 stroke-[2.5]" /> Reset tiến độ
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => setFilterMissingInfo(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-2 border-b-4 cursor-pointer select-none shadow-xs ${
                                            filterMissingInfo
                                                ? 'bg-amber-500 text-white border-amber-700'
                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                        }`}
                                        title="Lọc danh sách từ vựng còn thiếu câu ví dụ hoặc âm Hán Việt (Chỉ Admin nhìn thấy)"
                                    >
                                        <AlertTriangle className={`w-4 h-4 stroke-[2.5] ${filterMissingInfo ? 'text-white' : 'text-amber-500'}`} />
                                        Thiếu thông tin ({incompleteCount})
                                    </button>
                                )}
                                {isAdmin && incompleteCount > 0 && (
                                    <button
                                        onClick={handleAutoFillMissingWithAi}
                                        disabled={isAiFillingSino}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-b-4 border-amber-700 bg-amber-500 hover:bg-amber-400 text-white shadow-xs disabled:opacity-50 cursor-pointer select-none"
                                        title="Dùng AI tự động tạo câu ví dụ và điền âm Hán Việt cho tất cả từ vựng bị thiếu trong bài"
                                    >
                                        {isAiFillingSino ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                        AI Bổ sung thiếu ({incompleteCount})
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => setFilterBlankExamples(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-2 border-b-4 cursor-pointer select-none shadow-xs ${
                                            filterBlankExamples
                                                ? 'bg-emerald-600 text-white border-emerald-800'
                                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                        }`}
                                        title="Lọc danh sách từ vựng có câu ví dụ chứa chỗ trống (______)"
                                    >
                                        <Sparkles className={`w-4 h-4 stroke-[2.5] ${filterBlankExamples ? 'text-white' : 'text-emerald-500'}`} />
                                        Ví dụ có chỗ trống ({blankExamplesCount})
                                    </button>
                                )}
                                {isAdmin && blankExamplesCount > 0 && (
                                    <button
                                        onClick={handleAutoFillBlanksWithAi}
                                        disabled={isAiFillingBlanks}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-b-4 border-emerald-800 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs disabled:opacity-50 cursor-pointer select-none"
                                        title="Dùng AI tự động điền từ vựng vào chỗ trống và chia đúng thể ngữ pháp cho tất cả câu ví dụ trong bài"
                                    >
                                        {isAiFillingBlanks ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                        AI Điền từ vào ví dụ ({blankExamplesCount})
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={handleSyncCDN}
                                        disabled={isSyncingCDN}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:translate-y-0.5 active:border-b-2 border-b-4 border-emerald-700 bg-emerald-500 hover:bg-emerald-400 text-white shadow-xs disabled:opacity-50 cursor-pointer select-none"
                                        title="Đẩy toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN"
                                    >
                                        {isSyncingCDN ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CloudUpload className="w-4 h-4 stroke-[2.5]" />
                                        )}
                                        Đồng bộ CDN
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Thanh tìm kiếm từ vựng trong bài học */}
                {vocab.length > 0 && (
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 px-3.5 py-1.5 flex items-center shadow-xs transition-colors focus-within:border-sky-500">
                        <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                        <input
                            type="text"
                            value={lessonSearchQuery}
                            onChange={e => setLessonSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm từ vựng trong bài học để sửa nhanh..."
                            className="w-full py-2 bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                        />
                        {lessonSearchQuery && (
                            <button
                                onClick={() => setLessonSearchQuery('')}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {displayedVocab.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                        <FileText className="w-14 h-14 mx-auto mb-3.5 text-slate-300 dark:text-slate-600" />
                        {isAdmin && filterMissingInfo ? (
                            <div>
                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">Tất cả từ vựng trong bài này đã đầy đủ câu ví dụ và âm Hán Việt! 🎉</p>
                                <p className="text-xs font-bold text-slate-400 mt-1.5">Không còn từ vựng nào bị thiếu thông tin.</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-base font-black text-slate-700 dark:text-slate-200">Chưa có từ vựng</p>
                                {isAdmin && <p className="text-xs font-bold text-slate-400 mt-1">Import JSON để thêm từ vựng cho bài học này</p>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        {displayedVocab.map((item) => {
                            const v = item;
                            const i = item.originalIndex;
                            const word = v.word || v.front || '';
                            const displayWord = word.split('（')[0].split('(')[0].trim();
                            const isRevealed = revealedCards.has(i);

                            return (
                                <div
                                    key={i}
                                    ref={editingVocabIndex === i ? editingCardRef : null}
                                    className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 transition-all shadow-xs overflow-hidden select-none group"
                                >
                                    {editingVocabIndex === i && editingVocabData ? (
                                        /* EDIT MODE */
                                        <div className="p-5 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3.5">
                                                <h4 className="text-sm font-black text-slate-850 dark:text-white flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black text-xs">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </span>
                                                    Chỉnh sửa từ #{i + 1}
                                                </h4>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {onGeminiAssist && (
                                                        <button
                                                            type="button"
                                                            onClick={handleAiFillSingle}
                                                            disabled={isAiLoadingSingle}
                                                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 border-b-3 border-amber-700 active:translate-y-0.5 active:border-b-0 shadow-xs"
                                                            title="Dùng AI tự động điền các trường còn thiếu (Ví dụ, Hán Việt, Nghĩa, v.v.)"
                                                        >
                                                            {isAiLoadingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                            AI Điền thông tin
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleSaveVocabEdit}
                                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-b-3 border-emerald-700 active:translate-y-0.5 active:border-b-0 shadow-xs"
                                                    >
                                                        <Save className="w-3.5 h-3.5" /> Lưu
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingVocabIndex(null); setEditingVocabData(null); }}
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-b-3 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-0 shadow-2xs"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Hủy
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Từ vựng</label>
                                                    <input
                                                        value={editingVocabData.word || editingVocabData.front || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, word: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Cách đọc (reading)</label>
                                                    <input
                                                        value={editingVocabData.reading || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, reading: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                        placeholder="かんじ"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Nghĩa</label>
                                                    <input
                                                        value={editingVocabData.meaning || editingVocabData.back || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, meaning: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Hán Việt</label>
                                                    <input
                                                        value={editingVocabData.sinoVietnamese || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Từ loại</label>
                                                        <input
                                                            value={editingVocabData.pos || ''}
                                                            onChange={e => setEditingVocabData(prev => ({ ...prev, pos: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400"
                                                            placeholder="verb..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Cấp độ</label>
                                                        <input
                                                            value={editingVocabData.level || ''}
                                                            onChange={e => setEditingVocabData(prev => ({ ...prev, level: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400"
                                                            placeholder="N5..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Accent</label>
                                                        <input
                                                            value={editingVocabData.accent || ''}
                                                            onChange={e => setEditingVocabData(prev => ({ ...prev, accent: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Đồng nghĩa</label>
                                                    <input
                                                        value={editingVocabData.synonym || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, synonym: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Ghi chú / Sắc thái</label>
                                                    <input
                                                        value={editingVocabData.nuance || editingVocabData.note || ''}
                                                        onChange={e => setEditingVocabData(prev => ({ ...prev, nuance: e.target.value }))}
                                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 col-span-full pt-1">
                                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingVocabData.specialReading || false}
                                                            onChange={e => setEditingVocabData(prev => ({ ...prev, specialReading: e.target.checked }))}
                                                            className="w-4 h-4 rounded-lg border-2 border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Cách đọc đặc biệt (specialReading)</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Câu ví dụ</label>
                                                    {hasBlankInExample(editingVocabData) && (
                                                        <button
                                                            type="button"
                                                            onClick={handleFillBlankSingle}
                                                            disabled={isAiLoadingSingle}
                                                            className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {isAiLoadingSingle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                            Lắp từ vào chỗ trống bằng AI
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={editingVocabData.example || ''}
                                                    onChange={e => setEditingVocabData(prev => ({ ...prev, example: e.target.value }))}
                                                    rows={2}
                                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Nghĩa câu ví dụ</label>
                                                <textarea
                                                    value={editingVocabData.exampleMeaning || ''}
                                                    onChange={e => setEditingVocabData(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                                    rows={2}
                                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">URL hình ảnh (tùy chọn)</label>
                                                <input
                                                    value={editingVocabData.imageUrl || ''}
                                                    onChange={e => setEditingVocabData(prev => ({ ...prev, imageUrl: e.target.value }))}
                                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
                                                    placeholder="https://..."
                                                />
                                                {editingVocabData.imageUrl && (
                                                    <img src={editingVocabData.imageUrl} alt="preview" className="mt-2.5 max-h-24 rounded-2xl object-contain border-2 border-slate-200 dark:border-slate-700" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* VIEW MODE */
                                        <div
                                            className="flex flex-col md:flex-row cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                            onClick={() => {
                                                revealCard(i);
                                                if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                else { speakJapanese(word, null, null, null, v.reading || ''); }
                                            }}
                                        >
                                            {/* Desktop Index Column */}
                                            <div className="hidden md:flex w-14 shrink-0 bg-slate-50/60 dark:bg-slate-800/30 flex-col items-center justify-center gap-1.5 border-r-2 border-slate-100 dark:border-slate-800 p-2">
                                                <div
                                                    className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${
                                                        persistedRevealed.has(i)
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                                                            : 'bg-slate-100 dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                                    }`}
                                                    title={persistedRevealed.has(i) ? 'Đã lật thẻ' : `Từ #${i + 1}`}
                                                >
                                                    {persistedRevealed.has(i) ? '✓' : i + 1}
                                                </div>
                                                {persistedRevealed.has(i) && (
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                                        ĐÃ LẬT
                                                    </span>
                                                )}
                                            </div>

                                            {/* Mobile Header Bar (shown only on mobile) */}
                                            <div className="md:hidden flex items-center justify-between p-3 pb-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                                        #{i + 1}
                                                    </span>
                                                    {persistedRevealed.has(i) && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[10px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đã lật
                                                        </span>
                                                    )}
                                                    {v.specialReading && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-black border border-rose-200 dark:border-rose-800" title="Cách đọc đặc biệt">
                                                            Đặc biệt
                                                        </span>
                                                    )}
                                                    {isAdmin && isMissingSino(v) && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-black border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 text-amber-500" /> Thiếu Hán Việt
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mobile Actions in Header */}
                                                <div className="flex items-center gap-1">
                                                    {(v.nuance || v.note) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowNuanceIndex(showNuanceIndex === i ? null : i); }}
                                                            className={`p-1.5 transition-all cursor-pointer rounded-xl ${showNuanceIndex === i ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:text-amber-500'}`}
                                                            title="Xem sắc thái"
                                                        >
                                                            <Lightbulb className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditVocab(i); }}
                                                            className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors cursor-pointer rounded-xl"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteVocab(i); }}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer rounded-xl"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Left Column (Word, Reading, Sino, Meaning) */}
                                            <div className="w-full md:w-[28%] lg:w-[25%] p-3.5 sm:p-4 md:border-r-2 border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                                {(() => {
                                                    const blurJP = blurMode === 'jp' && !isRevealed;
                                                    const blurVN = blurMode === 'vn' && !isRevealed;
                                                    const blurClass = 'blur-[4px] opacity-40 select-none';
                                                    return (
                                                        <div className="flex items-start justify-between gap-3">
                                                            {/* Word details */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between md:justify-start gap-2">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <p className={`text-xl sm:text-2xl font-black text-slate-850 dark:text-white leading-tight tracking-wide transition-all duration-300 ${blurJP ? blurClass : ''}`}>
                                                                            {displayWord}
                                                                        </p>
                                                                        <span className="hidden md:inline-flex">
                                                                            {v.specialReading && (
                                                                                <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg font-black border border-rose-200 dark:border-rose-800" title="Cách đọc đặc biệt">
                                                                                    Đặc biệt
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                                                else { speakJapanese(word, null, null, null, v.reading || ''); }
                                                                            }}
                                                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer font-black border-2 active:translate-y-0.5 active:border-b-2 shrink-0 shadow-xs ${
                                                                                v.audioBase64
                                                                                    ? 'bg-sky-100 hover:bg-sky-200 border-sky-300 border-b-3 text-sky-600 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-400'
                                                                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 border-b-3 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                                                            }`}
                                                                            title={v.audioBase64 ? 'Phát audio bản xứ' : 'Phát TTS'}
                                                                        >
                                                                            <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                                                        </button>
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setFixAudioIndex(i); setFixAudioCustomReading(''); }}
                                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                                                title="Sửa audio"
                                                                            >
                                                                                <Wrench className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Reading */}
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
                                                                                        <span key={ci} className="relative inline-block text-xs font-bold text-slate-500 dark:text-slate-400">
                                                                                            <span className="block" style={{
                                                                                                borderTop: isHigh ? '2px solid rgba(249, 115, 22, 0.8)' : '2px solid transparent',
                                                                                                paddingTop: '1px', paddingLeft: '1px', paddingRight: '1px',
                                                                                            }}>
                                                                                                {char}
                                                                                            </span>
                                                                                            {showDrop && <span className="absolute -right-[1px] top-0 w-[2px] bg-orange-500/80" style={{ height: '100%' }}></span>}
                                                                                            {showRise && <span className="absolute -right-[1px] top-0 w-[2px] bg-orange-500/80" style={{ height: '100%' }}></span>}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return <p className={`text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 transition-all duration-300 ${blurJP ? blurClass : ''}`}>{v.reading}</p>;
                                                                })()}

                                                                {/* Sino Vietnamese */}
                                                                {(v.sinoVietnamese || v.sinoViet) && (
                                                                    <div className="mt-1">
                                                                        <span className={`inline-block px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black text-[11px] uppercase tracking-wider border border-amber-200 dark:border-amber-800/60 transition-all duration-300 ${blurVN ? blurClass : ''}`}>
                                                                            {v.sinoVietnamese || v.sinoViet}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Meaning */}
                                                                {blurVN ? (
                                                                    <div className="mt-1.5">
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-black text-[11px] border-2 border-dashed border-sky-300 dark:border-sky-800/80">
                                                                            👁️ Nhấn để xem nghĩa
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300 mt-1 leading-snug">
                                                                        {v.meaning || v.back || v.definition || ''}
                                                                    </p>
                                                                )}

                                                                {/* Synonym */}
                                                                {v.synonym && (
                                                                    <p className={`text-[11px] font-bold text-slate-400 dark:text-slate-400 mt-1 transition-all duration-300 ${blurVN ? blurClass : ''}`}>
                                                                        🔄 {v.synonym}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Mobile Image positioned right next to the Word/Meaning section */}
                                                            {v.imageUrl && (
                                                                <div className="md:hidden shrink-0 self-center sm:self-start">
                                                                    <img
                                                                        src={v.imageUrl}
                                                                        alt={word}
                                                                        className="w-20 h-20 xs:w-24 xs:h-24 rounded-2xl object-contain bg-white dark:bg-slate-900 border-2 border-b-3 border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 hover:scale-105 transition-all shadow-xs p-1"
                                                                        onClick={(e) => { e.stopPropagation(); window.open(v.imageUrl, '_blank', 'noopener,noreferrer'); }}
                                                                        title="Click để phóng to"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Right Column: Examples & Desktop Image */}
                                            <div className="flex-1 p-3.5 sm:p-4 border-t-2 md:border-t-0 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3.5 min-w-0 bg-slate-50/40 dark:bg-slate-900/40">
                                                <div className="flex-1 min-w-0 space-y-2 w-full">
                                                    {(v.example || v.exampleSentence) ? (
                                                        <div className="space-y-1.5">
                                                            {(v.example || v.exampleSentence).split('\n').map((ex, ei) => {
                                                                const blurJP = blurMode === 'jp' && !isRevealed;
                                                                const blurVN = blurMode === 'vn' && !isRevealed;
                                                                const blurClass = 'blur-[4px] opacity-40 select-none';
                                                                const exMeaning = v.exampleMeaning || v.exampleTranslation;
                                                                return (
                                                                    <div
                                                                        key={ei}
                                                                        className="relative group/ex bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-b-3 border-slate-200/90 dark:border-slate-700/80 p-2.5 sm:p-3 pr-10 transition-all hover:border-slate-300 shadow-2xs"
                                                                    >
                                                                        <p className={`text-xs sm:text-sm font-bold text-slate-850 dark:text-slate-100 leading-relaxed transition-all duration-300 break-words ${blurJP ? blurClass : ''}`}>
                                                                            <FuriganaText text={ex.trim()} />
                                                                        </p>
                                                                        {exMeaning && (() => {
                                                                            const meanings = exMeaning.split('\n');
                                                                            return meanings[ei] ? (
                                                                                <p className={`text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 italic transition-all duration-300 break-words ${blurVN ? blurClass : ''}`}>
                                                                                    {meanings[ei].trim()}
                                                                                </p>
                                                                            ) : null;
                                                                        })()}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                speakExampleSentence(ex.trim());
                                                                            }}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                                            title="Nghe câu ví dụ"
                                                                        >
                                                                            <Volume2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center sm:text-left">
                                                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">Chưa có câu ví dụ</p>
                                                        </div>
                                                    )}

                                                    {(v.nuance || v.note) && showNuanceIndex === i && (
                                                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs font-bold text-amber-800 dark:text-amber-300 animate-fadeIn flex items-center gap-2">
                                                            <span className="text-sm">💡</span>
                                                            <span>{v.nuance || v.note}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Desktop Image (hidden on mobile, shown on md screens) */}
                                                {v.imageUrl && (
                                                    <div className="hidden md:flex shrink-0 self-center">
                                                        <img
                                                            src={v.imageUrl}
                                                            alt={word}
                                                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white dark:bg-slate-900 p-1 border-2 border-b-3 border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 hover:scale-105 transition-all shadow-2xs"
                                                            onClick={(e) => { e.stopPropagation(); window.open(v.imageUrl, '_blank', 'noopener,noreferrer'); }}
                                                            title="Click để phóng to"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Desktop Action buttons */}
                                            <div className="hidden md:flex shrink-0 flex-col items-center justify-center gap-1 px-2 border-l-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                {(v.nuance || v.note) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowNuanceIndex(showNuanceIndex === i ? null : i); }}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                                            showNuanceIndex === i
                                                                ? 'bg-amber-100 text-amber-600 border border-amber-300 shadow-2xs'
                                                                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                                                        }`}
                                                        title="Xem sắc thái"
                                                    >
                                                        <Lightbulb className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditVocab(i); }}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteVocab(i); }}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                        title="Xóa"
                                                    >
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

            {/* Table of Contents - right sidebar */}
            {showTOC && (
                <BookTableOfContents
                    chapters={currentBook?.chapters || []}
                    currentLessonId={currentLesson?.id}
                    groupId={groupId}
                    bookId={bookId}
                    getLessonProgressInfo={getLessonProgressInfo}
                    isAdmin={isAdmin}
                    profile={profile}
                    setLockedPkgName={setLockedPkgName}
                    setShowPremiumModal={setShowPremiumModal}
                    navigateTo={navigateTo}
                />
            )}

            {/* Fix Audio Modal */}
            {fixAudioIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn" onClick={() => setFixAudioIndex(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b-2 border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs border border-amber-300">
                                    <Wrench className="w-4 h-4" />
                                </span>
                                Sửa audio cho từ vựng #{fixAudioIndex + 1}
                            </h3>
                            <button
                                onClick={() => setFixAudioIndex(null)}
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer font-black"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Tự động đọc theo cách đọc trong ngoặc đơn <code className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-black text-sky-600 border border-slate-200 dark:border-slate-700">（...）</code> hoặc trường reading của từ vựng này.
                                </p>
                                <button
                                    onClick={() => handleFixAudio(fixAudioIndex)}
                                    disabled={fixAudioLoading}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:translate-y-0.5 active:border-b-2 border-b-4 border-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {fixAudioLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                    Tạo audio tự động theo cách đọc
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-0.5 bg-slate-100 dark:bg-slate-800"></div>
                                <span className="text-[11px] text-slate-400 font-black uppercase tracking-wider">HOẶC</span>
                                <div className="flex-1 h-0.5 bg-slate-100 dark:bg-slate-800"></div>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0 border border-sky-300">
                                        <Mic className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                    </div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nhập cách đọc thủ công</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={fixAudioCustomReading}
                                        onChange={e => setFixAudioCustomReading(e.target.value)}
                                        placeholder="Nhập hiragana/katakana... (VD: たべる)"
                                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-400 focus:outline-none transition-colors"
                                        disabled={fixAudioLoading}
                                        onKeyDown={e => { if (e.key === 'Enter' && fixAudioCustomReading.trim()) handleFixAudio(fixAudioIndex, fixAudioCustomReading); }}
                                    />
                                    <button
                                        onClick={() => handleFixAudio(fixAudioIndex, fixAudioCustomReading)}
                                        disabled={fixAudioLoading || !fixAudioCustomReading.trim()}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                            fixAudioLoading || !fixAudioCustomReading.trim()
                                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed border-2 border-slate-200 dark:border-slate-700'
                                                : 'bg-sky-500 hover:bg-sky-600 text-white active:translate-y-0.5 active:border-b-2 border-b-4 border-sky-700 shadow-xs'
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
