import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { showToast } from '../utils/toast';
import { cleanFirestoreData } from '../utils/firestoreHelpers';
import { isVocabCardDue, calculateAnkiSRS } from '../utils/srs';
import { aiAssistVocab, extractVocabFromImage } from '../utils/aiProvider';
import { POINTS } from '../utils/scoring';

export const useAppVocab = ({ authReady, userId, dailyActivityLogs }) => {
    const [allCards, setAllCards] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_vocab_list');
            return cached ? JSON.parse(cached) : [];
        } catch (_) {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(false);

    const vocabCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/vocabulary`;
    }, [userId]);

    // Firestore listener for User Vocabulary (allCards)
    useEffect(() => {
        if (!authReady || !vocabCollectionPath) {
            return;
        }

        const q = query(collection(db, vocabCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCards = [];
            snapshot.forEach((docSnap) => {
                fetchedCards.push({ ...docSnap.data(), id: docSnap.id });
            });
            setAllCards(fetchedCards);
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi tải danh sách từ vựng:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [authReady, vocabCollectionPath]);

    const dueCounts = useMemo(() => {
        const now = Date.now();
        let back = 0, synonym = 0, example = 0, dictation = 0;
        allCards.forEach(c => {
            if (isVocabCardDue(c, 'back', now)) back++;
            if (isVocabCardDue(c, 'synonym', now)) synonym++;
            if (isVocabCardDue(c, 'example', now)) example++;
            if (isVocabCardDue(c, 'dictation', now)) dictation++;
        });
        return { back, synonym, example, dictation, total: back + synonym + example + dictation };
    }, [allCards]);

    const memoryStats = useMemo(() => {
        let total = allCards.length;
        let mastered = 0;
        let learning = 0;
        allCards.forEach(c => {
            const isBackMastered = (c.correctStreak_back || 0) >= 5;
            if (isBackMastered) mastered++;
            else if (c.intervalIndex_back >= 0 || c.lastReviewed_back) learning++;
        });
        const newCount = Math.max(0, total - mastered - learning);
        return { total, mastered, learning, newCount };
    }, [allCards]);

    const calculatedStreak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;

        // Nhận diện ngày có hoạt động học tập (từ vựng, kanji, ngữ pháp, xp...)
        const activeLogs = dailyActivityLogs.filter(log =>
            (log.cardsReviewed || 0) > 0 ||
            (log.reviewsDone || 0) > 0 ||
            (log.xpGained || 0) > 0 ||
            (log.newWordsAdded || 0) > 0 ||
            (log.newKanjiAdded || 0) > 0 ||
            (log.count || 0) > 0
        );
        if (activeLogs.length === 0) return 0;

        // Lưu log theo Map để tra cứu O(1)
        const logMap = new Map(activeLogs.map(l => [l.id, l]));

        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const getUtcDateStr = (d) => {
            return d.toISOString().split('T')[0];
        };

        // Hàm kiểm tra xem ngày d có hoạt động không (check cả local date lẫn utc date cho dữ liệu cũ)
        const hasActivityOnDate = (d) => {
            const localStr = getLocalDateStr(d);
            const utcStr = getUtcDateStr(d);
            return logMap.has(localStr) || logMap.has(utcStr);
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const hasToday = hasActivityOnDate(today);
        const hasYesterday = hasActivityOnDate(yesterday);

        // Nếu hôm nay chưa học VÀ hôm qua cũng không học thì streak = 0
        if (!hasToday && !hasYesterday) return 0;

        let currentStreak = 0;
        let checkDate = new Date();

        // Nếu hôm nay chưa học nhưng hôm qua có học, bắt đầu đếm từ hôm qua
        if (!hasToday) {
            checkDate = yesterday;
        }

        while (true) {
            if (hasActivityOnDate(checkDate)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return currentStreak;
    }, [dailyActivityLogs]);

    const handleUpdateCard = useCallback(async (cardId, isCorrectOrData, mode, action, responseTime) => {
        if (!cardId) return;

        let updatedFields = {};
        let newMasteryState = null;

        if (typeof isCorrectOrData === 'object' && isCorrectOrData !== null) {
            updatedFields = isCorrectOrData;
            if (isCorrectOrData.masteryState) {
                newMasteryState = isCorrectOrData.masteryState;
            }
        } else if (typeof mode === 'object' && mode !== null) {
            // Trường hợp gọi onUpdateCard(cardId, 'all', updates)
            updatedFields = mode;
            if (mode.masteryState) {
                newMasteryState = mode.masteryState;
            }
        } else if (typeof isCorrectOrData === 'string' && typeof mode !== 'undefined') {
            // Trường hợp gọi onUpdateCard(cardId, 'front', 'newValue')
            updatedFields = { [isCorrectOrData]: mode };
        } else {
            const isCorrect = Boolean(isCorrectOrData);
            if (action === 'flashcard_known' || action === 'memorized') {
                newMasteryState = 'memorized';
            } else if (action === 'flashcard_unknown' || action === 'learning') {
                newMasteryState = 'learning';
            } else if (isCorrect) {
                newMasteryState = 'memorized';
            } else {
                newMasteryState = 'learning';
            }
            updatedFields = {
                masteryState: newMasteryState,
                lastStudied: Date.now()
            };
        }

        setAllCards(prevCards => prevCards.map(card => {
            if (card.id === cardId) {
                return {
                    ...card,
                    ...updatedFields,
                    ...(newMasteryState ? { masteryState: newMasteryState } : {})
                };
            }
            return card;
        }));

        if (userId && vocabCollectionPath) {
            try {
                const safeCardId = String(cardId);
                const cardRef = doc(collection(db, vocabCollectionPath), safeCardId);
                const firestoreData = cleanFirestoreData({
                    ...updatedFields,
                    ...(newMasteryState ? { masteryState: newMasteryState } : {}),
                    updatedAt: Date.now()
                });
                await updateDoc(cardRef, firestoreData);
            } catch (err) {
                console.warn('⚠️ Failed to persist card mastery state to Firestore:', err);
            }
        }
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleAddCard = useCallback(async (newCard) => {
        if (!newCard) return false;
        const cardId = newCard.id ? String(newCard.id) : `card_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const cardData = {
            ...newCard,
            id: cardId,
            srsEnabled: newCard.srsEnabled !== undefined ? newCard.srsEnabled : true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            masteryState: newCard.masteryState || 'not_learned'
        };
        delete cardData.isNew;
        setAllCards(prevCards => [cardData, ...prevCards]);
        if (userId && vocabCollectionPath) {
            try {
                const cardRef = doc(db, vocabCollectionPath, String(cardId));
                await setDoc(cardRef, cleanFirestoreData(cardData));
            } catch (err) {
                console.warn('⚠️ Failed to persist new card to Firestore:', err);
            }
        }
        return true;
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleDeleteCard = useCallback(async (cardId) => {
        if (!cardId) return;
        const safeCardId = String(cardId);
        setAllCards(prevCards => prevCards.filter(c => String(c.id) !== safeCardId));
        if (userId && vocabCollectionPath) {
            try {
                const cardRef = doc(db, vocabCollectionPath, safeCardId);
                await deleteDoc(cardRef);
            } catch (err) {
                console.warn('⚠️ Failed to delete card from Firestore:', err);
            }
        }
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleDeleteCards = useCallback(async (cardIds) => {
        if (!cardIds || !cardIds.length) return;
        const idStrings = cardIds.map(id => String(id));
        const idSet = new Set(idStrings);
        setAllCards(prevCards => prevCards.filter(c => !idSet.has(String(c.id))));
        if (userId && vocabCollectionPath) {
            try {
                const BATCH_SIZE = 450;
                for (let i = 0; i < idStrings.length; i += BATCH_SIZE) {
                    const chunk = idStrings.slice(i, i + BATCH_SIZE);
                    const batch = writeBatch(db);
                    chunk.forEach(id => {
                        const cardRef = doc(db, vocabCollectionPath, id);
                        batch.delete(cardRef);
                    });
                    await batch.commit();
                }
            } catch (err) {
                console.warn('⚠️ Failed to batch delete cards from Firestore:', err);
            }
        }
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleSaveChanges = useCallback(async (cardIdOrData, updatedData) => {
        let realCardId = null;
        let patchData = {};

        if (typeof cardIdOrData === 'object' && cardIdOrData !== null) {
            realCardId = cardIdOrData.id || cardIdOrData.cardId;
            const { id, cardId, ...rest } = cardIdOrData;
            patchData = updatedData ? { ...rest, ...updatedData } : rest;
        } else {
            realCardId = cardIdOrData;
            patchData = updatedData || {};
        }

        if (!realCardId) return;

        const safeCardId = String(realCardId);

        setAllCards(prevCards => prevCards.map(c => {
            if (String(c.id) === safeCardId) {
                return { ...c, ...patchData, updatedAt: Date.now() };
            }
            return c;
        }));

        if (userId && vocabCollectionPath) {
            try {
                const cardRef = doc(collection(db, vocabCollectionPath), safeCardId);
                await updateDoc(cardRef, cleanFirestoreData({ ...patchData, updatedAt: Date.now() }));
            } catch (err) {
                console.warn('⚠️ Failed to persist card changes to Firestore:', err);
            }
        }
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleGeminiAssist = useCallback(async (frontText, contextPos = '', contextLevel = '', contextMeaning = '', targetLanguage = 'ja') => {
        try {
            return await aiAssistVocab(frontText, contextPos, contextLevel, contextMeaning, targetLanguage);
        } catch (err) {
            console.error('❌ AI Assist Vocab error:', err);
            showToast('Lỗi AI', err.message || 'Không thể tạo từ vựng bằng AI.');
            throw err;
        }
    }, []);

    const handleToggleSrs = useCallback(async (cardIdOrObj, targetState) => {
        let targetCardId = null;
        let nextSrsState = null;

        if (typeof cardIdOrObj === 'object' && cardIdOrObj !== null) {
            targetCardId = cardIdOrObj.id;
            nextSrsState = targetState !== undefined ? targetState : !(cardIdOrObj.srsEnabled !== false);
        } else {
            targetCardId = cardIdOrObj;
            if (targetState !== undefined) {
                nextSrsState = targetState;
            } else {
                const existing = allCards.find(c => String(c.id) === String(targetCardId));
                nextSrsState = existing ? !(existing.srsEnabled !== false) : true;
            }
        }

        if (!targetCardId) return;

        const safeId = String(targetCardId);
        setAllCards(prevCards => prevCards.map(c => {
            if (String(c.id) === safeId) {
                return { ...c, srsEnabled: nextSrsState, updatedAt: Date.now() };
            }
            return c;
        }));

        if (userId && vocabCollectionPath) {
            try {
                const cardRef = doc(collection(db, vocabCollectionPath), safeId);
                await setDoc(cardRef, { srsEnabled: nextSrsState, updatedAt: Date.now() }, { merge: true });
                if (nextSrsState) {
                    showToast('Đã bật Ôn tập ngắt quãng cho từ vựng này', 'success');
                } else {
                    showToast('Đã tắt Ôn tập ngắt quãng (Từ vựng sẽ tạm ẩn khỏi màn hình SRS)', 'info');
                }
            } catch (err) {
                console.warn('⚠️ Failed to persist SRS toggle state to Firestore:', err);
            }
        }
    }, [userId, vocabCollectionPath, setAllCards, allCards]);

    const handleUpdateVocabSrsRating = useCallback(async (cardId, ratingOrData, callback) => {
        if (!cardId) return 0;
        
        const safeId = String(cardId);
        const targetCard = allCards.find(c => String(c.id) === safeId);
        let newSrsFields = {};

        if (typeof ratingOrData === 'object' && ratingOrData !== null) {
            newSrsFields = ratingOrData;
        } else if (targetCard) {
            const rating = ratingOrData;
            const result = calculateAnkiSRS(targetCard, rating);
            const nowTime = Date.now();
            const nextReviewOffset = result.nextReviewOffsetMs !== undefined ? result.nextReviewOffsetMs : (result.interval * 60000);
            newSrsFields = {
                srsInterval: result.interval,
                srsEase: result.ease,
                srsLearningStep: result.learningStep,
                srsIsLapsed: result.isLapsed,
                srsReps: result.reps,
                srsLapseCount: result.lapseCount,
                srsPrelapseInterval: result.prelapseInterval,
                srsState: result.state,
                nextReview_back: nowTime + nextReviewOffset,
                lastReviewed_back: nowTime,
                lastReviewed: nowTime,
                state: result.state,
                interval: result.interval,
                ease: result.ease,
                nextReview: nowTime + nextReviewOffset
            };
        } else {
            newSrsFields = { lastReviewed: Date.now() };
        }

        await handleUpdateCard(safeId, newSrsFields);

        if (typeof callback === 'function') {
            try {
                callback(true);
            } catch (cbErr) {
                console.warn('SRS callback warning:', cbErr);
            }
        }

        const rawRating = typeof ratingOrData === 'string' ? ratingOrData : (ratingOrData?.rating || 'good');
        const ratingStr = String(rawRating).toLowerCase();
        const xpReward = POINTS?.SRS_VOCAB?.[ratingStr] || POINTS?.SRS_VOCAB?.good || 4;
        return xpReward;
    }, [allCards, handleUpdateCard]);

    const handleRevertVocabSrsRating = useCallback(async (cardId, prevData) => {
        if (!cardId) return;
        if (prevData) {
            await handleUpdateCard(String(cardId), prevData);
        }
    }, [handleUpdateCard]);

    const handleSaveCardAudio = useCallback(async (cardId, b64Audio, voiceId) => {
        if (!cardId || !b64Audio) return;
        const patch = {
            audio: b64Audio,
            audioVoice: voiceId || 'ja-JP-Standard-A',
            updatedAt: Date.now()
        };
        await handleUpdateCard(String(cardId), patch);
    }, [handleUpdateCard]);

    const handleExtractVocabFromImage = useCallback(async (base64Image, targetLanguage = 'ja') => {
        if (!base64Image) return [];
        try {
            return await extractVocabFromImage(base64Image, targetLanguage);
        } catch (err) {
            console.error('Lỗi trích xuất từ vựng từ ảnh:', err);
            showToast('Lỗi AI OCR', err.message || 'Không thể trích xuất từ vựng từ ảnh.');
            throw err;
        }
    }, []);

    const handleRestoreFromLocalBackup = useCallback(async () => {
        try {
            const raw = localStorage.getItem('quizki_vocab_last_backup') || localStorage.getItem('quizki_cached_vocab_list');
            if (!raw) {
                showToast('Không tìm thấy bản sao lưu nào trên trình duyệt', 'warning');
                return 0;
            }
            let cardsToRestore = [];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                cardsToRestore = parsed;
            } else if (parsed && Array.isArray(parsed.cards)) {
                cardsToRestore = parsed.cards;
            }

            if (cardsToRestore.length === 0) {
                showToast('Bản sao lưu trống', 'warning');
                return 0;
            }

            if (!userId || !vocabCollectionPath) return 0;
            const batchSize = 400;
            for (let i = 0; i < cardsToRestore.length; i += batchSize) {
                const chunk = cardsToRestore.slice(i, i + batchSize);
                const batch = writeBatch(db);
                chunk.forEach(c => {
                    const docId = String(c.id);
                    const cleanCard = { ...c };
                    delete cleanCard.id;
                    batch.set(doc(db, vocabCollectionPath, docId), cleanFirestoreData(cleanCard), { merge: true });
                });
                await batch.commit();
            }

            setAllCards(cardsToRestore);
            showToast(`🎉 Đã khôi phục thành công ${cardsToRestore.length} từ vựng từ bản sao lưu!`, 'success');
            return cardsToRestore.length;
        } catch (e) {
            console.error('Lỗi khôi phục backup:', e);
            showToast('Lỗi khi khôi phục bản sao lưu', 'error');
            return 0;
        }
    }, [userId, vocabCollectionPath, setAllCards]);

    return {
        allCards,
        setAllCards,
        isLoading,
        setIsLoading,
        vocabCollectionPath,
        dueCounts,
        memoryStats,
        calculatedStreak,
        handleUpdateCard,
        handleAddCard,
        handleDeleteCard,
        handleDeleteCards,
        handleSaveChanges,
        handleGeminiAssist,
        handleToggleSrs,
        handleUpdateVocabSrsRating,
        handleRevertVocabSrsRating,
        handleSaveCardAudio,
        handleExtractVocabFromImage,
        handleRestoreFromLocalBackup
    };
};
