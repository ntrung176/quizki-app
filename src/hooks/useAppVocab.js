import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { showToast } from '../utils/toast';
import { cleanFirestoreData } from '../utils/firestoreHelpers';
import { isVocabCardDue } from '../utils/srs';
import { aiAssistVocab } from '../utils/aiProvider';

export const useAppVocab = ({ authReady, userId, dailyActivityLogs }) => {
    const [allCards, setAllCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const vocabCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/vocabulary`;
    }, [userId]);

    // Firestore listener for User Vocabulary (allCards)
    useEffect(() => {
        if (!authReady || !vocabCollectionPath) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(collection(db, vocabCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCards = [];
            snapshot.forEach((docSnap) => {
                fetchedCards.push({ id: docSnap.id, ...docSnap.data() });
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
        const sortedLogs = [...dailyActivityLogs].sort((a, b) => b.id.localeCompare(a.id));
        const todayStr = new Date().toISOString().split('T')[0];

        let currentStreak = 0;
        let checkDate = new Date();

        const latestLogDate = sortedLogs[0]?.id;
        if (latestLogDate !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (latestLogDate !== yesterdayStr) return 0;
            checkDate = yesterday;
        }

        const logMap = new Map(sortedLogs.map(l => [l.id, l]));
        while (true) {
            const dStr = checkDate.toISOString().split('T')[0];
            const log = logMap.get(dStr);
            if (log && ((log.cardsReviewed || 0) > 0 || (log.xpGained || 0) > 0)) {
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
        setAllCards(prevCards => [cardData, ...prevCards]);
        if (userId && vocabCollectionPath) {
            try {
                const cardRef = doc(collection(db, vocabCollectionPath), String(cardId));
                await setDoc(cardRef, cleanFirestoreData(cardData));
            } catch (err) {
                console.warn('⚠️ Failed to persist new card to Firestore:', err);
            }
        }
        return true;
    }, [userId, vocabCollectionPath, setAllCards]);

    const handleDeleteCard = useCallback(async (cardId) => {
        if (!cardId) return;
        setAllCards(prevCards => prevCards.filter(c => String(c.id) !== String(cardId)));
        if (userId && vocabCollectionPath) {
            try {
                const safeCardId = String(cardId);
                const cardRef = doc(collection(db, vocabCollectionPath), safeCardId);
                await deleteDoc(cardRef);
            } catch (err) {
                console.warn('⚠️ Failed to delete card from Firestore:', err);
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
        handleSaveChanges,
        handleGeminiAssist,
        handleToggleSrs
    };
};
