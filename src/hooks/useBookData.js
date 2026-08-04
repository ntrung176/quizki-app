import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, appId } from '../config/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { getSharedBookGroups, getCachedBookGroups } from '../utils/bookService';
import { showToast, showConfirm } from '../utils/toast';
import { generateAudioSilentWithVoice, speakJapanese, playAudio } from '../utils/audio';
import { ENGLISH_SAMPLE_BOOK_GROUPS, getGroupCategory } from '../components/books/bookConstants';
import { useLanguage } from '../context/LanguageContext';
import { useTargetLanguage } from '../context/TargetLanguageContext';

export const useBookData = ({
    isAdmin = false,
    allUserCards = [],
    userId = null,
    folders = [],
    parentFolders = [],
    onDeleteFolder,
    onAddFolder,
    onMoveStudySetToParentFolder,
    onAddVocabToSRS,
    awardXP = null
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { targetLanguage, isEnglishMode } = useTargetLanguage();

    // Premium Locked states
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('Premium');

    // Data states
    const [bookGroups, setBookGroups] = useState(() => getCachedBookGroups() || []);
    const [loading, setLoading] = useState(!getCachedBookGroups());

    // Navigation IDs
    const groupId = searchParams.get('g') || searchParams.get('group') || null;
    const bookId = searchParams.get('b') || searchParams.get('book') || null;
    const chapterId = searchParams.get('c') || searchParams.get('chapter') || null;
    const lessonId = searchParams.get('l') || searchParams.get('lesson') || null;

    // Admin states
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [showAddBook, setShowAddBook] = useState(false);
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [showAddLesson, setShowAddLesson] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingNameItem, setEditingNameItem] = useState(null);
    const [editingNameValue, setEditingNameValue] = useState('');
    const [showNuanceIndex, setShowNuanceIndex] = useState(null);
    const [showEditGroup, setShowEditGroup] = useState(false);
    const [showEditBook, setShowEditBook] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formSubtitle, setFormSubtitle] = useState('');
    const [formColor, setFormColor] = useState('#4F87FF');
    const [formDescription, setFormDescription] = useState('');
    const [formWordCount, setFormWordCount] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [jsonInput, setJsonInput] = useState('');

    // Vocab adding states
    const [addingVocabIndex, setAddingVocabIndex] = useState(null);
    const [addedVocabSet, setAddedVocabSet] = useState(new Set());

    // Revealed cards for study
    const [revealedCards, setRevealedCards] = useState(new Set());
    const [persistedRevealed, setPersistedRevealed] = useState(new Set());
    const [blurMode, setBlurMode] = useState('vn');

    // Vocab editing states
    const [editingVocabIndex, setEditingVocabIndex] = useState(null);
    const [editingVocabData, setEditingVocabData] = useState(null);

    // Folder selection for SRS
    const availableFolders = useMemo(() => {
        return folders.filter(f => f.type !== 'folder');
    }, [folders]);
    const [selectedFolderId, setSelectedFolderId] = useState('');

    // Study set redesign states
    const [showCreateStudySetModal, setShowCreateStudySetModal] = useState(false);
    const [showLinkStudySetModal, setShowLinkStudySetModal] = useState(false);
    const [studySetName, setStudySetName] = useState('');
    const [studySetDesc, setStudySetDesc] = useState('');
    const [selectedParentFolderId, setSelectedParentFolderId] = useState('');
    const [isCreatingNewParentFolder, setIsCreatingNewParentFolder] = useState(false);
    const [newParentFolderName, setNewParentFolderName] = useState('');
    const [selectedVocabIndices, setSelectedVocabIndices] = useState(new Set());
    const [selectedExistingStudySetId, setSelectedExistingStudySetId] = useState('');
    const [creationLoading, setCreationLoading] = useState(false);

    // Table of contents & filters
    const [showTOC, setShowTOC] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [lessonAudioMap, setLessonAudioMap] = useState({});

    const bgAudioAbortRef = useRef(false);
    const editingCardRef = useRef(null);
    const [fixAudioIndex, setFixAudioIndex] = useState(null);
    const [fixAudioCustomReading, setFixAudioCustomReading] = useState('');
    const [fixAudioLoading, setFixAudioLoading] = useState(false);
    const saveProgressTimerRef = useRef(null);

    const COLLECTION = 'bookGroups';

    const activeBookGroups = useMemo(() => {
        if (isEnglishMode) {
            const userEnGroups = (bookGroups || []).filter(g => g.targetLanguage === 'en');
            return [...ENGLISH_SAMPLE_BOOK_GROUPS, ...userEnGroups];
        }
        return (bookGroups || []).filter(g => !g.targetLanguage || g.targetLanguage === 'ja');
    }, [bookGroups, isEnglishMode]);

    const filteredGroups = useMemo(() => {
        return activeBookGroups.filter(group => {
            const name = (group.name || '').toLowerCase();
            const subtitle = (group.subtitle || '').toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || subtitle.includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            if (activeFilter === 'ALL') return true;
            const cat = getGroupCategory(group);
            if (activeFilter === 'JLPT') return cat === 'JLPT';
            if (activeFilter === 'TEXTBOOK') return cat === 'TEXTBOOK';
            if (activeFilter === 'OXFORD') return name.includes('oxford');
            if (activeFilter === 'IELTS') return name.includes('ielts');
            if (activeFilter === 'TOEIC') return name.includes('toeic');
            if (activeFilter === 'CUSTOM') return cat === 'CUSTOM';
            return true;
        });
    }, [activeBookGroups, searchQuery, activeFilter]);

    const currentGroup = useMemo(() => activeBookGroups.find(g => g.id === groupId), [activeBookGroups, groupId]);
    const currentBook = useMemo(() => currentGroup?.books?.find(b => b.id === bookId), [currentGroup, bookId]);
    const currentChapter = useMemo(() => currentBook?.chapters?.find(c => c.id === chapterId), [currentBook, chapterId]);
    const currentLesson = useMemo(() => currentChapter?.lessons?.find(l => l.id === lessonId), [currentChapter, lessonId]);

    const vocabWithAudio = useMemo(() => {
        const vocab = currentLesson?.vocab || [];
        if (Object.keys(lessonAudioMap).length === 0) return vocab;
        return vocab.map((v, i) => {
            const wordAudio = lessonAudioMap[`${i}_word`];
            const exampleAudio = lessonAudioMap[`${i}_example`];
            return {
                ...v,
                ...(wordAudio?.base64 ? { audioBase64: wordAudio.base64 } : {}),
                ...(exampleAudio?.base64 ? { exampleAudioBase64: exampleAudio.base64 } : {}),
            };
        });
    }, [currentLesson, lessonAudioMap]);

    const linkedStudySet = useMemo(() => {
        if (!groupId || !bookId || !chapterId || !lessonId) return null;
        return folders.find(f => {
            if (f.type === 'folder') return false;
            const sl = f.sourceLesson;
            return sl && sl.groupId === groupId && sl.bookId === bookId && sl.chapterId === chapterId && sl.lessonId === lessonId;
        });
    }, [groupId, bookId, chapterId, lessonId, folders]);

    const syncStatus = useMemo(() => {
        if (!linkedStudySet) return { isSynced: true, missingCount: 0 };
        const setCards = allUserCards.filter(c => c.folderId === linkedStudySet.id);
        const setCardWords = new Set(setCards.map(c => (c.front || '').split('（')[0].split('(')[0].trim()));
        let missing = 0;
        vocabWithAudio.forEach(v => {
            const w = (v.word || v.front || '').split('（')[0].split('(')[0].trim();
            if (!setCardWords.has(w)) missing++;
        });
        return { isSynced: missing === 0, missingCount: missing };
    }, [linkedStudySet, allUserCards, vocabWithAudio]);

    const loadAllData = async (silent = false, forceRefresh = false) => {
        if (!silent) setLoading(true);
        try {
            const groups = await getSharedBookGroups(forceRefresh, false);
            setBookGroups(groups);
        } catch (e) {
            console.error('Error loading book data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const loadLessonAudio = useCallback(async () => {
        if (!groupId || !bookId || !chapterId || !lessonId) {
            setLessonAudioMap({});
            return;
        }
        try {
            const audioColRef = collection(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId, 'vocabAudio');
            const snap = await getDocs(audioColRef);
            const audioMap = {};
            snap.docs.forEach(d => { audioMap[d.id] = d.data(); });
            setLessonAudioMap(audioMap);
        } catch (e) {
            console.error('Error loading lesson audio:', e);
            setLessonAudioMap({});
        }
    }, [groupId, bookId, chapterId, lessonId]);

    const lessonPersistKey = useMemo(() => {
        if (!groupId || !bookId || !chapterId || !lessonId) return null;
        return `book_reveal_${groupId}_${bookId}_${chapterId}_${lessonId}`;
    }, [groupId, bookId, chapterId, lessonId]);

    useEffect(() => {
        loadLessonAudio();
        const loadProgress = async () => {
            if (!lessonPersistKey) {
                setPersistedRevealed(new Set());
                setRevealedCards(new Set());
                return;
            }
            if (userId && appId) {
                try {
                    const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/bookProgress`, lessonPersistKey);
                    const progressSnap = await getDoc(progressDocRef);
                    if (progressSnap.exists()) {
                        const data = progressSnap.data();
                        const arr = data.revealed || [];
                        const restoredSet = new Set(arr);
                        setPersistedRevealed(restoredSet);
                        setRevealedCards(new Set(restoredSet));
                        try { localStorage.setItem(lessonPersistKey, JSON.stringify(arr)); } catch (e) {}
                        return;
                    }
                } catch (e) {
                    if (e.code !== 'permission-denied') console.warn('Could not load progress from Firebase:', e);
                }
            }
            try {
                const saved = localStorage.getItem(lessonPersistKey);
                if (saved) {
                    const arr = JSON.parse(saved);
                    const restoredSet = new Set(arr);
                    setPersistedRevealed(restoredSet);
                    setRevealedCards(new Set(restoredSet));
                    return;
                }
            } catch (e) { console.warn('Error restoring reveal state:', e); }
            setPersistedRevealed(new Set());
            setRevealedCards(new Set());
        };
        loadProgress();
    }, [loadLessonAudio, lessonId, lessonPersistKey, userId]);

    const revealCard = useCallback((index) => {
        setRevealedCards(prev => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
        setPersistedRevealed(prev => {
            const next = new Set(prev);
            if (!next.has(index)) {
                next.add(index);
                if (awardXP) {
                    awardXP(10);
                    if (vocabWithAudio.length > 0 && next.size === vocabWithAudio.length) {
                        awardXP(50);
                        showToast('🎉 Bạn đã lật hết từ vựng & hoàn thành bài học! (+50 XP)', 'success');
                    }
                }
                const arr = [...next];
                if (lessonPersistKey) {
                    try { localStorage.setItem(lessonPersistKey, JSON.stringify(arr)); } catch (e) {}
                }
                if (userId && appId && lessonPersistKey) {
                    if (saveProgressTimerRef.current) clearTimeout(saveProgressTimerRef.current);
                    saveProgressTimerRef.current = setTimeout(async () => {
                        try {
                            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/bookProgress`, lessonPersistKey);
                            await setDoc(progressDocRef, { revealed: arr, updatedAt: new Date() }, { merge: true });
                        } catch (e) {
                            if (e.code !== 'permission-denied') console.warn('Could not save progress to Firebase:', e);
                        }
                    }, 1000);
                }
            }
            return next;
        });
    }, [lessonPersistKey, userId, awardXP, vocabWithAudio.length]);

    const handleReBlurAll = useCallback(() => { setRevealedCards(new Set()); }, []);

    const handleResetProgress = useCallback(async () => {
        setRevealedCards(new Set());
        setPersistedRevealed(new Set());
        if (lessonPersistKey) {
            try { localStorage.removeItem(lessonPersistKey); } catch (e) {}
        }
        if (userId && appId && lessonPersistKey) {
            try {
                const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/bookProgress`, lessonPersistKey);
                await deleteDoc(progressDocRef);
            } catch (e) {
                if (e.code !== 'permission-denied') console.warn('Could not delete progress from Firebase:', e);
            }
        }
    }, [lessonPersistKey, userId]);

    const navigateTo = useCallback((params) => {
        const sp = new URLSearchParams();
        if (params.group) sp.set('g', params.group);
        if (params.book) sp.set('b', params.book);
        if (params.chapter) sp.set('c', params.chapter);
        if (params.lesson) sp.set('l', params.lesson);
        setSearchParams(sp);
    }, [setSearchParams]);

    const goBack = () => {
        if (lessonId) navigateTo({ group: groupId, book: bookId, chapter: chapterId });
        else if (chapterId) navigateTo({ group: groupId, book: bookId });
        else if (bookId) navigateTo({ group: groupId });
        else if (groupId) navigateTo({});
        else navigateTo({});
    };

    const resetForm = () => {
        setFormName(''); setFormSubtitle(''); setFormColor('#4F87FF');
        setFormDescription(''); setFormWordCount(''); setFormImageUrl('');
        setJsonInput(''); setEditingItem(null); setEditTarget(null);
    };

    const handleAddGroup = async () => {
        if (!formName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, COLLECTION), {
                name: formName.trim(), subtitle: formSubtitle.trim(),
                imageUrl: formImageUrl.trim(), order: bookGroups.length, createdAt: Date.now()
            });
            const newGroup = {
                id: docRef.id, name: formName.trim(), subtitle: formSubtitle.trim(),
                imageUrl: formImageUrl.trim(), order: bookGroups.length, books: [], createdAt: Date.now()
            };
            setBookGroups(prev => [...prev, newGroup].sort((a, b) => (a.order || 0) - (b.order || 0)));
            showToast('Đã thêm nhóm sách thành công!', 'success');
            resetForm(); setShowAddGroup(false);
        } catch (e) {
            console.error('Lỗi khi thêm nhóm sách:', e);
            showToast('Lỗi khi thêm nhóm sách: ' + e.message, 'error');
        }
    };

    const handleAddBook = async () => {
        if (!formName.trim() || !groupId) return;
        const booksCount = currentGroup?.books?.length || 0;
        try {
            const docRef = await addDoc(collection(db, COLLECTION, groupId, 'books'), {
                name: formName.trim(), subtitle: formSubtitle.trim(), color: formColor,
                wordCount: formWordCount.trim(), description: formDescription.trim(), order: booksCount, createdAt: Date.now()
            });
            const newBook = {
                id: docRef.id, name: formName.trim(), subtitle: formSubtitle.trim(), color: formColor,
                wordCount: formWordCount.trim(), description: formDescription.trim(), order: booksCount, chapters: [], createdAt: Date.now()
            };
            setBookGroups(prev => prev.map(g => g.id === groupId ? { ...g, books: [...(g.books || []), newBook].sort((a, b) => (a.order || 0) - (b.order || 0)) } : g));
            showToast('Đã thêm sách thành công!', 'success');
            resetForm(); setShowAddBook(false);
        } catch (e) {
            console.error('Lỗi khi thêm sách:', e);
            showToast('Lỗi khi thêm sách: ' + e.message, 'error');
        }
    };

    const handleAddChapter = async () => {
        if (!formName.trim() || !groupId || !bookId) return;
        const chaptersCount = currentBook?.chapters?.length || 0;
        try {
            const docRef = await addDoc(collection(db, COLLECTION, groupId, 'books', bookId, 'chapters'), {
                name: formName.trim(), order: chaptersCount, createdAt: Date.now()
            });
            const newChapter = { id: docRef.id, name: formName.trim(), order: chaptersCount, lessons: [], createdAt: Date.now() };
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? { ...b, chapters: [...(b.chapters || []), newChapter].sort((a, b) => (a.order || 0) - (b.order || 0)) } : b)
            } : g));
            showToast('Đã thêm chương thành công!', 'success');
            resetForm(); setShowAddChapter(false);
        } catch (e) {
            console.error('Lỗi khi thêm chương:', e);
            showToast('Lỗi khi thêm chương: ' + e.message, 'error');
        }
    };

    const handleAddLesson = async () => {
        if (!formName.trim() || !groupId || !bookId || !chapterId) return;
        const lessonsCount = currentChapter?.lessons?.length || 0;
        try {
            const docRef = await addDoc(
                collection(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons'),
                { name: formName.trim(), vocab: [], order: lessonsCount, createdAt: Date.now() }
            );
            const newLesson = {
                id: docRef.id, name: formName.trim(), vocab: [], order: lessonsCount, isPremium: false, createdAt: Date.now(),
                _docPath: `${COLLECTION}/${groupId}/books/${bookId}/chapters/${chapterId}/lessons/${docRef.id}`
            };
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chapterId ? { ...c, lessons: [...(c.lessons || []), newLesson].sort((a, b) => (a.order || 0) - (b.order || 0)) } : c)
                } : b)
            } : g));
            showToast('Đã thêm bài học thành công!', 'success');
            resetForm(); setShowAddLesson(false);
        } catch (e) {
            console.error('Lỗi khi thêm bài học:', e);
            showToast('Lỗi khi thêm bài học: ' + e.message, 'error');
        }
    };

    const handleDeleteGroup = async (gId) => {
        if (!await showConfirm('Xóa nhóm sách này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, COLLECTION, gId));
            setBookGroups(prev => prev.filter(g => g.id !== gId));
            showToast('Đã xóa nhóm sách thành công!', 'success');
            if (groupId === gId) navigateTo({});
        } catch (e) {
            console.error('Lỗi khi xóa nhóm sách:', e);
            showToast('Lỗi khi xóa nhóm sách: ' + e.message, 'error');
        }
    };

    const handleDeleteBook = async (bId) => {
        if (!await showConfirm('Xóa sách này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, COLLECTION, groupId, 'books', bId));
            setBookGroups(prev => prev.map(g => g.id === groupId ? { ...g, books: g.books.filter(b => b.id !== bId) } : g));
            showToast('Đã xóa sách thành công!', 'success');
            if (bookId === bId) navigateTo({ group: groupId });
        } catch (e) {
            console.error('Lỗi khi xóa sách:', e);
            showToast('Lỗi khi xóa sách: ' + e.message, 'error');
        }
    };

    const handleDeleteChapter = async (cId) => {
        if (!await showConfirm('Xóa chương này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', cId));
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? { ...b, chapters: b.chapters.filter(c => c.id !== cId) } : b)
            } : g));
            showToast('Đã xóa chương thành công!', 'success');
            if (chapterId === cId) navigateTo({ group: groupId, book: bookId });
        } catch (e) {
            console.error('Lỗi khi xóa chương:', e);
            showToast('Lỗi khi xóa chương: ' + e.message, 'error');
        }
    };

    const handleDeleteLesson = async (lId) => {
        if (!await showConfirm('Xóa bài học này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lId));
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chapterId ? { ...c, lessons: c.lessons.filter(l => l.id !== lId) } : c)
                } : b)
            } : g));
            showToast('Đã xóa bài học thành công!', 'success');
            if (lessonId === lId) navigateTo({ group: groupId, book: bookId, chapter: chapterId });
        } catch (e) {
            console.error('Lỗi khi xóa bài học:', e);
            showToast('Lỗi khi xóa bài học: ' + e.message, 'error');
        }
    };

    const handleToggleLessonPremium = async (e, lessonItem, targetChapterId = null) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const activeChapterId = targetChapterId || chapterId || lessonItem.chapterId;
        if (!isAdmin || !groupId || !bookId || !activeChapterId) {
            console.warn('handleToggleLessonPremium missing IDs:', { isAdmin, groupId, bookId, activeChapterId });
            return;
        }
        try {
            const nextVal = !lessonItem.isPremium;
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', activeChapterId, 'lessons', lessonItem.id);
            await updateDoc(lessonRef, { isPremium: nextVal });
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === activeChapterId ? {
                        ...c,
                        lessons: c.lessons.map(l => l.id === lessonItem.id ? { ...l, isPremium: nextVal } : l)
                    } : c)
                } : b)
            } : g));
            showToast(`Đã chuyển bài học sang: ${nextVal ? 'Premium' : 'Miễn phí'}`, 'success');
        } catch (e) {
            console.error('Lỗi toggle premium lesson:', e);
            showToast('Lỗi: ' + e.message, 'error');
        }
    };

    const handleStartEditGroup = (group) => {
        setEditTarget(group);
        setFormName(group.name || '');
        setFormSubtitle(group.subtitle || '');
        setFormImageUrl(group.imageUrl || '');
        setShowEditGroup(true);
    };

    const handleSaveEditGroup = async () => {
        if (!editTarget || !formName.trim()) return;
        try {
            const ref = doc(db, COLLECTION, editTarget.id);
            await updateDoc(ref, {
                name: formName.trim(),
                subtitle: formSubtitle.trim(),
                imageUrl: formImageUrl.trim()
            });
            setBookGroups(prev => prev.map(g => g.id === editTarget.id ? {
                ...g, name: formName.trim(), subtitle: formSubtitle.trim(), imageUrl: formImageUrl.trim()
            } : g));
            showToast('Đã cập nhật nhóm sách!', 'success');
            resetForm(); setShowEditGroup(false);
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };

    const handleStartEditBook = (book) => {
        setEditTarget(book);
        setFormName(book.name || '');
        setFormSubtitle(book.subtitle || '');
        setFormColor(book.color || '#4F87FF');
        setFormWordCount(book.wordCount || '');
        setFormDescription(book.description || '');
        setShowEditBook(true);
    };

    const handleSaveEditBook = async () => {
        if (!editTarget || !formName.trim() || !groupId) return;
        try {
            const ref = doc(db, COLLECTION, groupId, 'books', editTarget.id);
            await updateDoc(ref, {
                name: formName.trim(), subtitle: formSubtitle.trim(), color: formColor,
                wordCount: formWordCount.trim(), description: formDescription.trim()
            });
            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === editTarget.id ? {
                    ...b, name: formName.trim(), subtitle: formSubtitle.trim(), color: formColor,
                    wordCount: formWordCount.trim(), description: formDescription.trim()
                } : b)
            } : g));
            showToast('Đã cập nhật sách!', 'success');
            resetForm(); setShowEditBook(false);
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };

    const handleEditVocab = (index) => {
        const v = vocabWithAudio[index];
        if (!v) return;
        setEditingVocabIndex(index);
        setEditingVocabData({ ...v });
    };

    const handleSaveVocabEdit = async () => {
        if (editingVocabIndex === null || !editingVocabData || !lessonId) return;
        try {
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const newVocab = [...(currentLesson?.vocab || [])];
            const oldItem = { ...newVocab[editingVocabIndex] };
            newVocab[editingVocabIndex] = { ...editingVocabData };
            await updateDoc(lessonRef, { vocab: newVocab });

            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chapterId ? {
                        ...c,
                        lessons: c.lessons.map(l => l.id === lessonId ? { ...l, vocab: newVocab } : l)
                    } : c)
                } : b)
            } : g));
            setEditingVocabIndex(null);
            setEditingVocabData(null);
            showToast('Đã cập nhật từ vựng!', 'success');
        } catch (e) {
            console.error('Error saving vocab edit:', e);
            showToast('Lỗi khi lưu: ' + e.message, 'error');
        }
    };

    const handleDeleteVocab = async (index) => {
        if (!await showConfirm('Xóa từ vựng này khỏi bài học?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const newVocab = (currentLesson?.vocab || []).filter((_, i) => i !== index);
            await updateDoc(lessonRef, { vocab: newVocab });

            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chapterId ? {
                        ...c,
                        lessons: c.lessons.map(l => l.id === lessonId ? { ...l, vocab: newVocab } : l)
                    } : c)
                } : b)
            } : g));
            showToast('Đã xóa từ vựng!', 'success');
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };

    const handleReorderChapter = async (ci, direction) => {
        const chapters = currentBook?.chapters || [];
        const swapIdx = ci + direction;
        if (swapIdx < 0 || swapIdx >= chapters.length) return;
        try {
            const batch = writeBatch(db);
            const chA = chapters[ci];
            const chB = chapters[swapIdx];
            batch.update(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chA.id), { order: swapIdx });
            batch.update(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chB.id), { order: ci });
            await batch.commit();

            const reordered = [...chapters];
            reordered[ci] = { ...chA, order: swapIdx };
            reordered[swapIdx] = { ...chB, order: ci };
            reordered.sort((a, b) => (a.order || 0) - (b.order || 0));

            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? { ...b, chapters: reordered } : b)
            } : g));
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };

    const handleReorderLesson = async (chId, li, direction) => {
        const chapter = currentBook?.chapters?.find(c => c.id === chId);
        if (!chapter) return;
        const lessons = chapter.lessons || [];
        const swapIdx = li + direction;
        if (swapIdx < 0 || swapIdx >= lessons.length) return;
        try {
            const batch = writeBatch(db);
            const lsA = lessons[li];
            const lsB = lessons[swapIdx];
            batch.update(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chId, 'lessons', lsA.id), { order: swapIdx });
            batch.update(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chId, 'lessons', lsB.id), { order: li });
            await batch.commit();

            const reordered = [...lessons];
            reordered[li] = { ...lsA, order: swapIdx };
            reordered[swapIdx] = { ...lsB, order: li };
            reordered.sort((a, b) => (a.order || 0) - (b.order || 0));

            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chId ? { ...c, lessons: reordered } : c)
                } : b)
            } : g));
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };

    const handleImportJson = async () => {
        if (!jsonInput.trim() || !lessonId) return;
        try {
            const vocabArray = JSON.parse(jsonInput.trim());
            if (!Array.isArray(vocabArray)) { showToast('JSON phải là mảng []', 'warning'); return; }
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const existing = [...(currentLesson?.vocab || [])];
            const normalizeWord = (w) => (w || '').split('（')[0].split('(')[0].trim();
            let updatedCount = 0;
            let addedCount = 0;
            for (const item of vocabArray) {
                const itemWord = normalizeWord(item.word || item.front || '');
                if (!itemWord) continue;
                const existingIndex = existing.findIndex(v => normalizeWord(v.word || v.front || '') === itemWord);
                if (existingIndex >= 0) {
                    const merged = { ...existing[existingIndex] };
                    for (const [key, value] of Object.entries(item)) {
                        if (value !== undefined && value !== null && value !== '') {
                            merged[key] = value;
                        }
                    }
                    existing[existingIndex] = merged;
                    updatedCount++;
                } else {
                    existing.push(item);
                    addedCount++;
                }
            }
            await updateDoc(lessonRef, { vocab: existing });

            setBookGroups(prev => prev.map(g => g.id === groupId ? {
                ...g,
                books: g.books.map(b => b.id === bookId ? {
                    ...b,
                    chapters: b.chapters.map(c => c.id === chapterId ? {
                        ...c,
                        lessons: c.lessons.map(l => l.id === lessonId ? { ...l, vocab: existing } : l)
                    } : c)
                } : b)
            } : g));

            const msgs = [];
            if (addedCount > 0) msgs.push(`Thêm ${addedCount} từ mới`);
            if (updatedCount > 0) msgs.push(`Cập nhật ${updatedCount} từ`);
            showToast(msgs.join(', ') || 'Không có thay đổi', msgs.length > 0 ? 'success' : 'info');
            resetForm(); setShowJsonImport(false);
        } catch (e) { showToast('JSON không hợp lệ: ' + e.message, 'error'); }
    };

    const handleFixAudio = async (vocabIndex, customReading = null) => {
        if (!lessonId || !groupId || !bookId || !chapterId) return;
        setFixAudioLoading(true);
        try {
            const vocab = currentLesson?.vocab || [];
            const v = vocab[vocabIndex];
            if (!v) throw new Error('Không tìm thấy từ vựng');
            const word = v.word || v.front || '';
            let textToGenerate;
            if (customReading) {
                textToGenerate = customReading.trim();
            } else {
                const readingMatch = word.match(/[（(]([^）)]+)[）)]/);
                textToGenerate = readingMatch ? readingMatch[1].trim() : (v.reading || word.split('（')[0].split('(')[0].trim());
            }
            if (!textToGenerate) throw new Error('Không có dữ liệu phát âm');
            const result = await generateAudioSilentWithVoice(textToGenerate, 'ryota');
            if (!result?.base64) throw new Error('Không thể tạo audio. Vui lòng thử lại.');
            const audioColPath = `${COLLECTION}/${groupId}/books/${bookId}/chapters/${chapterId}/lessons/${lessonId}/vocabAudio`;
            const wordDocId = `${vocabIndex}_word`;
            await setDoc(doc(db, audioColPath, wordDocId), {
                base64: result.base64, vocabIndex, clipType: 'word', updatedAt: Date.now()
            });
            showToast(`Đã tạo lại audio cho「${word.split('（')[0].split('(')[0].trim()}」(đọc: ${textToGenerate})`, 'success');
            setFixAudioIndex(null);
            setFixAudioCustomReading('');
            await loadLessonAudio();
        } catch (e) {
            console.error('Fix audio error:', e);
            showToast('Lỗi: ' + e.message, 'error');
        } finally {
            setFixAudioLoading(false);
        }
    };

    const handleCreateStudySetFromLesson = async () => {
        if (!userId) {
            showToast('Vui lòng đăng nhập để tạo học phần', 'warning');
            return;
        }
        if (!studySetName.trim()) {
            showToast('Vui lòng nhập tên học phần', 'warning');
            return;
        }
        setCreationLoading(true);
        try {
            const currentTargetLang = localStorage.getItem('quizki_target_language') || 'ja';
            let targetParentId = selectedParentFolderId;
            if (isCreatingNewParentFolder && newParentFolderName.trim()) {
                const pfRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/studySets`), {
                    name: newParentFolderName.trim(),
                    type: 'folder',
                    targetLanguage: currentTargetLang,
                    createdAt: serverTimestamp()
                });
                targetParentId = pfRef.id;
            }
            const setRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/studySets`), {
                name: studySetName.trim(),
                description: studySetDesc.trim(),
                parentId: targetParentId || null,
                targetLanguage: currentTargetLang,
                sourceLesson: { groupId, bookId, chapterId, lessonId },
                createdAt: serverTimestamp()
            });
            const newSetId = setRef.id;
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            const selectedVocabs = vocabWithAudio.filter((_, i) => selectedVocabIndices.has(i));
            for (const v of selectedVocabs) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                if (existingCard) {
                    if (existingCard.folderId !== newSetId) {
                        const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, existingCard.id);
                        batch.update(cardDocRef, { folderId: newSetId });
                        updatedCount++;
                        if (onAddVocabToSRS) {
                            onAddVocabToSRS({ ...existingCard, folderId: newSetId });
                        }
                    }
                } else {
                    const cardDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/vocabulary`));
                    const newCardData = {
                        front: word.trim(),
                        back: (v.meaning || v.back || '').trim(),
                        ipa: (v.ipa || '').trim(),
                        targetLanguage: currentTargetLang,
                        synonym: (v.synonym || '').trim(),
                        sinoVietnamese: (v.sinoVietnamese || '').trim(),
                        synonymSinoVietnamese: '',
                        example: (v.example || '').trim(),
                        exampleMeaning: (v.exampleMeaning || '').trim(),
                        nuance: (v.nuance || v.note || '').trim(),
                        pos: v.pos || '',
                        level: v.level || '',
                        audioBase64: v.audioBase64 || null,
                        imageBase64: v.imageUrl || null,
                        createdAt: serverTimestamp(),
                        userId: userId,
                        folderId: newSetId,
                        intervalIndex_back: -1,
                        correctStreak_back: 0,
                        nextReview_back: new Date(),
                        intervalIndex_synonym: v.synonym ? -1 : -999,
                        correctStreak_synonym: 0,
                        nextReview_synonym: v.synonym ? new Date() : new Date(9999, 0, 1),
                        intervalIndex_example: v.example ? -1 : -999,
                        correctStreak_example: 0,
                        nextReview_example: v.example ? new Date() : new Date(9999, 0, 1),
                        easeFactor: 2.5,
                        totalReps: 0,
                        srsEnabled: true,
                    };
                    if (v.exampleAudioBase64) newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) newCardData.audioBase64 = res.base64;
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
                    if (onAddVocabToSRS) {
                        onAddVocabToSRS({ ...newCardData, id: cardDocRef.id });
                    }
                }
            }
            await batch.commit();
            showToast(`Đã tạo học phần và thêm ${addedCount + updatedCount} từ vựng!`, "success");
            setShowCreateStudySetModal(false);
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (err) {
            console.error("Lỗi tạo học phần:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setCreationLoading(false);
        }
    };

    const handleLinkToExistingStudySet = async () => {
        if (!selectedExistingStudySetId) {
            showToast('Vui lòng chọn học phần', 'warning');
            return;
        }
        if (!userId) return;
        setCreationLoading(true);
        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/studySets`, selectedExistingStudySetId), {
                sourceLesson: { groupId, bookId, chapterId, lessonId }
            });
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            const selectedVocabs = vocabWithAudio.filter((_, i) => selectedVocabIndices.has(i));
            for (const v of selectedVocabs) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                if (existingCard) {
                    if (existingCard.folderId !== selectedExistingStudySetId) {
                        const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, existingCard.id);
                        batch.update(cardDocRef, { folderId: selectedExistingStudySetId });
                        updatedCount++;
                    }
                } else {
                    const cardDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/vocabulary`));
                    const newCardData = {
                        front: word.trim(),
                        back: (v.meaning || v.back || '').trim(),
                        ipa: (v.ipa || '').trim(),
                        targetLanguage: localStorage.getItem('quizki_target_language') || 'ja',
                        synonym: (v.synonym || '').trim(),
                        sinoVietnamese: (v.sinoVietnamese || '').trim(),
                        synonymSinoVietnamese: '',
                        example: (v.example || '').trim(),
                        exampleMeaning: (v.exampleMeaning || '').trim(),
                        nuance: (v.nuance || v.note || '').trim(),
                        pos: v.pos || '',
                        level: v.level || '',
                        audioBase64: v.audioBase64 || null,
                        imageBase64: v.imageUrl || null,
                        createdAt: serverTimestamp(),
                        userId: userId,
                        folderId: selectedExistingStudySetId,
                        intervalIndex_back: -1,
                        correctStreak_back: 0,
                        nextReview_back: new Date(),
                        intervalIndex_synonym: v.synonym ? -1 : -999,
                        correctStreak_synonym: 0,
                        nextReview_synonym: v.synonym ? new Date() : new Date(9999, 0, 1),
                        intervalIndex_example: v.example ? -1 : -999,
                        correctStreak_example: 0,
                        nextReview_example: v.example ? new Date() : new Date(9999, 0, 1),
                        easeFactor: 2.5,
                        totalReps: 0,
                        srsEnabled: true,
                    };
                    if (v.exampleAudioBase64) newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) newCardData.audioBase64 = res.base64;
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
                }
            }
            await batch.commit();
            showToast(`Đã liên kết học phần và thêm từ vựng!`, "success");
            setShowLinkStudySetModal(false);
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (err) {
            console.error("Lỗi liên kết học phần:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setCreationLoading(false);
        }
    };

    const handleSyncVocabWithStudySet = async () => {
        if (!linkedStudySet || !userId) return;
        setCreationLoading(true);
        try {
            const currentTargetLang = localStorage.getItem('quizki_target_language') || 'ja';
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            for (const v of vocabWithAudio) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                if (existingCard) {
                    if (existingCard.folderId !== linkedStudySet.id) {
                        const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, existingCard.id);
                        batch.update(cardDocRef, { folderId: linkedStudySet.id });
                        updatedCount++;
                    }
                } else {
                    const cardDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/vocabulary`));
                    const newCardData = {
                        front: word.trim(),
                        back: (v.meaning || v.back || '').trim(),
                        ipa: (v.ipa || '').trim(),
                        targetLanguage: currentTargetLang,
                        synonym: (v.synonym || '').trim(),
                        sinoVietnamese: (v.sinoVietnamese || '').trim(),
                        synonymSinoVietnamese: '',
                        example: (v.example || '').trim(),
                        exampleMeaning: (v.exampleMeaning || '').trim(),
                        nuance: (v.nuance || v.note || '').trim(),
                        pos: v.pos || '',
                        level: v.level || '',
                        audioBase64: v.audioBase64 || null,
                        imageBase64: v.imageUrl || null,
                        createdAt: serverTimestamp(),
                        userId: userId,
                        folderId: linkedStudySet.id,
                        intervalIndex_back: -1,
                        correctStreak_back: 0,
                        nextReview_back: new Date(),
                        intervalIndex_synonym: v.synonym ? -1 : -999,
                        correctStreak_synonym: 0,
                        nextReview_synonym: v.synonym ? new Date() : new Date(9999, 0, 1),
                        intervalIndex_example: v.example ? -1 : -999,
                        correctStreak_example: 0,
                        nextReview_example: v.example ? new Date() : new Date(9999, 0, 1),
                        easeFactor: 2.5,
                        totalReps: 0,
                        srsEnabled: true,
                    };
                    if (v.exampleAudioBase64) newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) newCardData.audioBase64 = res.base64;
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
                }
            }
            await batch.commit();
            showToast(`Đã đồng bộ từ vựng!`, "success");
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (err) {
            console.error("Lỗi đồng bộ học phần:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setCreationLoading(false);
        }
    };

    const handleUnlinkStudySet = async () => {
        if (!linkedStudySet || !userId) return;
        if (!await showConfirm('Hủy liên kết học phần này với bài học? Học phần và từ vựng của bạn vẫn sẽ được giữ lại.', { confirmText: 'Hủy liên kết' })) return;
        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/studySets`, linkedStudySet.id), {
                sourceLesson: null
            });
            showToast('Đã hủy liên kết học phần.', 'success');
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (e) {
            console.error('Error unlinking study set:', e);
            showToast('Lỗi: ' + e.message, 'error');
        }
    };

    const handleDeleteStudySet = async () => {
        if (!linkedStudySet || !userId) return;
        if (!onDeleteFolder) return;
        if (!await showConfirm('Xóa hoàn toàn học phần này? Toàn bộ từ vựng liên kết bên trong sẽ chuyển sang "Chưa phân loại".', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await onDeleteFolder(linkedStudySet.id);
            showToast('Đã xóa học phần thành công.', 'success');
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (e) {
            console.error('Error deleting study set:', e);
            showToast('Lỗi: ' + e.message, 'error');
        }
    };

    const isVocabInUserList = (vocab) => {
        const word = vocab.word || vocab.front || '';
        const n = word.split('（')[0].split('(')[0].trim();
        return allUserCards.some(c => c.front.split('（')[0].split('(')[0].trim() === n);
    };

    const getLessonProgressInfo = useCallback((gId, bId, chId, lesson) => {
        const vocabLen = lesson.vocab?.length || 0;
        if (vocabLen === 0) return { percent: 0, count: 0, total: 0 };
        const key = `book_reveal_${gId}_${bId}_${chId}_${lesson.id}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const arr = JSON.parse(saved);
                const count = new Set(arr).size;
                return { percent: Math.round((count / vocabLen) * 100), count, total: vocabLen };
            }
        } catch(e) {}
        return { percent: 0, count: 0, total: vocabLen };
    }, []);

    const getBookProgress = useCallback((gId, book) => {
        let totalVocab = 0;
        let revealedCount = 0;
        if (!book.chapters) return 0;
        for (const chapter of book.chapters) {
            if (!chapter.lessons) continue;
            for (const lesson of chapter.lessons) {
                const vocabLen = lesson.vocab?.length || 0;
                totalVocab += vocabLen;
                if (vocabLen > 0) {
                    const key = `book_reveal_${gId}_${book.id}_${chapter.id}_${lesson.id}`;
                    try {
                        const saved = localStorage.getItem(key);
                        if (saved) {
                            const arr = JSON.parse(saved);
                            revealedCount += new Set(arr).size;
                        }
                    } catch(e) {}
                }
            }
        }
        if (totalVocab === 0) return 0;
        return Math.round((revealedCount / totalVocab) * 100);
    }, []);

    const getGroupProgress = useCallback((group) => {
        let totalVocab = 0;
        let revealedCount = 0;
        if (!group.books) return 0;
        for (const book of group.books) {
            if (!book.chapters) continue;
            for (const chapter of book.chapters) {
                if (!chapter.lessons) continue;
                for (const lesson of chapter.lessons) {
                    const vocabLen = lesson.vocab?.length || 0;
                    totalVocab += vocabLen;
                    if (vocabLen > 0) {
                        const key = `book_reveal_${group.id}_${book.id}_${chapter.id}_${lesson.id}`;
                        try {
                            const saved = localStorage.getItem(key);
                            if (saved) {
                                const arr = JSON.parse(saved);
                                revealedCount += new Set(arr).size;
                            }
                        } catch(e) {}
                    }
                }
            }
        }
        if (totalVocab === 0) return 0;
        return Math.round((revealedCount / totalVocab) * 100);
    }, []);

    return {
        t, targetLanguage, isEnglishMode,
        searchParams, setSearchParams, navigate,
        bookGroups, setBookGroups, loading, setLoading,
        groupId, bookId, chapterId, lessonId,
        showAddGroup, setShowAddGroup,
        showAddBook, setShowAddBook,
        showAddChapter, setShowAddChapter,
        showAddLesson, setShowAddLesson,
        showJsonImport, setShowJsonImport,
        editingItem, setEditingItem,
        editingNameItem, setEditingNameItem,
        editingNameValue, setEditingNameValue,
        showNuanceIndex, setShowNuanceIndex,
        showEditGroup, setShowEditGroup,
        showEditBook, setShowEditBook,
        editTarget, setEditTarget,
        formName, setFormName,
        formSubtitle, setFormSubtitle,
        formColor, setFormColor,
        formDescription, setFormDescription,
        formWordCount, setFormWordCount,
        formImageUrl, setFormImageUrl,
        jsonInput, setJsonInput,
        addingVocabIndex, setAddingVocabIndex,
        addedVocabSet, setAddedVocabSet,
        revealedCards, setRevealedCards,
        persistedRevealed, setPersistedRevealed,
        blurMode, setBlurMode,
        editingVocabIndex, setEditingVocabIndex,
        editingVocabData, setEditingVocabData,
        editingCardRef,
        availableFolders, selectedFolderId, setSelectedFolderId,
        showCreateStudySetModal, setShowCreateStudySetModal,
        showLinkStudySetModal, setShowLinkStudySetModal,
        studySetName, setStudySetName,
        studySetDesc, setStudySetDesc,
        selectedParentFolderId, setSelectedParentFolderId,
        isCreatingNewParentFolder, setIsCreatingNewParentFolder,
        newParentFolderName, setNewParentFolderName,
        selectedVocabIndices, setSelectedVocabIndices,
        selectedExistingStudySetId, setSelectedExistingStudySetId,
        creationLoading, setCreationLoading,
        showTOC, setShowTOC,
        searchQuery, setSearchQuery,
        activeFilter, setActiveFilter,
        lessonAudioMap, setLessonAudioMap,
        fixAudioIndex, setFixAudioIndex,
        fixAudioCustomReading, setFixAudioCustomReading,
        fixAudioLoading, setFixAudioLoading,
        showPremiumModal, setShowPremiumModal,
        lockedPkgName, setLockedPkgName,
        activeBookGroups, filteredGroups,
        currentGroup, currentBook, currentChapter, currentLesson, vocabWithAudio,
        linkedStudySet, syncStatus,
        loadAllData, loadLessonAudio, revealCard, handleReBlurAll, handleResetProgress,
        navigateTo, goBack, resetForm,
        handleAddGroup, handleAddBook, handleAddChapter, handleAddLesson,
        handleDeleteGroup, handleDeleteBook, handleDeleteChapter, handleDeleteLesson,
        handleToggleLessonPremium, handleStartEditGroup, handleSaveEditGroup,
        handleStartEditBook, handleSaveEditBook, handleEditVocab, handleSaveVocabEdit,
        handleDeleteVocab, handleReorderChapter, handleReorderLesson, handleImportJson,
        handleFixAudio, handleCreateStudySetFromLesson, handleLinkToExistingStudySet,
        handleSyncVocabWithStudySet, handleUnlinkStudySet, handleDeleteStudySet,
        isVocabInUserList, getLessonProgressInfo, getBookProgress, getGroupProgress
    };
};
