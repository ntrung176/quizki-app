import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import { Search, Grid, PenTool, Download, BookOpen, Map, Globe, Layers, X, Plus, Save, Trash2, Volume2, ArrowLeft, Play, Upload, FileJson, Edit, Check } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { getKanjiDecomposition } from '../../data/kanjiDecomposition';
import { RADICALS_214, KANJI_TREE, getDecompositionTree, isBasicRadical, getRadicalInfo } from '../../data/radicals214';

// JLPT Levels
const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const KanjiScreen = ({ isAdmin = false }) => {
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKanji, setSelectedKanji] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddKanjiModal, setShowAddKanjiModal] = useState(false);
    const [showAddVocabModal, setShowAddVocabModal] = useState(false);
    const [showImportKanjiModal, setShowImportKanjiModal] = useState(false);
    const [showImportVocabModal, setShowImportVocabModal] = useState(false);
    const [showEditKanjiModal, setShowEditKanjiModal] = useState(false);
    const [showEditVocabModal, setShowEditVocabModal] = useState(false);
    const [editingKanji, setEditingKanji] = useState(null);
    const [editingVocab, setEditingVocab] = useState(null);
    const [importStatus, setImportStatus] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Firebase data
    const [kanjiList, setKanjiList] = useState([]);
    const [vocabList, setVocabList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Hanzi Writer ref
    const writerRef = useRef(null);
    const writerContainerRef = useRef(null);
    const detailWriterRef = useRef(null);
    const detailWriterContainerRef = useRef(null);

    // Kanji API data (radical, components, stroke count)
    const [kanjiApiData, setKanjiApiData] = useState(null);
    const [loadingApiData, setLoadingApiData] = useState(false);

    // Bulk selection states
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedKanjiIds, setSelectedKanjiIds] = useState([]);
    const [selectedVocabIds, setSelectedVocabIds] = useState([]);
    const [diagramZoom, setDiagramZoom] = useState(1); // Zoom level for decomposition diagram
    const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 }); // Pan position
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Form states
    const [newKanji, setNewKanji] = useState({
        character: '', meaning: '', onyomi: '', kunyomi: '',
        level: 'N5', sinoViet: '', mnemonic: '', radical: ''
    });
    const [newVocab, setNewVocab] = useState({
        word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara'
    });
    const [jsonKanjiInput, setJsonKanjiInput] = useState('');
    const [jsonVocabInput, setJsonVocabInput] = useState('');

    // Load data from Firebase (shared data for all users)
    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('Loading kanji data from Firebase...');

                // Load Kanji (shared collection - no userId filter)
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('Loaded kanji:', kanjiData.length, 'items');
                setKanjiList(kanjiData);

                // Load Vocab (shared collection - no userId filter)
                const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
                const vocabData = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('Loaded vocab:', vocabData.length, 'items');
                setVocabList(vocabData);
            } catch (e) {
                console.error('Error loading kanji data:', e);
                alert('Lỗi tải dữ liệu Kanji. Vui lòng kiểm tra kết nối hoặc Firebase Rules.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Initialize HanziWriter when selectedKanji changes
    useEffect(() => {
        if (selectedKanji && writerContainerRef.current) {
            // Clear previous writer
            writerContainerRef.current.innerHTML = '';

            // Get container size
            const containerSize = Math.min(
                writerContainerRef.current.offsetWidth || 200,
                writerContainerRef.current.offsetHeight || 200
            ) * 0.85;

            try {
                writerRef.current = HanziWriter.create(writerContainerRef.current, selectedKanji, {
                    width: containerSize,
                    height: containerSize,
                    padding: 5,
                    showOutline: true,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 300,
                    strokeColor: '#0891b2', // cyan-600
                    outlineColor: '#e2e8f0', // slate-200
                    drawingColor: '#0891b2',
                    showCharacter: false,
                    showHintAfterMisses: 3,
                });

                // Start animation after a short delay
                setTimeout(() => {
                    writerRef.current?.animateCharacter({
                        onComplete: () => {
                            // Show character after animation completes
                            writerRef.current?.showCharacter();
                        }
                    });
                }, 100);
            } catch (error) {
                console.error('HanziWriter error:', error);
                // Fallback: show character as text if animation fails
                writerContainerRef.current.innerHTML = `<span class="text-8xl font-bold text-cyan-600 dark:text-cyan-400 font-japanese">${selectedKanji}</span>`;
            }
        }

        return () => {
            // Cleanup
            if (writerRef.current) {
                writerRef.current = null;
            }
        };
    }, [selectedKanji]);

    // Fetch Kanji API data when kanji is selected
    useEffect(() => {
        const fetchKanjiApiData = async () => {
            if (!selectedKanji) return;

            setLoadingApiData(true);
            try {
                // Fetch từ kanjiapi.dev cho stroke_count và readings
                const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(selectedKanji)}`);
                let apiData = null;
                if (response.ok) {
                    apiData = await response.json();
                }

                // Lấy decomposition data từ local file
                const decomposition = getKanjiDecomposition(selectedKanji);

                // Kết hợp dữ liệu
                setKanjiApiData({
                    ...apiData,
                    // Sử dụng local data cho radical và components
                    radical: decomposition?.radical || null,
                    components: decomposition?.components || [],
                    componentMeaning: decomposition?.meaning || null,
                });
            } catch (error) {
                console.error('Kanjiapi error:', error);
                // Nếu API fail, vẫn sử dụng local data
                const decomposition = getKanjiDecomposition(selectedKanji);
                setKanjiApiData({
                    radical: decomposition?.radical || null,
                    components: decomposition?.components || [],
                    componentMeaning: decomposition?.meaning || null,
                });
            } finally {
                setLoadingApiData(false);
            }
        };

        fetchKanjiApiData();
    }, [selectedKanji]);

    // Initialize HanziWriter in detail modal
    useEffect(() => {
        if (!selectedKanji || !showDetailModal) return;

        let attempts = 0;
        const maxAttempts = 10;
        let timer = null;
        let animationTimer = null;

        const initWriter = () => {
            attempts++;

            // Check if container exists
            if (!detailWriterContainerRef.current) {
                if (attempts < maxAttempts) {
                    timer = setTimeout(initWriter, 100);
                }
                return;
            }

            // Skip if writer already exists for this kanji
            if (detailWriterRef.current) return;

            // Clear previous content
            detailWriterContainerRef.current.innerHTML = '';

            // Get container size
            const containerSize = Math.min(
                detailWriterContainerRef.current.offsetWidth || 250,
                detailWriterContainerRef.current.offsetHeight || 250
            ) * 0.75;

            try {
                detailWriterRef.current = HanziWriter.create(detailWriterContainerRef.current, selectedKanji, {
                    width: containerSize,
                    height: containerSize,
                    padding: 5,
                    showOutline: true,
                    strokeAnimationSpeed: 0.8,
                    delayBetweenStrokes: 400,
                    strokeColor: '#0891b2', // cyan-600
                    outlineColor: '#cbd5e1', // slate-300
                    drawingColor: '#0891b2',
                    showCharacter: false,
                });

                // Start animation
                animationTimer = setTimeout(() => {
                    detailWriterRef.current?.animateCharacter({
                        onComplete: () => {
                            detailWriterRef.current?.showCharacter();
                        }
                    });
                }, 200);
            } catch (error) {
                console.error('Detail HanziWriter error:', error);
                if (detailWriterContainerRef.current) {
                    detailWriterContainerRef.current.innerHTML = `<span class="text-[120px] font-bold text-cyan-600 dark:text-cyan-400 font-japanese">${selectedKanji}</span>`;
                }
            }
        };

        // Start trying to initialize
        timer = setTimeout(initWriter, 50);

        return () => {
            if (timer) clearTimeout(timer);
            if (animationTimer) clearTimeout(animationTimer);
            detailWriterRef.current = null;
        };
    }, [selectedKanji, showDetailModal]);

    // Get kanji for current level (from Firebase)
    const currentKanjiList = useMemo(() => {
        const firebaseKanji = kanjiList.filter(k => k.level === selectedLevel).map(k => k.character);
        if (!searchQuery.trim()) return firebaseKanji;
        return firebaseKanji.filter(k => k.includes(searchQuery));
    }, [selectedLevel, kanjiList, searchQuery]);

    // Get filtered kanji list with id for bulk operations
    const filteredKanjiList = useMemo(() => {
        let filtered = kanjiList.filter(k => k.level === selectedLevel);
        if (searchQuery.trim()) {
            filtered = filtered.filter(k => k.character.includes(searchQuery) || k.meaning?.includes(searchQuery) || k.sinoViet?.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return filtered;
    }, [selectedLevel, kanjiList, searchQuery]);

    // Get filtered vocab list with id for bulk operations
    const filteredVocabList = useMemo(() => {
        let filtered = vocabList.filter(v => v.level === selectedLevel);
        if (searchQuery.trim()) {
            filtered = filtered.filter(v => v.word?.includes(searchQuery) || v.meaning?.includes(searchQuery));
        }
        return filtered;
    }, [selectedLevel, vocabList, searchQuery]);

    // Get kanji detail
    const getKanjiDetail = (char) => {
        return kanjiList.find(k => k.character === char) || {
            character: char, meaning: 'Chưa có thông tin', onyomi: '', kunyomi: '',
            level: selectedLevel, strokeCount: '', sinoViet: '', mnemonic: ''
        };
    };

    // Get vocab containing this kanji
    const getVocabForKanji = (char) => {
        return vocabList.filter(v => v.word.includes(char));
    };

    // Get related kanji (from same level or other kanji in Firebase)
    const getRelatedKanji = (char) => {
        const allChars = kanjiList.map(k => k.character);
        return allChars.filter(k => k !== char).slice(0, 8);
    };

    // Add Kanji (check duplicate)
    const handleAddKanji = async () => {
        if (!newKanji.character) return;

        // Check if kanji already exists
        const existingKanji = kanjiList.find(k => k.character === newKanji.character);
        if (existingKanji) {
            alert(`Kanji "${newKanji.character}" đã tồn tại trong hệ thống!`);
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'kanji'), newKanji);
            setKanjiList([...kanjiList, { ...newKanji, id: docRef.id }]);
            setNewKanji({
                character: '', meaning: '', onyomi: '', kunyomi: '',
                level: 'N5', sinoViet: '', mnemonic: '', radical: ''
            });
            setShowAddKanjiModal(false);
        } catch (e) {
            console.error('Error adding kanji:', e);
        }
    };

    // Add Vocab (check duplicate)
    const handleAddVocab = async () => {
        if (!newVocab.word) return;

        // Check if vocab already exists
        const existingVocab = vocabList.find(v => v.word === newVocab.word);
        if (existingVocab) {
            alert(`Từ vựng "${newVocab.word}" đã tồn tại trong hệ thống!`);
            return;
        }

        try {
            // Extract kanji from word
            const kanjiChars = newVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const vocabData = { ...newVocab, kanjiList: kanjiChars };
            const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
            setVocabList([...vocabList, { ...vocabData, id: docRef.id }]);
            setNewVocab({ word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara' });
            setShowAddVocabModal(false);
        } catch (e) {
            console.error('Error adding vocab:', e);
        }
    };

    // Toggle kanji selection
    const toggleKanjiSelection = (id) => {
        setSelectedKanjiIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Toggle vocab selection
    const toggleVocabSelection = (id) => {
        setSelectedVocabIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Select all kanji
    const selectAllKanji = () => {
        const filteredIds = filteredKanjiList.map(k => k.id);
        setSelectedKanjiIds(prev =>
            prev.length === filteredIds.length ? [] : filteredIds
        );
    };

    // Select all vocab
    const selectAllVocab = () => {
        const filteredIds = filteredVocabList.map(v => v.id);
        setSelectedVocabIds(prev =>
            prev.length === filteredIds.length ? [] : filteredIds
        );
    };

    // Bulk delete kanji
    const handleBulkDeleteKanji = async () => {
        if (selectedKanjiIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedKanjiIds.length} kanji?`)) return;

        try {
            for (const id of selectedKanjiIds) {
                await deleteDoc(doc(db, 'kanji', id));
            }
            setKanjiList(prev => prev.filter(k => !selectedKanjiIds.includes(k.id)));
            setSelectedKanjiIds([]);
            setBulkSelectMode(false);
        } catch (e) {
            console.error('Error bulk deleting kanji:', e);
        }
    };

    // Bulk delete vocab
    const handleBulkDeleteVocab = async () => {
        if (selectedVocabIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedVocabIds.length} từ vựng?`)) return;

        try {
            for (const id of selectedVocabIds) {
                await deleteDoc(doc(db, 'kanjiVocab', id));
            }
            setVocabList(prev => prev.filter(v => !selectedVocabIds.includes(v.id)));
            setSelectedVocabIds([]);
            setBulkSelectMode(false);
        } catch (e) {
            console.error('Error bulk deleting vocab:', e);
        }
    };

    // Import Kanji from JSON
    const handleImportKanjiJson = async () => {
        if (!jsonKanjiInput.trim()) return;
        setIsImporting(true);
        setImportStatus('Đang xử lý...');

        try {
            const data = JSON.parse(jsonKanjiInput);
            const kanjiArray = Array.isArray(data) ? data : [data];

            let successCount = 0;
            let skippedCount = 0;
            const newKanjiItems = [];

            // Get existing kanji characters for duplicate check
            const existingChars = kanjiList.map(k => k.character);

            for (const item of kanjiArray) {
                if (!item.character) continue;

                // Check if kanji already exists
                if (existingChars.includes(item.character)) {
                    skippedCount++;
                    continue;
                }

                const kanjiData = {
                    character: item.character || '',
                    meaning: item.meaning || item.nghia || '',
                    onyomi: item.onyomi || item.on || '',
                    kunyomi: item.kunyomi || item.kun || '',
                    level: item.level || item.jlpt || 'N5',
                    sinoViet: item.sinoViet || item.hanViet || item.hv || '',
                    mnemonic: item.mnemonic || item.cachNho || '',
                    radical: item.radical || item.boThu || '',
                };

                const docRef = await addDoc(collection(db, 'kanji'), kanjiData);
                newKanjiItems.push({ ...kanjiData, id: docRef.id });
                existingChars.push(item.character); // Add to existing to prevent duplicates in same batch
                successCount++;
            }

            setKanjiList([...kanjiList, ...newKanjiItems]);
            const skipMsg = skippedCount > 0 ? ` (bỏ qua ${skippedCount} trùng)` : '';
            setImportStatus(`✅ Đã nhập ${successCount} kanji${skipMsg}!`);
            setTimeout(() => {
                setShowImportKanjiModal(false);
                setJsonKanjiInput('');
                setImportStatus('');
            }, 2000);
        } catch (e) {
            console.error('Error importing kanji:', e);
            setImportStatus(`❌ Lỗi: ${e.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Import Vocab from JSON
    const handleImportVocabJson = async () => {
        if (!jsonVocabInput.trim()) return;
        setIsImporting(true);
        setImportStatus('Đang xử lý...');

        try {
            const data = JSON.parse(jsonVocabInput);
            const vocabArray = Array.isArray(data) ? data : [data];

            let successCount = 0;
            let skippedCount = 0;
            const newVocabItems = [];

            // Get existing vocab words for duplicate check
            const existingWords = vocabList.map(v => v.word);

            for (const item of vocabArray) {
                if (!item.word && !item.tu) continue;

                const word = item.word || item.tu || '';

                // Check if vocab already exists
                if (existingWords.includes(word)) {
                    skippedCount++;
                    continue;
                }

                const kanjiChars = word.match(/[\u4e00-\u9faf]/g) || [];

                const vocabData = {
                    word: word,
                    reading: item.reading || item.doc || item.hiragana || '',
                    meaning: item.meaning || item.nghia || '',
                    level: item.level || item.jlpt || 'N5',
                    source: item.source || item.nguon || 'Mimikara',
                    sinoViet: item.sinoViet || item.hanViet || '',
                    kanjiList: kanjiChars
                };

                const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
                newVocabItems.push({ ...vocabData, id: docRef.id });
                existingWords.push(word); // Add to existing to prevent duplicates in same batch
                successCount++;
            }

            setVocabList([...vocabList, ...newVocabItems]);
            const skipMsg = skippedCount > 0 ? ` (bỏ qua ${skippedCount} trùng)` : '';
            setImportStatus(`✅ Đã nhập ${successCount} từ vựng${skipMsg}!`);
            setTimeout(() => {
                setShowImportVocabModal(false);
                setJsonVocabInput('');
                setImportStatus('');
            }, 2000);
        } catch (e) {
            console.error('Error importing vocab:', e);
            setImportStatus(`❌ Lỗi: ${e.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Edit Kanji
    const handleEditKanji = async () => {
        if (!editingKanji || !editingKanji.id) return;
        try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'kanji', editingKanji.id), {
                character: editingKanji.character,
                meaning: editingKanji.meaning,
                onyomi: editingKanji.onyomi,
                kunyomi: editingKanji.kunyomi,
                level: editingKanji.level,
                strokeCount: editingKanji.strokeCount,
                sinoViet: editingKanji.sinoViet,
                mnemonic: editingKanji.mnemonic
            });
            setKanjiList(kanjiList.map(k => k.id === editingKanji.id ? editingKanji : k));
            setShowEditKanjiModal(false);
            setEditingKanji(null);
        } catch (e) {
            console.error('Error editing kanji:', e);
        }
    };

    // Delete Kanji
    const handleDeleteKanji = async (kanjiId) => {
        if (!kanjiId || !window.confirm('Bạn có chắc muốn xóa kanji này?')) return;
        try {
            await deleteDoc(doc(db, 'kanji', kanjiId));
            setKanjiList(kanjiList.filter(k => k.id !== kanjiId));
        } catch (e) {
            console.error('Error deleting kanji:', e);
        }
    };

    // Edit Vocab
    const handleEditVocab = async () => {
        if (!editingVocab || !editingVocab.id) return;
        try {
            const { updateDoc } = await import('firebase/firestore');
            const kanjiChars = editingVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            await updateDoc(doc(db, 'kanjiVocab', editingVocab.id), {
                word: editingVocab.word,
                reading: editingVocab.reading,
                meaning: editingVocab.meaning,
                level: editingVocab.level,
                source: editingVocab.source,
                sinoViet: editingVocab.sinoViet,
                kanjiList: kanjiChars
            });
            setVocabList(vocabList.map(v => v.id === editingVocab.id ? { ...editingVocab, kanjiList: kanjiChars } : v));
            setShowEditVocabModal(false);
            setEditingVocab(null);
        } catch (e) {
            console.error('Error editing vocab:', e);
        }
    };

    // Delete Vocab
    const handleDeleteVocab = async (vocabId) => {
        if (!vocabId || !window.confirm('Bạn có chắc muốn xóa từ vựng này?')) return;
        try {
            await deleteDoc(doc(db, 'kanjiVocab', vocabId));
            setVocabList(vocabList.filter(v => v.id !== vocabId));
        } catch (e) {
            console.error('Error deleting vocab:', e);
        }
    };

    // Open Edit Kanji Modal
    const openEditKanji = (kanji) => {
        setEditingKanji({ ...kanji });
        setShowEditKanjiModal(true);
    };

    // Open Edit Vocab Modal
    const openEditVocab = (vocab) => {
        setEditingVocab({ ...vocab });
        setShowEditVocabModal(true);
    };

    // Kanji Detail Modal - memoized to prevent recreation on every render
    const KanjiDetailModal = useCallback(() => {
        if (!selectedKanji) return null;
        const detail = getKanjiDetail(selectedKanji);
        const vocab = getVocabForKanji(selectedKanji);
        const related = getRelatedKanji(selectedKanji);

        return (
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 overflow-auto">
                <div className="min-h-screen p-4 lg:p-8 bg-gradient-to-br from-indigo-50/95 via-white/95 to-purple-50/95 dark:from-slate-900/95 dark:via-slate-900/95 dark:to-slate-900/95">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setShowDetailModal(false)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" /> Quay lại
                        </button>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Tìm kiếm..." className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white text-sm shadow-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Kanji Display with Animation */}
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 aspect-square flex items-center justify-center relative shadow-xl overflow-hidden">
                                {/* HanziWriter Container - key prevents remounting */}
                                <div
                                    key={`hanzi-writer-${selectedKanji}`}
                                    ref={detailWriterContainerRef}
                                    className="w-full h-full flex items-center justify-center"
                                />
                                {/* Grid Overlay */}
                                <div className="absolute inset-6 grid grid-cols-2 grid-rows-2 pointer-events-none">
                                    <div className="border-r border-b border-gray-200 dark:border-slate-700/50 border-dashed"></div>
                                    <div className="border-b border-gray-200 dark:border-slate-700/50 border-dashed"></div>
                                    <div className="border-r border-gray-200 dark:border-slate-700/50 border-dashed"></div>
                                    <div></div>
                                </div>
                                {/* Replay Button */}
                                <button
                                    onClick={() => {
                                        detailWriterRef.current?.animateCharacter({
                                            onComplete: () => {
                                                detailWriterRef.current?.showCharacter();
                                            }
                                        });
                                    }}
                                    className="absolute bottom-3 right-3 p-2 bg-cyan-500 hover:bg-cyan-400 rounded-full text-white shadow-lg transition-all hover:scale-110"
                                    title="Xem lại animation"
                                >
                                    <Play className="w-5 h-5" />
                                </button>
                                {/* Stroke Count Badge */}
                                <div className="absolute top-3 right-3 bg-orange-500 text-white text-sm font-bold px-2 py-1 rounded-lg shadow">
                                    {kanjiApiData?.stroke_count || detail.strokeCount || '?'} nét
                                </div>
                            </div>
                        </div>

                        {/* Center: Kanji Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white font-japanese">{selectedKanji}</span>
                                <span className="text-2xl text-gray-400">-</span>
                                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{detail.sinoViet || 'CHI'}</span>
                                {isAdmin && detail.id && (
                                    <div className="ml-auto flex gap-2">
                                        <button
                                            onClick={() => openEditKanji(detail)}
                                            className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors"
                                            title="Chỉnh sửa kanji"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { handleDeleteKanji(detail.id); setShowDetailModal(false); }}
                                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors"
                                            title="Xóa kanji"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 text-sm bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                                <p><span className="text-cyan-600 dark:text-cyan-400">→ Quy tắc chuyển âm</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Ý nghĩa:</span> <span className="text-orange-500 dark:text-orange-400 font-medium">{detail.meaning || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Trình độ JLPT:</span> <span className="text-gray-900 dark:text-white font-medium">{detail.level || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Số nét:</span> <span className="text-gray-900 dark:text-white font-bold">{kanjiApiData?.stroke_count || detail.strokeCount || '?'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Bộ thủ:</span> <span className="text-orange-500 dark:text-orange-400 font-japanese">{detail.radical || kanjiApiData?.radical || '?'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm Kun:</span> <span className="text-gray-900 dark:text-white font-japanese">{detail.kunyomi || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm On:</span> <span className="text-cyan-600 dark:text-cyan-400 font-japanese">{detail.onyomi || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Ghi ý cách nhớ:</span> <span className="text-gray-900 dark:text-white">{detail.mnemonic || 'Chưa có ghi chú'}</span></p>
                            </div>
                            {/* Component Breakdown Diagram - Sơ đồ chiết tự */}
                            <div className="mt-6">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Sơ đồ chiết tự
                                </h4>
                                <div className="relative bg-slate-900 rounded-xl border border-slate-700 overflow-hidden" style={{ height: '420px' }}>
                                    {loadingApiData ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : (() => {
                                        // Parse radical string
                                        const parseRadicals = (str) => {
                                            if (!str) return [];
                                            const withoutParens = str.replace(/[（(][^)）]*[)）]/g, '');
                                            return withoutParens.split(/[,，、\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                        };

                                        // Build recursive decomposition tree
                                        const buildTree = (char, depth = 0, maxDepth = 4, visited = new Set()) => {
                                            if (depth >= maxDepth || visited.has(char)) return { char, children: [] };
                                            visited.add(char);
                                            let children = [];
                                            const kanjiData = kanjiList.find(k => k.character === char);
                                            if (kanjiData?.radical) {
                                                children = parseRadicals(kanjiData.radical);
                                            }
                                            if (children.length === 0) {
                                                const treeData = KANJI_TREE[char];
                                                if (treeData?.components?.length > 0) {
                                                    children = treeData.components;
                                                }
                                            }
                                            return {
                                                char,
                                                children: children.map(c => buildTree(c, depth + 1, maxDepth, new Set(visited)))
                                            };
                                        };

                                        const tree = buildTree(selectedKanji, 0, 4);
                                        const nodes = [];
                                        const lines = [];

                                        // Use pixel-based layout for better control over spacing
                                        const containerWidth = 600;
                                        const containerHeight = 400;
                                        const centerX = containerWidth / 2;
                                        const centerY = containerHeight / 2;

                                        // Improved layout with fixed pixel spacing
                                        const layoutTree = (node, x, y, level, parentX = null, parentY = null, angleStart = Math.PI, angleSpan = Math.PI * 1.2) => {
                                            nodes.push({ char: node.char, x, y, level, isRoot: level === 0 });
                                            if (parentX !== null && parentY !== null) {
                                                lines.push({ x1: x, y1: y, x2: parentX, y2: parentY });
                                            }
                                            const childCount = node.children.length;
                                            if (childCount > 0) {
                                                // Fixed pixel radius - much larger to avoid overlap
                                                const radius = level === 0 ? 120 : (level === 1 ? 80 : 50);
                                                const childAngleSpan = angleSpan / Math.max(childCount, 1);

                                                node.children.forEach((child, i) => {
                                                    const angle = angleStart + childAngleSpan * (i - (childCount - 1) / 2);
                                                    const childX = x + Math.cos(angle) * radius;
                                                    const childY = y + Math.sin(angle) * radius;
                                                    layoutTree(child, childX, childY, level + 1, x, y, angle, childAngleSpan * 0.8);
                                                });
                                            }
                                        };

                                        layoutTree(tree, centerX, centerY, 0);

                                        // Find kanji that use this kanji
                                        const kanjiFromTree = Object.entries(KANJI_TREE)
                                            .filter(([k, v]) => v.components?.includes(selectedKanji) && k !== selectedKanji)
                                            .map(([k]) => k);
                                        const kanjiFromFirebase = kanjiList
                                            .filter(k => {
                                                if (k.character === selectedKanji) return false;
                                                if (kanjiFromTree.includes(k.character)) return false;
                                                return parseRadicals(k.radical).includes(selectedKanji);
                                            })
                                            .map(k => k.character);
                                        const kanjiUsingThis = [...kanjiFromTree, ...kanjiFromFirebase].slice(0, 3);

                                        // Add result nodes to the right
                                        kanjiUsingThis.forEach((k, i) => {
                                            const totalResults = kanjiUsingThis.length;
                                            const angleSpan = Math.PI * 0.5;
                                            const baseAngle = -angleSpan / 2;
                                            const angle = totalResults === 1 ? 0 : baseAngle + (angleSpan / (totalResults - 1)) * i;
                                            const radius = 130;
                                            const x = centerX + Math.cos(angle) * radius;
                                            const y = centerY + Math.sin(angle) * radius;
                                            nodes.push({ char: k, x, y, level: -1, isResult: true });
                                            lines.push({ x1: centerX, y1: centerY, x2: x, y2: y, isResult: true });
                                        });

                                        return (
                                            <div
                                                className={`absolute inset-0 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                                onWheel={(e) => {
                                                    e.preventDefault();
                                                    const delta = e.deltaY > 0 ? -0.15 : 0.15;
                                                    setDiagramZoom(prev => Math.min(Math.max(prev + delta, 0.4), 3));
                                                }}
                                                onMouseDown={(e) => {
                                                    if (e.button !== 0) return;
                                                    setIsDragging(true);
                                                    setDragStart({ x: e.clientX - diagramPan.x, y: e.clientY - diagramPan.y });
                                                }}
                                                onMouseMove={(e) => {
                                                    if (!isDragging) return;
                                                    setDiagramPan({
                                                        x: e.clientX - dragStart.x,
                                                        y: e.clientY - dragStart.y
                                                    });
                                                }}
                                                onMouseUp={() => setIsDragging(false)}
                                                onMouseLeave={() => setIsDragging(false)}
                                            >
                                                {/* CSS Animation for arrows */}
                                                <style>{`
                                                    @keyframes flowArrow {
                                                        0% { stroke-dashoffset: 12; }
                                                        100% { stroke-dashoffset: 0; }
                                                    }
                                                    .animated-line {
                                                        stroke-dasharray: 6, 6;
                                                        animation: flowArrow 0.6s linear infinite;
                                                    }
                                                    @keyframes glow {
                                                        0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
                                                        50% { box-shadow: 0 0 30px rgba(255,255,255,0.5); }
                                                    }
                                                    .glow-node {
                                                        animation: glow 2s ease-in-out infinite;
                                                    }
                                                `}</style>

                                                {/* Zoomable & Pannable content */}
                                                <div
                                                    className="absolute"
                                                    style={{
                                                        width: containerWidth,
                                                        height: containerHeight,
                                                        left: '50%',
                                                        top: '50%',
                                                        transform: `translate(calc(-50% + ${diagramPan.x}px), calc(-50% + ${diagramPan.y}px)) scale(${diagramZoom})`,
                                                        transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                                                    }}
                                                >

                                                    {/* SVG for lines */}
                                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                                                        <defs>
                                                            <marker id="arrowWhite" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                                <polygon points="0 0, 8 3, 0 6" fill="#ffffff" />
                                                            </marker>
                                                            <marker id="arrowCyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                                <polygon points="0 0, 8 3, 0 6" fill="#22d3ee" />
                                                            </marker>
                                                        </defs>

                                                        {/* All lines */}
                                                        {lines.map((line, i) => (
                                                            <line key={`line-${i}`}
                                                                x1={line.x1} y1={line.y1}
                                                                x2={line.x2} y2={line.y2}
                                                                stroke={line.isResult ? "#22d3ee" : "#9ca3af"}
                                                                strokeWidth="2"
                                                                className="animated-line"
                                                                markerEnd={line.isResult ? "url(#arrowCyan)" : "url(#arrowWhite)"}
                                                            />
                                                        ))}
                                                    </svg>

                                                    {/* Render component nodes (orange) */}
                                                    {nodes.filter(n => !n.isRoot && !n.isResult).map((node, i) => {
                                                        const size = node.level === 1 ? 48 : (node.level === 2 ? 40 : 32);
                                                        const fontSize = node.level === 1 ? 20 : (node.level === 2 ? 16 : 14);

                                                        return (
                                                            <div key={`node-${i}`}
                                                                className="absolute bg-orange-500 rounded-full flex items-center justify-center font-bold text-white cursor-pointer hover:bg-orange-400 hover:scale-110 transition-all font-japanese"
                                                                style={{
                                                                    top: node.y,
                                                                    left: node.x,
                                                                    width: size,
                                                                    height: size,
                                                                    fontSize: fontSize,
                                                                    transform: 'translate(-50%, -50%)',
                                                                    zIndex: 10 - node.level
                                                                }}
                                                                onClick={() => {
                                                                    const hasKanji = kanjiList.some(k => k.character === node.char);
                                                                    if (hasKanji) {
                                                                        setSelectedKanji(node.char);
                                                                        setDiagramPan({ x: 0, y: 0 });
                                                                        setDiagramZoom(1);
                                                                    }
                                                                }}
                                                                title={node.char}
                                                            >
                                                                {node.char}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Root node (white/light gray) - center */}
                                                    {nodes.filter(n => n.isRoot).map((node, i) => (
                                                        <div key={`root-${i}`}
                                                            className="absolute bg-gray-100 rounded-full flex items-center justify-center font-bold text-slate-800 font-japanese glow-node"
                                                            style={{
                                                                top: node.y,
                                                                left: node.x,
                                                                width: 56,
                                                                height: 56,
                                                                fontSize: 24,
                                                                transform: 'translate(-50%, -50%)',
                                                                zIndex: 15
                                                            }}
                                                            title={node.char}
                                                        >
                                                            {node.char}
                                                        </div>
                                                    ))}

                                                    {/* Result nodes (cyan) */}
                                                    {nodes.filter(n => n.isResult).map((node, i) => {
                                                        const kanjiData = kanjiList.find(kj => kj.character === node.char);
                                                        return (
                                                            <div key={`result-${i}`}
                                                                className="absolute bg-cyan-400 rounded-full flex items-center justify-center font-bold text-white cursor-pointer hover:bg-cyan-300 hover:scale-110 transition-all font-japanese"
                                                                style={{
                                                                    top: node.y,
                                                                    left: node.x,
                                                                    width: 48,
                                                                    height: 48,
                                                                    fontSize: 20,
                                                                    transform: 'translate(-50%, -50%)',
                                                                    zIndex: 10
                                                                }}
                                                                onClick={() => {
                                                                    if (kanjiData) {
                                                                        setSelectedKanji(node.char);
                                                                        setDiagramPan({ x: 0, y: 0 });
                                                                        setDiagramZoom(1);
                                                                    }
                                                                }}
                                                                title={node.char}
                                                            >
                                                                {node.char}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Right: Vocabulary */}
                        <div className="space-y-4 bg-white dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center">
                                <h3 className="text-orange-500 dark:text-orange-400 font-medium">Từ vựng trong (Mimikara, Tango)</h3>
                                <button className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline">Flashcard →</button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {vocab.length > 0 ? vocab.map((v, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-orange-500 dark:text-orange-400 font-japanese">{v.word}</span>
                                            <span className="text-gray-500 dark:text-gray-400 ml-2 font-japanese">({v.reading})</span>
                                            <span className="text-gray-400 ml-2">-</span>
                                            <span className="text-cyan-600 dark:text-cyan-400 ml-2">{v.sinoViet || ''}</span>
                                            <span className="text-gray-400 ml-2">-</span>
                                            <span className="text-gray-900 dark:text-white ml-2">{v.meaning}</span>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                            <button className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                                                <Play className="w-4 h-4" />
                                            </button>
                                            {isAdmin && v.id && (
                                                <>
                                                    <button
                                                        onClick={() => openEditVocab(v)}
                                                        className="p-1.5 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVocab(v.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-center py-4">Chưa có từ vựng</p>
                                )}
                            </div>

                            <h3 className="text-orange-500 dark:text-orange-400 font-medium mt-6">Từ vựng trong đề JLPT</h3>
                            <div className="space-y-2">
                                <p className="text-gray-400 dark:text-gray-500 text-center py-4">Chưa có từ vựng</p>
                            </div>

                            {isAdmin && (
                                <button onClick={() => setShowAddVocabModal(true)} className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5" /> Thêm từ vựng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKanji, kanjiList, vocabList, kanjiApiData, isAdmin, diagramZoom, diagramPan, isDragging, dragStart]);

    // Loading screen
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-cyan-200 dark:border-slate-700 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                        <span className="absolute inset-0 flex items-center justify-center text-3xl font-japanese text-cyan-600 dark:text-cyan-400">漢</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Đang tải dữ liệu Kanji...</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Lần đầu có thể mất vài giây</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 px-8 lg:px-16 py-6">
                {/* Left Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
                    <h1 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-japanese">鑒 Học Kanji</h1>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm kanji..."
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    {/* Kanji Preview with Stroke Animation */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl aspect-square flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                        {selectedKanji ? (
                            <>
                                <div
                                    ref={writerContainerRef}
                                    id="kanji-writer-container"
                                    className="w-full h-full flex items-center justify-center"
                                />
                                <button
                                    onClick={() => writerRef.current?.animateCharacter()}
                                    className="absolute bottom-2 right-2 p-2 bg-cyan-500 hover:bg-cyan-400 rounded-full text-white shadow-lg transition-all hover:scale-110"
                                    title="Xem lại animation"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <PenTool className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                        )}
                    </div>

                    {/* Admin buttons */}
                    {isAdmin && (
                        <div className="space-y-2">
                            <button onClick={() => setShowAddKanjiModal(true)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium flex items-center justify-center gap-2 text-white">
                                <Plus className="w-4 h-4" /> Thêm Kanji
                            </button>
                            <button onClick={() => setShowAddVocabModal(true)} className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium flex items-center justify-center gap-2 text-white">
                                <Plus className="w-4 h-4" /> Thêm Từ vựng
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setShowImportKanjiModal(true)} className="py-2 bg-cyan-700 hover:bg-cyan-600 rounded-lg font-medium flex items-center justify-center gap-1 text-sm text-white">
                                    <FileJson className="w-4 h-4" /> Import Kanji
                                </button>
                                <button onClick={() => setShowImportVocabModal(true)} className="py-2 bg-purple-700 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-1 text-sm text-white">
                                    <FileJson className="w-4 h-4" /> Import Vocab
                                </button>
                            </div>
                            {/* Bulk Select Mode Toggle */}
                            <button
                                onClick={() => {
                                    setBulkSelectMode(!bulkSelectMode);
                                    setSelectedKanjiIds([]);
                                    setSelectedVocabIds([]);
                                }}
                                className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm ${bulkSelectMode ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                            >
                                {bulkSelectMode ? <><X className="w-4 h-4" /> Thoát chế độ chọn</> : <><Trash2 className="w-4 h-4" /> Xóa hàng loạt</>}
                            </button>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{kanjiList.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Kanji</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">Sơ đồ</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Chiết tự</div>
                        </div>
                    </div>
                </div>

                {/* Right: Kanji Grid */}
                <div className="flex-1 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Khám phá Kanji theo trình độ</h2>

                    {/* Level Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {JLPT_LEVELS.map(level => (
                            <button
                                key={level}
                                onClick={() => setSelectedLevel(level)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${selectedLevel === level ? 'bg-cyan-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {/* Bulk Select Controls */}
                    {bulkSelectMode && isAdmin && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedKanjiIds.length === filteredKanjiList.length && filteredKanjiList.length > 0}
                                    onChange={selectAllKanji}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Chọn tất cả Kanji ({selectedKanjiIds.length}/{filteredKanjiList.length})</span>
                            </div>
                            {selectedKanjiIds.length > 0 && (
                                <span className="text-xs text-orange-600 dark:text-orange-400">
                                    💡 Chọn kanji để xem từ vựng liên quan
                                </span>
                            )}
                            <div className="flex-1" />
                            {selectedKanjiIds.length > 0 && (
                                <button onClick={handleBulkDeleteKanji} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                                    <Trash2 className="w-4 h-4" /> Xóa {selectedKanjiIds.length} Kanji
                                </button>
                            )}
                            {selectedVocabIds.length > 0 && (
                                <button onClick={handleBulkDeleteVocab} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                                    <Trash2 className="w-4 h-4" /> Xóa {selectedVocabIds.length} Vocab
                                </button>
                            )}
                        </div>
                    )}

                    {/* Kanji Grid */}
                    <div className="bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 max-h-[calc(100vh-320px)] overflow-auto shadow-lg">
                        {bulkSelectMode && isAdmin ? (
                            /* Bulk select mode - show list with checkboxes */
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Chọn Kanji để xóa:</p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                    {filteredKanjiList.map(kanji => (
                                        <div
                                            key={kanji.id}
                                            onClick={() => toggleKanjiSelection(kanji.id)}
                                            className={`relative aspect-square flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer transition-all ${selectedKanjiIds.includes(kanji.id) ? 'bg-red-500 text-white ring-2 ring-red-300' : 'bg-emerald-500 dark:bg-emerald-600/80 text-white hover:bg-emerald-600'}`}
                                        >
                                            <span className="font-japanese">{kanji.character}</span>
                                            {selectedKanjiIds.includes(kanji.id) && (
                                                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-red-600" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Vocab related to selected kanji */}
                                {(() => {
                                    // Get selected kanji characters
                                    const selectedKanjiChars = filteredKanjiList
                                        .filter(k => selectedKanjiIds.includes(k.id))
                                        .map(k => k.character);

                                    // Get vocab containing any selected kanji
                                    const relatedVocab = selectedKanjiChars.length > 0
                                        ? vocabList.filter(v => selectedKanjiChars.some(char => v.word?.includes(char)))
                                        : [];

                                    return relatedVocab.length > 0 && (
                                        <>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 mb-2">
                                                Từ vựng chứa kanji đã chọn ({relatedVocab.length}):
                                            </p>
                                            <div className="space-y-1 max-h-60 overflow-auto">
                                                {relatedVocab.map(vocab => (
                                                    <div
                                                        key={vocab.id}
                                                        onClick={() => toggleVocabSelection(vocab.id)}
                                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${selectedVocabIds.includes(vocab.id) ? 'bg-red-100 dark:bg-red-900/30 ring-1 ring-red-300' : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedVocabIds.includes(vocab.id)}
                                                            onChange={() => { }}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                        <span className="font-japanese text-lg text-gray-900 dark:text-white">{vocab.word}</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">- {vocab.meaning}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            /* Normal mode - show grid */
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-11 gap-1">
                                {currentKanjiList.map((kanji, i) => (
                                    <button
                                        key={`${kanji}-${i}`}
                                        onClick={() => { setSelectedKanji(kanji); setShowDetailModal(true); }}
                                        className={`aspect-square flex items-center justify-center text-xl font-bold rounded-lg transition-all ${selectedKanji === kanji ? 'bg-cyan-500 text-white scale-105 shadow-lg' : 'bg-emerald-500 dark:bg-emerald-600/80 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:scale-105 shadow-md'}`}
                                    >
                                        <span className="font-japanese">{kanji}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && KanjiDetailModal()}

            {/* Add Kanji Modal */}
            {showAddKanjiModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[320px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thêm Kanji mới</h3>
                            <button onClick={() => setShowAddKanjiModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <input value={newKanji.character} onChange={e => setNewKanji({ ...newKanji, character: e.target.value })} placeholder="Kanji (例: 水)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-xl text-center text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500" />
                        <input value={newKanji.sinoViet} onChange={e => setNewKanji({ ...newKanji, sinoViet: e.target.value })} placeholder="Âm Hán Việt (例: THỦY)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newKanji.meaning} onChange={e => setNewKanji({ ...newKanji, meaning: e.target.value })} placeholder="Nghĩa (例: Nước)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={newKanji.onyomi} onChange={e => setNewKanji({ ...newKanji, onyomi: e.target.value })} placeholder="Âm On" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                            <input value={newKanji.kunyomi} onChange={e => setNewKanji({ ...newKanji, kunyomi: e.target.value })} placeholder="Âm Kun" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newKanji.level} onChange={e => setNewKanji({ ...newKanji, level: e.target.value })} className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <input value={newKanji.radical || ''} onChange={e => setNewKanji({ ...newKanji, radical: e.target.value })} placeholder="Bộ thủ (例: 水)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        </div>
                        <textarea value={newKanji.mnemonic} onChange={e => setNewKanji({ ...newKanji, mnemonic: e.target.value })} placeholder="Cách nhớ" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 resize-none h-16 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <button onClick={handleAddKanji} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white text-sm">Lưu Kanji</button>
                    </div>
                </div>
            )}

            {/* Add Vocab Modal */}
            {showAddVocabModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[320px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Từ vựng</h3>
                            <button onClick={() => setShowAddVocabModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <input value={newVocab.word} onChange={e => setNewVocab({ ...newVocab, word: e.target.value })} placeholder="Từ vựng (例: 水道)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-base text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.reading} onChange={e => setNewVocab({ ...newVocab, reading: e.target.value })} placeholder="Cách đọc (例: すいどう)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.sinoViet || ''} onChange={e => setNewVocab({ ...newVocab, sinoViet: e.target.value })} placeholder="Âm Hán Việt" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.meaning} onChange={e => setNewVocab({ ...newVocab, meaning: e.target.value })} placeholder="Nghĩa" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newVocab.level} onChange={e => setNewVocab({ ...newVocab, level: e.target.value })} className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <input value={newVocab.source || ''} onChange={e => setNewVocab({ ...newVocab, source: e.target.value })} placeholder="Nguồn" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">* Tự động liên kết với Kanji trong từ</p>
                        <button onClick={handleAddVocab} className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-white text-sm">Lưu Từ vựng</button>
                    </div>
                </div>
            )}

            {/* Import Kanji JSON Modal */}
            {showImportKanjiModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[420px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileJson className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> Import Kanji
                            </h3>
                            <button onClick={() => { setShowImportKanjiModal(false); setImportStatus(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-3 text-xs border border-gray-200 dark:border-slate-600">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-700 dark:text-gray-300 font-medium">📋 JSON mẫu:</p>
                                <button
                                    onClick={() => {
                                        const sampleJson = `[
  {
    "character": "水",
    "sinoViet": "THỦY",
    "meaning": "Nước",
    "onyomi": "スイ",
    "kunyomi": "みず",
    "level": "N5",
    "radical": "水",
    "mnemonic": "Hình dòng nước chảy"
  }
]`;
                                        navigator.clipboard.writeText(sampleJson);
                                        setImportStatus('📋 Đã copy JSON mẫu!');
                                        setTimeout(() => setImportStatus(''), 2000);
                                    }}
                                    className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] rounded font-medium flex items-center gap-1"
                                >
                                    📋 Copy
                                </button>
                            </div>
                            <pre className="text-[10px] text-cyan-600 dark:text-cyan-400 overflow-x-auto whitespace-pre-wrap bg-white/50 dark:bg-slate-800/50 rounded p-2">{`[
  {
    "character": "水",
    "sinoViet": "THỦY",
    "meaning": "Nước",
    "onyomi": "スイ",
    "kunyomi": "みず",
    "level": "N5",
    "radical": "水",
    "mnemonic": "Hình dòng nước chảy"
  }
]`}</pre>
                        </div>

                        <textarea
                            value={jsonKanjiInput}
                            onChange={e => setJsonKanjiInput(e.target.value)}
                            placeholder="Dán JSON Kanji vào đây..."
                            className="w-full h-32 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-xs resize-none border border-gray-200 dark:border-slate-600"
                        />

                        {importStatus && (
                            <p className={`text-center text-sm font-medium ${importStatus.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : importStatus.includes('❌') ? 'text-red-600 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                {importStatus}
                            </p>
                        )}

                        <button
                            onClick={handleImportKanjiJson}
                            disabled={isImporting || !jsonKanjiInput.trim()}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2 text-white text-sm"
                        >
                            {isImporting ? 'Đang nhập...' : <><Upload className="w-4 h-4" /> Import</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Import Vocab JSON Modal */}
            {showImportVocabModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[420px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileJson className="w-5 h-5 text-purple-500 dark:text-purple-400" /> Import Từ vựng
                            </h3>
                            <button onClick={() => { setShowImportVocabModal(false); setImportStatus(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-2 text-xs border border-gray-200 dark:border-slate-600">
                            <p className="text-gray-700 dark:text-gray-300 mb-1">📝 Format:</p>
                            <pre className="text-[10px] text-purple-600 dark:text-purple-400 overflow-x-auto">{`[{"word":"水道","reading":"すいどう","meaning":"Đường nước","level":"N4"}]`}</pre>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-1">* Tự động liên kết với Kanji</p>
                        </div>

                        <textarea
                            value={jsonVocabInput}
                            onChange={e => setJsonVocabInput(e.target.value)}
                            placeholder="Dán JSON Từ vựng vào đây..."
                            className="w-full h-32 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-xs resize-none border border-gray-200 dark:border-slate-600"
                        />

                        {importStatus && (
                            <p className={`text-center text-sm font-medium ${importStatus.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : importStatus.includes('❌') ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {importStatus}
                            </p>
                        )}

                        <button
                            onClick={handleImportVocabJson}
                            disabled={isImporting || !jsonVocabInput.trim()}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2 text-white text-sm"
                        >
                            {isImporting ? 'Đang nhập...' : <><Upload className="w-4 h-4" /> Import</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Kanji Modal */}
            {showEditKanjiModal && editingKanji && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-auto space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Edit className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> Chỉnh sửa Kanji
                            </h3>
                            <button onClick={() => { setShowEditKanjiModal(false); setEditingKanji(null); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <input
                            value={editingKanji.character}
                            onChange={e => setEditingKanji({ ...editingKanji, character: e.target.value })}
                            placeholder="Kanji"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-2xl text-center text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <input
                            value={editingKanji.sinoViet || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, sinoViet: e.target.value })}
                            placeholder="Âm Hán Việt"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <input
                            value={editingKanji.meaning || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, meaning: e.target.value })}
                            placeholder="Nghĩa"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={editingKanji.onyomi || ''}
                                onChange={e => setEditingKanji({ ...editingKanji, onyomi: e.target.value })}
                                placeholder="Âm On"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            />
                            <input
                                value={editingKanji.kunyomi || ''}
                                onChange={e => setEditingKanji({ ...editingKanji, kunyomi: e.target.value })}
                                placeholder="Âm Kun"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={editingKanji.level}
                                onChange={e => setEditingKanji({ ...editingKanji, level: e.target.value })}
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            >
                                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <input
                                value={editingKanji.strokeCount || ''}
                                onChange={e => setEditingKanji({ ...editingKanji, strokeCount: e.target.value })}
                                placeholder="Số nét"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            />
                        </div>
                        <input
                            value={editingKanji.radical || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, radical: e.target.value })}
                            placeholder="Bộ thủ"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <textarea
                            value={editingKanji.mnemonic || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, mnemonic: e.target.value })}
                            placeholder="Cách nhớ"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 resize-none h-20 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <button onClick={handleEditKanji} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold flex items-center justify-center gap-2 text-white">
                            <Save className="w-5 h-5" /> Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Vocab Modal */}
            {showEditVocabModal && editingVocab && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Edit className="w-5 h-5 text-orange-500 dark:text-orange-400" /> Chỉnh sửa Từ vựng
                            </h3>
                            <button onClick={() => { setShowEditVocabModal(false); setEditingVocab(null); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <input
                            value={editingVocab.word}
                            onChange={e => setEditingVocab({ ...editingVocab, word: e.target.value })}
                            placeholder="Từ vựng"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-lg text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <input
                            value={editingVocab.reading || ''}
                            onChange={e => setEditingVocab({ ...editingVocab, reading: e.target.value })}
                            placeholder="Cách đọc (hiragana)"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <input
                            value={editingVocab.sinoViet || ''}
                            onChange={e => setEditingVocab({ ...editingVocab, sinoViet: e.target.value })}
                            placeholder="Âm Hán Việt"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <input
                            value={editingVocab.meaning || ''}
                            onChange={e => setEditingVocab({ ...editingVocab, meaning: e.target.value })}
                            placeholder="Nghĩa"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={editingVocab.level}
                                onChange={e => setEditingVocab({ ...editingVocab, level: e.target.value })}
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            >
                                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <input
                                value={editingVocab.source || ''}
                                onChange={e => setEditingVocab({ ...editingVocab, source: e.target.value })}
                                placeholder="Nguồn"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            />
                        </div>
                        <button onClick={handleEditVocab} className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold flex items-center justify-center gap-2 text-white">
                            <Save className="w-5 h-5" /> Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiScreen;
