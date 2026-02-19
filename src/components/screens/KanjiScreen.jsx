import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { Search, Grid, PenTool, Download, BookOpen, Map, Globe, Layers, X, Plus, Save, Trash2, Volume2, ArrowLeft, Play, Upload, FileJson, Edit, Check, Copy, Tag, FolderPlus, RotateCcw, RefreshCw } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch, updateDoc } from 'firebase/firestore';
import { playAudio } from '../../utils/audio';
import { fetchJotobaWordData, playJotobaAudio, accentNumberToPitchParts } from '../../utils/pitchAccent';
import HanziWriter from 'hanzi-writer';
import { renderStrokeGuide } from '../../utils/kanjiStroke';

import { RADICALS_214, KANJI_TREE, getDecompositionTree, isBasicRadical, getRadicalInfo } from '../../data/radicals214';
import { JOTOBA_KANJI_DATA, getJotobaKanjiByLevel, getJotobaKanjiChars, getJotobaKanjiData } from '../../data/jotobaKanjiData';

// JLPT Levels
const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// Colors for each JLPT level (grid buttons)
const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500 dark:bg-emerald-600/80', hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-500', text: 'text-white' },
    N4: { bg: 'bg-sky-500 dark:bg-sky-600/80', hover: 'hover:bg-sky-600 dark:hover:bg-sky-500', text: 'text-white' },
    N3: { bg: 'bg-violet-500 dark:bg-violet-600/80', hover: 'hover:bg-violet-600 dark:hover:bg-violet-500', text: 'text-white' },
    N2: { bg: 'bg-amber-500 dark:bg-amber-600/80', hover: 'hover:bg-amber-600 dark:hover:bg-amber-500', text: 'text-white' },
    N1: { bg: 'bg-rose-500 dark:bg-rose-600/80', hover: 'hover:bg-rose-600 dark:hover:bg-rose-500', text: 'text-white' },
    'Bộ thủ': { bg: 'bg-orange-500 dark:bg-orange-600/80', hover: 'hover:bg-orange-600 dark:hover:bg-orange-500', text: 'text-white' },
};

// Tab colors for level selector
const LEVEL_TAB_COLORS = {
    N5: 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/50',
    N4: 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/50',
    N3: 'bg-violet-500 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/50',
    N2: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50',
    N1: 'bg-rose-500 text-white shadow-md shadow-rose-900/50',
    'Bộ thủ': 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/50',
};

