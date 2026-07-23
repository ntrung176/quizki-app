import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Edit, ChevronRight, Check, X, Lightbulb, Upload, FolderPlus, FileText, Search, Save, Layers, Copy, Folder, Volume2, ChevronUp, ChevronDown, RefreshCw, Mic, Wrench, EyeOff, RotateCcw, Languages, Lock, Unlock } from 'lucide-react'
import { db, appId } from '../../config/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { getSharedBookGroups, getCachedBookGroups } from '../../utils/bookService';
import { showToast, showConfirm } from '../../utils/toast';
import { speakJapanese, playAudio, generateAudioSilentWithVoice } from '../../utils/audio';
import FuriganaText from '../ui/FuriganaText';
import { accentNumberToPitchParts } from '../../utils/pitchAccent';
import { ensureFuriganaFormat } from '../../utils/furiganaHelper';
import { TopTabBar, PremiumLockedModal } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
import { useLanguage } from '../../context/LanguageContext';

// ==================== REUSABLE COMPONENTS (outside BookScreen to prevent re-mount) ====================
const FormModal = ({ show, onClose, title, onSave, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-4">{children}</div>
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Hủy</button>
                    <button onClick={onSave} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold">Lưu</button>
                </div>
            </div>
        </div>
    );
};
const InputField = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none" />
    </div>
);
// ==================== BOOK SCREEN ====================
const BookScreen = ({ 
    isAdmin = false, 
    onAddVocabToSRS, 
    onGeminiAssist, 
    onGenerateMoreExample,
    allUserCards = [], 
    userId = null,
    folders = [],
    parentFolders = [],
    onDeleteFolder,
    onAddFolder,
    onMoveStudySetToParentFolder,
    profile = null
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const fadeWholePage = useMenuTransition();
    // Premium Locked states
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('Premium');

    // Data states
    const [bookGroups, setBookGroups] = useState(() => getCachedBookGroups() || []);
    const [loading, setLoading] = useState(!getCachedBookGroups());
    // Navigation: groupId -> bookId -> chapterId -> lessonId (short param names for cleaner URLs)
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
    // Persisted progress — cards that have been flipped at least once (saved to localStorage)
    const [persistedRevealed, setPersistedRevealed] = useState(new Set());
    // Blur mode: 'vn' = blur Vietnamese (default), 'jp' = blur Japanese
    const [blurMode, setBlurMode] = useState('vn');
    // Vocab editing states
    const [editingVocabIndex, setEditingVocabIndex] = useState(null);
    const [editingVocabData, setEditingVocabData] = useState(null);
    // Folder selection for SRS (redefined as a useMemo from the real folders prop)
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
    // Table of contents
    const [showTOC, setShowTOC] = useState(true);
    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const getGroupCategory = (group) => {
        const name = (group.name || '').toLowerCase();
        const subtitle = (group.subtitle || '').toLowerCase();
        if (name.includes('mimikara') || name.includes('jlpt') || subtitle.includes('jlpt') || name.includes('tango')) {
            return 'JLPT';
        }
        if (name.includes('daichi') || name.includes('irodori') || name.includes('minna') || name.includes('sách')) {
            return 'TEXTBOOK';
        }
        return 'CUSTOM';
    };
    const filteredGroups = useMemo(() => {
        return bookGroups.filter(group => {
            const name = (group.name || '').toLowerCase();
            const subtitle = (group.subtitle || '').toLowerCase();
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || subtitle.includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            if (activeFilter === 'ALL') return true;
            const cat = getGroupCategory(group);
            if (activeFilter === 'JLPT') return cat === 'JLPT';
            if (activeFilter === 'TEXTBOOK') return cat === 'TEXTBOOK';
            if (activeFilter === 'CUSTOM') return cat === 'CUSTOM';
            return true;
        });
    }, [bookGroups, searchQuery, activeFilter]);
    // Audio stored separately to avoid Firestore 1MB document limit
    const [lessonAudioMap, setLessonAudioMap] = useState({});
    const bgAudioAbortRef = useRef(false);
    const editingCardRef = useRef(null);
    // Fix audio states
    const [fixAudioIndex, setFixAudioIndex] = useState(null);
    const [fixAudioCustomReading, setFixAudioCustomReading] = useState('');
    const [fixAudioLoading, setFixAudioLoading] = useState(false);
    // Debounce ref for saving progress to Firebase
    const saveProgressTimerRef = useRef(null);
    const COLLECTION = 'bookGroups';
    // ==================== LOAD DATA ====================
    useEffect(() => {
        loadAllData();
    }, []);
    // Load audio from subcollection when lesson changes
    const loadLessonAudio = useCallback(async () => {
        if (!groupId || !bookId || !chapterId || !lessonId) {
            setLessonAudioMap({});
            return;
        }
        try {
            const audioColRef = collection(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId, 'vocabAudio');
            const snap = await getDocs(audioColRef);
            const audioMap = {};
            snap.docs.forEach(d => {
                audioMap[d.id] = d.data();
            });
            setLessonAudioMap(audioMap);
        } catch (e) {
            console.error('Error loading lesson audio:', e);
            setLessonAudioMap({});
        }
    }, [groupId, bookId, chapterId, lessonId]);
    // Build a stable key for persisting reveal state per lesson
    const lessonPersistKey = useMemo(() => {
        if (!groupId || !bookId || !chapterId || !lessonId) return null;
        return `book_reveal_${groupId}_${bookId}_${chapterId}_${lessonId}`;
    }, [groupId, bookId, chapterId, lessonId]);
    useEffect(() => {
        loadLessonAudio();
        // Load persisted reveal state: Firebase first, then localStorage fallback
        const loadProgress = async () => {
            if (!lessonPersistKey) {
                setPersistedRevealed(new Set());
                setRevealedCards(new Set());
                return;
            }
            // Try Firebase first if user is logged in
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
                        // Also update localStorage cache
                        try { localStorage.setItem(lessonPersistKey, JSON.stringify(arr)); } catch (e) { /* ignore */ }
                        return;
                    }
                } catch (e) {
                    if (e.code !== 'permission-denied') {
                        console.warn('Could not load progress from Firebase, falling back to localStorage:', e);
                    }
                }
            }
            // Fallback: localStorage
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
    // Persist when a card is revealed
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
                const arr = [...next];
                // Save to localStorage immediately (fast cache)
                if (lessonPersistKey) {
                    try { localStorage.setItem(lessonPersistKey, JSON.stringify(arr)); }
                    catch (e) { /* ignore */ }
                }
                // Debounced save to Firebase (sync across devices)
                if (userId && appId && lessonPersistKey) {
                    if (saveProgressTimerRef.current) clearTimeout(saveProgressTimerRef.current);
                    saveProgressTimerRef.current = setTimeout(async () => {
                        try {
                            const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/bookProgress`, lessonPersistKey);
                            await setDoc(progressDocRef, { revealed: arr, updatedAt: new Date() }, { merge: true });
                        } catch (e) {
                            if (e.code !== 'permission-denied') {
                                console.warn('Could not save progress to Firebase:', e);
                            }
                        }
                    }, 1000); // debounce 1 second
                }
            }
            return next;
        });
    }, [lessonPersistKey, userId]);
    // Re-blur all cards (does NOT affect persisted progress)
    const handleReBlurAll = useCallback(() => {
        setRevealedCards(new Set());
    }, []);
    // Reset all progress (clear persisted + view)
    const handleResetProgress = useCallback(async () => {
        setRevealedCards(new Set());
        setPersistedRevealed(new Set());
        if (lessonPersistKey) {
            try { localStorage.removeItem(lessonPersistKey); } catch (e) { /* ignore */ }
        }
        // Also delete from Firebase
        if (userId && appId && lessonPersistKey) {
            try {
                const progressDocRef = doc(db, `artifacts/${appId}/users/${userId}/bookProgress`, lessonPersistKey);
                await deleteDoc(progressDocRef);
            } catch (e) {
                if (e.code !== 'permission-denied') {
                    console.warn('Could not delete progress from Firebase:', e);
                }
            }
        }
    }, [lessonPersistKey, userId]);
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
    // ==================== NAVIGATION HELPERS ====================
    const currentGroup = useMemo(() => bookGroups.find(g => g.id === groupId), [bookGroups, groupId]);
    const currentBook = useMemo(() => currentGroup?.books?.find(b => b.id === bookId), [currentGroup, bookId]);
    const currentChapter = useMemo(() => currentBook?.chapters?.find(c => c.id === chapterId), [currentBook, chapterId]);
    const currentLesson = useMemo(() => currentChapter?.lessons?.find(l => l.id === lessonId), [currentChapter, lessonId]);
    // Merge vocab with audio from subcollection
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
    // ==================== ADMIN CRUD ====================
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
                imageUrl: formImageUrl.trim(), order: bookGroups.length,
                createdAt: Date.now()
            });
            const newGroup = {
                id: docRef.id,
                name: formName.trim(),
                subtitle: formSubtitle.trim(),
                imageUrl: formImageUrl.trim(),
                order: bookGroups.length,
                books: [],
                createdAt: Date.now()
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
                name: formName.trim(), subtitle: formSubtitle.trim(),
                color: formColor, wordCount: formWordCount.trim(),
                description: formDescription.trim(), order: booksCount,
                createdAt: Date.now()
            });
            const newBook = {
                id: docRef.id,
                name: formName.trim(),
                subtitle: formSubtitle.trim(),
                color: formColor,
                wordCount: formWordCount.trim(),
                description: formDescription.trim(),
                order: booksCount,
                chapters: [],
                createdAt: Date.now()
            };
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: [...(g.books || []), newBook].sort((a, b) => (a.order || 0) - (b.order || 0))
                };
            }));
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
            const newChapter = {
                id: docRef.id,
                name: formName.trim(),
                order: chaptersCount,
                lessons: [],
                createdAt: Date.now()
            };
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: [...(b.chapters || []), newChapter].sort((a, b) => (a.order || 0) - (b.order || 0))
                        };
                    })
                };
            }));
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
                id: docRef.id,
                name: formName.trim(),
                vocab: [],
                order: lessonsCount,
                isPremium: false,
                createdAt: Date.now(),
                _docPath: `${COLLECTION}/${groupId}/books/${bookId}/chapters/${chapterId}/lessons/${docRef.id}`
            };
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chapterId) return c;
                                return {
                                    ...c,
                                    lessons: [...(c.lessons || []), newLesson].sort((a, b) => (a.order || 0) - (b.order || 0))
                                };
                            })
                        };
                    })
                };
            }));
            showToast('Đã thêm bài học thành công!', 'success');
            resetForm(); setShowAddLesson(false);
        } catch (e) {
            console.error('Lỗi khi thêm bài học:', e);
            showToast('Lỗi khi thêm bài học: ' + e.message, 'error');
        }
    };
    // ==================== EDIT GROUP/BOOK ====================
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
            await updateDoc(doc(db, COLLECTION, editTarget.id), {
                name: formName.trim(), subtitle: formSubtitle.trim(), imageUrl: formImageUrl.trim()
            });
            setBookGroups(prev => prev.map(g => {
                if (g.id !== editTarget.id) return g;
                return {
                    ...g,
                    name: formName.trim(),
                    subtitle: formSubtitle.trim(),
                    imageUrl: formImageUrl.trim()
                };
            }));
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
            await updateDoc(doc(db, COLLECTION, groupId, 'books', editTarget.id), {
                name: formName.trim(), subtitle: formSubtitle.trim(),
                color: formColor, wordCount: formWordCount.trim(),
                description: formDescription.trim()
            });
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== editTarget.id) return b;
                        return {
                            ...b,
                            name: formName.trim(),
                            subtitle: formSubtitle.trim(),
                            color: formColor,
                            wordCount: formWordCount.trim(),
                            description: formDescription.trim()
                        };
                    })
                };
            }));
            showToast('Đã cập nhật sách!', 'success');
            resetForm(); setShowEditBook(false);
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };
    // ==================== REORDER CHAPTERS/LESSONS ====================
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

            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return { ...b, chapters: reordered };
                    })
                };
            }));
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

            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chId) return c;
                                return { ...c, lessons: reordered };
                            })
                        };
                    })
                };
            }));
        } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    };
    const handleImportJson = async () => {
        if (!jsonInput.trim() || !lessonId) return;
        try {
            const vocabArray = JSON.parse(jsonInput.trim());
            if (!Array.isArray(vocabArray)) { showToast('JSON phải là mảng []', 'warning'); return; }
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const existing = [...(currentLesson?.vocab || [])];
            // Helper: normalize word for matching (remove furigana in parentheses)
            const normalizeWord = (w) => (w || '').split('（')[0].split('(')[0].trim();
            let updatedCount = 0;
            let addedCount = 0;
            for (const item of vocabArray) {
                const itemWord = normalizeWord(item.word || item.front || '');
                if (!itemWord) continue;
                // Find existing vocab by matching word
                const existingIndex = existing.findIndex(v => {
                    const vWord = normalizeWord(v.word || v.front || '');
                    return vWord === itemWord;
                });
                if (existingIndex >= 0) {
                    // Merge: only update fields that are provided and non-empty in the import
                    const merged = { ...existing[existingIndex] };
                    for (const [key, value] of Object.entries(item)) {
                        if (value !== undefined && value !== null && value !== '') {
                            merged[key] = value;
                        }
                    }
                    existing[existingIndex] = merged;
                    updatedCount++;
                } else {
                    // New vocab: add to end
                    existing.push(item);
                    addedCount++;
                }
            }
            await updateDoc(lessonRef, { vocab: existing });
            
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chapterId) return c;
                                return {
                                    ...c,
                                    lessons: c.lessons.map(l => {
                                        if (l.id !== lessonId) return l;
                                        return { ...l, vocab: existing };
                                    })
                                };
                            })
                        };
                    })
                };
            }));

            const msgs = [];
            if (addedCount > 0) msgs.push(`Thêm ${addedCount} từ mới`);
            if (updatedCount > 0) msgs.push(`Cập nhật ${updatedCount} từ`);
            showToast(msgs.join(', ') || 'Không có thay đổi', msgs.length > 0 ? 'success' : 'info');
            resetForm(); setShowJsonImport(false);
        } catch (e) { showToast('JSON không hợp lệ: ' + e.message, 'error'); }
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
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.filter(b => b.id !== bId)
                };
            }));
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
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.filter(c => c.id !== cId)
                        };
                    })
                };
            }));
            showToast('Đã xóa chương thành công!', 'success');
            if (chapterId === cId) navigateTo({ group: groupId, book: bookId });
        } catch (e) {
            console.error('Lỗi khi xóa chương:', e);
            showToast('Lỗi khi xóa chương: ' + e.message, 'error');
        }
    };
    const handleDeleteLesson = async (cId, lId) => {
        if (!await showConfirm('Xóa bài này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', cId, 'lessons', lId));
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== cId) return c;
                                return {
                                    ...c,
                                    lessons: c.lessons.filter(l => l.id !== lId)
                                };
                            })
                        };
                    })
                };
            }));
            showToast('Đã xóa bài học thành công!', 'success');
            if (lessonId === lId) navigateTo({ group: groupId, book: bookId, chapter: cId });
        } catch (e) {
            console.error('Lỗi khi xóa bài học:', e);
            showToast('Lỗi khi xóa bài học: ' + e.message, 'error');
        }
    };
    const handleToggleLessonPremium = async (e, chId, lesson) => {
        e.stopPropagation();
        try {
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chId, 'lessons', lesson.id);
            const nextVal = !lesson.isPremium;
            await updateDoc(lessonRef, { isPremium: nextVal });
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chId) return c;
                                return {
                                    ...c,
                                    lessons: c.lessons.map(l => {
                                        if (l.id !== lesson.id) return l;
                                        return { ...l, isPremium: nextVal };
                                    })
                                };
                            })
                        };
                    })
                };
            }));
            showToast(`Đã chuyển trạng thái bài học thành ${nextVal ? 'Premium' : 'Miễn phí'}`, 'success');
        } catch (err) {
            console.error('Lỗi toggle premium:', err);
            showToast('Lỗi: ' + err.message, 'error');
        }
    };
    const handleDeleteVocab = async (vocabIndex) => {
        if (!await showConfirm('Xóa từ vựng này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const newVocab = [...(currentLesson?.vocab || [])];
            newVocab.splice(vocabIndex, 1);
            await updateDoc(lessonRef, { vocab: newVocab });
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chapterId) return c;
                                return {
                                    ...c,
                                    lessons: c.lessons.map(l => {
                                        if (l.id !== lessonId) return l;
                                        return { ...l, vocab: newVocab };
                                    })
                                };
                            })
                        };
                    })
                };
            }));
            showToast('Đã xóa từ vựng thành công!', 'success');
        } catch (e) {
            console.error('Lỗi khi xóa từ vựng:', e);
            showToast('Lỗi khi xóa từ vựng: ' + e.message, 'error');
        }
    };
    const handleEditVocab = (vocabIndex) => {
        const v = currentLesson?.vocab?.[vocabIndex];
        if (!v) return;
        setEditingVocabIndex(vocabIndex);
        setEditingVocabData({ ...v });
    };
    const handleSaveVocabEdit = async () => {
        if (editingVocabIndex === null || !editingVocabData) return;
        try {
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const oldVocab = currentLesson?.vocab?.[editingVocabIndex] || {};
            const newVocab = [...(currentLesson?.vocab || [])];
            newVocab[editingVocabIndex] = editingVocabData;
            await updateDoc(lessonRef, { vocab: newVocab });
            // === ADMIN SYNC: Track changes for user vocab sync ===
            if (isAdmin && appId) {
                const word = oldVocab.word || oldVocab.front || editingVocabData.word || editingVocabData.front || '';
                // Detect which fields actually changed
                const trackFields = ['meaning', 'back', 'synonym', 'example', 'exampleMeaning', 'nuance', 'note', 'reading', 'sinoVietnamese', 'pos', 'level'];
                const changes = {};
                for (const field of trackFields) {
                    const oldVal = (oldVocab[field] || '').toString().trim();
                    const newVal = (editingVocabData[field] || '').toString().trim();
                    if (oldVal !== newVal && newVal) {
                        changes[field] = newVal;
                    }
                }
                // Only create update record if there are actual changes  
                if (Object.keys(changes).length > 0 && word) {
                    try {
                        const updatesCol = collection(db, `artifacts/${appId}/bookVocabUpdates`);
                        await addDoc(updatesCol, {
                            word: word.split('（')[0].split('(')[0].trim(),
                            wordFull: word,
                            changes,
                            bookPath: `${groupId}/${bookId}/${chapterId}/${lessonId}`,
                            bookName: currentBook?.name || '',
                            lessonName: currentLesson?.name || '',
                            updatedAt: new Date(),
                            updatedBy: userId || 'admin',
                        });
                    } catch (e) { console.warn('Could not create vocab update record:', e); }
                }
            }
            setBookGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    books: g.books.map(b => {
                        if (b.id !== bookId) return b;
                        return {
                            ...b,
                            chapters: b.chapters.map(c => {
                                if (c.id !== chapterId) return c;
                                return {
                                    ...c,
                                    lessons: c.lessons.map(l => {
                                        if (l.id !== lessonId) return l;
                                        return { ...l, vocab: newVocab };
                                    })
                                };
                            })
                        };
                    })
                };
            }));
            setEditingVocabIndex(null);
            setEditingVocabData(null);
            showToast('Đã cập nhật từ vựng!', 'success');
        } catch (e) {
            console.error('Error saving vocab edit:', e);
            showToast('Lỗi khi lưu: ' + e.message, 'error');
        }
    };
    // ==================== EDIT NAMES (Group/Book/Chapter/Lesson) ====================
    const handleStartEditName = (type, id, currentName) => {
        setEditingNameItem({ type, id });
        setEditingNameValue(currentName);
    };
    const handleSaveEditName = async () => {
        if (!editingNameItem || !editingNameValue.trim()) return;
        try {
            const { type, id } = editingNameItem;
            let ref;
            if (type === 'group') {
                ref = doc(db, COLLECTION, id);
            } else if (type === 'book') {
                ref = doc(db, COLLECTION, groupId, 'books', id);
            } else if (type === 'chapter') {
                ref = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', id);
            } else if (type === 'lesson') {
                ref = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', id);
            }
            if (ref) {
                const nameTrimmed = editingNameValue.trim();
                await updateDoc(ref, { name: nameTrimmed });
                
                setBookGroups(prev => prev.map(g => {
                    if (type === 'group' && g.id === id) {
                        return { ...g, name: nameTrimmed };
                    }
                    if (g.id !== groupId) return g;
                    return {
                        ...g,
                        books: g.books.map(b => {
                            if (type === 'book' && b.id === id) {
                                return { ...b, name: nameTrimmed };
                            }
                            if (b.id !== bookId) return b;
                            return {
                                ...b,
                                chapters: b.chapters.map(c => {
                                    if (type === 'chapter' && c.id === id) {
                                        return { ...c, name: nameTrimmed };
                                    }
                                    if (c.id !== chapterId) return c;
                                    return {
                                        ...c,
                                        lessons: c.lessons.map(l => {
                                            if (type === 'lesson' && l.id === id) {
                                                return { ...l, name: nameTrimmed };
                                            }
                                            return l;
                                        })
                                    };
                                })
                            };
                        })
                    };
                }));
                showToast('Đã cập nhật tên!', 'success');
            }
        } catch (e) {
            console.error('Error saving name edit:', e);
            showToast('Lỗi: ' + e.message, 'error');
        }
        setEditingNameItem(null);
        setEditingNameValue('');
    };
    // Inline edit name component
    const InlineEditName = ({ type, id, currentName, className = '' }) => {
        if (!isAdmin) return <span className={className}>{currentName}</span>;
        if (editingNameItem?.type === type && editingNameItem?.id === id) {
            return (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditName(); if (e.key === 'Escape') { setEditingNameItem(null); setEditingNameValue(''); } }}
                        className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-sky-400 rounded text-sm text-gray-900 dark:text-white outline-none"
                        autoFocus
                    />
                    <button onClick={handleSaveEditName} className="p-0.5 text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingNameItem(null); setEditingNameValue(''); }} className="p-0.5 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
            );
        }
        return (
            <span className={`${className} group/edit cursor-pointer`} onClick={e => { e.stopPropagation(); handleStartEditName(type, id, currentName); }}>
                {currentName}
                <Edit className="w-3 h-3 ml-1 inline opacity-0 group-hover/edit:opacity-50 transition-opacity" />
            </span>
        );
    };
    // ==================== BACKGROUND AUDIO GENERATION ====================
    // Tự động tạo audio ngầm cho từ vựng sách: word → giọng nam (không tạo cho ví dụ)
    useEffect(() => {
        if (!lessonId || !currentLesson?.vocab?.length || !groupId || !bookId || !chapterId) return;
        bgAudioAbortRef.current = false;
        const generateBookAudio = async () => {
            const vocab = currentLesson.vocab;
            const audioColPath = `${COLLECTION}/${groupId}/books/${bookId}/chapters/${chapterId}/lessons/${lessonId}/vocabAudio`;
            for (let i = 0; i < vocab.length; i++) {
                if (bgAudioAbortRef.current) return;
                const v = vocab[i];
                const word = v.word || v.front || '';
                // Generate word audio only (giọng nam - ryota)
                const wordDocId = `${i}_word`;
                if (word && !lessonAudioMap[wordDocId]) {
                    try {
                        const existingDoc = await getDoc(doc(db, audioColPath, wordDocId));
                        if (!existingDoc.exists()) {
                            const result = await generateAudioSilentWithVoice(word, 'ryota');
                            if (result?.base64 && !bgAudioAbortRef.current) {
                                await setDoc(doc(db, audioColPath, wordDocId), {
                                    base64: result.base64, vocabIndex: i, clipType: 'word', updatedAt: Date.now()
                                });
                                console.log(`🔊 Book audio (word/nam): "${word}"`);
                            }
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    } catch (e) { console.warn('Book audio word error:', e.message); }
                }
            }
            // Reload audio map after generation
            if (!bgAudioAbortRef.current) {
                loadLessonAudio();
            }
        };
        // Delay 3s before starting background generation
        const timer = setTimeout(generateBookAudio, 3000);
        return () => { bgAudioAbortRef.current = true; clearTimeout(timer); };
    }, [lessonId, currentLesson?.vocab?.length]);
    // ==================== FIX AUDIO ====================
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
                // Option 2: Manual custom reading input
                textToGenerate = customReading.trim();
            } else {
                // Option 1: Use pronunciation in parentheses, or reading field
                const readingMatch = word.match(/[（(]([^）)]+)[）)]/);
                textToGenerate = readingMatch ? readingMatch[1].trim() : (v.reading || word.split('（')[0].split('(')[0].trim());
            }
            if (!textToGenerate) throw new Error('Không có dữ liệu phát âm');
            const result = await generateAudioSilentWithVoice(textToGenerate, 'ryota');
            if (!result?.base64) throw new Error('Không thể tạo audio. Vui lòng thử lại.');
            // Save to Firestore vocabAudio subcollection
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
    // Memoized study set linked to this lesson
    const linkedStudySet = useMemo(() => {
        if (!folders || !groupId || !bookId || !chapterId || !lessonId) return null;
        return folders.find(f => 
            f.type !== 'folder' && 
            f.sourceLesson && 
            f.sourceLesson.groupId === groupId && 
            f.sourceLesson.bookId === bookId && 
            f.sourceLesson.chapterId === chapterId && 
            f.sourceLesson.lessonId === lessonId
        );
    }, [folders, groupId, bookId, chapterId, lessonId]);
    // Check if the book vocab and linked study set cards are in sync
    const syncStatus = useMemo(() => {
        if (!linkedStudySet || !vocabWithAudio.length) return { isSynced: true, missingCount: 0 };
        let missingCount = 0;
        for (const v of vocabWithAudio) {
            const word = v.word || v.front || '';
            const displayWord = word.split('（')[0].split('(')[0].trim();
            // Check if there is a card in allUserCards that has front === displayWord AND folderId === linkedStudySet.id
            const existsInSet = allUserCards.some(c => {
                const f = c.front.split('（')[0].split('(')[0].trim();
                return f === displayWord && c.folderId === linkedStudySet.id;
            });
            if (!existsInSet) {
                missingCount++;
            }
        }
        return {
            isSynced: missingCount === 0,
            missingCount
        };
    }, [linkedStudySet, vocabWithAudio, allUserCards]);
    // ==================== ADD VOCAB TO SRS ====================
    const handleAddToSRS = async (vocab, index) => {
        if (!onAddVocabToSRS) return;
        const word = vocab.word || vocab.front || '';
        const displayWord = word.split('（')[0].split('(')[0].trim();
        const exists = allUserCards.some(c => {
            const f = c.front.split('（')[0].split('(')[0].trim();
            return f === displayWord;
        });
        if (exists) { 
            // If it exists but is not in the linked study set, update its folderId!
            if (linkedStudySet) {
                const card = allUserCards.find(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                if (card && card.folderId !== linkedStudySet.id) {
                    try {
                        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, card.id), {
                            folderId: linkedStudySet.id
                        });
                        showToast(`Đã liên kết「${displayWord}」vào học phần bài học`, 'success');
                        window.dispatchEvent(new Event('study_sets_updated'));
                    } catch (e) {
                        console.error('Error updating card folderId:', e);
                    }
                }
            }
            setAddedVocabSet(prev => new Set([...prev, index])); 
            return; 
        }
        setAddingVocabIndex(index);
        try {
            const formattedWord = await ensureFuriganaFormat(word, vocab.reading);
            const formattedSynonym = vocab.synonym ? await ensureFuriganaFormat(vocab.synonym) : '';

            await onAddVocabToSRS({
                front: formattedWord,
                back: vocab.meaning || vocab.back || '',
                synonym: formattedSynonym,
                example: vocab.example || '',
                exampleMeaning: vocab.exampleMeaning || '',
                nuance: vocab.nuance || vocab.note || '',
                pos: vocab.pos || '',
                level: vocab.level || '',
                sinoVietnamese: vocab.sinoVietnamese || '',
                synonymSinoVietnamese: '',
                imageBase64: vocab.imageUrl || null,
                audioBase64: vocab.audioBase64 || null,
                exampleAudioBase64: vocab.exampleAudioBase64 || null,
                action: 'stay',
                folderId: linkedStudySet ? linkedStudySet.id : (selectedFolderId || null),
            });
            setAddedVocabSet(prev => new Set([...prev, index]));
        } catch (e) { console.error('Error adding to SRS:', e); }
        finally { setAddingVocabIndex(null); }
    };
    const handleAddAllToSRS = async () => {
        if (!vocabWithAudio.length) return;
        for (let i = 0; i < vocabWithAudio.length; i++) {
            if (!addedVocabSet.has(i)) {
                await handleAddToSRS(vocabWithAudio[i], i);
            }
        }
    };
    // Redesign: create a study set with a batch of cards
    const handleCreateStudySetFromLesson = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!userId) {
            showToast('Vui lòng đăng nhập để thực hiện chức năng này', 'warning');
            return;
        }
        if (!studySetName.trim()) {
            showToast('Vui lòng nhập tên học phần', 'warning');
            return;
        }
        setCreationLoading(true);
        try {
            // 1. Create parent folder if user requested new one
            let targetParentId = selectedParentFolderId;
            if (isCreatingNewParentFolder && newParentFolderName.trim()) {
                const pfRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/studySets`), {
                    name: newParentFolderName.trim(),
                    type: 'folder',
                    createdAt: serverTimestamp()
                });
                targetParentId = pfRef.id;
            }
            // 2. Create the study set
            const setRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/studySets`), {
                name: studySetName.trim(),
                description: studySetDesc.trim(),
                parentId: targetParentId || null,
                sourceLesson: {
                    groupId,
                    bookId,
                    chapterId,
                    lessonId
                },
                createdAt: serverTimestamp()
            });
            const newSetId = setRef.id;
            // 3. Batch add/link vocabulary cards
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            const selectedVocabs = vocabWithAudio.filter((_, i) => selectedVocabIndices.has(i));
            for (const v of selectedVocabs) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => {
                    const f = c.front.split('（')[0].split('(')[0].trim();
                    return f === displayWord;
                });
                if (existingCard) {
                    if (!existingCard.folderId) {
                        const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, existingCard.id);
                        batch.update(cardDocRef, { folderId: newSetId });
                        updatedCount++;
                    }
                } else {
                    const cardDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/vocabulary`));
                    const newCardData = {
                        front: word.trim(),
                        back: (v.meaning || v.back || '').trim(),
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
                    if (v.exampleAudioBase64) {
                        newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    }
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) {
                                newCardData.audioBase64 = res.base64;
                            }
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
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
    // Redesign: link to an existing study set
    const handleLinkToExistingStudySet = async () => {
        if (!selectedExistingStudySetId) {
            showToast('Vui lòng chọn học phần', 'warning');
            return;
        }
        if (!userId) return;
        setCreationLoading(true);
        try {
            // 1. Link study set to this lesson by setting sourceLesson
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/studySets`, selectedExistingStudySetId), {
                sourceLesson: {
                    groupId,
                    bookId,
                    chapterId,
                    lessonId
                }
            });
            // 2. Add selected words to this study set
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            const selectedVocabs = vocabWithAudio.filter((_, i) => selectedVocabIndices.has(i));
            for (const v of selectedVocabs) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => {
                    const f = c.front.split('（')[0].split('(')[0].trim();
                    return f === displayWord;
                });
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
                    if (v.exampleAudioBase64) {
                        newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    }
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) {
                                newCardData.audioBase64 = res.base64;
                            }
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
                }
            }
            await batch.commit();
            showToast(`Đã liên kết và đồng bộ ${addedCount + updatedCount} từ vựng!`, "success");
            setShowLinkStudySetModal(false);
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (err) {
            console.error("Lỗi liên kết học phần:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setCreationLoading(false);
        }
    };
    // Redesign: sync vocabulary words between book lesson and study set
    const handleSyncVocabWithStudySet = async () => {
        if (!linkedStudySet || !userId) return;
        setCreationLoading(true);
        try {
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            for (const v of vocabWithAudio) {
                const word = v.word || v.front || '';
                const displayWord = word.split('（')[0].split('(')[0].trim();
                const existingCard = allUserCards.find(c => {
                    const f = c.front.split('（')[0].split('(')[0].trim();
                    return f === displayWord;
                });
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
                    if (v.exampleAudioBase64) {
                        newCardData.exampleAudioBase64 = v.exampleAudioBase64;
                    }
                    if (!newCardData.audioBase64) {
                        try {
                            const res = await generateAudioSilentWithVoice(word, 'ryota');
                            if (res && res.base64) {
                                newCardData.audioBase64 = res.base64;
                            }
                        } catch(e) {}
                    }
                    batch.set(cardDocRef, newCardData);
                    addedCount++;
                }
            }
            await batch.commit();
            showToast(`Đã đồng bộ từ vựng (thêm mới: ${addedCount}, liên kết lại: ${updatedCount})!`, "success");
            window.dispatchEvent(new Event('study_sets_updated'));
        } catch (err) {
            console.error("Lỗi đồng bộ học phần:", err);
            showToast("Lỗi: " + err.message, "error");
        } finally {
            setCreationLoading(false);
        }
    };
    // Redesign: unlink study set from this lesson
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
    // Redesign: delete linked study set completely
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
    const getLessonProgressInfo = useCallback((gId, bId, chapterId, lesson) => {
        const vocabLen = lesson.vocab?.length || 0;
        if (vocabLen === 0) return { percent: 0, count: 0, total: 0 };
        const key = `book_reveal_${gId}_${bId}_${chapterId}_${lesson.id}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const arr = JSON.parse(saved);
                const count = new Set(arr).size;
                return {
                    percent: Math.round((count / vocabLen) * 100),
                    count,
                    total: vocabLen
                };
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
    // ==================== COLORS ====================
    const BOOK_COLORS = [
        '#4F87FF', '#9B59B6', '#2ECC71', '#FF6B6B', '#F1C40F',
        '#E67E22', '#1ABC9C', '#E91E63', '#00BCD4', '#FF9800'
    ];
    // ==================== BREADCRUMB ====================
    const Breadcrumb = () => (
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
            <button onClick={() => navigateTo({})} className="hover:text-sky-600 dark:hover:text-sky-400 font-medium">📚 Thư viện sách</button>
            {currentGroup && <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => navigateTo({ group: groupId })} className="hover:text-sky-600 dark:hover:text-sky-400">{currentGroup.name}</button>
            </>}
            {currentBook && <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => navigateTo({ group: groupId, book: bookId })} className="hover:text-sky-600 dark:hover:text-sky-400">{currentBook.name}</button>
            </>}
            {currentChapter && <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => navigateTo({ group: groupId, book: bookId, chapter: chapterId })} className="hover:text-sky-600 dark:hover:text-sky-400">{currentChapter.name}</button>
            </>}
            {currentLesson && <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-900 dark:text-white font-medium">{currentLesson.name}</span>
            </>}
        </div>
    );
    // ==================== VIEWS ====================
    // VIEW 1: Book Groups listing
    const GroupsView = () => {
        return (
            <div className="space-y-8">
                {/* Banner Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t('books.vocabBooksTitle', 'Sách từ vựng')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
                        {t('books.vocabBooksSub', 'Tuyển tập các bộ sách cho hành trình học tiếng Nhật. Theo dõi tiến độ qua các giáo trình nền tảng và bộ từ vựng chuyên biệt.')}
                    </p>
                </div>
                {/* Filters & Search Row */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                    {/* Tabs / Filters */}
                    <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                        {[
                            { id: 'ALL', label: t('common.all', 'TẤT CẢ') },
                            { id: 'JLPT', label: 'JLPT' },
                            { id: 'TEXTBOOK', label: t('books.curriculum', 'GIÁO TRÌNH') },
                            { id: 'CUSTOM', label: t('books.custom', 'TÙY CHỈNH') }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 ${
                                    activeFilter === tab.id
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={t('books.searchBooks', 'Tìm kiếm sách...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                    </div>
                </div>
                {filteredGroups.length === 0 && !loading && (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-400" />
                        <p className="text-lg font-semibold">Không tìm thấy sách nào</p>
                        <p className="text-sm mt-1">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                )}
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map(group => {
                        const progress = getGroupProgress(group);
                        const category = getGroupCategory(group);
                        const isTextbook = category === 'TEXTBOOK';
                        const isJLPT = category === 'JLPT';
                        const badgeText = isTextbook ? t('books.curriculum', 'GIÁO TRÌNH') : isJLPT ? 'JLPT' : t('books.custom', 'TÙY CHỈNH');
                        // Badge levels
                        let levelBadge = '';
                        if (group.name.includes('Daichi')) levelBadge = 'SƠ CẤP';
                        else if (group.name.includes('Irodori')) levelBadge = 'TRÌNH ĐỘ A2';
                        else if (group.name.includes('Mimikara')) levelBadge = 'TRÌNH ĐỘ N2';
                        return (
                            <div
                                key={group.id}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all duration-300 cursor-pointer flex flex-col group"
                                onClick={() => navigateTo({ group: group.id })}
                            >
                                {group.imageUrl ? (
                                    <div className="h-44 overflow-hidden relative">
                                        <img
                                            src={group.imageUrl}
                                            alt={group.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4 flex gap-1.5">
                                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm ${
                                                isJLPT ? 'bg-sky-500 text-white' : isTextbook ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                            }`}>
                                                {badgeText}
                                            </span>
                                            {levelBadge && (
                                                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-slate-900/80 text-white backdrop-blur-sm">
                                                    {levelBadge}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative">
                                        <BookOpen className="w-12 h-12 text-slate-400 opacity-40" />
                                        <div className="absolute top-4 left-4 flex gap-1.5">
                                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-400 text-white rounded-lg shadow-sm">
                                                {badgeText}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-start justify-between gap-4">
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight group-hover:text-sky-500 transition-colors">
                                                {group.name}
                                            </h2>
                                            {isAdmin && (
                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                                                        className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {group.subtitle && (
                                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                                                {group.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                            <span>{t('books.progress', 'Tiến độ')}</span>
                                            <span className="text-sky-500 font-extrabold">{progress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {/* Admin Add Card */}
                    {isAdmin && (
                        <div
                            onClick={() => { resetForm(); setShowAddGroup(true); }}
                            className="bg-transparent dark:bg-transparent rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all min-h-[320px] group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">{t('books.addBookGroup', 'Thêm nhóm sách mới')}</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                {t('books.addBookGroupSub', 'Tạo bộ sưu tập tùy chỉnh cho mục tiêu học tập của bạn.')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // VIEW 2: Books in a group (Tango-like cards)
    const BooksView = () => {
        const filteredBooks = (currentGroup?.books || []).filter(book => 
            (book.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (book.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{currentGroup?.name}</h1>
                        {currentGroup?.subtitle && <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{currentGroup.subtitle}</p>}
                    </div>
                    {isAdmin && (
                        <button onClick={() => { resetForm(); setShowAddBook(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-sm">
                            <Plus className="w-4 h-4" /> Thêm sách
                        </button>
                    )}
                </div>
                {/* Books Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBooks.map(book => {
                        const progress = getBookProgress(groupId, book);
                        // Extract level badge or category if possible
                        let bookLevel = book.subtitle || '';
                        if (book.name.includes('N5')) bookLevel = 'TRÌNH ĐỘ N5';
                        else if (book.name.includes('N4')) bookLevel = 'TRÌNH ĐỘ N4';
                        else if (book.name.includes('N3')) bookLevel = 'TRÌNH ĐỘ N3';
                        else if (book.name.includes('N2')) bookLevel = 'TRÌNH ĐỘ N2';
                        else if (book.name.includes('N1')) bookLevel = 'TRÌNH ĐỘ N1';
                        return (
                            <div key={book.id}
                                onClick={() => navigateTo({ group: groupId, book: book.id })}
                                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] group relative overflow-hidden"
                            >
                                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: book.color || '#4F87FF' }} />
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            {bookLevel && (
                                                <span className="inline-block px-2.5 py-0.5 text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded mb-2">
                                                    {bookLevel}
                                                </span>
                                            )}
                                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-snug group-hover:text-sky-500 transition-colors">
                                                {book.name}
                                            </h3>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleStartEditBook(book); }}
                                                    className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {book.description && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                                            {book.description}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-3 mt-4">
                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium">
                                            {book.wordCount || 0} từ vựng
                                        </span>
                                        <span className="text-sky-500 font-black">{progress}%</span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {/* Admin Add Book */}
                    {isAdmin && (
                        <div
                            onClick={() => { resetForm(); setShowAddBook(true); }}
                            className="bg-transparent dark:bg-transparent rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all min-h-[220px] group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Thêm sách mới</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                Tạo một cuốn sách thuộc nhóm này.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // VIEW 3: Chapters & Lessons (with TOC)
    const ChaptersView = () => {
        const chapters = currentBook?.chapters || [];
        return (
            <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentBook?.name}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{chapters.length} chương</p>
                        </div>
                        {isAdmin && (
                            <button onClick={() => { resetForm(); setShowAddChapter(true); }}
                                className="flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium">
                                <FolderPlus className="w-4 h-4" /> Thêm chương
                            </button>
                        )}
                    </div>
                    {chapters.map((chapter, ci) => (
                        <div key={chapter.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
                                    📖 <InlineEditName type="chapter" id={chapter.id} currentName={chapter.name} />
                                </h3>
                                <div className="flex items-center gap-0.5">
                                    {isAdmin && <>
                                        <button onClick={() => handleReorderChapter(ci, -1)} disabled={ci === 0}
                                            className={`p-1 rounded transition-colors ${ci === 0 ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-500'}`}
                                            title="Di chuyển lên">
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleReorderChapter(ci, 1)} disabled={ci === chapters.length - 1}
                                            className={`p-1 rounded transition-colors ${ci === chapters.length - 1 ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-500'}`}
                                            title="Di chuyển xuống">
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { resetForm(); setFormName(''); navigateTo({ group: groupId, book: bookId, chapter: chapter.id }); setShowAddLesson(true); }}
                                            className="p-1.5 text-gray-400 hover:text-sky-500 transition-colors" title="Thêm bài">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteChapter(chapter.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Xóa chương">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>}
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {chapter.lessons.map((lesson, li) => {
                                    const isLocked = lesson.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('vocab_zen');
                                    const progressInfo = getLessonProgressInfo(groupId, bookId, chapter.id, lesson);
                                    return (
                                        <div key={lesson.id}
                                            onClick={() => {
                                                if (isLocked) {
                                                    setLockedPkgName('Từ vựng chuyên sâu Zen');
                                                    setShowPremiumModal(true);
                                                } else {
                                                    navigateTo({ group: groupId, book: bookId, chapter: chapter.id, lesson: lesson.id });
                                                }
                                            }}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/10 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-bold text-sky-600 dark:text-sky-400">
                                                    {li + 1}
                                                </span>
                                                <span className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                    {lesson.name}
                                                    {lesson.isPremium && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                                                            👑 Premium
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {progressInfo.percent > 0 && (
                                                    progressInfo.percent === 100 ? (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200/50 dark:border-emerald-800/30">
                                                            ✓ Hoàn thành
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 rounded-md border border-sky-200 dark:border-sky-800/30">
                                                            {progressInfo.count}/{progressInfo.total} ({progressInfo.percent}%)
                                                        </span>
                                                    )
                                                )}
                                                <span className="text-xs text-gray-400">{lesson.vocab?.length || 0} từ</span>
                                                {isAdmin && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleToggleLessonPremium(e, chapter.id, lesson)}
                                                            className={`p-1 rounded transition-colors ${lesson.isPremium ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                                            title={lesson.isPremium ? "Đổi thành Miễn phí" : "Đổi thành Premium"}
                                                        >
                                                            {lesson.isPremium ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, -1); }} disabled={li === 0}
                                                            className={`p-0.5 rounded ${li === 0 ? 'text-gray-250 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                            <ChevronUp className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, 1); }} disabled={li === chapter.lessons.length - 1}
                                                            className={`p-0.5 rounded ${li === chapter.lessons.length - 1 ? 'text-gray-250 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                            <ChevronDown className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(chapter.id, lesson.id); }}
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                        </div>
                                    );
                                })}
                                {chapter.lessons.length === 0 && (
                                    <p className="text-center py-4 text-sm text-gray-400">Chưa có bài nào</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {chapters.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Chưa có chương nào</p>
                        </div>
                    )}
                </div>
                {/* Table of Contents - right sidebar */}
                {showTOC && chapters.length > 0 && (
                    <div className="hidden lg:block w-56 shrink-0">
                        <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mục lục</h4>
                            <nav className="space-y-1">
                                {chapters.map((ch, i) => (
                                    <div key={ch.id}>
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1">{ch.name}</p>
                                        {ch.lessons.map((ls, j) => {
                                            const isLocked = ls.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('vocab_zen');
                                            const progressInfo = getLessonProgressInfo(groupId, bookId, ch.id, ls);
                                            return (
                                                <button key={ls.id}
                                                    onClick={() => {
                                                        if (isLocked) {
                                                            setLockedPkgName('Từ vựng chuyên sâu Zen');
                                                            setShowPremiumModal(true);
                                                        } else {
                                                            navigateTo({ group: groupId, book: bookId, chapter: ch.id, lesson: ls.id });
                                                        }
                                                    }}
                                                    className="w-full text-left text-[11px] px-3 py-1 text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10 rounded transition-colors truncate flex items-center justify-between gap-1">
                                                    <span className="truncate flex items-center gap-1">
                                                        {ls.name}
                                                        {progressInfo.percent > 0 && (
                                                            progressInfo.percent === 100 ? (
                                                                <span className="text-emerald-500 font-black text-[9px] shrink-0" title="Hoàn thành">✓</span>
                                                            ) : (
                                                                <span className="text-sky-500 font-bold text-[9px] shrink-0">({progressInfo.percent}%)</span>
                                                            )
                                                        )}
                                                    </span>
                                                    {ls.isPremium && <span className="text-[9px] text-amber-500 shrink-0" title="Bài học Premium">👑</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    // VIEW 4: Lesson vocabulary
    const LessonView = () => {
        const vocab = vocabWithAudio;
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
                                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium">
                                    <Upload className="w-4 h-4" /> Import JSON
                                </button>
                            )}
                        </div>
                    </div>
                    {/* STUDY SET REDESIGN CONTROL PANEL */}
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
                                    {!syncStatus.isSynced && (
                                        <button
                                            onClick={handleSyncVocabWithStudySet}
                                            disabled={creationLoading}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                            title={`Có ${syncStatus.missingCount} từ vựng mới trong sách chưa được thêm vào học phần. Click để đồng bộ.`}
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${creationLoading ? 'animate-spin' : ''}`} />
                                            Đồng bộ ({syncStatus.missingCount} từ mới)
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/vocab/set/${linkedStudySet.id}`)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg"
                                    >
                                        Học Ngay 🚀
                                    </button>
                                    <div className="relative group">
                                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700">
                                            <Wrench className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 hidden group-hover:block z-20 after:content-[''] after:absolute after:-top-2 after:h-2 after:left-0 after:right-0">
                                            <button
                                                onClick={handleUnlinkStudySet}
                                                className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                            >
                                                <X className="w-3.5 h-3.5 text-slate-400" /> Hủy liên kết bài học
                                            </button>
                                            <button
                                                onClick={handleDeleteStudySet}
                                                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-semibold"
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
                                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Tạo học phần mới
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedExistingStudySetId('');
                                            setSelectedVocabIndices(new Set(vocab.map((_, i) => i)));
                                            setShowLinkStudySetModal(true);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
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
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                                {/* Progress */}
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
                                {/* Controls */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Toggle blur mode */}
                                    <button
                                        onClick={() => setBlurMode(prev => prev === 'vn' ? 'jp' : 'vn')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${blurMode === 'vn'
                                            ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                            }`}
                                        title={blurMode === 'vn' ? 'Đang ẩn: Tiếng Việt' : 'Đang ẩn: Kanji + Cách đọc'}
                                    >
                                        <Languages className="w-3.5 h-3.5" />
                                        {blurMode === 'vn' ? 'Ẩn: Tiếng Việt' : 'Ẩn: Kanji + Đọc'}
                                    </button>
                                    {/* Re-blur all (keep progress) */}
                                    <button
                                        onClick={handleReBlurAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600/50"
                                        title="Làm mờ lại tất cả (giữ tiến độ)"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" /> Mờ lại
                                    </button>
                                    {/* Reset progress */}
                                    {persistedRevealed.size > 0 && (
                                        <button
                                            onClick={async () => {
                                                if (await showConfirm('Xóa toàn bộ tiến độ bài này?', { type: 'danger', confirmText: 'Xóa' })) handleResetProgress();
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-800/30"
                                            title="Xóa tiến độ và bắt đầu lại"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Reset tiến độ
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                    {vocab.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Chưa có từ vựng</p>
                            {isAdmin && <p className="text-sm mt-1">Import JSON để thêm từ vựng</p>}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {vocab.map((v, i) => {
                                const word = v.word || v.front || '';
                                const displayWord = word.split('（')[0].split('(')[0].trim();
                                const inList = isVocabInUserList(v) || addedVocabSet.has(i);
                                const isRevealed = revealedCards.has(i);
                                return (
                                    <div key={i} ref={editingVocabIndex === i ? editingCardRef : null} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 transition-colors overflow-hidden">
                                        {editingVocabIndex === i && editingVocabData ? (
                                            /* ===== EDIT MODE ===== */
                                            <div className="p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Edit className="w-4 h-4 text-sky-500" /> Chỉnh sửa từ #{i + 1}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={handleSaveVocabEdit} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                        <button onClick={() => { setEditingVocabIndex(null); setEditingVocabData(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold"><X className="w-3.5 h-3.5" /> Hủy</button>
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
                                            /* ===== VIEW MODE ===== */
                                            <div className="flex cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => {
                                                revealCard(i);
                                                if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                else { speakJapanese(word); }
                                            }}>
                                                {/* INDEX column */}
                                                <div className="w-10 shrink-0 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center gap-1 border-r border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                                                    {persistedRevealed.has(i) && (
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" title="Đã lật" />
                                                    )}
                                                </div>
                                                {/* LEFT: Từ vựng + nghĩa */}
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
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded" title="Cách đọc đặc biệt">特</span>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                                            else { speakJapanese(word); }
                                                                        }}
                                                                        className={`p-1 rounded-lg transition-all hover:scale-110 shrink-0 ${v.audioBase64
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
                                                                            className="p-1 rounded-lg transition-all hover:scale-110 shrink-0 text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500"
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
                                                                        // Render reading with pitch accent lines
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
                                                {/* RIGHT: Ví dụ + nghĩa ví dụ */}
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
                                                            <img src={v.imageUrl} alt={word} className="w-28 h-28 rounded-xl object-cover border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); window.open(v.imageUrl, '_blank'); }} title="Click để phóng to" />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* ACTION buttons */}
                                                <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 border-l border-gray-100 dark:border-gray-700">
                                                    {(v.nuance || v.note) && (
                                                        <button onClick={(e) => { e.stopPropagation(); setShowNuanceIndex(showNuanceIndex === i ? null : i); }}
                                                            className={`p-1.5 transition-colors ${showNuanceIndex === i ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                                                            title="Xem sắc thái">
                                                            <Lightbulb className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditVocab(i); }}
                                                            className="p-1.5 text-gray-300 hover:text-sky-500 transition-colors" title="Chỉnh sửa">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteVocab(i); }}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Xóa">
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
                {/* TOC sidebar for lesson view */}
                {showTOC && currentBook?.chapters?.length > 0 && (
                    <div className="hidden lg:block w-56 shrink-0">
                        <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 max-h-[80vh] overflow-y-auto">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mục lục</h4>
                            <nav className="space-y-1">
                                {currentBook.chapters.map(ch => (
                                    <div key={ch.id}>
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1">{ch.name}</p>
                                        {ch.lessons.map(ls => (
                                            <button key={ls.id}
                                                onClick={() => navigateTo({ group: groupId, book: bookId, chapter: ch.id, lesson: ls.id })}
                                                className={`w-full text-left text-[11px] px-3 py-1 rounded transition-colors truncate ${lessonId === ls.id
                                                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-medium'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10'
                                                    }`}>
                                                {ls.name}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    // ==================== FIX AUDIO MODAL ====================
    const FixAudioModal = () => {
        if (fixAudioIndex === null) return null;
        const vocab = vocabWithAudio;
        const v = vocab[fixAudioIndex];
        if (!v) return null;
        const word = v.word || v.front || '';
        const displayWord = word.split('（')[0].split('(')[0].trim();
        const readingMatch = word.match(/[（(]([^）)]+)[）)]/);
        const autoReading = readingMatch ? readingMatch[1].trim() : (v.reading || '');
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!fixAudioLoading) { setFixAudioIndex(null); setFixAudioCustomReading(''); } }}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sửa âm thanh</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Từ #{fixAudioIndex + 1}: <span className="font-bold text-gray-700 dark:text-gray-300">{displayWord}</span></p>
                            </div>
                        </div>
                        <button onClick={() => { if (!fixAudioLoading) { setFixAudioIndex(null); setFixAudioCustomReading(''); } }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors" disabled={fixAudioLoading}>
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    {/* Content */}
                    <div className="p-4 space-y-3">
                        {/* Option 1: Auto regenerate */}
                        <button
                            onClick={() => handleFixAudio(fixAudioIndex)}
                            disabled={fixAudioLoading || !autoReading}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left group ${fixAudioLoading ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                                : autoReading ? 'border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 cursor-pointer'
                                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/60 transition-colors">
                                <RefreshCw className={`w-5 h-5 text-sky-600 dark:text-sky-400 ${fixAudioLoading && !fixAudioCustomReading ? 'animate-spin' : ''}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Tạo lại từ phát âm gốc</p>
                                {autoReading ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sử dụng: <span className="font-bold text-sky-600 dark:text-sky-400">「{autoReading}」</span></p>
                                ) : (
                                    <p className="text-xs text-red-400 dark:text-red-500 mt-0.5">Không tìm thấy phát âm trong ngoặc</p>
                                )}
                            </div>
                        </button>
                        {/* Divider */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">HOẶC</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                        </div>
                        {/* Option 2: Manual input */}
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
                                    className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all"
                                    disabled={fixAudioLoading}
                                    onKeyDown={e => { if (e.key === 'Enter' && fixAudioCustomReading.trim()) handleFixAudio(fixAudioIndex, fixAudioCustomReading); }}
                                />
                                <button
                                    onClick={() => handleFixAudio(fixAudioIndex, fixAudioCustomReading)}
                                    disabled={fixAudioLoading || !fixAudioCustomReading.trim()}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${fixAudioLoading || !fixAudioCustomReading.trim()
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    {fixAudioLoading && fixAudioCustomReading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    Tạo
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 pl-10">Nhập cách đọc bằng hiragana để tạo audio chính xác</p>
                        </div>
                    </div>
                    {/* Footer hint */}
                    {v.audioBase64 && (
                        <div className="px-4 pb-3">
                            <p className="text-[11px] text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                ⚠️ Audio hiện tại sẽ bị thay thế bằng audio mới
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // ==================== RENDER ====================
    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={VOCAB_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu Sách..." />
                </div>
            </div>
        );
    }
    // Determine which view to render (call as functions, NOT as components <View/>)
    // Using <View/> would create new component type each render → unmount/remount → lose focus & scroll
    const renderCurrentView = () => {
        if (lessonId && currentLesson) return LessonView();
        if (bookId && currentBook) return ChaptersView();
        if (groupId && currentGroup) return BooksView();
        return GroupsView();
    };
    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-6xl mx-auto space-y-4 px-4 md:px-8 mt-4 animate-fade-in">
                {(groupId || bookId || chapterId || lessonId) && <Breadcrumb />}
            {renderCurrentView()}
            {/* Modals */}
            <FormModal show={showAddGroup} onClose={() => { setShowAddGroup(false); resetForm(); }} title="Thêm nhóm sách" onSave={handleAddGroup}>
                <InputField label="Tên nhóm" value={formName} onChange={setFormName} placeholder="VD: Tango" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="URL hình ảnh (tùy chọn)" value={formImageUrl} onChange={setFormImageUrl} placeholder="https://..." />
            </FormModal>
            <FormModal show={showAddBook} onClose={() => { setShowAddBook(false); resetForm(); }} title="Thêm sách" onSave={handleAddBook}>
                <InputField label="Tên sách" value={formName} onChange={setFormName} placeholder="VD: N5" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="Số lượng từ vựng" value={formWordCount} onChange={setFormWordCount} placeholder="VD: 1000" />
                <InputField label="Mô tả" value={formDescription} onChange={setFormDescription} placeholder="VD: dành cho Kỳ thi Năng lực Nhật ngữ N5" />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Màu sách</label>
                    <div className="flex gap-2 flex-wrap">
                        {BOOK_COLORS.map(c => (
                            <button key={c} onClick={() => setFormColor(c)}
                                className={`w-8 h-8 rounded-lg transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            </FormModal>
            <FormModal show={showAddChapter} onClose={() => { setShowAddChapter(false); resetForm(); }} title="Thêm chương" onSave={handleAddChapter}>
                <InputField label="Tên chương" value={formName} onChange={setFormName} placeholder="VD: Chương 1 - Chào hỏi" />
            </FormModal>
            <FormModal show={showAddLesson} onClose={() => { setShowAddLesson(false); resetForm(); }} title="Thêm bài" onSave={handleAddLesson}>
                <InputField label="Tên bài" value={formName} onChange={setFormName} placeholder="VD: Bài 1 - Giới thiệu bản thân" />
            </FormModal>
            <FormModal show={showJsonImport} onClose={() => { setShowJsonImport(false); resetForm(); }} title="Import / Cập nhật từ vựng (JSON)" onSave={handleImportJson}>
                <div className="space-y-3">
                    {/* Info about merge behavior */}
                    <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
                        <p className="text-xs text-sky-700 dark:text-sky-300 font-medium">💡 Hỗ trợ cập nhật từ vựng đã có</p>
                        <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1">Nếu <strong>word</strong> đã tồn tại trong bài, chỉ các trường <strong>không trống</strong> trong JSON sẽ được cập nhật. Từ mới sẽ được thêm vào cuối danh sách.</p>
                    </div>
                    {/* Sample JSON */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON mẫu</label>
                            <button
                                onClick={() => {
                                    const sample = JSON.stringify([
                                        {
                                            word: "漢字（かんじ）",
                                            reading: "かんじ",
                                            meaning: "Chữ Hán; Kanji",
                                            level: "N3",
                                            sinoVietnamese: "HÁN TỰ",
                                            pos: "noun",
                                            synonym: "文字",
                                            example: "漢字を勉強します。\n新しい漢字を書きなさい。",
                                            exampleMeaning: "Tôi học chữ Hán.\nHãy viết chữ Hán mới.",
                                            nuance: "Chỉ hệ thống chữ viết gốc Trung Quốc dùng trong tiếng Nhật.",
                                            accent: "0",
                                            specialReading: false
                                        }
                                    ], null, 2);
                                    navigator.clipboard.writeText(sample);
                                    showToast('Đã copy JSON mẫu!', 'success');
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors font-medium"
                            >
                                <Copy className="w-3 h-3" /> Copy mẫu
                            </button>
                        </div>
                        <pre className="text-[11px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl p-3 overflow-x-auto text-gray-600 dark:text-gray-400 font-mono leading-relaxed max-h-48 overflow-y-auto">{`[
  {
    "word": "漢字（かんじ）",
    "reading": "かんじ",
    "meaning": "Chữ Hán; Kanji",
    "level": "N3",
    "sinoVietnamese": "HÁN TỰ",
    "pos": "noun",
    "synonym": "文字",
    "example": "漢字を勉強します。\\n新しい漢字を書きなさい。",
    "exampleMeaning": "Tôi học chữ Hán.\\nHãy viết chữ Hán mới.",
    "nuance": "Ghi chú về sắc thái hoặc cách dùng.",
    "accent": "0",
    "specialReading": false
  }
]`}</pre>
                    </div>
                    {/* Partial update example */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ví dụ cập nhật 1 trường cho từ đã có:</label>
                        <pre className="text-[10px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2 font-mono text-amber-700 dark:text-amber-400 mt-1">{`[{ "word": "漢字（かんじ）", "sinoVietnamese": "HÁN TỰ" }]`}</pre>
                    </div>
                    {/* Input area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dán JSON vào đây</label>
                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            rows={10} placeholder="Dán JSON từ vựng vào đây...\n\nCó thể bỏ trống các trường không cần cập nhật."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none" />
                        <p className="text-[10px] text-gray-400 mt-1">Các trường: word, reading, meaning, sinoVietnamese, pos, level, synonym, example, exampleMeaning, nuance, accent, specialReading, imageUrl</p>
                    </div>
                </div>
            </FormModal>
            {/* Edit Group Modal */}
            <FormModal show={showEditGroup} onClose={() => { setShowEditGroup(false); resetForm(); }} title="Chỉnh sửa nhóm sách" onSave={handleSaveEditGroup}>
                <InputField label="Tên nhóm" value={formName} onChange={setFormName} placeholder="VD: Tango" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="URL hình ảnh (tùy chọn)" value={formImageUrl} onChange={setFormImageUrl} placeholder="https://..." />
            </FormModal>
            {/* Edit Book Modal */}
            <FormModal show={showEditBook} onClose={() => { setShowEditBook(false); resetForm(); }} title="Chỉnh sửa sách" onSave={handleSaveEditBook}>
                <InputField label="Tên sách" value={formName} onChange={setFormName} placeholder="VD: N5" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="Số lượng từ vựng" value={formWordCount} onChange={setFormWordCount} placeholder="VD: 1000" />
                <InputField label="Mô tả" value={formDescription} onChange={setFormDescription} placeholder="VD: dành cho Kỳ thi Năng lực Nhật ngữ N5" />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Màu sách</label>
                    <div className="flex gap-2 flex-wrap">
                        {BOOK_COLORS.map(c => (
                            <button key={c} onClick={() => setFormColor(c)}
                                className={`w-8 h-8 rounded-lg transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            </FormModal>
            {/* Create Study Set Modal */}
            {showCreateStudySetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-sky-500" />
                                    Tạo học phần mới từ bài học
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Từ vựng của bài học này sẽ được tự động thêm vào học phần mới.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCreateStudySetModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tên học phần</label>
                                <input 
                                    type="text" 
                                    value={studySetName} 
                                    onChange={e => setStudySetName(e.target.value)}
                                    placeholder="Ví dụ: N5 - Bài 1"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Mô tả học phần (tùy chọn)</label>
                                <textarea 
                                    value={studySetDesc} 
                                    onChange={e => setStudySetDesc(e.target.value)}
                                    placeholder="Nhập mô tả cho học phần này..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Thư mục cha</label>
                                    <select 
                                        value={selectedParentFolderId} 
                                        onChange={e => {
                                            setSelectedParentFolderId(e.target.value);
                                            setIsCreatingNewParentFolder(e.target.value === 'NEW_PARENT');
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="">📂 Chưa phân loại (Gốc)</option>
                                        {parentFolders.map(pf => (
                                            <option key={pf.id} value={pf.id}>📁 {pf.name}</option>
                                        ))}
                                        <option value="NEW_PARENT">➕ Tạo thư mục mới...</option>
                                    </select>
                                </div>
                                {isCreatingNewParentFolder && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-xs font-bold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">Tên thư mục mới</label>
                                        <input 
                                            type="text" 
                                            value={newParentFolderName} 
                                            onChange={e => setNewParentFolderName(e.target.value)}
                                            placeholder="Tên thư mục cha mới..."
                                            className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Vocabulary Checklist */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Chọn từ vựng muốn thêm ({selectedVocabIndices.size}/{vocabWithAudio.length})
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (selectedVocabIndices.size === vocabWithAudio.length) {
                                                setSelectedVocabIndices(new Set());
                                            } else {
                                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-xs text-sky-500 dark:text-sky-400 font-bold hover:underline"
                                    >
                                        {selectedVocabIndices.size === vocabWithAudio.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="border border-slate-100 dark:border-slate-700 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                    {vocabWithAudio.map((v, i) => {
                                        const word = v.word || v.front || '';
                                        const displayWord = word.split('（')[0].split('(')[0].trim();
                                        const isSelected = selectedVocabIndices.has(i);
                                        const inList = allUserCards.some(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    setSelectedVocabIndices(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(i)) next.delete(i);
                                                        else next.add(i);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {}} // handled by parent click
                                                    className="w-4 h-4 rounded text-sky-500 border-slate-300 dark:border-slate-600 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{displayWord}</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{v.meaning || v.back}</p>
                                                </div>
                                                {inList && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                                        Đã có trong SRS
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowCreateStudySetModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={handleCreateStudySetFromLesson}
                                disabled={creationLoading || !studySetName.trim() || selectedVocabIndices.size === 0}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-1.5"
                            >
                                {creationLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    'Tạo học phần 🚀'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Link Existing Study Set Modal */}
            {showLinkStudySetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    Liên kết với học phần sẵn có
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Chọn một học phần trống hoặc chưa liên kết từ thư viện của bạn.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowLinkStudySetModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Chọn học phần</label>
                                <select 
                                    value={selectedExistingStudySetId} 
                                    onChange={e => setSelectedExistingStudySetId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="">-- Chọn học phần trong danh sách --</option>
                                    {folders.filter(f => f.type !== 'folder' && !f.sourceLesson).map(f => (
                                        <option key={f.id} value={f.id}>📚 {f.name} ({allUserCards.filter(c => c.folderId === f.id).length} từ vựng)</option>
                                    ))}
                                    {folders.filter(f => f.type !== 'folder' && f.sourceLesson).map(f => (
                                        <option key={f.id} value={f.id}>🔗 {f.name} (Đang liên kết bài khác - {allUserCards.filter(c => c.folderId === f.id).length} từ vựng)</option>
                                    ))}
                                </select>
                            </div>
                            {/* Vocabulary Checklist */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Chọn từ vựng muốn thêm ({selectedVocabIndices.size}/{vocabWithAudio.length})
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (selectedVocabIndices.size === vocabWithAudio.length) {
                                                setSelectedVocabIndices(new Set());
                                            } else {
                                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline"
                                    >
                                        {selectedVocabIndices.size === vocabWithAudio.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="border border-slate-100 dark:border-slate-700 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                    {vocabWithAudio.map((v, i) => {
                                        const word = v.word || v.front || '';
                                        const displayWord = word.split('（')[0].split('(')[0].trim();
                                        const isSelected = selectedVocabIndices.has(i);
                                        const inList = allUserCards.some(c => c.front.split('（')[0].split('(')[0].trim() === displayWord);
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    setSelectedVocabIndices(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(i)) next.delete(i);
                                                        else next.add(i);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {}} // handled by parent click
                                                    className="w-4 h-4 rounded text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{displayWord}</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{v.meaning || v.back}</p>
                                                </div>
                                                {inList && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                                        Đã có trong SRS
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowLinkStudySetModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={handleLinkToExistingStudySet}
                                disabled={creationLoading || !selectedExistingStudySetId || selectedVocabIndices.size === 0}
                                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-1.5"
                            >
                                {creationLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang liên kết...
                                    </>
                                ) : (
                                    'Liên kết ngay 🔗'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Locked Modal */}
            <PremiumLockedModal 
                isOpen={showPremiumModal} 
                onClose={() => setShowPremiumModal(false)} 
                pkgName={lockedPkgName} 
            />
            {/* Fix Audio Modal */}
            {FixAudioModal()}
            </div>
        </div>
    );
};
export default BookScreen;
