import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useSearchParams } from 'react-router-dom';
import {
    BookOpen, Plus, Trash2, Edit, ChevronRight, ChevronLeft, Check, X, Lightbulb,
    Upload, FolderPlus, FileText, List, Search, ArrowLeft, Image, Save, Layers, Copy, Clipboard, Folder, Volume2,
    ChevronUp, ChevronDown, RefreshCw, Mic, Wrench
} from 'lucide-react';
import { db } from '../../config/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, setDoc, getDoc
} from 'firebase/firestore';
import { showToast } from '../../utils/toast';
import { speakJapanese, playAudio, generateAudioSilentWithVoice } from '../../utils/audio';
import FuriganaText from '../ui/FuriganaText';
import { accentNumberToPitchParts } from '../../utils/pitchAccent';

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
const BookScreen = ({ isAdmin = false, onAddVocabToSRS, onGeminiAssist, allUserCards = [] }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Data states
    const [bookGroups, setBookGroups] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Vocab editing states
    const [editingVocabIndex, setEditingVocabIndex] = useState(null);
    const [editingVocabData, setEditingVocabData] = useState(null);

    // Folder selection for SRS
    const [availableFolders, setAvailableFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState('');

    // Table of contents
    const [showTOC, setShowTOC] = useState(true);

    // Audio stored separately to avoid Firestore 1MB document limit
    const [lessonAudioMap, setLessonAudioMap] = useState({});
    const bgAudioAbortRef = useRef(false);
    const editingCardRef = useRef(null);

    // Fix audio states
    const [fixAudioIndex, setFixAudioIndex] = useState(null);
    const [fixAudioCustomReading, setFixAudioCustomReading] = useState('');
    const [fixAudioLoading, setFixAudioLoading] = useState(false);

    const COLLECTION = 'bookGroups';

    // ==================== LOAD DATA ====================
    useEffect(() => {
        loadAllData();
        // Load vocab folders from localStorage
        try {
            const saved = localStorage.getItem('vocab_folders');
            if (saved) setAvailableFolders(JSON.parse(saved));
        } catch (e) { console.error('Error loading folders:', e); }
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

    useEffect(() => {
        loadLessonAudio();
        // Clear reveal state when lesson changes
        setRevealedCards(new Set());
    }, [loadLessonAudio, lessonId]);

    const loadAllData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const groupsSnap = await getDocs(collection(db, COLLECTION));

            const groups = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
                const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };

                const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));

                group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
                    const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };

                    const chaptersSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters'));

                    book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                        const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };

                        const lessonsSnap = await getDocs(
                            collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons')
                        );

                        chapter.lessons = lessonsSnap.docs.map(lessonDoc => ({
                            id: lessonDoc.id,
                            ...lessonDoc.data()
                        })).sort((a, b) => (a.order || 0) - (b.order || 0));

                        return chapter;
                    }));

                    book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
                    return book;
                }));

                group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
                return group;
            }));

            groups.sort((a, b) => (a.order || 0) - (b.order || 0));
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
        await addDoc(collection(db, COLLECTION), {
            name: formName.trim(), subtitle: formSubtitle.trim(),
            imageUrl: formImageUrl.trim(), order: bookGroups.length,
            createdAt: Date.now()
        });
        resetForm(); setShowAddGroup(false); loadAllData();
    };

    const handleAddBook = async () => {
        if (!formName.trim() || !groupId) return;
        const booksCount = currentGroup?.books?.length || 0;
        await addDoc(collection(db, COLLECTION, groupId, 'books'), {
            name: formName.trim(), subtitle: formSubtitle.trim(),
            color: formColor, wordCount: formWordCount.trim(),
            description: formDescription.trim(), order: booksCount,
            createdAt: Date.now()
        });
        resetForm(); setShowAddBook(false); loadAllData();
    };

    const handleAddChapter = async () => {
        if (!formName.trim() || !groupId || !bookId) return;
        const chaptersCount = currentBook?.chapters?.length || 0;
        await addDoc(collection(db, COLLECTION, groupId, 'books', bookId, 'chapters'), {
            name: formName.trim(), order: chaptersCount, createdAt: Date.now()
        });
        resetForm(); setShowAddChapter(false); loadAllData();
    };

    const handleAddLesson = async () => {
        if (!formName.trim() || !groupId || !bookId || !chapterId) return;
        const lessonsCount = currentChapter?.lessons?.length || 0;
        await addDoc(
            collection(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons'),
            { name: formName.trim(), vocab: [], order: lessonsCount, createdAt: Date.now() }
        );
        resetForm(); setShowAddLesson(false); loadAllData();
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
            showToast('Đã cập nhật nhóm sách!', 'success');
            resetForm(); setShowEditGroup(false); loadAllData();
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
            showToast('Đã cập nhật sách!', 'success');
            resetForm(); setShowEditBook(false); loadAllData();
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
            loadAllData(true);
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
            loadAllData(true);
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
            const msgs = [];
            if (addedCount > 0) msgs.push(`Thêm ${addedCount} từ mới`);
            if (updatedCount > 0) msgs.push(`Cập nhật ${updatedCount} từ`);
            showToast(msgs.join(', ') || 'Không có thay đổi', msgs.length > 0 ? 'success' : 'info');
            resetForm(); setShowJsonImport(false); loadAllData();
        } catch (e) { showToast('JSON không hợp lệ: ' + e.message, 'error'); }
    };

    const handleDeleteGroup = async (gId) => {
        if (!window.confirm('Xóa nhóm sách này?')) return;
        await deleteDoc(doc(db, COLLECTION, gId));
        if (groupId === gId) navigateTo({});
        loadAllData();
    };

    const handleDeleteBook = async (bId) => {
        if (!window.confirm('Xóa sách này?')) return;
        await deleteDoc(doc(db, COLLECTION, groupId, 'books', bId));
        if (bookId === bId) navigateTo({ group: groupId });
        loadAllData();
    };

    const handleDeleteChapter = async (cId) => {
        if (!window.confirm('Xóa chương này?')) return;
        await deleteDoc(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', cId));
        if (chapterId === cId) navigateTo({ group: groupId, book: bookId });
        loadAllData();
    };

    const handleDeleteLesson = async (lId) => {
        if (!window.confirm('Xóa bài này?')) return;
        await deleteDoc(doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lId));
        if (lessonId === lId) navigateTo({ group: groupId, book: bookId, chapter: chapterId });
        loadAllData();
    };

    const handleDeleteVocab = async (vocabIndex) => {
        if (!window.confirm('Xóa từ vựng này?')) return;
        const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
        const newVocab = [...(currentLesson?.vocab || [])];
        newVocab.splice(vocabIndex, 1);
        await updateDoc(lessonRef, { vocab: newVocab });
        loadAllData();
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
            const newVocab = [...(currentLesson?.vocab || [])];
            newVocab[editingVocabIndex] = editingVocabData;
            await updateDoc(lessonRef, { vocab: newVocab });
            setEditingVocabIndex(null);
            setEditingVocabData(null);
            showToast('Đã cập nhật từ vựng!', 'success');
            // Preserve scroll position during reload
            const scrollY = window.scrollY;
            await loadAllData(true);
            requestAnimationFrame(() => { window.scrollTo(0, scrollY); });
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
                await updateDoc(ref, { name: editingNameValue.trim() });
                showToast('Đã cập nhật tên!', 'success');
                loadAllData();
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

    // ==================== ADD VOCAB TO SRS ====================
    const handleAddToSRS = async (vocab, index) => {
        if (!onAddVocabToSRS) return;
        const word = vocab.word || vocab.front || '';
        const normalizedWord = word.split('（')[0].split('(')[0].trim();
        const exists = allUserCards.some(c => {
            const f = c.front.split('（')[0].split('(')[0].trim();
            return f === normalizedWord;
        });
        if (exists) { setAddedVocabSet(prev => new Set([...prev, index])); return; }

        setAddingVocabIndex(index);
        try {
            await onAddVocabToSRS({
                front: word,
                back: vocab.meaning || vocab.back || '',
                synonym: vocab.synonym || '',
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
                folderId: selectedFolderId || null,
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

    const isVocabInUserList = (vocab) => {
        const word = vocab.word || vocab.front || '';
        const n = word.split('（')[0].split('(')[0].trim();
        return allUserCards.some(c => c.front.split('（')[0].split('(')[0].trim() === n);
    };

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
    const GroupsView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📚 Thư viện sách</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chọn bộ sách để bắt đầu học từ vựng</p>
                </div>
                {isAdmin && (
                    <button onClick={() => { resetForm(); setShowAddGroup(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Thêm nhóm sách
                    </button>
                )}
            </div>

            {bookGroups.length === 0 && !loading && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Chưa có nhóm sách nào</p>
                    {isAdmin && <p className="text-sm mt-1">Bấm "Thêm nhóm sách" để bắt đầu</p>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookGroups.map(group => (
                    <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group/card"
                        onClick={() => navigateTo({ group: group.id })}>
                        {group.imageUrl && (
                            <div className="h-40 overflow-hidden">
                                <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{group.name}</h2>
                                    {group.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{group.subtitle}</p>}
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{group.books?.length || 0} cuốn sách</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                                            className="p-2 text-gray-400 hover:text-sky-500 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // VIEW 2: Books in a group (Tango-like cards)
    const BooksView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentGroup?.name}</h1>
                    {currentGroup?.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{currentGroup.subtitle}</p>}
                </div>
                {isAdmin && (
                    <button onClick={() => { resetForm(); setShowAddBook(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium">
                        <Plus className="w-4 h-4" /> Thêm sách
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentGroup?.books || []).map(book => (
                    <div key={book.id}
                        onClick={() => navigateTo({ group: groupId, book: book.id })}
                        className="relative rounded-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl overflow-hidden"
                        style={{ backgroundColor: book.color || '#4F87FF' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 text-center text-white">
                            {book.subtitle && <p className="text-xs opacity-80 mb-1">{book.subtitle}</p>}
                            <h3 className="text-4xl font-bold mb-2">{book.name}</h3>
                            {book.wordCount && <p className="text-sm opacity-90">{book.wordCount} từ vựng</p>}
                            {book.description && <p className="text-xs opacity-70 mt-1">{book.description}</p>}
                        </div>
                        {isAdmin && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                                <button onClick={(e) => { e.stopPropagation(); handleStartEditBook(book); }}
                                    className="p-1.5 bg-black/20 hover:bg-sky-500/80 rounded-lg text-white/70 hover:text-white transition-colors">
                                    <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}
                                    className="p-1.5 bg-black/20 hover:bg-red-500/80 rounded-lg text-white/70 hover:text-white transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

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
                                {chapter.lessons.map((lesson, li) => (
                                    <div key={lesson.id}
                                        onClick={() => navigateTo({ group: groupId, book: bookId, chapter: chapter.id, lesson: lesson.id })}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/10 cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-bold text-sky-600 dark:text-sky-400">
                                                {li + 1}
                                            </span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200">{lesson.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-400">{lesson.vocab?.length || 0} từ</span>
                                            {isAdmin && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, -1); }} disabled={li === 0}
                                                        className={`p-0.5 rounded ${li === 0 ? 'text-gray-200 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, 1); }} disabled={li === chapter.lessons.length - 1}
                                                        className={`p-0.5 rounded ${li === chapter.lessons.length - 1 ? 'text-gray-200 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                ))}
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
                                        {ch.lessons.map((ls, j) => (
                                            <button key={ls.id}
                                                onClick={() => navigateTo({ group: groupId, book: bookId, chapter: ch.id, lesson: ls.id })}
                                                className="w-full text-left text-[11px] px-3 py-1 text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10 rounded transition-colors truncate">
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
                            {/* Folder selector for SRS */}
                            {onAddVocabToSRS && availableFolders.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-1.5">
                                    <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <select
                                        value={selectedFolderId}
                                        onChange={e => setSelectedFolderId(e.target.value)}
                                        className="text-xs bg-transparent text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                                    >
                                        <option value="">📂 Chưa phân loại</option>
                                        {availableFolders.map(f => (
                                            <option key={f.id} value={f.id}>📁 {f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {onAddVocabToSRS && vocab.length > 0 && (
                                <button onClick={handleAddAllToSRS}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors">
                                    <Plus className="w-4 h-4" /> Thêm tất cả vào SRS
                                </button>
                            )}
                            {isAdmin && (
                                <button onClick={() => { resetForm(); setShowJsonImport(true); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium">
                                    <Upload className="w-4 h-4" /> Import JSON
                                </button>
                            )}
                        </div>
                    </div>

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
                                                setRevealedCards(prev => new Set(prev).add(i));
                                                if (v.audioBase64) { playAudio(v.audioBase64, word); }
                                                else { speakJapanese(word); }
                                            }}>
                                                {/* INDEX column */}
                                                <div className="w-10 shrink-0 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                                                </div>

                                                {/* LEFT: Từ vựng + nghĩa */}
                                                <div className="w-[30%] p-4 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{displayWord}</p>

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
                                                                    ? 'text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600'
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
                                                                    <span className="inline-flex items-end gap-0 mt-0.5">
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
                                                            return <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{v.reading}</p>;
                                                        })()}
                                                        {v.sinoVietnamese && (
                                                            <p className={`text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 transition-all duration-300 ${isRevealed ? '' : 'blur-[4px] opacity-40 select-none'}`}>{v.sinoVietnamese}</p>
                                                        )}

                                                        <p className={`text-sm text-sky-600 dark:text-sky-400 mt-2 font-medium transition-all duration-300 ${isRevealed ? '' : 'blur-[4px] opacity-40 select-none'}`}>{v.meaning || v.back || ''}</p>

                                                    </div>
                                                </div>

                                                {/* RIGHT: Ví dụ + nghĩa ví dụ */}
                                                <div className="flex-1 p-4 flex items-stretch gap-3">
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        {v.example ? (
                                                            <div className="space-y-2">
                                                                {v.example.split('\n').map((ex, ei) => (
                                                                    <div key={ei}>
                                                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"><FuriganaText text={ex.trim()} /></p>
                                                                        {v.exampleMeaning && (() => {
                                                                            const meanings = v.exampleMeaning.split('\n');
                                                                            return meanings[ei] ? (
                                                                                <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic transition-all duration-300 ${isRevealed ? '' : 'blur-[4px] opacity-40 select-none'}`}>{meanings[ei].trim()}</p>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                ))}
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
                                                    {onAddVocabToSRS && (
                                                        inList ? (
                                                            <span className="p-1.5 text-emerald-500" title="Đã có trong SRS"><Check className="w-4 h-4" /></span>
                                                        ) : addingVocabIndex === i ? (
                                                            <span className="p-1.5"><div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div></span>
                                                        ) : (
                                                            <button onClick={(e) => { e.stopPropagation(); handleAddToSRS(v, i); }}
                                                                className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors" title="Thêm vào SRS">
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        )
                                                    )}
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
                                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                                    <Mic className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Nhập cách đọc thủ công</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={fixAudioCustomReading}
                                    onChange={e => setFixAudioCustomReading(e.target.value)}
                                    placeholder="Nhập hiragana/katakana... (VD: たべる)"
                                    className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all"
                                    disabled={fixAudioLoading}
                                    onKeyDown={e => { if (e.key === 'Enter' && fixAudioCustomReading.trim()) handleFixAudio(fixAudioIndex, fixAudioCustomReading); }}
                                />
                                <button
                                    onClick={() => handleFixAudio(fixAudioIndex, fixAudioCustomReading)}
                                    disabled={fixAudioLoading || !fixAudioCustomReading.trim()}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${fixAudioLoading || !fixAudioCustomReading.trim()
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm hover:shadow-md'
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
        return <LoadingIndicator text="Đang tải dữ liệu Sách..." />;
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
        <div className="space-y-4">
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

            {/* Fix Audio Modal */}
            {FixAudioModal()}
        </div>
    );
};

export default BookScreen;