const KanjiScreen = ({ isAdmin = false, onAddVocabToSRS, onGeminiAssist, allUserCards = [] }) => {
    const [searchParams] = useSearchParams();
    const params = useParams();
    const navigate = useNavigate();
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

    // Vocab Categories
    const [vocabCategories, setVocabCategories] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [importCategory, setImportCategory] = useState(''); // Category selected for import

    // Firebase data
    const [kanjiList, setKanjiList] = useState([]);
    const [vocabList, setVocabList] = useState([]);
    const [loading, setLoading] = useState(true);

    // KanjiVG stroke animation controllers
    const sidebarStrokeCtrl = useRef(null);
    const detailStrokeCtrl = useRef(null);

    // Refs
    const writerContainerRef = useRef(null);
    const detailWriterContainerRef = useRef(null);
    const strokeGuideRef = useRef(null);

    // Kanji API data (from Jotoba)
    const [kanjiApiData, setKanjiApiData] = useState(null);
    const [loadingApiData, setLoadingApiData] = useState(false);

    // Search dropdown state
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchInputRef = useRef(null);

    // Handwriting search state
    const [handwritingSuggestions, setHandwritingSuggestions] = useState([]);
    const [selectedStrokeCount, setSelectedStrokeCount] = useState(0); // 0 = auto
    const handwritingStrokesRef = useRef([]); // stores [[xs, ys], ...] for each stroke
    const currentStrokeRef = useRef({ xs: [], ys: [] });
    const recognitionTimeoutRef = useRef(null);

    // Helper function to navigate to kanji detail with path params
    const openKanjiDetail = useCallback((char) => {
        navigate(`/kanji/list/${char}`);
        setSelectedKanji(char);
        setShowDetailModal(true);
    }, [navigate]);

    // Google handwriting recognition
    const recognizeHandwriting = useCallback(async (strokes, canvasWidth, canvasHeight) => {
        if (!strokes || strokes.length === 0) return;
        try {
            // Format ink data for Google Input Tools API
            const ink = strokes.map(s => [s.xs, s.ys]);
            const payload = JSON.stringify({
                options: 'enable_pre_space',
                requests: [{
                    writing_guide: { writing_area_width: canvasWidth, writing_area_height: canvasHeight },
                    ink: ink,
                    language: 'ja'
                }]
            });
            const resp = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
            const data = await resp.json();
            if (data && data[0] === 'SUCCESS' && data[1] && data[1][0]) {
                const candidates = data[1][0][1] || [];
                // Map to our kanji objects
                const suggestions = candidates
                    .filter(char => char.length === 1) // single characters only
                    .map((char, idx) => {
                        const kanjiDoc = kanjiList.find(k => k.character === char);
                        const jData = getJotobaKanjiData(char);
                        return {
                            id: kanjiDoc?.id || `hw_${idx}`,
                            character: char,
                            meaning: kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                            sinoViet: kanjiDoc?.sinoViet || jData?.sinoViet || '',
                            strokes: jData?.stroke_count || 0,
                            level: kanjiDoc?.level || jData?.level || '',
                            inDatabase: !!kanjiDoc
                        };
                    })
                    .slice(0, 24);
                console.log('Google HW Recognition:', suggestions.map(s => s.character).join(''));
                setHandwritingSuggestions(suggestions);
            }
        } catch (err) {
            console.warn('Google handwriting API failed, falling back to local:', err.message);
            // Fallback: basic pixel analysis
            const canvas = document.getElementById('handwriting-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let totalPixels = 0;
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 128) totalPixels++;
            }
            const estimatedStrokes = Math.max(1, Math.min(30, Math.round(totalPixels / 650)));
            const targetStrokes = selectedStrokeCount > 0 ? selectedStrokeCount : estimatedStrokes;
            const suggestions = kanjiList
                .map(k => {
                    const jData = getJotobaKanjiData(k.character);
                    const sc = jData?.stroke_count || 0;
                    const diff = Math.abs(sc - targetStrokes);
                    let score = 100 - diff * 10;
                    if (diff === 0) score += 50;
                    else if (diff <= 1) score += 20;
                    else if (diff <= 2) score += 10;
                    return { ...k, score, strokes: sc };
                })
                .filter(k => k.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 24);
            setHandwritingSuggestions(suggestions);
        }
    }, [kanjiList, selectedStrokeCount]);

    // Bulk selection states
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedKanjiIds, setSelectedKanjiIds] = useState([]);
    const [selectedVocabIds, setSelectedVocabIds] = useState([]);
    const [diagramZoom, setDiagramZoom] = useState(1); // Zoom level for decomposition diagram
    const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 }); // Pan position
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [addingVocabId, setAddingVocabId] = useState(null); // Track which vocab is being added
    const [addedVocabIds, setAddedVocabIds] = useState(new Set()); // Track successfully added vocab
    const [pitchAccentData, setPitchAccentData] = useState({}); // word -> pitch parts array
    const [addingAllVocab, setAddingAllVocab] = useState(false);

    // Form states
    const [newKanji, setNewKanji] = useState({
        character: '', meaning: '', onyomi: '', kunyomi: '',
        level: 'N5', sinoViet: '', mnemonic: '', radical: ''
    });
    const [newVocab, setNewVocab] = useState({
        word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara',
        sinoViet: '', pos: '', synonym: '', example: '', exampleMeaning: '', nuance: '', category: ''
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

                // Load Vocab Categories
                const catSnap = await getDocs(collection(db, 'vocabCategories'));
                const catData = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('Loaded vocab categories:', catData.length, 'items');
                setVocabCategories(catData);
            } catch (e) {
                console.error('Error loading kanji data:', e);
                alert('Lỗi tải dữ liệu Kanji. Vui lòng kiểm tra kết nối hoặc Firebase Rules.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Auto-open detail if :char param or ?char= param is present
    useEffect(() => {
        // Priority: path param > query param
        const charParam = params.char || searchParams.get('char');
        if (charParam && kanjiList.length > 0 && !loading) {
            setSelectedKanji(charParam);
            setShowDetailModal(true);
        }
    }, [params.char, searchParams, kanjiList, loading]);

    // Fetch Kanji API data + set up data when kanji is selected
    useEffect(() => {
        if (!selectedKanji) return;
        setLoadingApiData(true);

        // Use Jotoba static data + local data
        const jData = getJotobaKanjiData(selectedKanji);
        const kanjiData = kanjiList.find(k => k.character === selectedKanji);
        const treeData = KANJI_TREE[selectedKanji];

        setKanjiApiData({
            stroke_count: jData?.stroke_count || null,
            jlpt: jData?.jlpt || null,
            onyomi: jData?.onyomi || [],
            kunyomi: jData?.kunyomi || [],
            meanings: jData?.meanings || [],
            parts: jData?.parts || [],
            components: treeData?.components || [],
            componentMeaning: kanjiData?.meaning || null,
        });
        setLoadingApiData(false);
    }, [selectedKanji]);

    // Sidebar kanji preview stroke animation (HanziWriter)
    useEffect(() => {
        if (!selectedKanji || !writerContainerRef.current) return;
        let cancelled = false;
        let animTimer = null;

        // Cancel previous writer animation
        if (sidebarStrokeCtrl.current) {
            try { sidebarStrokeCtrl.current.cancelQuiz?.(); } catch (_) { }
            try { sidebarStrokeCtrl.current.hideCharacter?.(); } catch (_) { }
            sidebarStrokeCtrl.current = null;
        }

        const container = writerContainerRef.current;
        container.innerHTML = '';
        const size = Math.min(container.clientWidth, container.clientHeight) || 120;

        const showFallback = () => {
            if (!cancelled && container) {
                container.innerHTML = `<span style="font-size:${Math.floor(size * 0.8)}px;color:#0891b2;font-family:'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif;line-height:1;user-select:none">${selectedKanji}</span>`;
            }
        };

        HanziWriter.loadCharacterData(selectedKanji)
            .then((charData) => {
                if (cancelled || !container) return;
                if (!charData || !charData.strokes || charData.strokes.length === 0) {
                    showFallback();
                    return;
                }
                try {
                    const writer = HanziWriter.create(container, selectedKanji, {
                        width: size, height: size, padding: 5,
                        showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 300,
                        strokeColor: '#0891b2', outlineColor: '#334155',
                        drawingColor: '#0891b2', showCharacter: false,
                        charDataLoader: () => charData,
                    });
                    sidebarStrokeCtrl.current = writer;
                    animTimer = setTimeout(() => {
                        if (!cancelled) {
                            writer.animateCharacter();
                        }
                    }, 100);
                } catch (err) {
                    console.error('HanziWriter sidebar error:', err);
                    showFallback();
                }
            })
            .catch(() => showFallback());

        return () => {
            cancelled = true;
            if (animTimer) clearTimeout(animTimer);
        };
    }, [selectedKanji]);

    // Detail modal stroke animation + stroke guide (HanziWriter)
    useEffect(() => {
        if (!selectedKanji || !showDetailModal || !detailWriterContainerRef.current) return;
        let cancelled = false;
        let animTimer = null;

        // Cancel previous writer animation
        if (detailStrokeCtrl.current) {
            try { detailStrokeCtrl.current.cancelQuiz?.(); } catch (_) { }
            try { detailStrokeCtrl.current.hideCharacter?.(); } catch (_) { }
            detailStrokeCtrl.current = null;
        }

        const container = detailWriterContainerRef.current;
        container.innerHTML = '';

        const timer = setTimeout(() => {
            if (cancelled) return;
            const size = Math.min(container.clientWidth, container.clientHeight) || 200;

            const showFallback = () => {
                if (!cancelled && container) {
                    container.innerHTML = `<span style="font-size:${Math.floor(size * 0.8)}px;color:#0891b2;font-family:'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif;line-height:1;user-select:none">${selectedKanji}</span>`;
                }
            };

            HanziWriter.loadCharacterData(selectedKanji)
                .then((charData) => {
                    if (cancelled || !container) return;
                    if (!charData || !charData.strokes || charData.strokes.length === 0) {
                        showFallback();
                        return;
                    }
                    try {
                        const writer = HanziWriter.create(container, selectedKanji, {
                            width: size, height: size, padding: 5,
                            showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 300,
                            strokeColor: '#0891b2', outlineColor: '#334155',
                            drawingColor: '#0891b2', showCharacter: false,
                            charDataLoader: () => charData,
                        });
                        detailStrokeCtrl.current = writer;
                        animTimer = setTimeout(() => {
                            if (!cancelled) {
                                writer.animateCharacter();
                            }
                        }, 100);
                    } catch (err) {
                        console.error('HanziWriter detail error:', err);
                        showFallback();
                    }
                })
                .catch(() => showFallback());

            // Stroke order guide strip (still uses kanjiStroke.js)
            if (strokeGuideRef.current) {
                renderStrokeGuide(strokeGuideRef.current, selectedKanji, {
                    frameSize: 65,
                });
            }
        }, 100);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (animTimer) clearTimeout(animTimer);
        };
    }, [selectedKanji, showDetailModal]);

    // Get kanji for current level: merge Jotoba static data + Firebase data, sorted by stroke count
    const currentKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') {
            // Return all 214 radicals as characters
            return Object.keys(RADICALS_214);
        }
        // Start with all Jotoba kanji for this level (comprehensive JLPT list)
        const jotobaChars = getJotobaKanjiChars(selectedLevel);
        // Add any Firebase kanji not in Jotoba
        const firebaseChars = kanjiList.filter(k => k.level === selectedLevel).map(k => k.character);
        const mergedSet = new Set([...jotobaChars, ...firebaseChars]);
        let merged = [...mergedSet];

        // Sort by stroke count (simple → complex)
        merged.sort((a, b) => {
            const jA = getJotobaKanjiData(a);
            const jB = getJotobaKanjiData(b);
            const fA = kanjiList.find(k => k.character === a);
            const fB = kanjiList.find(k => k.character === b);
            const strokeA = jA?.stroke_count || fA?.strokeCount || 999;
            const strokeB = jB?.stroke_count || fB?.strokeCount || 999;
            if (strokeA !== strokeB) return strokeA - strokeB;
            // Secondary sort: frequency (lower = more common)
            const freqA = jA?.frequency || 9999;
            const freqB = jB?.frequency || 9999;
            return freqA - freqB;
        });

        if (!searchQuery.trim()) return merged;
        // Filter by search query
        const query = searchQuery.toLowerCase().trim();
        return merged.filter(k => {
            if (k.includes(query)) return true;
            const jData = getJotobaKanjiData(k);
            const fData = kanjiList.find(f => f.character === k);
            if (jData?.meanings?.some(m => m.toLowerCase().includes(query))) return true;
            if (fData?.meaning?.toLowerCase().includes(query)) return true;
            if (fData?.sinoViet?.toLowerCase().includes(query)) return true;
            if (jData?.sinoViet?.toLowerCase().includes(query)) return true;
            return false;
        });
    }, [selectedLevel, kanjiList, searchQuery]);

    // Get filtered kanji list with id for bulk operations (Firebase items only - need IDs for delete/edit)
    const filteredKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') return []; // No bulk ops for radicals
        let filtered = kanjiList.filter(k => k.level === selectedLevel);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(k => k.character.includes(query) || k.meaning?.toLowerCase().includes(query) || k.sinoViet?.toLowerCase().includes(query));
        }
        return filtered;
    }, [selectedLevel, kanjiList, searchQuery]);

    // Search results for dropdown (search across ALL kanji: Firebase + Jotoba)
    // Priority: 1. sinoViet match  2. meaning match  3. Japanese reading match
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase().trim();

        // Build comprehensive results from both sources
        const allResults = [];
        const seenChars = new Set();

        // Helper: compute match priority score (lower = higher priority)
        const getMatchScore = (char, sinoViet, meaning, meanings, onyomi, kunyomi) => {
            // Exact sinoViet match
            if (sinoViet?.toLowerCase() === query) return 0;
            // sinoViet starts with query
            if (sinoViet?.toLowerCase().startsWith(query)) return 1;
            // sinoViet contains query
            if (sinoViet?.toLowerCase().includes(query)) return 2;
            // Exact character match
            if (char === query) return 3;
            // Meaning exact match
            if (meaning?.toLowerCase() === query) return 4;
            // Meaning/meanings contain query
            if (meaning?.toLowerCase().includes(query)) return 5;
            if (meanings?.some(m => m.toLowerCase().includes(query))) return 5;
            // Japanese readings match
            if (onyomi?.some(o => o.includes(query))) return 6;
            if (kunyomi?.some(o => o.includes(query))) return 6;
            // Character contains query
            if (char.includes(query)) return 7;
            return 99;
        };

        // Search Firebase kanji
        for (const k of kanjiList) {
            const score = getMatchScore(k.character, k.sinoViet, k.meaning, null, null, null);
            if (score < 99) {
                seenChars.add(k.character);
                allResults.push({ ...k, _score: score });
            }
        }

        // Search Jotoba static data
        for (const k of Object.values(JOTOBA_KANJI_DATA)) {
            if (seenChars.has(k.literal)) {
                // Update score if Jotoba data gives better match (e.g. sinoViet)
                const score = getMatchScore(k.literal, k.sinoViet, k.meaningVi, k.meanings, k.onyomi, k.kunyomi);
                const existing = allResults.find(r => r.character === k.literal);
                if (existing && score < existing._score) {
                    existing._score = score;
                    existing.sinoViet = existing.sinoViet || k.sinoViet || '';
                }
                continue;
            }
            const score = getMatchScore(k.literal, k.sinoViet, k.meaningVi, k.meanings, k.onyomi, k.kunyomi);
            if (score < 99) {
                seenChars.add(k.literal);
                allResults.push({
                    character: k.literal,
                    meaning: k.meaningVi || k.meanings?.join(', ') || '',
                    onyomi: k.onyomi?.join('、') || '',
                    kunyomi: k.kunyomi?.join('、') || '',
                    level: k.level,
                    sinoViet: k.sinoViet || '',
                    _fromJotoba: true,
                    _score: score,
                });
            }
        }

        // Sort by priority score, then by stroke count
        allResults.sort((a, b) => {
            if (a._score !== b._score) return a._score - b._score;
            const strokeA = getJotobaKanjiData(a.character)?.stroke_count || 999;
            const strokeB = getJotobaKanjiData(b.character)?.stroke_count || 999;
            return strokeA - strokeB;
        });

        return allResults.slice(0, 20);
    }, [kanjiList, searchQuery]);

    // Handle selecting a kanji from search results → open detail modal directly
    const handleSelectSearchResult = (kanji) => {
        setSelectedKanji(kanji.character);
        setSelectedLevel(kanji.level); // Switch to the kanji's level
        setShowDetailModal(true); // Open detail modal directly
        setShowSearchResults(false);
        setSearchQuery('');
    };

    // Get filtered vocab list with id for bulk operations
    const filteredVocabList = useMemo(() => {
        let filtered = vocabList.filter(v => v.level === selectedLevel);
        if (searchQuery.trim()) {
            filtered = filtered.filter(v => v.word?.includes(searchQuery) || v.meaning?.includes(searchQuery));
        }
        return filtered;
    }, [selectedLevel, vocabList, searchQuery]);

    // Get kanji detail (Firebase first, then Jotoba static data as fallback)
    const getKanjiDetail = (char) => {
        const fbData = kanjiList.find(k => k.character === char);
        const jData = getJotobaKanjiData(char);

        if (fbData) {
            // Merge: Firebase data + Jotoba fills gaps
            return {
                ...fbData,
                sinoViet: fbData.sinoViet || jData?.sinoViet || '',
                meaning: fbData.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                meaningVi: jData?.meaningVi || fbData.meaning || '',
            };
        }
        // Fallback to Jotoba static data
        if (jData) {
            return {
                character: jData.literal,
                meaning: jData.meaningVi || jData.meanings?.join(', ') || '',
                meaningVi: jData.meaningVi || '',
                sinoViet: jData.sinoViet || '',
                onyomi: jData.onyomi?.join('、') || '',
                kunyomi: jData.kunyomi?.join('、') || '',
                level: jData.level || selectedLevel,
                strokeCount: jData.stroke_count || '',
                mnemonic: '',
                parts: jData.parts || [],
                _fromJotoba: true
            };
        }
        return {
            character: char, meaning: 'Chưa có thông tin', meaningVi: '', sinoViet: '',
            onyomi: '', kunyomi: '', level: selectedLevel, strokeCount: '', mnemonic: ''
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

    // Sync ALL Jotoba kanji data to Firebase
    const handleSyncJotobaToFirebase = async () => {
        if (!window.confirm('Đồng bộ toàn bộ dữ liệu Kanji từ Jotoba vào Firebase?\nKanji mới sẽ được thêm, kanji đã có sẽ được cập nhật fields còn thiếu.\nDữ liệu đã chỉnh sửa sẽ KHÔNG bị ghi đè.')) return;

        setIsImporting(true);
        setImportStatus('Đang đồng bộ...');

        try {
            const allJotobaKanji = Object.values(JOTOBA_KANJI_DATA);
            const existingChars = {};
            kanjiList.forEach(k => { if (k.character) existingChars[k.character] = k; });

            let newCount = 0;
            let updateCount = 0;
            const newItems = [];
            const BATCH_SIZE = 400;

            // Separate new and existing
            const toCreate = [];
            const toUpdate = [];

            for (const jk of allJotobaKanji) {
                const existing = existingChars[jk.literal];
                if (existing) {
                    const updates = {};
                    if (!existing.sinoViet && jk.sinoViet) updates.sinoViet = jk.sinoViet;
                    if (!existing.meaningVi && jk.meaningVi) updates.meaningVi = jk.meaningVi;
                    if ((!existing.meaning || existing.meaning === 'Chưa có thông tin') && jk.meaningVi) updates.meaning = jk.meaningVi;
                    if (!existing.strokeCount && jk.stroke_count) updates.strokeCount = String(jk.stroke_count);
                    if (!existing.onyomi && jk.onyomi?.length) updates.onyomi = jk.onyomi.join('、');
                    if (!existing.kunyomi && jk.kunyomi?.length) updates.kunyomi = jk.kunyomi.join('、');
                    if (Object.keys(updates).length > 0) {
                        toUpdate.push({ id: existing.id, updates });
                    }
                } else {
                    toCreate.push({
                        character: jk.literal,
                        meaning: jk.meaningVi || jk.meanings?.join(', ') || '',
                        meaningVi: jk.meaningVi || '',
                        sinoViet: jk.sinoViet || '',
                        onyomi: jk.onyomi?.join('、') || '',
                        kunyomi: jk.kunyomi?.join('、') || '',
                        level: jk.level || 'N5',
                        strokeCount: String(jk.stroke_count || ''),
                        mnemonic: '',
                        parts: (jk.parts || []).join('、'),
                    });
                }
            }

            setImportStatus(`Tạo ${toCreate.length} mới, cập nhật ${toUpdate.length}...`);

            // Batch create
            for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = toCreate.slice(i, i + BATCH_SIZE);
                for (const kanji of chunk) {
                    const docRef = doc(collection(db, 'kanji'));
                    batch.set(docRef, kanji);
                    newItems.push({ ...kanji, id: docRef.id });
                }
                await batch.commit();
                newCount += chunk.length;
                setImportStatus(`Tạo mới: ${newCount}/${toCreate.length}...`);
            }

            // Batch update
            for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = toUpdate.slice(i, i + BATCH_SIZE);
                for (const item of chunk) {
                    batch.update(doc(db, 'kanji', item.id), item.updates);
                }
                await batch.commit();
                updateCount += chunk.length;
                setImportStatus(`Cập nhật: ${updateCount}/${toUpdate.length}...`);
            }

            // Update local state
            setKanjiList(prev => {
                const updated = [...prev];
                // Apply updates to existing items
                for (const item of toUpdate) {
                    const idx = updated.findIndex(k => k.id === item.id);
                    if (idx >= 0) updated[idx] = { ...updated[idx], ...item.updates };
                }
                // Add new items
                return [...updated, ...newItems];
            });

            setImportStatus(`✅ Đồng bộ xong! Tạo mới: ${newCount}, Cập nhật: ${updateCount}`);
            setTimeout(() => setImportStatus(''), 5000);
        } catch (e) {
            console.error('Sync error:', e);
            setImportStatus(`❌ Lỗi: ${e.message}`);
        } finally {
            setIsImporting(false);
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
            setNewVocab({ word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara', sinoViet: '', pos: '', synonym: '', example: '', exampleMeaning: '', nuance: '', category: '' });
            setShowAddVocabModal(false);
        } catch (e) {
            console.error('Error adding vocab:', e);
        }
    };

    // Add Vocab Category
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const trimmed = newCategoryName.trim();
        // Check duplicate
        if (vocabCategories.some(c => c.name === trimmed)) {
            alert(`Phân loại "${trimmed}" đã tồn tại!`);
            return;
        }
        try {
            const docRef = await addDoc(collection(db, 'vocabCategories'), {
                name: trimmed,
                createdAt: new Date().toISOString()
            });
            setVocabCategories([...vocabCategories, { id: docRef.id, name: trimmed }]);
            setNewCategoryName('');
        } catch (e) {
            console.error('Error adding category:', e);
            alert('Lỗi khi thêm phân loại: ' + e.message);
        }
    };

    // Delete Vocab Category
    const handleDeleteCategory = async (catId) => {
        if (!window.confirm('Bạn có chắc muốn xóa phân loại này?')) return;
        try {
            await deleteDoc(doc(db, 'vocabCategories', catId));
            setVocabCategories(vocabCategories.filter(c => c.id !== catId));
        } catch (e) {
            console.error('Error deleting category:', e);
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
                const vocabLevel = item.level || item.jlpt || selectedLevel || 'N5';

                // Chỉ liên kết với kanji cùng cấp độ
                const sameLevelKanjiChars = kanjiList
                    .filter(k => k.level === vocabLevel)
                    .map(k => k.character);
                const linkedKanji = kanjiChars.filter(c => sameLevelKanjiChars.includes(c));

                const vocabData = {
                    word: word,
                    reading: item.reading || item.doc || item.hiragana || '',
                    meaning: item.meaning || item.nghia || '',
                    level: vocabLevel,
                    source: item.source || item.nguon || 'Mimikara',
                    sinoViet: item.sinoViet || item.hanViet || '',
                    pos: item.pos || '',
                    synonym: item.synonym || '',
                    example: item.example || '',
                    exampleMeaning: item.exampleMeaning || '',
                    nuance: item.nuance || '',
                    accent: item.accent || '',
                    specialReading: item.specialReading || false,
                    category: item.category || importCategory || '',
                    kanjiList: linkedKanji
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

    // Edit Kanji (update existing or create new from Jotoba data)
    const handleEditKanji = async () => {
        if (!editingKanji) return;
        const kanjiDoc = {
            character: editingKanji.character || '',
            meaning: editingKanji.meaning || '',
            onyomi: editingKanji.onyomi || '',
            kunyomi: editingKanji.kunyomi || '',
            level: editingKanji.level || 'N5',
            strokeCount: editingKanji.strokeCount || '',
            sinoViet: editingKanji.sinoViet || '',
            mnemonic: editingKanji.mnemonic || '',
            radical: editingKanji.radical || '',
            parts: editingKanji.parts || '',
        };
        try {
            if (editingKanji.id) {
                // Update existing
                await updateDoc(doc(db, 'kanji', editingKanji.id), kanjiDoc);
                setKanjiList(kanjiList.map(k => k.id === editingKanji.id ? { ...editingKanji, ...kanjiDoc } : k));
            } else {
                // Create new (from Jotoba data that admin customized)
                const docRef = await addDoc(collection(db, 'kanji'), kanjiDoc);
                setKanjiList([...kanjiList, { ...kanjiDoc, id: docRef.id }]);
            }
            setShowEditKanjiModal(false);
            setEditingKanji(null);
        } catch (e) {
            console.error('Error saving kanji:', e);
            alert('Lỗi khi lưu kanji: ' + e.message);
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
            const kanjiChars = editingVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            await updateDoc(doc(db, 'kanjiVocab', editingVocab.id), {
                word: editingVocab.word,
                reading: editingVocab.reading,
                meaning: editingVocab.meaning,
                level: editingVocab.level,
                source: editingVocab.source,
                sinoViet: editingVocab.sinoViet,
                category: editingVocab.category || '',
                kanjiList: kanjiChars
            });
            setVocabList(vocabList.map(v => v.id === editingVocab.id ? { ...editingVocab, kanjiList: kanjiChars } : v));
            setShowEditVocabModal(false);
            setEditingVocab(null);
        } catch (e) {
            console.error('Error editing vocab:', e);
            alert('Lỗi khi lưu từ vựng: ' + e.message);
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

    // Add vocabulary to user's personal SRS list
    const handleAddVocabToSRS = async (vocab) => {
        if (!onAddVocabToSRS || !vocab) return;

        // Check if already in user's vocab list
        const normalizedWord = vocab.word.split('（')[0].split('(')[0].trim();
        const alreadyExists = allUserCards.some(card => {
            const cardFront = card.front.split('（')[0].split('(')[0].trim();
            return cardFront === normalizedWord;
        });

        if (alreadyExists) {
            setAddedVocabIds(prev => new Set([...prev, vocab.id]));
            return;
        }

        setAddingVocabId(vocab.id);

        try {
            // Dùng dữ liệu có sẵn, handleAddCard sẽ tự tra shared DB
            const cardData = {
                front: vocab.word || '',
                back: vocab.meaning || '',
                synonym: vocab.synonym || '',
                example: vocab.example || '',
                exampleMeaning: vocab.exampleMeaning || '',
                nuance: vocab.nuance || '',
                pos: vocab.pos || '',
                level: vocab.level || '',
                sinoVietnamese: vocab.sinoViet || '',
                synonymSinoVietnamese: '',
                imageBase64: null,
                audioBase64: null,
                action: 'stay',
            };

            await onAddVocabToSRS(cardData);
            setAddedVocabIds(prev => new Set([...prev, vocab.id]));
        } catch (e) {
            console.error('Error adding vocab to SRS:', e);
            alert('Lỗi khi thêm từ vựng vào danh sách ôn tập: ' + e.message);
        } finally {
            setAddingVocabId(null);
        }
    };

    // Add ALL vocab for a kanji to SRS
    const handleAddAllVocabToSRS = async (vocabItems) => {
        if (!onAddVocabToSRS || !vocabItems?.length) return;
        setAddingAllVocab(true);
        try {
            for (const v of vocabItems) {
                const normalizedWord = v.word.split('（')[0].split('(')[0].trim();
                const alreadyExists = allUserCards.some(card => {
                    const cardFront = card.front.split('（')[0].split('(')[0].trim();
                    return cardFront === normalizedWord;
                });
                if (alreadyExists || addedVocabIds.has(v.id)) continue;
                await handleAddVocabToSRS(v);
            }
        } catch (e) {
            console.error('Error adding all vocab to SRS:', e);
        } finally {
            setAddingAllVocab(false);
        }
    };

    // Auto-fetch pitch accent + audio data from Jotoba when detail modal opens
    useEffect(() => {
        if (!showDetailModal || !selectedKanji) return;

        const vocab = getVocabForKanji(selectedKanji);
        if (vocab.length === 0) return;

        // Only fetch for words we don't already have pitch data for
        const wordsToFetch = vocab.filter(v => !pitchAccentData[v.word] && v.word);
        if (wordsToFetch.length === 0) return;

        let cancelled = false;

        const fetchAll = async () => {
            const newData = { ...pitchAccentData };
            for (const v of wordsToFetch) {
                if (cancelled) break;
                try {
                    const jotobaData = await fetchJotobaWordData(v.word);
                    if (jotobaData?.pitch && !cancelled) {
                        newData[v.word] = jotobaData.pitch;
                    }
                } catch (e) {
                    // Silently fail for individual words
                }
                // Small delay between requests to be nice to the API
                if (wordsToFetch.length > 3) {
                    await new Promise(r => setTimeout(r, 150));
                }
            }
            if (!cancelled) {
                setPitchAccentData(newData);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [showDetailModal, selectedKanji]);

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
                        <button onClick={() => { setShowDetailModal(false); navigate('/kanji/list'); }} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
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
                                {/* KanjiVG Stroke Animation Container */}
                                <div
                                    key={`kanji-display-${selectedKanji}`}
                                    ref={detailWriterContainerRef}
                                    className="w-full h-full flex items-center justify-center"
                                />
                                {/* Replay Button */}
                                <button
                                    onClick={() => detailStrokeCtrl.current?.replay()}
                                    className="absolute bottom-3 right-3 p-2 bg-cyan-500 hover:bg-cyan-400 rounded-full text-white shadow-lg transition-all hover:scale-110"
                                    title="Xem lại nét vẽ"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                                {/* Stroke Count Badge */}
                                <div className="absolute top-3 right-3 bg-orange-500 text-white text-sm font-bold px-2 py-1 rounded-lg shadow">
                                    {kanjiApiData?.stroke_count || detail.strokeCount || '?'} nét
                                </div>
                            </div>
                            {/* Stroke Order Guide Strip (Jotoba Style) */}
                            <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-slate-700">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5 px-1 font-medium">Hướng dẫn nét viết</p>
                                <div
                                    ref={strokeGuideRef}
                                    className="flex gap-0.5 overflow-x-auto pb-1 scrollbar-thin"
                                    style={{ scrollbarWidth: 'thin' }}
                                />
                            </div>
                        </div>
                        {/* Center: Kanji Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white font-japanese">{selectedKanji}</span>
                                <span className="text-2xl text-gray-400">-</span>
                                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{detail.sinoViet || ''}</span>
                                {isAdmin && (
                                    <div className="ml-auto flex gap-2">
                                        <button
                                            onClick={() => {
                                                // Open edit for any kanji - pre-fill from Jotoba if not in Firebase
                                                const jData = getJotobaKanjiData(selectedKanji);
                                                const editData = detail.id ? detail : {
                                                    character: selectedKanji,
                                                    meaning: jData?.meaningVi || jData?.meanings?.join(', ') || '',
                                                    onyomi: jData?.onyomi?.join('、') || '',
                                                    kunyomi: jData?.kunyomi?.join('、') || '',
                                                    level: jData?.level || selectedLevel,
                                                    sinoViet: jData?.sinoViet || '',
                                                    mnemonic: '',
                                                    radical: '',
                                                    parts: jData?.parts?.join('、') || '',
                                                };
                                                openEditKanji(editData);
                                            }}
                                            className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors"
                                            title="Chỉnh sửa kanji"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {detail.id && (
                                            <button
                                                onClick={() => { handleDeleteKanji(detail.id); setShowDetailModal(false); navigate('/kanji/list'); }}
                                                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-slate-700 rounded-lg transition-colors"
                                                title="Xóa kanji"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2.5 text-sm bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                                {/* Vietnamese meaning - primary */}
                                <p><span className="text-gray-500 dark:text-gray-400">Ý nghĩa:</span> <span className="text-orange-500 dark:text-orange-400 font-medium text-base">{detail.meaning || getJotobaKanjiData(selectedKanji)?.meaningVi || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Trình độ JLPT:</span> <span className="text-gray-900 dark:text-white font-medium">{detail.level || (kanjiApiData?.jlpt ? `N${kanjiApiData.jlpt}` : '-')}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Số nét:</span> <span className="text-gray-900 dark:text-white font-bold">{kanjiApiData?.stroke_count || detail.strokeCount || getJotobaKanjiData(selectedKanji)?.stroke_count || '?'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm Kun:</span> <span className="text-gray-900 dark:text-white font-japanese">{detail.kunyomi || (kanjiApiData?.kunyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.kunyomi?.join('、') || '-'}</span></p>
                                <p><span className="text-gray-500 dark:text-gray-400">Âm On:</span> <span className="text-cyan-600 dark:text-cyan-400 font-japanese">{detail.onyomi || (kanjiApiData?.onyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.onyomi?.join('、') || '-'}</span></p>
                                {/* Parts / Thành phần chiết tự */}
                                {(() => {
                                    const parts = kanjiApiData?.parts || detail.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
                                    if (parts.length === 0) return null;
                                    const partsArr = typeof parts === 'string' ? parts.split(/[,，、]/).filter(Boolean) : parts;
                                    return (
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Thành phần:</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {partsArr.map((p, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSelectedKanji(p); setDiagramPan({ x: 0, y: 0 }); setDiagramZoom(1); }}
                                                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-base font-japanese hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors cursor-pointer"
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {detail.mnemonic && (
                                    <p className="pt-1 border-t border-gray-100 dark:border-slate-700"><span className="text-gray-500 dark:text-gray-400">💡 Cách nhớ:</span> <span className="text-gray-900 dark:text-white">{detail.mnemonic}</span></p>
                                )}
                            </div>
                            {/* Component Breakdown Diagram - Sơ đồ chiết tự */}
                            <div className="mt-6">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Sơ đồ chiết tự
                                </h4>
                                <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden" style={{ height: '420px' }}>
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

                                        // Build full decomposition tree
                                        const buildTree = (char, depth = 0, maxDepth = 4, visited = new Set()) => {
                                            if (depth >= maxDepth || visited.has(char)) return { char, children: [] };
                                            visited.add(char);
                                            let children = [];
                                            // 1. Firebase data (radical or parts field)
                                            const kanjiData = kanjiList.find(k => k.character === char);
                                            if (kanjiData?.parts) {
                                                children = parseRadicals(kanjiData.parts);
                                            } else if (kanjiData?.radical) {
                                                children = parseRadicals(kanjiData.radical);
                                            }
                                            // 2. KANJI_TREE data
                                            if (children.length === 0) {
                                                const treeData = KANJI_TREE[char];
                                                if (treeData?.components?.length > 0) {
                                                    children = treeData.components;
                                                }
                                            }
                                            // 3. Jotoba static parts data
                                            if (children.length === 0) {
                                                const jData = getJotobaKanjiData(char);
                                                if (jData?.parts?.length > 0) {
                                                    children = jData.parts.filter(p => p !== char);
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

                                        // Find kanji that use this kanji as a component (comprehensive search)
                                        const kanjiFromTree = Object.entries(KANJI_TREE)
                                            .filter(([k, v]) => v.components?.includes(selectedKanji) && k !== selectedKanji)
                                            .map(([k]) => k);

                                        const kanjiFromFirebase = kanjiList
                                            .filter(k => {
                                                if (k.character === selectedKanji) return false;
                                                if (kanjiFromTree.includes(k.character)) return false;
                                                const radicals = parseRadicals(k.radical || '');
                                                const parts = parseRadicals(k.parts || '');
                                                return radicals.includes(selectedKanji) || parts.includes(selectedKanji);
                                            })
                                            .map(k => k.character);

                                        // Also search in Jotoba static data
                                        const kanjiFromJotoba = Object.values(JOTOBA_KANJI_DATA)
                                            .filter(jk => {
                                                if (jk.literal === selectedKanji) return false;
                                                if (kanjiFromTree.includes(jk.literal)) return false;
                                                if (kanjiFromFirebase.includes(jk.literal)) return false;
                                                return jk.parts?.includes(selectedKanji);
                                            })
                                            .map(jk => jk.literal);

                                        const kanjiUsingThis = [...kanjiFromTree, ...kanjiFromFirebase, ...kanjiFromJotoba].slice(0, 5);

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
                                                            {/* Markers for light mode */}
                                                            <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                                <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
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
                                                                markerEnd={line.isResult ? "url(#arrowCyan)" : "url(#arrowGray)"}
                                                            />
                                                        ))}
                                                    </svg>

                                                    {/* Render component nodes (orange) - only show actual components, not root */}
                                                    {nodes.filter(n => !n.isRoot && !n.isResult && n.char !== selectedKanji).map((node, i) => {
                                                        const size = node.level === 1 ? 48 : (node.level === 2 ? 40 : 32);
                                                        const fontSize = node.level === 1 ? 20 : (node.level === 2 ? 16 : 14);

                                                        return (
                                                            <div key={`node-${i}`}
                                                                className="absolute bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center font-bold text-white cursor-pointer hover:scale-110 transition-all font-japanese ring-2 ring-orange-300/50 hover:ring-orange-200"
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
                                                                    // Switch to this component as the new root kanji
                                                                    // This will show its decomposition + kanji that use it
                                                                    navigate(`/kanji/list/${node.char}`);
                                                                    setSelectedKanji(node.char);
                                                                    setDiagramPan({ x: 0, y: 0 });
                                                                    setDiagramZoom(1);
                                                                }}
                                                                title={`Bấm để xem chiết tự ${node.char}`}
                                                            >
                                                                {node.char}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Root node (white/light gray) - center */}
                                                    {nodes.filter(n => n.isRoot).map((node, i) => (
                                                        <div key={`root-${i}`}
                                                            className="absolute bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-slate-800 dark:text-white font-japanese glow-node"
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
                                                                        navigate(`/kanji/list/${node.char}`);
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

                        {/* Right: Vocabulary - grouped by category */}
                        <div className="space-y-4 bg-white dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                            {/* Header with Add All and Category Management */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-orange-500 dark:text-orange-400 font-medium flex items-center gap-1.5">
                                    <Tag className="w-4 h-4" /> Từ vựng ({vocab.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowCategoryModal(true)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors font-medium"
                                            title="Quản lý phân loại"
                                        >
                                            <FolderPlus className="w-3 h-3" /> Phân loại
                                        </button>
                                    )}
                                    {onAddVocabToSRS && vocab.length > 0 && (
                                        <button
                                            onClick={() => handleAddAllVocabToSRS(vocab)}
                                            disabled={addingAllVocab}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-800/40 transition-colors font-medium disabled:opacity-50"
                                        >
                                            {addingAllVocab ? (
                                                <><div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div> Đang thêm...</>
                                            ) : (
                                                <><Plus className="w-3 h-3" /> Thêm tất cả</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Render vocab grouped by category */}
                            {(() => {
                                // Group vocab by category
                                const grouped = {};
                                const uncategorized = [];
                                for (const v of vocab) {
                                    const cat = v.category || '';
                                    if (!cat) {
                                        uncategorized.push(v);
                                    } else {
                                        if (!grouped[cat]) grouped[cat] = [];
                                        grouped[cat].push(v);
                                    }
                                }

                                // Get all category names (from Firebase categories + any found in vocab)
                                const allCatNames = new Set([
                                    ...vocabCategories.map(c => c.name),
                                    ...Object.keys(grouped)
                                ]);

                                // Render a single vocab item
                                const renderVocabItem = (v, i) => {
                                    const isSpecialReading = v.specialReading || false;
                                    const apiPitch = pitchAccentData[v.word];
                                    const storedPitch = v.accent !== undefined && v.accent !== '' ? accentNumberToPitchParts(v.reading, v.accent) : null;
                                    const pitchParts = apiPitch || storedPitch;

                                    const renderWord = () => {
                                        if (isSpecialReading) {
                                            return <span className="text-blue-400 font-japanese font-bold">{v.word}</span>;
                                        }
                                        return <span className="text-orange-400 font-japanese font-bold">{v.word}</span>;
                                    };

                                    const renderReading = () => {
                                        if (!v.reading) return null;
                                        if (isSpecialReading) {
                                            return <span className="text-blue-400 font-japanese">{v.reading}</span>;
                                        }

                                        const kanjiDetail = kanjiList.find(k => k.character === selectedKanji);
                                        const kanjiReadings = [];
                                        if (kanjiDetail) {
                                            if (kanjiDetail.onyomi) {
                                                kanjiDetail.onyomi.split(/[、,]/).forEach(r => {
                                                    const clean = r.trim().replace(/[-\.。]/g, '');
                                                    if (clean) kanjiReadings.push(clean);
                                                });
                                            }
                                            if (kanjiDetail.kunyomi) {
                                                kanjiDetail.kunyomi.split(/[、,]/).forEach(r => {
                                                    const clean = r.trim().split('.')[0].replace(/[-。]/g, '');
                                                    if (clean) kanjiReadings.push(clean);
                                                });
                                            }
                                        }

                                        let highlightStart = -1;
                                        let highlightEnd = -1;
                                        const readingChars = [...v.reading];

                                        const toHiragana = (str) => str.replace(/[\u30A1-\u30F6]/g, ch =>
                                            String.fromCharCode(ch.charCodeAt(0) - 0x60)
                                        );

                                        for (const kr of kanjiReadings) {
                                            const hiraReading = toHiragana(kr);
                                            const readingStr = v.reading;
                                            const idx = readingStr.indexOf(hiraReading);
                                            if (idx !== -1) {
                                                const beforeStr = readingStr.substring(0, idx);
                                                highlightStart = [...beforeStr].length;
                                                highlightEnd = highlightStart + [...hiraReading].length;
                                                break;
                                            }
                                        }

                                        if (pitchParts && pitchParts.length > 0) {
                                            const charPitchMap = [];
                                            for (const pp of pitchParts) {
                                                const partChars = [...pp.part];
                                                for (const c of partChars) {
                                                    charPitchMap.push({ char: c, high: pp.high });
                                                }
                                            }

                                            return (
                                                <span className="font-japanese inline-flex items-end gap-0">
                                                    {readingChars.map((char, ci) => {
                                                        const pm = charPitchMap[ci];
                                                        const isHigh = pm ? pm.high : false;
                                                        const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                                                        const showDrop = isHigh && !nextHigh && ci < readingChars.length - 1;
                                                        const showRise = !isHigh && nextHigh && ci < readingChars.length - 1;
                                                        const isHighlighted = highlightStart >= 0 && ci >= highlightStart && ci < highlightEnd;

                                                        return (
                                                            <span key={ci} className="relative inline-block" style={{ marginRight: '0px' }}>
                                                                <span
                                                                    className="block"
                                                                    style={{
                                                                        borderTop: isHigh ? '2.5px solid #f97316' : '2.5px solid transparent',
                                                                        paddingTop: '1px',
                                                                        paddingLeft: '1px',
                                                                        paddingRight: '1px',
                                                                    }}
                                                                >
                                                                    <span className={isHighlighted ? 'text-blue-400' : 'text-gray-400'}>{char}</span>
                                                                </span>
                                                                {showDrop && (
                                                                    <span className="absolute -right-[1px] top-0 w-[2.5px] bg-orange-500" style={{ height: '100%' }}></span>
                                                                )}
                                                                {showRise && (
                                                                    <span className="absolute -right-[1px] top-0 w-[2.5px] bg-orange-500" style={{ height: '100%' }}></span>
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </span>
                                            );
                                        }

                                        return (
                                            <span className="font-japanese">
                                                {readingChars.map((char, ci) => {
                                                    const isHighlighted = highlightStart >= 0 && ci >= highlightStart && ci < highlightEnd;
                                                    return (
                                                        <span key={ci} className={isHighlighted ? 'text-blue-400' : 'text-gray-400'}>{char}</span>
                                                    );
                                                })}
                                            </span>
                                        );
                                    };

                                    return (
                                        <div key={`vocab-${v.id || i}`} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/80 transition-colors border border-gray-200 dark:border-slate-700/50">
                                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                                                {renderWord()}
                                                <span className="text-gray-400 dark:text-gray-500">（</span>{renderReading()}<span className="text-gray-400 dark:text-gray-500">）</span>
                                                <span className="text-gray-400 dark:text-gray-600">–</span>
                                                <span className="text-cyan-600 dark:text-cyan-500 font-medium uppercase text-xs">{v.sinoViet || ''}</span>
                                                <span className="text-gray-400 dark:text-gray-600">–</span>
                                                <span className="text-gray-700 dark:text-gray-200">{v.meaning}</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); playJotobaAudio(v.word); }}
                                                    className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-600/50"
                                                    title="Nghe phát âm (Jotoba)"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                                {onAddVocabToSRS && (
                                                    addedVocabIds.has(v.id) || allUserCards.some(c => c.front.split('（')[0].split('(')[0].trim() === v.word.split('（')[0].split('(')[0].trim()) ? (
                                                        <span className="p-1.5 text-emerald-500" title="Đã có trong danh sách">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </span>
                                                    ) : addingVocabId === v.id ? (
                                                        <span className="p-1.5">
                                                            <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddVocabToSRS(v)}
                                                            className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-600/50"
                                                            title="Thêm vào danh sách ôn tập"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )
                                                )}
                                                {isAdmin && v.id && (
                                                    <>
                                                        <button
                                                            onClick={() => openEditVocab(v)}
                                                            className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-600/50"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVocab(v.id)}
                                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-600/50"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                };

                                // If no vocab at all
                                if (vocab.length === 0) {
                                    return <p className="text-gray-400 dark:text-gray-500 text-center py-4">Chưa có từ vựng</p>;
                                }

                                // Render each category section
                                const categoryColors = [
                                    { text: 'text-orange-500 dark:text-orange-400', tag: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
                                    { text: 'text-purple-500 dark:text-purple-400', tag: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
                                    { text: 'text-emerald-500 dark:text-emerald-400', tag: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
                                    { text: 'text-blue-500 dark:text-blue-400', tag: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
                                    { text: 'text-pink-500 dark:text-pink-400', tag: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
                                    { text: 'text-amber-500 dark:text-amber-400', tag: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
                                ];

                                const sortedCatNames = [...allCatNames].sort();
                                let colorIndex = 0;

                                return (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                        {sortedCatNames.map(catName => {
                                            const items = grouped[catName] || [];
                                            if (items.length === 0) return null;
                                            const color = categoryColors[colorIndex % categoryColors.length];
                                            colorIndex++;
                                            return (
                                                <div key={catName}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.tag}`}>
                                                            {catName}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">({items.length})</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {items.map((v, i) => renderVocabItem(v, i))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Uncategorized vocab */}
                                        {uncategorized.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                                                        Chưa phân loại
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">({uncategorized.length})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {uncategorized.map((v, i) => renderVocabItem(v, i))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

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
    }, [selectedKanji, kanjiList, vocabList, kanjiApiData, isAdmin, diagramZoom, diagramPan, isDragging, dragStart, pitchAccentData, addedVocabIds, addingVocabId, vocabCategories]);

    // Loading screen
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-cyan-200 dark:border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">Đang tải dữ liệu Kanji...</p>
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

                    {/* Search with dropdown */}
                    <div className="relative" ref={searchInputRef}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            placeholder="Tìm bằng Kanji hoặc âm Hán Việt..."
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                        {/* Search Results Dropdown */}
                        {showSearchResults && searchQuery.trim() && searchResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                                <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                                    Tìm thấy {searchResults.length} kết quả
                                </div>
                                {searchResults.map((kanji, idx) => (
                                    <button
                                        key={kanji.id || idx}
                                        onClick={() => {
                                            openKanjiDetail(kanji.character);
                                            setSearchQuery('');
                                            setShowSearchResults(false);
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors text-left border-b border-gray-50 dark:border-slate-700 last:border-b-0"
                                    >
                                        <span className="text-2xl font-japanese text-cyan-600 dark:text-cyan-400 w-10 text-center">
                                            {kanji.character}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-800 dark:text-white">
                                                    {kanji.sinoViet || '---'}
                                                </span>
                                                <span className="text-xs px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded">
                                                    {kanji.level}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {kanji.meaning}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* No results message */}
                        {showSearchResults && searchQuery.trim() && searchResults.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-4 text-center text-gray-500 dark:text-gray-400">
                                Không tìm thấy kanji nào
                            </div>
                        )}
                    </div>

                    {/* Click outside to close dropdown */}
                    {showSearchResults && (
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowSearchResults(false)}
                        />
                    )}

                    {/* Kanji Handwriting Search Canvas */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col shadow-lg relative">
                        <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Vẽ Kanji để tìm kiếm</span>
                            <div className="flex items-center gap-1">
                                {handwritingStrokesRef.current.length > 0 && (
                                    <span className="text-[10px] text-gray-400 mr-1">{handwritingStrokesRef.current.length} nét</span>
                                )}
                                <button
                                    onClick={() => {
                                        const canvas = document.getElementById('handwriting-canvas');
                                        if (canvas) {
                                            const ctx = canvas.getContext('2d');
                                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                                        }
                                        handwritingStrokesRef.current = [];
                                        currentStrokeRef.current = { xs: [], ys: [] };
                                        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                        setHandwritingSuggestions([]);
                                        setSelectedStrokeCount(0);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Xóa và vẽ lại"
                                >
                                    <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="relative h-80">
                            <canvas
                                id="handwriting-canvas"
                                width="280"
                                height="280"
                                className="w-full h-full cursor-crosshair touch-none"
                                style={{ touchAction: 'none' }}
                                onMouseDown={(e) => {
                                    const canvas = e.currentTarget;
                                    const rect = canvas.getBoundingClientRect();
                                    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                    const ctx = canvas.getContext('2d');
                                    ctx.beginPath();
                                    ctx.moveTo(x, y);
                                    canvas.dataset.drawing = 'true';
                                    currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] };
                                }}
                                onMouseMove={(e) => {
                                    const canvas = e.currentTarget;
                                    if (canvas.dataset.drawing !== 'true') return;
                                    const rect = canvas.getBoundingClientRect();
                                    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                    const ctx = canvas.getContext('2d');
                                    ctx.lineTo(x, y);
                                    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#000';
                                    ctx.lineWidth = 4;
                                    ctx.lineCap = 'round';
                                    ctx.lineJoin = 'round';
                                    ctx.stroke();
                                    currentStrokeRef.current.xs.push(Math.round(x));
                                    currentStrokeRef.current.ys.push(Math.round(y));
                                }}
                                onMouseUp={(e) => {
                                    const canvas = e.currentTarget;
                                    canvas.dataset.drawing = 'false';
                                    // Save completed stroke
                                    if (currentStrokeRef.current.xs.length > 1) {
                                        handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }];
                                        currentStrokeRef.current = { xs: [], ys: [] };
                                        // Debounced API call
                                        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                        recognitionTimeoutRef.current = setTimeout(() => {
                                            recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height);
                                        }, 300);
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    const canvas = e.currentTarget;
                                    if (canvas.dataset.drawing === 'true') {
                                        canvas.dataset.drawing = 'false';
                                        if (currentStrokeRef.current.xs.length > 1) {
                                            handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }];
                                            currentStrokeRef.current = { xs: [], ys: [] };
                                            if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                            recognitionTimeoutRef.current = setTimeout(() => {
                                                recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height);
                                            }, 300);
                                        }
                                    }
                                }}
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    const canvas = e.currentTarget;
                                    const rect = canvas.getBoundingClientRect();
                                    const touch = e.touches[0];
                                    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                                    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                                    const ctx = canvas.getContext('2d');
                                    ctx.beginPath();
                                    ctx.moveTo(x, y);
                                    canvas.dataset.drawing = 'true';
                                    currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] };
                                }}
                                onTouchMove={(e) => {
                                    e.preventDefault();
                                    const canvas = e.currentTarget;
                                    if (canvas.dataset.drawing !== 'true') return;
                                    const rect = canvas.getBoundingClientRect();
                                    const touch = e.touches[0];
                                    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                                    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                                    const ctx = canvas.getContext('2d');
                                    ctx.lineTo(x, y);
                                    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#000';
                                    ctx.lineWidth = 4;
                                    ctx.lineCap = 'round';
                                    ctx.lineJoin = 'round';
                                    ctx.stroke();
                                    currentStrokeRef.current.xs.push(Math.round(x));
                                    currentStrokeRef.current.ys.push(Math.round(y));
                                }}
                                onTouchEnd={(e) => {
                                    const canvas = e.currentTarget;
                                    canvas.dataset.drawing = 'false';
                                    if (currentStrokeRef.current.xs.length > 1) {
                                        handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }];
                                        currentStrokeRef.current = { xs: [], ys: [] };
                                        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                        recognitionTimeoutRef.current = setTimeout(() => {
                                            recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height);
                                        }, 300);
                                    }
                                }}
                            />
                        </div>
                        {/* Handwriting Suggestions */}
                        {handwritingSuggestions.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-900/50 max-h-48 overflow-y-auto">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1 flex items-center justify-between">
                                    <span>Chọn kanji phù hợp:</span>
                                    <span className="text-[10px]">{handwritingSuggestions.length} kết quả</span>
                                </div>
                                <div className="grid grid-cols-8 gap-1.5">
                                    {handwritingSuggestions.map((kanji, idx) => (
                                        <button
                                            key={kanji.id || idx}
                                            onClick={() => {
                                                openKanjiDetail(kanji.character);
                                                const canvas = document.getElementById('handwriting-canvas');
                                                if (canvas) {
                                                    const ctx = canvas.getContext('2d');
                                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                                }
                                                handwritingStrokesRef.current = [];
                                                setHandwritingSuggestions([]);
                                            }}
                                            className={`aspect-square hover:bg-cyan-50 dark:hover:bg-cyan-900/30 border rounded-lg flex flex-col items-center justify-center text-base font-japanese hover:border-cyan-400 dark:hover:border-cyan-500 transition-all hover:scale-110 relative group ${kanji.inDatabase === false ? 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-white'}`}
                                            title={`${kanji.character} - ${kanji.sinoViet || ''} ${kanji.meaning || ''} (${kanji.strokes || '?'} nét)`}
                                        >
                                            <span className="text-lg">{kanji.character}</span>
                                            <span className="text-[9px] text-gray-400 dark:text-gray-500 absolute bottom-0.5 right-0.5 opacity-60 group-hover:opacity-100">
                                                {kanji.strokes || ''}
                                            </span>
                                            {kanji.inDatabase === false && (
                                                <span className="absolute top-0 left-0.5 text-[7px] text-orange-400">●</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Admin buttons */}
                    {isAdmin && (
                        <div className="space-y-2">
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
                            <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{currentKanjiList.length}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Kanji ({selectedLevel})</div>
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
                        {[...JLPT_LEVELS, 'Bộ thủ'].map(level => (
                            <button
                                key={level}
                                onClick={() => setSelectedLevel(level)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${selectedLevel === level ? LEVEL_TAB_COLORS[level] : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {/* Bulk Select Controls */}
                    {bulkSelectMode && isAdmin && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedKanjiIds.length === filteredKanjiList.length && filteredKanjiList.length > 0}
                                        onChange={selectAllKanji}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Chọn tất cả Kanji ({selectedKanjiIds.length}/{filteredKanjiList.length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedVocabIds.length === filteredVocabList.length && filteredVocabList.length > 0}
                                        onChange={selectAllVocab}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Chọn tất cả Vocab ({selectedVocabIds.length}/{filteredVocabList.length})</span>
                                </div>
                                {selectedKanjiIds.length > 0 && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400">
                                        💡 Chọn kanji để xem từ vựng liên quan
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
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
                                            className={`relative aspect-square flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer transition-all ${selectedKanjiIds.includes(kanji.id) ? 'bg-red-500 text-white ring-2 ring-red-300' : `${LEVEL_COLORS[selectedLevel]?.bg || 'bg-emerald-500 dark:bg-emerald-600/80'} text-white ${LEVEL_COLORS[selectedLevel]?.hover || 'hover:bg-emerald-600'}`}`}
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
                                            <div className="flex items-center justify-between mt-4 mb-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Từ vựng chứa kanji đã chọn ({relatedVocab.length}):
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        const relatedIds = relatedVocab.map(v => v.id);
                                                        const allSelected = relatedIds.every(id => selectedVocabIds.includes(id));
                                                        setSelectedVocabIds(prev => allSelected
                                                            ? prev.filter(id => !relatedIds.includes(id))
                                                            : [...new Set([...prev, ...relatedIds])]
                                                        );
                                                    }}
                                                    className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800/40 font-medium"
                                                >
                                                    {relatedVocab.every(v => selectedVocabIds.includes(v.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                </button>
                                            </div>
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
                        ) : selectedLevel === 'Bộ thủ' ? (
                            /* Bộ thủ (Radicals) mode - show radicals grid with info */
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">214 bộ thủ Kangxi ({currentKanjiList.length} bộ)</p>
                                {(() => {
                                    // Group radicals by stroke count
                                    const grouped = {};
                                    currentKanjiList.forEach(radical => {
                                        const info = RADICALS_214[radical];
                                        const strokes = info?.strokes || 0;
                                        if (!grouped[strokes]) grouped[strokes] = [];
                                        grouped[strokes].push(radical);
                                    });
                                    return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([strokes, radicals]) => (
                                        <div key={strokes} className="mb-4">
                                            <p className="text-xs font-bold text-orange-500 dark:text-orange-400 mb-1.5 border-b border-orange-200 dark:border-orange-800/50 pb-1">{strokes} nét ({radicals.length})</p>
                                            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-1.5">
                                                {radicals.map((radical, i) => {
                                                    const info = RADICALS_214[radical];
                                                    return (
                                                        <button
                                                            key={`${radical}-${i}`}
                                                            onClick={() => openKanjiDetail(radical)}
                                                            className={`group relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all ${selectedKanji === radical ? 'bg-orange-500 text-white scale-105 shadow-lg' : 'bg-orange-500 dark:bg-orange-600/80 text-white hover:bg-orange-600 dark:hover:bg-orange-500 hover:scale-105 shadow-md'}`}
                                                            title={`${info?.name || ''} - ${info?.meaning || ''}`}
                                                        >
                                                            <span className="font-japanese text-lg leading-none">{radical}</span>
                                                            <span className="text-[8px] opacity-70 leading-tight mt-0.5 truncate max-w-full px-0.5">{info?.name || ''}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            /* Normal mode - show grid with per-level colors */
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-11 gap-1">
                                {currentKanjiList.map((kanji, i) => {
                                    const colors = LEVEL_COLORS[selectedLevel] || LEVEL_COLORS.N5;
                                    const jData = getJotobaKanjiData(kanji);
                                    const fbData = kanjiList.find(k => k.character === kanji);
                                    const meaningTip = fbData?.meaning || jData?.meaningVi || '';
                                    return (
                                        <button
                                            key={`${kanji}-${i}`}
                                            onClick={() => openKanjiDetail(kanji)}
                                            className={`aspect-square flex items-center justify-center text-xl font-bold rounded-lg transition-all ${selectedKanji === kanji ? 'bg-cyan-500 text-white scale-105 shadow-lg' : `${colors.bg} ${colors.text} ${colors.hover} hover:scale-105 shadow-md`}`}
                                            title={meaningTip}
                                        >
                                            <span className="font-japanese">{kanji}</span>
                                        </button>
                                    );
                                })}
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[400px] max-w-[90vw] max-h-[90vh] overflow-y-auto space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Từ vựng</h3>
                            <button onClick={() => setShowAddVocabModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <input value={newVocab.word} onChange={e => setNewVocab({ ...newVocab, word: e.target.value })} placeholder="Từ vựng (例: 水道)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-base text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.reading} onChange={e => setNewVocab({ ...newVocab, reading: e.target.value })} placeholder="Cách đọc (例: すいどう)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.sinoViet || ''} onChange={e => setNewVocab({ ...newVocab, sinoViet: e.target.value })} placeholder="Âm Hán Việt (例: THỦY ĐẠO)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.meaning} onChange={e => setNewVocab({ ...newVocab, meaning: e.target.value })} placeholder="Nghĩa (例: Đường ống nước)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newVocab.level} onChange={e => setNewVocab({ ...newVocab, level: e.target.value })} className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                                {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <select value={newVocab.pos || ''} onChange={e => setNewVocab({ ...newVocab, pos: e.target.value })} className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                                <option value="">Từ loại</option>
                                <option value="noun">Danh từ</option>
                                <option value="verb">Động từ</option>
                                <option value="suru_verb">Danh động từ</option>
                                <option value="adj_i">Tính từ -i</option>
                                <option value="adj_na">Tính từ -na</option>
                                <option value="adverb">Trạng từ</option>
                                <option value="conjunction">Liên từ</option>
                                <option value="grammar">Ngữ pháp</option>
                                <option value="phrase">Cụm từ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>
                        <input value={newVocab.synonym || ''} onChange={e => setNewVocab({ ...newVocab, synonym: e.target.value })} placeholder="Đồng nghĩa (例: 上水)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.example || ''} onChange={e => setNewVocab({ ...newVocab, example: e.target.value })} placeholder="Ví dụ (例: 水道の水を飲みます。)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.exampleMeaning || ''} onChange={e => setNewVocab({ ...newVocab, exampleMeaning: e.target.value })} placeholder="Nghĩa ví dụ (例: Tôi uống nước máy.)" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <input value={newVocab.nuance || ''} onChange={e => setNewVocab({ ...newVocab, nuance: e.target.value })} placeholder="Sắc thái / Ghi chú" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={newVocab.source || ''} onChange={e => setNewVocab({ ...newVocab, source: e.target.value })} placeholder="Nguồn" className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600" />
                            <select value={newVocab.category || ''} onChange={e => setNewVocab({ ...newVocab, category: e.target.value })} className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                                <option value="">-- Phân loại --</option>
                                {vocabCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">* Tự động liên kết với Kanji trong từ</p>
                        <button onClick={handleAddVocab} className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-white text-sm">Lưu Từ vựng</button>
                    </div>
                </div>
            )}

            {/* Import Kanji JSON Modal */}
            {showImportKanjiModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[480px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileJson className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> Import Kanji
                            </h3>
                            <button onClick={() => { setShowImportKanjiModal(false); setImportStatus(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-3 text-xs border border-gray-200 dark:border-slate-600">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-700 dark:text-gray-300 font-medium">📝 JSON mẫu:</p>
                                <button
                                    onClick={() => {
                                        const sampleJson = `[{"character":"夏","sinoViet":"HẠ","meaning":"Mùa hè","onyomi":"カ","kunyomi":"なつ","level":"N4","radical":"自(Tự), 夂(Truy)","mnemonic":"Còn lại Mình 自 ta Sau 夂 Mùa Hạ 夏."}]`;
                                        navigator.clipboard.writeText(sampleJson);
                                        setImportStatus('📋 Đã copy JSON mẫu!');
                                        setTimeout(() => setImportStatus(''), 2000);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded hover:bg-cyan-200 dark:hover:bg-cyan-800/50 transition-colors font-medium"
                                >
                                    <Copy className="w-3 h-3" /> Copy mẫu
                                </button>
                            </div>
                            <pre className="text-[10px] text-cyan-600 dark:text-cyan-400 overflow-x-auto whitespace-pre-wrap bg-white/50 dark:bg-slate-800/50 rounded p-2">{`{
  "character": "夏",
  "sinoViet": "HẠ",
  "meaning": "Mùa hè",
  "onyomi": "カ",
  "kunyomi": "なつ",
  "level": "N4",
  "radical": "自(Tự), 夂(Truy)",
  "mnemonic": "Còn lại Mình 自 ta Sau 夂 Mùa Hạ 夏."
}`}</pre>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-2">* Các trường bắt buộc: character, level. Các trường khác tùy chọn.</p>
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

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-600"></div>
                            <span className="text-xs text-gray-400">hoặc</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-600"></div>
                        </div>

                        {/* Sync ALL Jotoba kanji */}
                        <button
                            onClick={handleSyncJotobaToFirebase}
                            disabled={isImporting}
                            className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-slate-600 dark:disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2 text-white text-sm"
                        >
                            {isImporting ? importStatus : <><RefreshCw className="w-4 h-4" /> Đồng bộ toàn bộ Kanji Jotoba → Firebase</>}
                        </button>
                        <p className="text-[10px] text-gray-400 text-center">Thêm 2211 kanji JLPT N5→N1 vào database (không ghi đè dữ liệu đã chỉnh sửa)</p>
                    </div>
                </div>
            )}

            {/* Import Vocab JSON Modal */}
            {showImportVocabModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[480px] max-w-[90vw] space-y-3 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <FileJson className="w-5 h-5 text-purple-500 dark:text-purple-400" /> Import Từ vựng
                            </h3>
                            <button onClick={() => { setShowImportVocabModal(false); setImportStatus(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-gray-100 dark:bg-slate-700/50 rounded-lg p-3 text-xs border border-gray-200 dark:border-slate-600">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-700 dark:text-gray-300 font-medium">📝 JSON mẫu:</p>
                                <button
                                    onClick={() => {
                                        const sampleJson = `[{"word":"夏休み","reading":"なつやすみ","meaning":"Nghỉ hè","level":"N4","sinoViet":"Hạ hưu","pos":"noun","synonym":"","example":"夏休みは楽しいです。","exampleMeaning":"Kỳ nghỉ hè vui lắm.","nuance":"","accent":"3","specialReading":false}]`;
                                        navigator.clipboard.writeText(sampleJson);
                                        setImportStatus('📋 Đã copy JSON mẫu!');
                                        setTimeout(() => setImportStatus(''), 2000);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors font-medium"
                                >
                                    <Copy className="w-3 h-3" /> Copy mẫu
                                </button>
                            </div>
                            <pre className="text-[10px] text-purple-600 dark:text-purple-400 overflow-x-auto whitespace-pre-wrap bg-white/50 dark:bg-slate-800/50 rounded p-2">{`{
  "word": "夏休み",
  "reading": "なつやすみ",
  "meaning": "Nghỉ hè",
  "level": "N4",
  "sinoViet": "Hạ hưu",
  "pos": "noun",
  "accent": "3",
  "specialReading": false,
  "synonym": "",
  "example": "夏休みは楽しいです。",
  "exampleMeaning": "Kỳ nghỉ hè vui lắm.",
  "nuance": ""
}`}</pre>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-2">* accent: số vị trí accent (0=heiban, 1=atamadaka...). specialReading: true = đọc đặc biệt (全青色). Tự động liên kết với Kanji cùng cấp độ.</p>
                        </div>

                        {/* Category selector for import */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">🏷️ Phân loại:</label>
                            <select
                                value={importCategory}
                                onChange={e => setImportCategory(e.target.value)}
                                className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            >
                                <option value="">-- Không phân loại --</option>
                                {vocabCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <textarea
                            value={jsonVocabInput}
                            onChange={e => setJsonVocabInput(e.target.value)}
                            placeholder="Dán JSON Từ vựng vào đây..."
                            className="w-full h-32 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white font-mono text-xs resize-none border border-gray-200 dark:border-slate-600"
                        />

                        {importStatus && (
                            <p className={`text-center text-sm font-medium ${importStatus.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : importStatus.includes('❌') ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
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
                                <Edit className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> {editingKanji.id ? 'Chỉnh sửa' : 'Thêm/Sửa'} Kanji
                            </h3>
                            <button onClick={() => { setShowEditKanjiModal(false); setEditingKanji(null); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <input
                            value={editingKanji.character}
                            onChange={e => setEditingKanji({ ...editingKanji, character: e.target.value })}
                            placeholder="Kanji"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-2xl text-center text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                            readOnly={!!editingKanji.id || !!editingKanji._fromJotoba}
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
                            placeholder="Nghĩa (tiếng Việt)"
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
                            value={editingKanji.parts || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, parts: e.target.value })}
                            placeholder="Thành phần chiết tự (cách nhau bằng 、)"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white font-japanese border border-gray-200 dark:border-slate-600"
                        />
                        <textarea
                            value={editingKanji.mnemonic || ''}
                            onChange={e => setEditingKanji({ ...editingKanji, mnemonic: e.target.value })}
                            placeholder="Cách nhớ"
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 resize-none h-20 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        />
                        <button onClick={handleEditKanji} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold flex items-center justify-center gap-2 text-white">
                            <Save className="w-5 h-5" /> {editingKanji.id ? 'Lưu thay đổi' : 'Lưu vào Firebase'}
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
                        <select
                            value={editingVocab.category || ''}
                            onChange={e => setEditingVocab({ ...editingVocab, category: e.target.value })}
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600"
                        >
                            <option value="">-- Phân loại --</option>
                            {vocabCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button onClick={handleEditVocab} className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold flex items-center justify-center gap-2 text-white">
                            <Save className="w-5 h-5" /> Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[400px] max-w-[90vw] space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <FolderPlus className="w-5 h-5 text-purple-500 dark:text-purple-400" /> Quản lý phân loại từ vựng
                            </h3>
                            <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tạo các phân loại để nhóm từ vựng (ví dụ: "Mimikara N3", "Tango N3", "Đề JLPT N3").
                        </p>

                        {/* Add new category */}
                        <div className="flex items-center gap-2">
                            <input
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                placeholder="Tên phân loại mới..."
                                className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleAddCategory}
                                disabled={!newCategoryName.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Thêm
                            </button>
                        </div>

                        {/* Category list */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {vocabCategories.length === 0 ? (
                                <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">Chưa có phân loại nào</p>
                            ) : (
                                vocabCategories.map((cat, idx) => {
                                    const catVocabCount = vocabList.filter(v => v.category === cat.name).length;
                                    const colors = [
                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                                        'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
                                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                                    ];
                                    return (
                                        <div key={cat.id} className={`flex items-center justify-between p-3 rounded-lg border ${colors[idx % colors.length]} transition-all`}>
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                <span className="font-medium text-sm">{cat.name}</span>
                                                <span className="text-xs opacity-70">({catVocabCount} từ)</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-1 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
                                                title="Xóa phân loại"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiScreen;
