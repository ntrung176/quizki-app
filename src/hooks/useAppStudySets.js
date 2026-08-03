import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { showToast } from '../utils/toast';

export const useAppStudySets = ({ authReady, userId, targetLanguage, allCards = [] }) => {
    const [folders, setFolders] = useState([]);

    const studySetsCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/studySets`;
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
            await deleteDoc(doc(db, studySetsCollectionPath, folderId));
        } catch (err) {
            console.error('❌ Error deleting folder:', err);
        }
    }, [userId]);

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
        return handleDeleteFolder(id);
    }, [handleDeleteFolder]);

    const handleMoveStudySetToParentFolder = useCallback(async (setId, parentId) => {
        return handleUpdateFolder(setId, { parentId: parentId || null });
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
