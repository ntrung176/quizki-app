import { useState, useEffect, useCallback } from 'react';

export const useStudySets = (userId) => {
    const folderStorageKey = userId ? `vocab_folders_${userId}` : 'vocab_folders';
    const cardFolderStorageKey = userId ? `vocab_card_folders_${userId}` : 'vocab_card_folders';

    const [folders, setFolders] = useState(() => {
        try {
            const saved = localStorage.getItem(folderStorageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [cardFolders, setCardFolders] = useState(() => {
        try {
            const saved = localStorage.getItem(cardFolderStorageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });



    // Listen for cross-component updates
    useEffect(() => {
        const handleUpdate = () => {
            try {
                const savedF = localStorage.getItem(folderStorageKey);
                if (savedF) {
                    setFolders(prev => {
                        if (JSON.stringify(prev) !== savedF) return JSON.parse(savedF);
                        return prev;
                    });
                }
                const savedC = localStorage.getItem(cardFolderStorageKey);
                if (savedC) {
                    setCardFolders(prev => {
                        if (JSON.stringify(prev) !== savedC) return JSON.parse(savedC);
                        return prev;
                    });
                }
            } catch (e) {}
        };
        window.addEventListener('study_sets_updated', handleUpdate);
        return () => window.removeEventListener('study_sets_updated', handleUpdate);
    }, [folderStorageKey, cardFolderStorageKey]);

    const createFolder = useCallback((name, description = '', coverImage = null) => {
        const newFolder = { id: `folder_${Date.now()}`, name, description, parentId: null, coverImage };
        setFolders(prev => {
            const next = [...prev, newFolder];
            localStorage.setItem(folderStorageKey, JSON.stringify(next));
            window.dispatchEvent(new Event('study_sets_updated'));
            return next;
        });
        return newFolder.id;
    }, [folderStorageKey]);

    const updateFolder = useCallback((id, updates) => {
        setFolders(prev => {
            const next = prev.map(f => f.id === id ? { ...f, ...updates } : f);
            localStorage.setItem(folderStorageKey, JSON.stringify(next));
            window.dispatchEvent(new Event('study_sets_updated'));
            return next;
        });
    }, [folderStorageKey]);

    const deleteFolder = useCallback((id) => {
        setFolders(prev => {
            const next = prev.filter(f => f.id !== id);
            localStorage.setItem(folderStorageKey, JSON.stringify(next));
            window.dispatchEvent(new Event('study_sets_updated'));
            return next;
        });
        setCardFolders(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(cardId => {
                if (next[cardId] === id) delete next[cardId];
            });
            localStorage.setItem(cardFolderStorageKey, JSON.stringify(next));
            window.dispatchEvent(new Event('study_sets_updated'));
            return next;
        });
    }, [folderStorageKey, cardFolderStorageKey]);

    const moveCardToFolder = useCallback((cardId, folderId) => {
        setCardFolders(prev => {
            const next = { ...prev };
            if (folderId === 'unfiled' || !folderId) {
                delete next[cardId];
            } else {
                next[cardId] = folderId;
            }
            localStorage.setItem(cardFolderStorageKey, JSON.stringify(next));
            window.dispatchEvent(new Event('study_sets_updated'));
            return next;
        });
    }, [cardFolderStorageKey]);

    return {
        folders,
        cardFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        moveCardToFolder
    };
};



