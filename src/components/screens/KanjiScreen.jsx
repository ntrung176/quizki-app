import React, { useState, useMemo, useEffect } from 'react';
import { Search, Grid, PenTool, Download, BookOpen, Map, Globe, Layers, X, Plus, Save, Trash2, Volume2, ArrowLeft, Play, Upload, FileJson, Edit } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

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

    // Form states
    const [newKanji, setNewKanji] = useState({
        character: '', meaning: '', onyomi: '', kunyomi: '',
        level: 'N5', strokeCount: '', sinoViet: '', mnemonic: ''
    });
    const [newVocab, setNewVocab] = useState({
        word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara'
    });
    const [jsonKanjiInput, setJsonKanjiInput] = useState('');
    const [jsonVocabInput, setJsonVocabInput] = useState('');

    // Load data from Firebase
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load Kanji
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setKanjiList(kanjiData);

                // Load Vocab
                const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
                const vocabData = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setVocabList(vocabData);
            } catch (e) {
                console.error('Error loading kanji data:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Get kanji for current level (from Firebase)
    const currentKanjiList = useMemo(() => {
        const firebaseKanji = kanjiList.filter(k => k.level === selectedLevel).map(k => k.character);
        if (!searchQuery.trim()) return firebaseKanji;
        return firebaseKanji.filter(k => k.includes(searchQuery));
    }, [selectedLevel, kanjiList, searchQuery]);

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

    // Add Kanji
    const handleAddKanji = async () => {
        if (!newKanji.character) return;
        try {
            await addDoc(collection(db, 'kanji'), newKanji);
            setKanjiList([...kanjiList, { ...newKanji, id: Date.now().toString() }]);
            setNewKanji({ character: '', meaning: '', onyomi: '', kunyomi: '', level: 'N5', strokeCount: '', sinoViet: '', mnemonic: '' });
            setShowAddKanjiModal(false);
        } catch (e) {
            console.error('Error adding kanji:', e);
        }
    };

    // Add Vocab
    const handleAddVocab = async () => {
        if (!newVocab.word) return;
        try {
            // Extract kanji from word
            const kanjiChars = newVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const vocabData = { ...newVocab, kanjiList: kanjiChars };
            await addDoc(collection(db, 'kanjiVocab'), vocabData);
            setVocabList([...vocabList, { ...vocabData, id: Date.now().toString() }]);
            setNewVocab({ word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara' });
            setShowAddVocabModal(false);
        } catch (e) {
            console.error('Error adding vocab:', e);
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
            const newKanjiItems = [];

            for (const item of kanjiArray) {
                if (!item.character) continue;

                const kanjiData = {
                    character: item.character || '',
                    meaning: item.meaning || item.nghia || '',
                    onyomi: item.onyomi || item.on || '',
                    kunyomi: item.kunyomi || item.kun || '',
                    level: item.level || item.jlpt || 'N5',
                    strokeCount: item.strokeCount || item.soNet || '',
                    sinoViet: item.sinoViet || item.hanViet || item.hv || '',
                    mnemonic: item.mnemonic || item.cachNho || ''
                };

                await addDoc(collection(db, 'kanji'), kanjiData);
                newKanjiItems.push({ ...kanjiData, id: Date.now().toString() + successCount });
                successCount++;
            }

            setKanjiList([...kanjiList, ...newKanjiItems]);
            setImportStatus(`✅ Đã nhập thành công ${successCount} kanji!`);
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
            const newVocabItems = [];

            for (const item of vocabArray) {
                if (!item.word && !item.tu) continue;

                const word = item.word || item.tu || '';
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

                await addDoc(collection(db, 'kanjiVocab'), vocabData);
                newVocabItems.push({ ...vocabData, id: Date.now().toString() + successCount });
                successCount++;
            }

            setVocabList([...vocabList, ...newVocabItems]);
            setImportStatus(`✅ Đã nhập thành công ${successCount} từ vựng!`);
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

    // Kanji Detail Modal
    const KanjiDetailModal = () => {
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
                        {/* Left: Kanji Display */}
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 aspect-square flex items-center justify-center relative shadow-xl">
                                <span className="text-[150px] font-bold text-cyan-600 dark:text-cyan-400 font-japanese">{selectedKanji}</span>
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
                                    <div className="border-r border-b border-gray-200 dark:border-slate-700/50"></div>
                                    <div className="border-b border-gray-200 dark:border-slate-700/50"></div>
                                    <div className="border-r border-gray-200 dark:border-slate-700/50"></div>
                                    <div></div>
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
                                <p><span className="text-gray-500 dark:text-gray-400">Ý nghĩa:</span> <span className="text-orange-500 dark:text-orange-400 font-medium">{detail.meaning}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Trình độ JLPT:</span> <span className="text-gray-900 dark:text-white font-medium">{detail.level}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Số nét:</span> <span className="text-gray-900 dark:text-white">{detail.strokeCount || '4'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm Kun:</span> <span className="text-gray-900 dark:text-white font-japanese">{detail.kunyomi || 'ささえる, つかえる, かう'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm On:</span> <span className="text-cyan-600 dark:text-cyan-400 font-japanese">{detail.onyomi || 'シ'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Ghi ý cách nhớ:</span> <span className="text-gray-900 dark:text-white">{detail.mnemonic || 'Có 10 (十) ngày lại (又) làm chi nhánh (支) thu tiền'}</span></p>
                            </div>

                            {/* Related Kanji Diagram */}
                            <div className="mt-8 relative h-64">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-full h-full">
                                        {/* Center */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-cyan-500/50">
                                            {selectedKanji}
                                        </div>
                                        {/* Related */}
                                        {related.map((k, i) => {
                                            const angle = (i * 45) * (Math.PI / 180);
                                            const radius = 100;
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle) * radius;
                                            const colors = ['bg-orange-500', 'bg-white text-slate-900', 'bg-cyan-500'];
                                            return (
                                                <div
                                                    key={i}
                                                    className={`absolute w-10 h-10 rounded-full ${colors[i % 3]} flex items-center justify-center text-lg font-bold cursor-pointer hover:scale-110 transition-transform shadow-lg`}
                                                    style={{ top: `calc(50% + ${y}px - 20px)`, left: `calc(50% + ${x}px - 20px)` }}
                                                    onClick={() => setSelectedKanji(k)}
                                                >
                                                    {k}
                                                </div>
                                            );
                                        })}
                                    </div>
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
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white">
            <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
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

                    {/* Kanji Preview */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl aspect-square flex items-center justify-center shadow-lg">
                        {selectedKanji ? (
                            <span className="text-8xl font-bold text-cyan-600 dark:text-cyan-400 font-japanese">{selectedKanji}</span>
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

                    {/* Kanji Grid */}
                    <div className="bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 max-h-[calc(100vh-280px)] overflow-auto shadow-lg">
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
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && <KanjiDetailModal />}

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
                            <input value={newKanji.strokeCount} onChange={e => setNewKanji({ ...newKanji, strokeCount: e.target.value })} placeholder="Số nét" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
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

                        <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-2 text-xs border border-gray-200 dark:border-slate-600">
                            <p className="text-gray-700 dark:text-gray-300 mb-1">📝 Format:</p>
                            <pre className="text-[10px] text-cyan-600 dark:text-cyan-400 overflow-x-auto">{`[{"character":"水","sinoViet":"THỦY","meaning":"Nước","level":"N5"}]`}</pre>
                        </div>

                        <textarea
                            value={jsonKanjiInput}
                            onChange={e => setJsonKanjiInput(e.target.value)}
                            placeholder="Dán JSON Kanji vào đây..."
                            className="w-full h-32 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-xs resize-none border border-gray-200 dark:border-slate-600"
                        />

                        {importStatus && (
                            <p className={`text-center text-sm font-medium ${importStatus.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : importStatus.includes('❌') ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
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
