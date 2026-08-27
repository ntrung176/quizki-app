import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, writeBatch, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { showToast } from '../utils/toast';

export const useAppStudySets = ({ authReady, userId, targetLanguage, allCards = [], setAllCards }) => {
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
        }, (error) => {
            console.error("Lỗi tải học phần:", error);
        });
        return () => unsubscribe();
    }, [authReady, studySetsCollectionPath]);

    const activeFolders = useMemo(() => {
        const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
        return folders.filter(f => {
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

    // Tự động kiểm tra và phục hồi các học phần mồ côi (có parentId nhưng thư mục cha đã bị xóa)
    useEffect(() => {
        if (!folders || folders.length === 0 || !studySetsCollectionPath) return;
        const existingParentIds = new Set(folders.filter(f => f.type === 'folder').map(f => f.id));
        const orphanedSets = folders.filter(f => f.type !== 'folder' && f.parentId && !existingParentIds.has(f.parentId));
        
        if (orphanedSets.length > 0) {
            const batch = writeBatch(db);
            orphanedSets.forEach(set => {
                batch.update(doc(db, studySetsCollectionPath, set.id), { parentId: null });
            });
            batch.commit().catch(err => console.warn('Auto-healing orphaned study sets:', err));
        }
    }, [folders, studySetsCollectionPath]);

    // Tự động dọn dẹp các từ vựng thuộc về học phần đã bị xóa trước đó
    useEffect(() => {
        if (!folders || folders.length === 0 || !allCards || allCards.length === 0 || !vocabCollectionPath) return;
        const validFolderIds = new Set(folders.map(f => f.id));
        validFolderIds.add('unfiled');

        const orphanedCards = allCards.filter(c => c.folderId && c.folderId !== 'unfiled' && !validFolderIds.has(c.folderId));
        if (orphanedCards.length > 0) {
            const batch = writeBatch(db);
            orphanedCards.forEach(c => {
                batch.delete(doc(db, vocabCollectionPath, c.id));
            });
            batch.commit().catch(err => console.warn('Auto-deleting orphaned vocab cards in Firestore:', err));
            if (setAllCards) {
                setAllCards(prev => prev.filter(c => !c.folderId || c.folderId === 'unfiled' || validFolderIds.has(c.folderId)));
            }
        }
    }, [folders, allCards, vocabCollectionPath, setAllCards]);

    const cardFolders = useMemo(() => {
        const mapping = {};
        allCards.forEach(card => {
            if (card.folderId) {
                mapping[card.id] = card.folderId;
            }
        });
        return mapping;
    }, [allCards]);

    const handleAddFolder = useCallback(async (name, description = '', coverImage = null, parentId = null) => {
        if (!userId || !name || !name.trim()) return null;
        try {
            const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
            const studySetsCollectionPath = `artifacts/${appId}/users/${userId}/studySets`;
            const docRef = await addDoc(collection(db, studySetsCollectionPath), {
                name: name.trim(),
                description: (description || '').trim(),
                parentId: parentId || null,
                coverImage: coverImage || null,
                targetLanguage: currentTarget,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (err) {
            console.error('❌ Error creating study set in handleAddFolder:', err);
            showToast('Lỗi', 'Không thể tạo học phần.');
            return null;
        }
    }, [userId, targetLanguage]);

    const handleDeleteFolder = useCallback(async (folderId) => {
        if (!userId || !folderId) return;
        try {
            const studySetsCollectionPath = `artifacts/${appId}/users/${userId}/studySets`;
            const vocabCollectionPath = `artifacts/${appId}/users/${userId}/vocabulary`;

            // 1. Xóa tài liệu học phần
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));

            // 2. Tìm và xóa tất cả từ vựng thuộc học phần này trong Firestore
            const q = query(collection(db, vocabCollectionPath), where("folderId", "==", folderId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const batch = writeBatch(db);
                snap.forEach((docSnapshot) => {
                    batch.delete(docSnapshot.ref);
                });
                await batch.commit();
            }

            // 3. Dọn dẹp local storage mapping
            try {
                const folderKey = `vocab_card_folders_${userId}`;
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
            } catch (_) {}

            // 4. Cập nhật state local ngay lập tức
            setFolders(prev => prev.filter(f => f.id !== folderId));
            if (setAllCards) {
                setAllCards(prev => prev.filter(c => c.folderId !== folderId && cardFolders[c.id] !== folderId));
            }
        } catch (err) {
            console.error('❌ Error deleting study set and vocabulary cards:', err);
        }
    }, [userId, cardFolders, setAllCards]);

    const handleUpdateFolder = useCallback(async (folderId, updates) => {
        if (!userId || !folderId) return;
        try {
            const studySetsCollectionPath = `artifacts/${appId}/users/${userId}/studySets`;
            const updatePayload = typeof updates === 'string' ? { name: updates } : updates;
            await updateDoc(doc(db, studySetsCollectionPath, folderId), updatePayload);
        } catch (err) {
            console.error('❌ Error updating folder:', err);
        }
    }, [userId]);

    const handleAddParentFolder = useCallback(async (name) => {
        if (!userId || !name || !name.trim()) return null;
        try {
            const currentTarget = targetLanguage || localStorage.getItem('quizki_target_language') || 'ja';
            const studySetsCollectionPath = `artifacts/${appId}/users/${userId}/studySets`;
            const docRef = await addDoc(collection(db, studySetsCollectionPath), {
                name: name.trim(),
                type: 'folder',
                targetLanguage: currentTarget,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (err) {
            console.error('❌ Error adding parent folder:', err);
            return null;
        }
    }, [userId, targetLanguage]);

    const handleUpdateParentFolder = useCallback(async (id, name) => {
        return handleUpdateFolder(id, { name });
    }, [handleUpdateFolder]);

    const handleDeleteParentFolder = useCallback(async (id) => {
        if (!userId || !id) return;
        try {
            const studySetsCollectionPath = `artifacts/${appId}/users/${userId}/studySets`;
            
            // 1. Xóa tài liệu thư mục cha
            await deleteDoc(doc(db, studySetsCollectionPath, id));

            // 2. Tìm tất cả học phần đang nằm trong thư mục này và chuyển ra ngoài gốc (parentId = null)
            const q = query(collection(db, studySetsCollectionPath), where("parentId", "==", id));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const batch = writeBatch(db);
                snap.forEach((docSnapshot) => {
                    batch.update(docSnapshot.ref, { parentId: null });
                });
                await batch.commit();
            }

            // 3. Cập nhật state local ngay lập tức
            setFolders(prev => prev
                .filter(f => f.id !== id)
                .map(f => f.parentId === id ? { ...f, parentId: null } : f)
            );
        } catch (err) {
            console.error('❌ Error deleting parent folder and unlinking study sets:', err);
        }
    }, [userId]);

    const handleMoveStudySetToParentFolder = useCallback(async (setId, parentId) => {
        return handleUpdateFolder(setId, { parentId: (parentId === 'root' || !parentId) ? null : parentId });
    }, [handleUpdateFolder]);

    return {
        folders,
        setFolders,
        studySetsCollectionPath,
        activeFolders,
        parentFolders,
        studySets,
        cardFolders,
        handleAddFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleAddParentFolder,
        handleUpdateParentFolder,
        handleDeleteParentFolder,
        handleMoveStudySetToParentFolder
    };
};
