import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, where, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

export const useStudySets = ({ userId, authReady, allCards = [], profile, hasPremium, targetLanguage, setNotification } = {}) => {
    const [folders, setFolders] = useState([]);

    const studySetsCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/studySets`;
    }, [userId]);

    const vocabCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/vocabulary`;
    }, [userId]);

    useEffect(() => {
        if (!authReady || !studySetsCollectionPath) return;

        const q = query(collection(db, studySetsCollectionPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedFolders = [];
            snapshot.forEach((doc) => {
                fetchedFolders.push({ id: doc.id, ...doc.data() });
            });
            setFolders(fetchedFolders);
        }, (err) => {
            console.warn('StudySets listener error:', err);
        });
        return () => unsubscribe();
    }, [authReady, studySetsCollectionPath]);

    const activeFolders = useMemo(() => {
        const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
        return (folders || []).filter(f => {
            const fLang = f.targetLanguage || 'ja';
            return fLang === currentTarget;
        });
    }, [folders, targetLanguage]);

    const parentFolders = useMemo(() => {
        return activeFolders.filter(f => f.type === 'folder');
    }, [activeFolders]);

    const studySets = useMemo(() => {
        return activeFolders.filter(f => f.type !== 'folder');
    }, [activeFolders]);

    const cardFolders = useMemo(() => {
        const mapping = {};
        (allCards || []).forEach(card => {
            if (card && card.folderId) {
                mapping[card.id] = card.folderId;
            }
        });
        return mapping;
    }, [allCards]);

    const handleAddFolder = async (name, description = '', coverImage = null, parentId = null) => {
        if (!studySetsCollectionPath) return null;

        const isRestricted = profile?.trialPricingTier === 'free' || !hasPremium;
        if (isRestricted && studySets.length >= 3) {
            if (setNotification) setNotification('⚠️ Bạn đã đạt giới hạn 3 học phần của gói Miễn phí. Vui lòng nâng cấp gói!');
            return null;
        }

        try {
            const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
            const folderRef = await addDoc(collection(db, studySetsCollectionPath), {
                name,
                description,
                parentId: parentId || null,
                coverImage,
                targetLanguage: currentTarget,
                createdAt: serverTimestamp()
            });
            return folderRef.id;
        } catch (e) {
            console.error('Lỗi khi tạo học phần:', e);
            if (setNotification) setNotification('Lỗi khi tạo học phần');
            return null;
        }
    };

    const handleUpdateFolder = async (folderId, updates) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await updateDoc(doc(db, studySetsCollectionPath, folderId), updates);
        } catch (e) {
            console.error('Lỗi khi cập nhật học phần:', e);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));

            const q = query(collection(db, vocabCollectionPath), where("folderId", "==", folderId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            if (!snapshot.empty) {
                await batch.commit();
            }

            try {
                const folderKey = userId ? `vocab_card_folders_${userId}` : 'vocab_card_folders';
                const savedFolders = JSON.parse(localStorage.getItem(folderKey) || '{}');
                let localChanged = false;
                Object.keys(savedFolders).forEach(cardId => {
                    if (savedFolders[cardId] === folderId) {
                        delete savedFolders[cardId];
                        localChanged = true;
                    }
                });
                if (localChanged) {
                    localStorage.setItem(folderKey, JSON.stringify(savedFolders));
                }
            } catch (localErr) {
                console.error('Lỗi khi xoá local storage mapping:', localErr);
            }
        } catch (e) {
            console.error('Lỗi khi xoá học phần:', e);
        }
    };

    const handleMoveCardToFolder = async (cardId, folderId) => {
        if (!vocabCollectionPath || !cardId) return;

        const isRestricted = profile?.trialPricingTier === 'free' || !hasPremium;
        if (isRestricted && folderId && folderId !== 'unfiled') {
            const folderCards = allCards.filter(c => c.folderId === folderId);
            if (folderCards.length >= 20) {
                if (setNotification) setNotification('⚠️ Học phần mục tiêu đã đạt giới hạn 20 từ vựng của gói Miễn phí!');
                return;
            }
        }

        try {
            const val = folderId === 'unfiled' || !folderId ? null : folderId;
            await updateDoc(doc(db, vocabCollectionPath, cardId), { folderId: val });
        } catch (e) {
            console.error('Lỗi di chuyển thẻ:', e);
        }
    };

    const handleAddParentFolder = async (name) => {
        if (!studySetsCollectionPath) return null;
        try {
            const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
            const docRef = await addDoc(collection(db, studySetsCollectionPath), {
                name,
                type: 'folder',
                targetLanguage: currentTarget,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (e) {
            console.error("Lỗi tạo thư mục:", e);
            return null;
        }
    };

    const handleUpdateParentFolder = async (folderId, name) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await updateDoc(doc(db, studySetsCollectionPath, folderId), { name });
        } catch (e) {
            console.error("Lỗi cập nhật thư mục:", e);
        }
    };

    const handleDeleteParentFolder = async (folderId) => {
        if (!studySetsCollectionPath || !folderId) return;
        try {
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));

            const batch = writeBatch(db);
            let hasUpdates = false;
            folders.forEach(set => {
                if (set.type !== 'folder' && set.parentId === folderId) {
                    batch.update(doc(db, studySetsCollectionPath, set.id), { parentId: null });
                    hasUpdates = true;
                }
            });
            if (hasUpdates) await batch.commit();
        } catch (e) {
            console.error("Lỗi xóa thư mục:", e);
        }
    };

    const handleMoveStudySetToParentFolder = async (setId, parentFolderId) => {
        if (!studySetsCollectionPath || !setId) return;
        try {
            const targetParentId = parentFolderId === 'root' || !parentFolderId ? null : parentFolderId;
            await updateDoc(doc(db, studySetsCollectionPath, setId), { parentId: targetParentId });
        } catch (e) {
            console.error("Lỗi di chuyển học phần vào thư mục:", e);
        }
    };

    return {
        folders,
        studySetsCollectionPath,
        vocabCollectionPath,
        activeFolders,
        parentFolders,
        studySets,
        cardFolders,
        handleAddFolder,
        handleUpdateFolder,
        handleDeleteFolder,
        handleMoveCardToFolder,
        handleAddParentFolder,
        handleUpdateParentFolder,
        handleDeleteParentFolder,
        handleMoveStudySetToParentFolder
    };
};
