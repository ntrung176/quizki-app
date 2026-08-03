import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, setDoc, writeBatch, collectionGroup } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { aiRecreateVocabulary } from '../utils/aiProvider';
import { showConfirm, showToast } from '../utils/toast';

export const useAdminVocabulary = ({ activeSection, setNotification }) => {
    const [dictResults, setDictResults] = useState([]);
    const [isLoadingDict, setIsLoadingDict] = useState(false);
    const [dictLevelFilter, setDictLevelFilter] = useState('all');
    const [dictPosFilter, setDictPosFilter] = useState('all');
    const [dictErrorReportedFilter, setDictErrorReportedFilter] = useState('all');
    const [dictKanjiFilter, setDictKanjiFilter] = useState('all');
    const [dictSearchQuery, setDictSearchQuery] = useState('');
    const [visibleLimit, setVisibleLimit] = useState(50);
    const [dictLangTab, setDictLangTab] = useState('ja');
    const [jaCount, setJaCount] = useState(0);
    const [enCount, setEnCount] = useState(0);
    const [isClearingDict, setIsClearingDict] = useState(false);

    const [isBulkRecreating, setIsBulkRecreating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const bulkCancelRef = useRef(false);

    const [editingDictItem, setEditingDictItem] = useState(null);
    const [deletingDictItem, setDeletingDictItem] = useState(null);
    const [recreatingVocabId, setRecreatingVocabId] = useState(null);
    const [originalAudioBase64, setOriginalAudioBase64] = useState(null);

    // Fetch shared vocabulary
    useEffect(() => {
        if (activeSection === 'vocabulary') {
            setIsLoadingDict(true);
            setDictResults([]);
            const targetCollection = dictLangTab === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary';
            const q = query(collection(db, targetCollection));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const results = [];
                snapshot.forEach((doc) => {
                    results.push({ id: doc.id, ...doc.data() });
                });
                setDictResults(results);
                if (dictLangTab === 'en') setEnCount(results.length);
                else setJaCount(results.length);
                setIsLoadingDict(false);
            }, (error) => {
                console.error("Error fetching shared vocabulary:", error);
                setIsLoadingDict(false);
            });

            const qJa = query(collection(db, 'sharedVocabulary'));
            const unsubJa = onSnapshot(qJa, (snap) => setJaCount(snap.size), () => {});
            const qEn = query(collection(db, 'sharedVocabulary_en'));
            const unsubEn = onSnapshot(qEn, (snap) => setEnCount(snap.size), () => {});

            return () => {
                unsubscribe();
                unsubJa();
                unsubEn();
            };
        }
    }, [activeSection, dictLangTab]);

    const filteredDictResults = useMemo(() => {
        const hasKanji = (text) => {
            if (!text) return false;
            return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
        };

        return dictResults.filter(item => {
            const matchLevel = dictLevelFilter === 'all' || item.level === dictLevelFilter;
            const matchPos = dictPosFilter === 'all' || item.pos === dictPosFilter;
            const matchError = dictErrorReportedFilter === 'all' ||
                (dictErrorReportedFilter === 'error' && (item.reportedError === true || item.reportedAudioError === true)) ||
                (dictErrorReportedFilter === 'normal' && !item.reportedError && !item.reportedAudioError);

            let matchKanji = true;
            if (dictKanjiFilter !== 'all') {
                const hasK = hasKanji(item.front);
                const hasL = (item.sinoVietnamese && item.sinoVietnamese !== item.sinoVietnamese.toUpperCase()) ||
                    (item.synonymSinoVietnamese && item.synonymSinoVietnamese !== item.synonymSinoVietnamese.toUpperCase());

                if (dictKanjiFilter === 'no_kanji') {
                    matchKanji = !hasK;
                } else if (dictKanjiFilter === 'lowercase_sino') {
                    matchKanji = hasK && hasL;
                } else if (dictKanjiFilter === 'no_kanji_or_lowercase_sino') {
                    matchKanji = !hasK || hasL;
                }
            }

            const matchSearch = !dictSearchQuery.trim() ||
                (item.front || '').toLowerCase().includes(dictSearchQuery.toLowerCase()) ||
                (item.back || '').toLowerCase().includes(dictSearchQuery.toLowerCase()) ||
                (item.sinoVietnamese || '').toLowerCase().includes(dictSearchQuery.toLowerCase());
            return matchLevel && matchPos && matchError && matchKanji && matchSearch;
        });
    }, [dictResults, dictLevelFilter, dictPosFilter, dictErrorReportedFilter, dictKanjiFilter, dictSearchQuery]);

    const handleSaveDictItem = async (e) => {
        if (e) e.preventDefault();
        if (!editingDictItem) return;
        try {
            const docId = editingDictItem.id;
            const saveData = {
                front: editingDictItem.front.trim(),
                back: (editingDictItem.back || editingDictItem.meaning || '').trim(),
                sinoVietnamese: (editingDictItem.sinoVietnamese || '').trim(),
                pos: editingDictItem.pos || '',
                level: editingDictItem.level || '',
                synonym: (editingDictItem.synonym || '').trim(),
                nuance: (editingDictItem.nuance || '').trim(),
                example: (editingDictItem.example || '').trim(),
                exampleMeaning: (editingDictItem.exampleMeaning || '').trim(),
                synonymSinoVietnamese: (editingDictItem.synonymSinoVietnamese || '').trim(),
                audioBase64: editingDictItem.audioBase64 || null,
                reportedError: false,
                reportedAudioError: false,
                updatedAt: Date.now()
            };
            await setDoc(doc(db, dictLangTab === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary', docId), saveData, { merge: true });

            setEditingDictItem(null);
            setNotification({ type: 'success', message: 'Đã lưu từ vựng kho chung thành công!' });

            setTimeout(async () => {
                try {
                    const normalizedWord = saveData.front.split('（')[0].split('(')[0].trim().toLowerCase();
                    const q = query(collectionGroup(db, 'vocabulary'));
                    const snap = await getDocs(q);

                    const matchedRefs = [];
                    snap.forEach((vocabDoc) => {
                        if (vocabDoc.ref.path.includes(`artifacts/${appId}/`)) {
                            const cardData = vocabDoc.data();
                            const cardFrontNormalized = (cardData.front || '').split('（')[0].split('(')[0].trim().toLowerCase();
                            if (cardFrontNormalized === normalizedWord) {
                                matchedRefs.push(vocabDoc.ref);
                            }
                        }
                    });

                    if (matchedRefs.length > 0) {
                        let currentBatch = writeBatch(db);
                        let opCount = 0;
                        for (const docRef of matchedRefs) {
                            if (opCount >= 500) {
                                await currentBatch.commit();
                                currentBatch = writeBatch(db);
                                opCount = 0;
                            }
                            currentBatch.update(docRef, {
                                audioBase64: saveData.audioBase64 || null
                            });
                            opCount++;
                        }
                        if (opCount > 0) {
                            await currentBatch.commit();
                        }
                        setNotification({ type: 'success', message: `Đã cập nhật từ vựng và đồng bộ âm thanh đến ${matchedRefs.length} thẻ học phần!` });
                    }
                } catch (syncErr) {
                    console.error("Failed to sync audio to user cards in background:", syncErr);
                    setNotification({ type: 'warning', message: 'Đã lưu kho chung, nhưng đồng bộ nền gặp lỗi phân quyền hoặc kết nối.' });
                }
            }, 50);
        } catch (err) {
            console.error("Error saving dict item:", err);
            setNotification({ type: 'error', message: 'Lỗi khi cập nhật từ vựng: ' + err.message });
        }
    };

    const handleOpenEditModal = (item) => {
        setEditingDictItem(item);
        setOriginalAudioBase64(item.audioBase64 || null);
    };

    const handleDeleteDictItem = async () => {
        if (!deletingDictItem) return;
        try {
            await deleteDoc(doc(db, dictLangTab === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary', deletingDictItem));
            setDeletingDictItem(null);
            setNotification({ type: 'success', message: 'Đã xóa từ vựng khỏi kho chung!' });
        } catch (err) {
            console.error("Error deleting dict item:", err);
            setNotification({ type: 'error', message: 'Lỗi khi xóa từ vựng: ' + err.message });
        }
    };

    const handleAiRecreateVocabulary = async (item) => {
        if (!item) return;
        setRecreatingVocabId(item.id);
        try {
            const recreatedData = await aiRecreateVocabulary(item);
            if (recreatedData) {
                const docRef = doc(db, dictLangTab === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary', item.id);
                await setDoc(docRef, {
                    ...recreatedData,
                    reportedError: false,
                    updatedAt: Date.now()
                }, { merge: true });
                setNotification({ type: 'success', message: `Đã dùng AI tạo lại từ vựng "${item.id}" thành công!` });
            } else {
                setNotification({ type: 'error', message: 'Không nhận được dữ liệu hợp lệ từ AI.' });
            }
        } catch (err) {
            console.error("Error in handleAiRecreateVocabulary:", err);
            setNotification({ type: 'error', message: 'Lỗi AI tạo lại từ vựng: ' + err.message });
        } finally {
            setRecreatingVocabId(null);
        }
    };

    const handleBulkAiRecreate = async () => {
        const targets = filteredDictResults;
        if (targets.length === 0) {
            setNotification({ type: 'info', message: 'Không có từ vựng nào khớp với bộ lọc hiện tại để tạo hàng loạt.' });
            return;
        }

        const confirmMessage = `Bạn có chắc muốn dùng AI tạo lại ${targets.length} từ vựng đang lọc? Quá trình này sẽ gọi API và tiêu hao credit.`;
        if (!await window.showConfirm(confirmMessage)) return;

        setIsBulkRecreating(true);
        bulkCancelRef.current = false;
        setBulkProgress({ current: 0, total: targets.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < targets.length; i++) {
            if (bulkCancelRef.current) {
                setNotification({ type: 'info', message: `Đã dừng tạo hàng loạt. Thành công ${successCount}, Thất bại ${failCount}.` });
                break;
            }

            const item = targets[i];
            setBulkProgress({ current: i + 1, total: targets.length });
            try {
                const recreatedData = await aiRecreateVocabulary(item);
                if (recreatedData) {
                    const docRef = doc(db, dictLangTab === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary', item.id);
                    await setDoc(docRef, {
                        ...recreatedData,
                        reportedError: false,
                        updatedAt: Date.now()
                    }, { merge: true });
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Error recreating vocab ${item.id} in bulk:`, err);
                failCount++;
            }
        }

        setIsBulkRecreating(false);
        if (!bulkCancelRef.current) {
            setNotification({
                type: 'success',
                message: `Hoàn thành tạo hàng loạt: Thành công ${successCount}, Thất bại ${failCount}`
            });
        }
    };

    const handleCancelBulkRecreate = () => {
        bulkCancelRef.current = true;
    };

    const handleClearSharedVocabCollection = async (langTarget = dictLangTab) => {
        const isEng = langTarget === 'en';
        const collectionName = isEng ? 'sharedVocabulary_en' : 'sharedVocabulary';
        const langLabel = isEng ? 'Tiếng Anh (sharedVocabulary_en)' : 'Tiếng Nhật (sharedVocabulary)';

        const confirmed = await showConfirm(
            `⚠️ BẠN CÓ CHẮC CHẮN NGHĨ KỸ CHƯA?\n\nHành động này sẽ XÓA SẠCH TOÀN BỘ từ vựng trong kho ${langLabel}.\nDữ liệu đã xóa KHÔNG THỂ KHÔI PHỤC!`,
            { type: 'danger', confirmText: `Xóa Sạch Kho ${isEng ? 'Tiếng Anh' : 'Tiếng Nhật'}`, cancelText: 'Hủy bỏ' }
        );

        if (!confirmed) return;

        setIsClearingDict(true);
        try {
            const qSnap = await getDocs(collection(db, collectionName));
            const totalDocs = qSnap.docs.length;
            if (totalDocs === 0) {
                showToast(`Kho từ vựng ${langLabel} hiện tại đã trống.`, 'info');
                setIsClearingDict(false);
                return;
            }

            const docs = qSnap.docs;
            const chunkSize = 400;
            let deletedCount = 0;

            for (let i = 0; i < docs.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = docs.slice(i, i + chunkSize);
                chunk.forEach(docSnap => batch.delete(docSnap.ref));
                await batch.commit();
                deletedCount += chunk.length;
            }

            showToast(`Đã xóa thành công toàn bộ ${deletedCount} từ vựng trong kho ${langLabel}!`, 'success');
        } catch (e) {
            console.error('Lỗi khi xóa kho từ vựng:', e);
            showToast('Lỗi khi xóa kho từ vựng: ' + (e.message || e), 'error');
        } finally {
            setIsClearingDict(false);
        }
    };

    return {
        dictResults,
        isLoadingDict,
        dictLevelFilter,
        setDictLevelFilter,
        dictPosFilter,
        setDictPosFilter,
        dictErrorReportedFilter,
        setDictErrorReportedFilter,
        dictKanjiFilter,
        setDictKanjiFilter,
        dictSearchQuery,
        setDictSearchQuery,
        visibleLimit,
        setVisibleLimit,
        dictLangTab,
        setDictLangTab,
        jaCount,
        enCount,
        isClearingDict,
        isBulkRecreating,
        bulkProgress,
        editingDictItem,
        setEditingDictItem,
        deletingDictItem,
        setDeletingDictItem,
        recreatingVocabId,
        originalAudioBase64,
        filteredDictResults,
        handleSaveDictItem,
        handleOpenEditModal,
        handleDeleteDictItem,
        handleAiRecreateVocabulary,
        handleBulkAiRecreate,
        handleCancelBulkRecreate,
        handleClearSharedVocabCollection
    };
};
