import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BookOpen, Plus, Trash2, Edit, ChevronRight, ChevronLeft, Check, X, Lightbulb,
    Upload, FolderPlus, FileText, List, Search, ArrowLeft, Image, Save, Layers, Copy, Clipboard, Folder, Volume2
} from 'lucide-react';
import { db } from '../../config/firebase';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, setDoc, getDoc
} from 'firebase/firestore';
import { showToast } from '../../utils/toast';
import { speakJapanese, playAudio, generateAudioSilentWithVoice } from '../../utils/audio';
import FuriganaText from '../ui/FuriganaText';

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
    const [editingNameItem, setEditingNameItem] = useState(null); // { type: 'group'|'book'|'chapter'|'lesson', id, name }
    const [editingNameValue, setEditingNameValue] = useState('');
    const [showNuanceIndex, setShowNuanceIndex] = useState(null); // index of vocab to show nuance

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
    }, [loadLessonAudio]);

    const loadAllData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const groupsSnap = await getDocs(collection(db, COLLECTION));
            const groups = [];

            for (const groupDoc of groupsSnap.docs) {
                const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };

                const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));
                for (const bookDoc of booksSnap.docs) {
                    const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };

                    const chaptersSnap = await getDocs(
                        collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters')
                    );
                    for (const chapterDoc of chaptersSnap.docs) {
                        const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };

                        const lessonsSnap = await getDocs(
                            collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons')
                        );
                        for (const lessonDoc of lessonsSnap.docs) {
                            chapter.lessons.push({ id: lessonDoc.id, ...lessonDoc.data() });
                        }
                        chapter.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
                        book.chapters.push(chapter);
                    }
                    book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
                    group.books.push(book);
                }
                group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
                groups.push(group);
            }
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
        setJsonInput(''); setEditingItem(null);
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

    const handleImportJson = async () => {
        if (!jsonInput.trim() || !lessonId) return;
        try {
            const vocabArray = JSON.parse(jsonInput.trim());
            if (!Array.isArray(vocabArray)) { showToast('JSON phải là mảng []', 'warning'); return; }
            const lessonRef = doc(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons', lessonId);
            const existing = currentLesson?.vocab || [];
            await updateDoc(lessonRef, { vocab: [...existing, ...vocabArray] });
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
                imageBase64: null,
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
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-red-500/80 rounded-lg text-white/70 hover:text-white transition-colors z-20">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">📖 {chapter.name}</h3>
                                <div className="flex items-center gap-1">
                                    {isAdmin && <>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">{lesson.vocab?.length || 0} từ</span>
                                            {isAdmin && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
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
                                const inList = isVocabInUserList(v) || addedVocabSet.has(i);
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
                                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nghĩa</label>
                                                        <input value={editingVocabData.meaning || editingVocabData.back || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, meaning: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Hán Việt</label>
                                                        <input value={editingVocabData.sinoVietnamese || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
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
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Câu ví dụ</label>
                                                    <input value={editingVocabData.example || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, example: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nghĩa câu ví dụ</label>
                                                    <input value={editingVocabData.exampleMeaning || ''} onChange={e => setEditingVocabData(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            /* ===== VIEW MODE ===== */
                                            <div className="flex">
                                                {/* INDEX column */}
                                                <div className="w-10 shrink-0 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                                                </div>

                                                {/* LEFT: Từ vựng + nghĩa */}
                                                <div className="w-2/5 p-4 border-r border-gray-100 dark:border-gray-700 flex flex-col">
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{word}</p>
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
                                                        </div>
                                                        {v.sinoVietnamese && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">{v.sinoVietnamese}</p>
                                                        )}

                                                        <p className="text-sm text-sky-600 dark:text-sky-400 mt-2 font-medium">{v.meaning || v.back || ''}</p>
                                                    </div>
                                                </div>

                                                {/* RIGHT: Ví dụ + nghĩa ví dụ */}
                                                <div className="flex-1 p-4 flex flex-col justify-center">
                                                    {v.example ? (
                                                        <div>
                                                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"><FuriganaText text={v.example} /></p>
                                                            {v.exampleMeaning && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">{v.exampleMeaning}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-300 dark:text-gray-600 italic">Chưa có ví dụ</p>
                                                    )}
                                                    {(v.nuance || v.note) && showNuanceIndex === i && (
                                                        <p className="text-xs text-orange-500 dark:text-orange-400 mt-2 italic animate-fadeIn">💡 {v.nuance || v.note}</p>
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
                                                            <button onClick={() => handleAddToSRS(v, i)}
                                                                className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors" title="Thêm vào SRS">
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        )
                                                    )}
                                                    {(v.nuance || v.note) && (
                                                        <button onClick={() => setShowNuanceIndex(showNuanceIndex === i ? null : i)}
                                                            className={`p-1.5 transition-colors ${showNuanceIndex === i ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                                                            title="Xem sắc thái">
                                                            <Lightbulb className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={() => handleEditVocab(i)}
                                                            className="p-1.5 text-gray-300 hover:text-sky-500 transition-colors" title="Chỉnh sửa">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={() => handleDeleteVocab(i)}
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

    // ==================== RENDER ====================
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
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

            <FormModal show={showJsonImport} onClose={() => { setShowJsonImport(false); resetForm(); }} title="Import từ vựng (JSON)" onSave={handleImportJson}>
                <div className="space-y-3">
                    {/* Sample JSON */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON mẫu</label>
                            <button
                                onClick={() => {
                                    const sample = JSON.stringify([
                                        {
                                            word: "食べる（たべる）",
                                            meaning: "Ăn",
                                            sinoVietnamese: "THỰC",
                                            pos: "verb",
                                            level: "N5",
                                            synonym: "食事する, 食う",
                                            nuance: "Dùng cho việc ăn nói chung",
                                            note: "",
                                            example: "毎日朝ごはんを食べます。",
                                            exampleMeaning: "Mỗi ngày tôi ăn sáng."
                                        },
                                        {
                                            word: "飲む（のむ）",
                                            meaning: "Uống",
                                            sinoVietnamese: "ẤM",
                                            pos: "verb",
                                            level: "N5",
                                            synonym: "",
                                            nuance: "Dùng cho đồ uống, thuốc",
                                            note: "",
                                            example: "水を飲みます。",
                                            exampleMeaning: "Tôi uống nước."
                                        }
                                    ], null, 2);
                                    navigator.clipboard.writeText(sample);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors font-medium"
                            >
                                <Copy className="w-3 h-3" /> Copy mẫu
                            </button>
                        </div>
                        <pre className="text-[11px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl p-3 overflow-x-auto text-gray-600 dark:text-gray-400 font-mono leading-relaxed">{`[
  {
    "word": "食べる（たべる）",
    "meaning": "Ăn",
    "sinoVietnamese": "THỰC",
    "pos": "verb",
    "level": "N5",
    "synonym": "食事する, 食う",
    "nuance": "Dùng cho việc ăn nói chung",
    "note": "ghi chú thêm",
    "example": "毎日朝ごはんを食べます。",
    "exampleMeaning": "Mỗi ngày tôi ăn sáng."
  }
]`}</pre>
                    </div>

                    {/* Input area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dán JSON vào đây</label>
                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            rows={10} placeholder="Dán JSON từ vựng vào đây..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none" />
                        <p className="text-[10px] text-gray-400 mt-1">Các trường: word, meaning, sinoVietnamese, pos (từ loại), level (cấp độ), synonym (đồng nghĩa), nuance (sắc thái), note (ghi chú), example, exampleMeaning</p>
                    </div>
                </div>
            </FormModal>
        </div>
    );
};

export default BookScreen;
