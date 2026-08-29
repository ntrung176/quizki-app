import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, appId } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { recordRecentKanji } from '../utils/kanjiHistory';
import { playAudio } from '../utils/audio';
import { fetchJotobaWordData } from '../utils/pitchAccent';
import { showToast, showConfirm } from '../utils/toast';
import { RADICALS_214, KANJI_TREE } from '../data/radicals214';
import {
    getSharedKanjiList, getSharedVocabList, getSharedVocabCategories, updateCachedKanji,
    deleteCachedKanji, updateCachedVocab, deleteCachedVocab, getCachedKanjiList,
    getCachedVocabList, getCachedVocabCategories, syncKanjiAndVocabToCDN, getSharedKanjiSrs, updateCachedUserSrs
} from '../utils/kanjiService';
import { JOTOBA_KANJI_DATA, getJotobaKanjiChars, getJotobaKanjiData } from '../data/jotobaKanjiData';
import kanjiComponents from '../data/kanjiComponents.json' with { type: 'json' };
import { computeSinoVietnameseForWord } from '../utils/kanjiHVLookup';
import { generateVocabForKanjiWithAI } from '../utils/aiProvider';
import { ROUTES } from '../router';

export const useKanjiData = ({
    isAdmin = false,
    onAddVocabToSRS,
    allUserCards = [],
    profile = null,
    userId,
    awardXP
}) => {
    const [searchParams] = useSearchParams();
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // SRS states
    const [userKanjiSRS, setUserKanjiSRS] = useState(new Set());
    const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
    const [vocabToSave, setVocabToSave] = useState(null);
    const [selectedModalFolderId, setSelectedModalFolderId] = useState(null);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    // Premium Locked states
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('Premium');

    const [selectedLevel, setSelectedLevel] = useState('N5');
    const currentUserEmail = getAuth().currentUser?.email || '';
    const isUserAdmin = isAdmin || ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(currentUserEmail);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleLimit, setVisibleLimit] = useState(100);
    const [selectedKanji, setSelectedKanji] = useState(null);

    useEffect(() => {
        setVisibleLimit(100);
    }, [selectedLevel, searchQuery]);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddKanjiModal, setShowAddKanjiModal] = useState(false);
    const [showAddVocabModal, setShowAddVocabModal] = useState(false);
    const [showEditKanjiModal, setShowEditKanjiModal] = useState(false);
    const [showEditVocabModal, setShowEditVocabModal] = useState(false);
    const [editingKanji, setEditingKanji] = useState(null);
    const [editingVocab, setEditingVocab] = useState(null);
    const [syncingCDN, setSyncingCDN] = useState(false);
    const [migratingComponents, setMigratingComponents] = useState(false);
    const [fixingSinoViet, setFixingSinoViet] = useState(false);
    const [generatingAiVocab, setGeneratingAiVocab] = useState(false);

    // Vocab Categories
    const [vocabCategories, setVocabCategories] = useState(() => getCachedVocabCategories() || []);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Lists
    const [kanjiList, setKanjiList] = useState(() => getCachedKanjiList() || location.state?.kanjiList || []);
    const [vocabList, setVocabList] = useState(() => getCachedVocabList() || location.state?.vocabList || []);
    const [loading, setLoading] = useState(() => !getCachedKanjiList() && !location.state?.kanjiList);

    const kanjiMap = useMemo(() => {
        const map = new Map();
        kanjiList.forEach(k => {
            const char = (k?.character || '').trim();
            if (char && !map.has(char)) map.set(char, { ...k, character: char });
        });
        return map;
    }, [kanjiList]);

    // KanjiVG stroke animation controllers & refs
    const sidebarStrokeCtrl = useRef(null);
    const detailStrokeCtrl = useRef(null);
    const writerContainerRef = useRef(null);
    const detailWriterContainerRef = useRef(null);
    const strokeGuideRef = useRef(null);

    // Kanji API data
    const [kanjiApiData, setKanjiApiData] = useState(null);
    const [loadingApiData, setLoadingApiData] = useState(false);

    // Search dropdown state
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showHandwritingPopup, setShowHandwritingPopup] = useState(false);
    const searchInputRef = useRef(null);

    // Handwriting search state
    const [handwritingSuggestions, setHandwritingSuggestions] = useState([]);
    const [selectedStrokeCount, setSelectedStrokeCount] = useState(0);
    const handwritingStrokesRef = useRef([]);
    const currentStrokeRef = useRef({ xs: [], ys: [] });
    const recognitionTimeoutRef = useRef(null);

    const recognizeHandwriting = useCallback(async (strokes, width = 280, height = 240) => {
        if (!strokes || strokes.length === 0) {
            setHandwritingSuggestions([]);
            return;
        }
        const ink = strokes.map(s => [s.xs, s.ys]);
        const payload = {
            options: "enable_homophone",
            requests: [
                {
                    writing_guide: { width: Math.round(width), height: Math.round(height) },
                    ink: ink,
                    language: "ja"
                }
            ]
        };
        try {
            const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                const candidates = data[1][0][1];
                const processed = candidates.slice(0, 12).map((char, index) => {
                    const fbData = kanjiMap.get(char);
                    const jData = getJotobaKanjiData(char);
                    return {
                        id: `${char}_${index}`,
                        character: char,
                        sinoViet: fbData?.sinoViet || jData?.sinoViet || '',
                        inDatabase: !!(fbData || jData)
                    };
                });
                setHandwritingSuggestions(processed);
            }
        } catch (err) {
            console.error("Error recognizing handwriting:", err);
        }
    }, [kanjiMap]);

    // Bulk selection states
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedKanjiIds, setSelectedKanjiIds] = useState([]);
    const [selectedVocabIds, setSelectedVocabIds] = useState([]);
    const [diagramZoom, setDiagramZoom] = useState(1);
    const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 });
    const [addingVocabId, setAddingVocabId] = useState(null);
    const [addedVocabIds, setAddedVocabIds] = useState(new Set());
    const [pitchAccentData, setPitchAccentData] = useState({});
    const [addingAllVocab, setAddingAllVocab] = useState(false);

    // Form states
    const [newKanji, setNewKanji] = useState({
        character: '', meaning: '', onyomi: '', kunyomi: '',
        level: 'N5', sinoViet: '', mnemonic: '', radical: '', parts: '', strokeCount: '', imageUrl: ''
    });
    const [newVocab, setNewVocab] = useState({
        word: '', reading: '', meaning: '', level: 'N5', source: 'Mimikara',
        sinoViet: '', pos: '', synonym: '', example: '', exampleMeaning: '', nuance: '', category: ''
    });
    const [jsonKanjiInput, setJsonKanjiInput] = useState('');
    const [jsonVocabInput, setJsonVocabInput] = useState('');

    const pureKanjiVocabList = useMemo(() => vocabList, [vocabList]);

    // Load user SRS
    useEffect(() => {
        if (!userId) return;
        const loadUserSRS = async () => {
            try {
                const srs = await getSharedKanjiSrs(userId);
                setUserKanjiSRS(new Set(Object.keys(srs)));
            } catch (e) {
                console.error('Error loading user kanjiSRS:', e);
            }
        };
        loadUserSRS();
    }, [userId]);

    // Load shared data
    useEffect(() => {
        const loadData = async () => {
            const hasPreloadedData = !!(location.state?.kanjiList);
            try {
                if (hasPreloadedData) {
                    const catData = await getSharedVocabCategories();
                    setVocabCategories(catData);
                    location.state.kanjiList.forEach(k => updateCachedKanji(k));
                    location.state.vocabList.forEach(v => updateCachedVocab(v));
                } else {
                    const [kanjiData, vocabData, catData] = await Promise.all([
                        getSharedKanjiList(),
                        getSharedVocabList(),
                        getSharedVocabCategories()
                    ]);
                    setKanjiList(kanjiData);
                    setVocabList(vocabData);
                    setVocabCategories(catData);
                }
            } catch (e) {
                console.error('Error loading kanji data:', e);
                if (!hasPreloadedData) {
                    showToast('Lỗi tải dữ liệu Kanji. Vui lòng kiểm tra kết nối hoặc Firebase Rules.', 'error');
                }
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Listen to cache updates
    useEffect(() => {
        const handleCacheUpdate = (e) => {
            const { type, data } = e.detail;
            if (type === 'kanji') {
                setKanjiList(prev => {
                    const idx = prev.findIndex(k => (k.id && data.id && k.id === data.id) || (k.character && data.character && k.character === data.character));
                    if (idx !== -1) return prev.map((k, i) => i === idx ? { ...k, ...data } : k);
                    return [...prev, data];
                });
            } else if (type === 'kanji-delete') {
                setKanjiList(prev => prev.filter(k => k.id !== data));
            } else if (type === 'vocab') {
                setVocabList(prev => {
                    const idx = prev.findIndex(v => (v.id && data.id && v.id === data.id) || (v.word && data.word && v.word.trim() === data.word.trim()));
                    if (idx !== -1) return prev.map((v, i) => i === idx ? { ...v, ...data } : v);
                    return [...prev, data];
                });
            } else if (type === 'vocab-delete') {
                setVocabList(prev => prev.filter(v => v.id !== data));
            }
        };

        const handleCacheReloaded = (e) => {
            const { kanjiList: kList, vocabList: vList, categories } = e.detail;
            if (kList) setKanjiList(kList);
            if (vList) setVocabList(vList);
            if (categories) setVocabCategories(categories);
        };

        window.addEventListener('kanji-cache-updated', handleCacheUpdate);
        window.addEventListener('kanji-cache-reloaded', handleCacheReloaded);
        return () => {
            window.removeEventListener('kanji-cache-updated', handleCacheUpdate);
            window.removeEventListener('kanji-cache-reloaded', handleCacheReloaded);
        };
    }, []);

    // URL parameters listener
    useEffect(() => {
        const charParam = params.char || searchParams.get('char');
        if (charParam) {
            setSelectedKanji(charParam);
            setShowDetailModal(true);
        } else {
            setShowDetailModal(false);
            setSelectedKanji(null);
        }
    }, [params.char, searchParams]);

    useEffect(() => {
        const queryParam = searchParams.get('search');
        if (queryParam) setSearchQuery(queryParam);
        const levelParam = searchParams.get('level');
        if (levelParam && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(levelParam)) {
            setSelectedLevel(levelParam);
        }
    }, [searchParams]);



    // Fetch Jotoba data on Kanji select
    useEffect(() => {
        if (!selectedKanji) return;
        setLoadingApiData(true);
        const jData = getJotobaKanjiData(selectedKanji);
        const kanjiData = kanjiMap.get(selectedKanji);
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
    }, [selectedKanji, kanjiMap]);

    useEffect(() => {
        if (!selectedKanji) return;
        const auth = getAuth();
        const currentUid = auth.currentUser?.uid;
        recordRecentKanji(currentUid, selectedKanji);
    }, [selectedKanji]);

    const toggleKanjiSRS = async (e, kanjiChar) => {
        if (e) e.stopPropagation();
        const auth = getAuth();
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
            showToast('Vui lòng đăng nhập để lưu Kanji', 'error');
            return;
        }

        const kanjiDoc = kanjiMap.get(kanjiChar);
        if (!kanjiDoc || !kanjiDoc.id) {
            showToast('Chữ Kanji này chưa được khởi tạo trong hệ thống dữ liệu', 'warning');
            return;
        }

        const isSRSAdded = userKanjiSRS.has(kanjiDoc.id);
        if (isSRSAdded) return;

        setUserKanjiSRS(prev => new Set([...prev, kanjiDoc.id]));
        showToast(`Đã thêm ${kanjiChar} vào danh sách ôn tập SRS`);

        try {
            const now = Date.now();
            const newSrs = {
                interval: 0,
                ease: 2.5,
                nextReview: now,
                lastReview: now,
                reps: 0,
                learningStep: null,
                isLapsed: false,
                lapseCount: 0,
                prelapseInterval: null,
                state: 'NEW'
            };
            await setDoc(doc(db, `artifacts/${appId}/users/${currentUid}/kanjiSRS`, kanjiDoc.id), newSrs, { merge: true });
            updateCachedUserSrs(currentUid, kanjiDoc.id, newSrs);

            let multiplier = 1.0;
            const kLevel = kanjiDoc.level || selectedLevel || 'N5';
            if (kLevel) {
                const lvlUpper = String(kLevel).toUpperCase();
                if (lvlUpper.includes('N3')) multiplier = 1.2;
                else if (lvlUpper.includes('N2')) multiplier = 1.4;
                else if (lvlUpper.includes('N1')) multiplier = 1.6;
            }
            const xpAmount = Math.round(15 * multiplier);
            if (xpAmount > 0 && awardXP) awardXP(xpAmount);

            try {
                const todayDateString = new Date().toISOString().split('T')[0];
                const activityRef = doc(db, `artifacts/${appId}/users/${currentUid}/dailyActivity`, todayDateString);
                await setDoc(activityRef, { newKanjiAdded: increment(1) }, { merge: true });
            } catch (err) {
                console.warn('Lỗi ghi activity Kanji mới:', err);
            }
        } catch (err) {
            console.error('Error adding to SRS:', err);
            showToast('Lỗi khi lưu vào SRS', 'error');
            setUserKanjiSRS(prev => {
                const next = new Set(prev);
                next.delete(kanjiDoc.id);
                return next;
            });
        }
    };

    const openKanjiDetail = useCallback((char) => {
        const fbData = kanjiMap.get(char);
        const jData = getJotobaKanjiData(char);
        const lvl = fbData?.level || jData?.level || 'N5';
        const isLvlLocked = ['N3', 'N2', 'N1'].includes(lvl) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');

        if (isLvlLocked) {
            setLockedPkgName('Thư viện Kanji Zen');
            setShowPremiumModal(true);
            return;
        }

        navigate(`/kanji/list/${char}?from=list`);
        setSelectedKanji(char);
        setShowDetailModal(true);
    }, [navigate, kanjiMap, isAdmin, profile]);

    const handleConfirmSaveVocab = async (folderId) => {
        if (!vocabToSave) return;
        const targetFolderId = folderId === 'unfiled' ? null : folderId;
        setShowFolderSelectModal(false);
        setSelectedModalFolderId(null);
        setModalSearchQuery('');
        const items = Array.isArray(vocabToSave) ? vocabToSave : [vocabToSave];
        const isBulk = Array.isArray(vocabToSave);
        setVocabToSave(null);

        if (isBulk) setAddingAllVocab(true);
        else setAddingVocabId(items[0].id);

        try {
            for (const v of items) {
                const cardData = {
                    front: v.word || '',
                    back: v.meaning || '',
                    synonym: v.synonym || '',
                    example: v.example || '',
                    exampleMeaning: v.exampleMeaning || '',
                    nuance: v.nuance || '',
                    pos: v.pos || '',
                    level: v.level || '',
                    sinoVietnamese: v.sinoViet || '',
                    synonymSinoVietnamese: v.synonymSinoVietnamese || '',
                    reading: v.reading || '',
                    accent: v.accent !== undefined ? String(v.accent) : '0',
                    imageBase64: null,
                    audioBase64: null,
                    action: 'stay',
                    folderId: targetFolderId
                };
                await onAddVocabToSRS(cardData);
                setAddedVocabIds(prev => new Set([...prev, v.id]));
            }
            if (awardXP) awardXP(Math.max(10, items.length * 10));
            showToast(isBulk ? 'Đã lưu tất cả từ vựng vào học phần' : `Đã lưu "${items[0].word}" vào học phần`);
        } catch (e) {
            console.error('Error adding vocab to SRS:', e);
            showToast('Lỗi khi lưu từ vựng: ' + e.message, 'error');
        } finally {
            setAddingVocabId(null);
            setAddingAllVocab(false);
        }
    };

    const currentKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') return Object.keys(RADICALS_214);
        let sorted = [];
        if (selectedLevel === 'Mới thêm') {
            const list = kanjiList.filter(k => k.updatedAt).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            sorted = list.map(k => (k.character || '').trim()).filter(Boolean);
        } else if (selectedLevel === 'Chưa có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c.trim()));
            });
            const list = kanjiList.filter(k => {
                const char = (k.character || '').trim();
                return char && !kanjiInVocab.has(char);
            });
            sorted = list.map(k => (k.character || '').trim()).filter(Boolean);
        } else if (selectedLevel === 'Đã có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c.trim()));
            });
            const list = kanjiList.filter(k => {
                const char = (k.character || '').trim();
                return char && kanjiInVocab.has(char);
            });
            sorted = list.map(k => (k.character || '').trim()).filter(Boolean);
        } else {
            const jotobaChars = getJotobaKanjiChars(selectedLevel);
            const firebaseChars = [];
            kanjiMap.forEach((v, k) => { if (v.level === selectedLevel) firebaseChars.push(k); });
            const mergedSet = new Set([...jotobaChars, ...firebaseChars].map(c => String(c).trim()).filter(Boolean));
            let merged = [...mergedSet];
            const mapped = merged.map(char => {
                const jData = getJotobaKanjiData(char);
                const fData = kanjiMap.get(char);
                return {
                    char,
                    stroke: jData?.stroke_count || parseInt(fData?.strokeCount) || 999,
                    freq: jData?.frequency || 9999
                };
            });
            mapped.sort((a, b) => {
                if (a.stroke !== b.stroke) return a.stroke - b.stroke;
                return a.freq - b.freq;
            });
            sorted = mapped.map(x => x.char);
        }

        const uniqueSorted = Array.from(new Set(sorted.map(s => String(s).trim()).filter(Boolean)));

        if (!searchQuery.trim()) return uniqueSorted;
        const query = searchQuery.toLowerCase().trim();
        return uniqueSorted.filter(k => {
            if (k.includes(query)) return true;
            const fData = kanjiMap.get(k);
            if (fData) {
                if (fData.meaning && String(fData.meaning).toLowerCase().includes(query)) return true;
                if (fData.sinoViet && String(fData.sinoViet).toLowerCase().includes(query)) return true;
                if (fData.onyomi && String(fData.onyomi).toLowerCase().includes(query)) return true;
                if (fData.kunyomi && String(fData.kunyomi).toLowerCase().includes(query)) return true;
                return false;
            }
            const jData = getJotobaKanjiData(k);
            if (jData) {
                if (jData.meaningVi && String(jData.meaningVi).toLowerCase().includes(query)) return true;
                if (jData.meanings?.some(m => m && String(m).toLowerCase().includes(query))) return true;
                if (jData.sinoViet && String(jData.sinoViet).toLowerCase().includes(query)) return true;
                if (jData.onyomi?.some(o => o && String(o).toLowerCase().includes(query))) return true;
                if (jData.kunyomi?.some(o => o && String(o).toLowerCase().includes(query))) return true;
            }
            return false;
        });
    }, [selectedLevel, kanjiMap, kanjiList, pureKanjiVocabList, searchQuery]);

    const displayedKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') return currentKanjiList;
        const unique = Array.from(new Set(currentKanjiList.map(c => String(c).trim()).filter(Boolean)));
        return unique.slice(0, visibleLimit);
    }, [currentKanjiList, selectedLevel, visibleLimit]);

    const filteredKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') return [];
        let filtered;
        if (selectedLevel === 'Mới thêm') {
            filtered = kanjiList.filter(k => k.updatedAt).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        } else if (selectedLevel === 'Chưa có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c.trim()));
            });
            filtered = kanjiList.filter(k => {
                const char = (k.character || '').trim();
                return char && !kanjiInVocab.has(char);
            });
        } else if (selectedLevel === 'Đã có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c.trim()));
            });
            filtered = kanjiList.filter(k => {
                const char = (k.character || '').trim();
                return char && kanjiInVocab.has(char);
            });
        } else {
            filtered = kanjiList.filter(k => (k.level || '').trim() === selectedLevel);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(k => k.character && (k.character.includes(query) || (k.meaning && String(k.meaning).toLowerCase().includes(query)) || (k.sinoViet && String(k.sinoViet).toLowerCase().includes(query))));
        }
        const seen = new Set();
        filtered = filtered.filter(k => {
            const char = (k?.character || '').trim();
            if (!char || seen.has(char)) return false;
            seen.add(char);
            return true;
        });
        return filtered;
    }, [selectedLevel, kanjiList, pureKanjiVocabList, searchQuery]);

    const completedCount = useMemo(() => {
        if (!userKanjiSRS || userKanjiSRS.size === 0) return 0;
        return currentKanjiList.filter(char => {
            if (userKanjiSRS.has(char)) return true;
            const kanjiDoc = kanjiMap.get(char);
            if (kanjiDoc && (userKanjiSRS.has(kanjiDoc.id) || (kanjiDoc.character && userKanjiSRS.has(kanjiDoc.character)))) return true;
            return false;
        }).length;
    }, [currentKanjiList, userKanjiSRS, kanjiMap]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase().trim();
        const allResults = [];
        const seenChars = new Set();

        const getMatchScore = (char, sinoViet, meaning, meanings, onyomi, kunyomi) => {
            const cleanSino = sinoViet ? String(sinoViet).toLowerCase() : '';
            const cleanMeaning = meaning ? String(meaning).toLowerCase() : '';
            if (cleanSino === query) return 0;
            if (cleanSino.startsWith(query)) return 1;
            if (cleanSino.includes(query)) return 2;
            if (char === query) return 3;
            if (cleanMeaning === query) return 4;
            if (cleanMeaning.includes(query)) return 5;
            if (meanings?.some(m => m && String(m).toLowerCase().includes(query))) return 5;

            const checkReading = (readingVal) => {
                if (!readingVal) return false;
                if (Array.isArray(readingVal)) return readingVal.some(r => r && String(r).toLowerCase().includes(query));
                return String(readingVal).toLowerCase().includes(query);
            };

            if (checkReading(onyomi)) return 6;
            if (checkReading(kunyomi)) return 6;
            if (char.includes(query)) return 7;
            return 99;
        };

        const firebaseCharsSet = new Set(kanjiList.map(k => k.character).filter(Boolean));
        for (const k of kanjiList) {
            if (seenChars.has(k.character)) continue;
            const score = getMatchScore(k.character, k.sinoViet, k.meaning, null, k.onyomi, k.kunyomi);
            if (score < 99) {
                seenChars.add(k.character);
                allResults.push({ ...k, _score: score });
            }
        }
        for (const k of Object.values(JOTOBA_KANJI_DATA)) {
            if (firebaseCharsSet.has(k.literal)) continue;
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
        allResults.sort((a, b) => {
            if (a._score !== b._score) return a._score - b._score;
            const strokeA = getJotobaKanjiData(a.character)?.stroke_count || 999;
            const strokeB = getJotobaKanjiData(b.character)?.stroke_count || 999;
            return strokeA - strokeB;
        });
        return allResults.slice(0, 20);
    }, [kanjiList, searchQuery]);

    const handleSelectSearchResult = (kanji) => {
        setSelectedKanji(kanji.character);
        setSelectedLevel(kanji.level);
        setShowDetailModal(true);
        setShowSearchResults(false);
        setSearchQuery('');
    };

    const getKanjiDetail = (char) => {
        const fbData = kanjiMap.get(char);
        const jData = getJotobaKanjiData(char);
        if (fbData) {
            const onyomiStr = Array.isArray(fbData.onyomi) ? fbData.onyomi.join('、') : (fbData.onyomi || '');
            const kunyomiStr = Array.isArray(fbData.kunyomi) ? fbData.kunyomi.join('、') : (fbData.kunyomi || '');
            return {
                ...fbData,
                sinoViet: fbData.sinoViet || jData?.sinoViet || '',
                meaning: fbData.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                meaningVi: jData?.meaningVi || fbData.meaning || '',
                onyomi: onyomiStr || jData?.onyomi?.join('、') || '',
                kunyomi: kunyomiStr || jData?.kunyomi?.join('、') || '',
                strokeCount: fbData.strokeCount || jData?.stroke_count || '',
                parts: kanjiComponents[char] ? kanjiComponents[char].join('、') : (fbData.parts || jData?.parts?.join('、') || ''),
                radical: fbData.radical || '',
                mnemonic: fbData.mnemonic || '',
                level: fbData.level || jData?.level || 'N5',
                imageUrl: fbData.imageUrl || '',
            };
        }
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
                radical: '',
                parts: kanjiComponents[char] ? kanjiComponents[char].join('、') : (jData.parts?.join('、') || ''),
                _fromJotoba: true
            };
        }
        return {
            character: char, meaning: 'Chưa có thông tin', meaningVi: '', sinoViet: '',
            onyomi: '', kunyomi: '', level: selectedLevel, strokeCount: '', mnemonic: '', radical: '', parts: '', imageUrl: ''
        };
    };

    const getVocabForKanji = (char) => {
        const list = pureKanjiVocabList.filter(v => (v.word || '').includes(char));
        // Deduplicate list by id or word
        const seen = new Set();
        const uniqueList = list.filter(v => {
            const key = v.id ? `id_${v.id}` : `word_${v.word}`;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const levelOrder = { 'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5 };
        return uniqueList.sort((a, b) => {
            const orderA = levelOrder[a.level] || 99;
            const orderB = levelOrder[b.level] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.word || '').length - (b.word || '').length;
        });
    };

    const getRelatedKanji = (char) => {
        const allChars = kanjiList.map(k => k.character);
        return allChars.filter(k => k !== char).slice(0, 8);
    };

    const handleAddKanji = async () => {
        if (!newKanji.character) return;
        const existingKanji = kanjiList.find(k => k.character === newKanji.character);
        if (existingKanji) {
            showToast(`Kanji "${newKanji.character}" đã tồn tại trong hệ thống!`, 'warning');
            return;
        }
        try {
            const kanjiDataToSave = {
                ...newKanji,
                character: newKanji.character.trim(),
                strokeCount: newKanji.strokeCount || newKanji.stroke_count || '',
                parts: newKanji.parts || '',
                updatedAt: Date.now()
            };
            const docRef = await addDoc(collection(db, 'kanji'), kanjiDataToSave);
            const addedKanji = { ...kanjiDataToSave, id: docRef.id };
            updateCachedKanji(addedKanji);
            showToast(`Đã thêm thành công Kanji "${addedKanji.character}"!`, 'success');
            setNewKanji({
                character: '', meaning: '', onyomi: '', kunyomi: '',
                level: 'N5', sinoViet: '', mnemonic: '', radical: '', parts: '', strokeCount: '', imageUrl: ''
            });
            setShowAddKanjiModal(false);
        } catch (e) {
            console.error('Error adding kanji:', e);
            showToast('Lỗi khi thêm Kanji: ' + e.message, 'error');
        }
    };

    const handleImportKanjiJson = async (jsonText) => {
        if (!jsonText || !jsonText.trim()) {
            showToast('Vui lòng dán chuỗi JSON hợp lệ!', 'warning');
            return;
        }
        try {
            let parsed = JSON.parse(jsonText.trim());
            if (!Array.isArray(parsed)) parsed = [parsed];
            if (parsed.length === 0) {
                showToast('Danh sách JSON rỗng!', 'warning');
                return;
            }

            let addedCount = 0;
            const now = Date.now();
            const newItems = [];

            for (const item of parsed) {
                if (!item.character) continue;
                const char = item.character.trim();
                if (kanjiList.some(k => k.character === char)) continue;

                const kanjiObj = {
                    character: char,
                    meaning: item.meaning || item.meaningVi || '',
                    meaningVi: item.meaningVi || item.meaning || '',
                    sinoViet: item.sinoViet || '',
                    onyomi: Array.isArray(item.onyomi) ? item.onyomi.join('、') : (item.onyomi || ''),
                    kunyomi: Array.isArray(item.kunyomi) ? item.kunyomi.join('、') : (item.kunyomi || ''),
                    level: item.level || selectedLevel || 'N5',
                    strokeCount: String(item.strokeCount || item.stroke_count || ''),
                    parts: Array.isArray(item.parts) ? item.parts.join('、') : (item.parts || ''),
                    mnemonic: item.mnemonic || '',
                    radical: item.radical || '',
                    imageUrl: item.imageUrl || item.image || '',
                    updatedAt: now
                };

                const docRef = await addDoc(collection(db, 'kanji'), kanjiObj);
                const savedItem = { ...kanjiObj, id: docRef.id };
                updateCachedKanji(savedItem);
                newItems.push(savedItem);
                addedCount++;
            }

            if (newItems.length > 0) {
                setKanjiList(prev => [...prev, ...newItems]);
            }

            showToast(`Đã nhập thành công ${addedCount} chữ Kanji mới!`, 'success');
            setJsonKanjiInput('');
            setShowAddKanjiModal(false);
        } catch (err) {
            console.error('Lỗi import JSON Kanji:', err);
            showToast('Lỗi cú pháp JSON: ' + err.message, 'error');
        }
    };

    const handleAddVocab = async () => {
        if (!newVocab.word) return;
        const existingVocab = vocabList.find(v => v.word === newVocab.word);
        if (existingVocab) {
            showToast(`Từ vựng "${newVocab.word}" đã tồn tại trong hệ thống!`, 'warning');
            return;
        }
        try {
            const kanjiChars = newVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const computedHV = computeSinoVietnameseForWord(newVocab.word, kanjiMap);
            const vocabData = {
                ...newVocab,
                sinoViet: (newVocab.sinoViet || '').trim() || computedHV,
                kanjiList: kanjiChars,
                updatedAt: Date.now()
            };
            const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
            const addedVocab = { ...vocabData, id: docRef.id };
            updateCachedVocab(addedVocab);
            setNewVocab({
                word: '', reading: '', meaning: '', level: selectedLevel, source: 'Mimikara',
                sinoViet: '', pos: '', synonym: '', example: '', exampleMeaning: '', nuance: '', category: ''
            });
            setShowAddVocabModal(false);
        } catch (e) {
            console.error('Error adding vocab:', e);
        }
    };

    const handleImportVocabJson = async (jsonStr) => {
        if (!jsonStr || !jsonStr.trim()) {
            showToast('Vui lòng nhập mã JSON từ vựng!', 'warning');
            return;
        }
        try {
            let cleaned = jsonStr.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
            }
            const parsed = JSON.parse(cleaned);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            let addedCount = 0;
            const now = Date.now();
            const newItems = [];

            for (const item of items) {
                const word = String(item.word || item.front || item.kanji || item.vocabulary || '').trim();
                if (!word) continue;
                if (vocabList.some(v => v.word === word)) continue;

                const kanjiChars = word.match(/[\u4e00-\u9faf]/g) || [];
                const rawSinoViet = String(item.sinoViet || item.sinoVietnamese || item.hanViet || '').trim();
                const computedHV = computeSinoVietnameseForWord(word, kanjiMap);
                const vocabObj = {
                    word: word,
                    reading: String(item.reading || item.furigana || item.kana || '').trim(),
                    sinoViet: rawSinoViet || computedHV,
                    meaning: String(item.meaning || item.back || item.vietnamese || '').trim(),
                    pos: String(item.pos || item.partOfSpeech || item.type || '').trim(),
                    level: String(item.level || item.jlpt || selectedLevel || 'N5').trim(),
                    example: String(item.example || item.exampleSentence || '').trim(),
                    exampleMeaning: String(item.exampleMeaning || item.exampleTranslation || '').trim(),
                    synonym: String(item.synonym || '').trim(),
                    synonymSinoVietnamese: String(item.synonymSinoVietnamese || item.synonymHanViet || '').trim(),
                    nuance: String(item.nuance || item.note || '').trim(),
                    category: String(item.category || '').trim(),
                    source: 'Mimikara',
                    kanjiList: kanjiChars,
                    updatedAt: now
                };

                const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabObj);
                const savedItem = { ...vocabObj, id: docRef.id };
                updateCachedVocab(savedItem);
                newItems.push(savedItem);
                addedCount++;
            }

            if (newItems.length > 0) {
                newItems.forEach(item => updateCachedVocab(item));
            }

            showToast(`Đã nhập thành công ${addedCount} từ vựng mới!`, 'success');
            setJsonVocabInput('');
            setShowAddVocabModal(false);
        } catch (err) {
            console.error('Lỗi import JSON Từ vựng:', err);
            showToast('Lỗi cú pháp JSON: ' + err.message, 'error');
        }
    };

    const handleAutoFixVocabSinoViet = async () => {
        if (!await showConfirm('Bạn có muốn tự động kiểm tra và chuẩn hóa lại âm Hán Việt cho TOÀN BỘ từ vựng Kanji dựa trên dữ liệu Kanji đã lưu không?', { type: 'info', confirmText: 'Đồng ý chuẩn hóa' })) return;

        setFixingSinoViet(true);
        try {
            const now = Date.now();
            const pendingUpdates = [];

            for (const vocab of vocabList) {
                if (!vocab.word) continue;
                const wordClean = vocab.word.split('（')[0].split('(')[0].trim();
                const correctHV = computeSinoVietnameseForWord(wordClean, kanjiMap);
                if (!correctHV) continue;

                const currentHV = (vocab.sinoViet || '').trim().toUpperCase();
                if (currentHV !== correctHV) {
                    pendingUpdates.push({ ...vocab, sinoViet: correctHV, updatedAt: now });
                }
            }

            if (pendingUpdates.length === 0) {
                showToast('Tất cả từ vựng đã có âm Hán Việt chính xác!', 'info');
                return;
            }

            // Batched write to Firestore in chunks of 500 (super high speed!)
            const batchSize = 500;
            for (let i = 0; i < pendingUpdates.length; i += batchSize) {
                const chunk = pendingUpdates.slice(i, i + batchSize);
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    if (item.id) {
                        const ref = doc(db, 'kanjiVocab', item.id);
                        batch.update(ref, { sinoViet: item.sinoViet, updatedAt: now });
                    }
                });
                await batch.commit();
                chunk.forEach(item => updateCachedVocab(item));
            }

            showToast(`Đã tự động cập nhật và chuẩn hóa âm Hán Việt cho ${pendingUpdates.length} từ vựng!`, 'success');
        } catch (err) {
            console.error('Error fixing Sino-Vietnamese for vocab:', err);
            showToast('Lỗi khi chuẩn hóa âm Hán Việt: ' + err.message, 'error');
        } finally {
            setFixingSinoViet(false);
        }
    };

    const handleGenerateAiVocabForSingleKanji = async (char) => {
        const targetChar = (char || selectedKanji || '').trim();
        if (!targetChar) return;

        setGeneratingAiVocab(true);
        try {
            const kDoc = kanjiMap.get(targetChar);
            const generatedItems = await generateVocabForKanjiWithAI(targetChar, kDoc);
            
            let addedCount = 0;
            const batch = writeBatch(db);
            const newItems = [];

            for (const item of generatedItems) {
                const cleanWord = item.word.split('（')[0].split('(')[0].trim();
                if (vocabList.some(v => (v.word || '').split('（')[0].split('(')[0].trim() === cleanWord)) continue;

                const newRef = doc(collection(db, 'kanjiVocab'));
                const vocabObj = { ...item, id: newRef.id };
                batch.set(newRef, vocabObj);
                newItems.push(vocabObj);
                addedCount++;
            }

            if (addedCount > 0) {
                await batch.commit();
                newItems.forEach(item => updateCachedVocab(item));
                showToast(`AI đã tạo thành công ${addedCount} từ vựng mới cho chữ ${targetChar}!`, 'success');
            } else {
                showToast(`Từ vựng do AI tạo ra đã có sẵn trong ứng dụng cho chữ ${targetChar}.`, 'info');
            }
        } catch (err) {
            console.error('Lỗi khi dùng AI tạo từ vựng:', err);
            showToast('Lỗi AI tạo từ vựng: ' + err.message, 'error');
        } finally {
            setGeneratingAiVocab(false);
        }
    };

    const handleBatchGenerateAiVocabForNoVocabKanji = async (limitCount = 10) => {
        const kanjiInVocab = new Set();
        pureKanjiVocabList.forEach(v => {
            const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
            chars.forEach(c => kanjiInVocab.add(c.trim()));
        });
        const noVocabKanji = kanjiList.filter(k => k.character && !kanjiInVocab.has(k.character.trim())).map(k => k.character.trim());

        if (noVocabKanji.length === 0) {
            showToast('Tất cả chữ Kanji hiện tại đều đã có từ vựng!', 'info');
            return;
        }

        const targetList = noVocabKanji.slice(0, limitCount);
        if (!await showConfirm(`Bạn có muốn sử dụng AI để tự động tạo từ vựng JLPT chuẩn cho ${targetList.length} chữ Kanji chưa có từ vựng không?\n(${targetList.join(', ')})`, { type: 'info', confirmText: 'Bắt đầu tạo AI' })) return;

        setGeneratingAiVocab(true);
        try {
            let totalAdded = 0;
            for (let i = 0; i < targetList.length; i++) {
                const char = targetList[i];
                showToast(`🤖 AI đang tạo từ vựng cho Kanji ${char} (${i + 1}/${targetList.length})...`, 'info');
                const kDoc = kanjiMap.get(char);
                const generatedItems = await generateVocabForKanjiWithAI(char, kDoc);
                
                const batch = writeBatch(db);
                const newItems = [];
                let addedForThisChar = 0;

                for (const item of generatedItems) {
                    const cleanWord = item.word.split('（')[0].split('(')[0].trim();
                    if (vocabList.some(v => (v.word || '').split('（')[0].split('(')[0].trim() === cleanWord)) continue;

                    const newRef = doc(collection(db, 'kanjiVocab'));
                    const vocabObj = { ...item, id: newRef.id };
                    batch.set(newRef, vocabObj);
                    newItems.push(vocabObj);
                    addedForThisChar++;
                }

                if (addedForThisChar > 0) {
                    await batch.commit();
                    newItems.forEach(item => updateCachedVocab(item));
                    totalAdded += addedForThisChar;
                }
            }

            showToast(`🎉 AI đã bổ sung thành công tổng cộng ${totalAdded} từ vựng mới cho ${targetList.length} chữ Kanji!`, 'success');
        } catch (err) {
            console.error('Lỗi khi AI bổ sung từ vựng hàng loạt:', err);
            showToast('Lỗi AI tạo từ vựng: ' + err.message, 'error');
        } finally {
            setGeneratingAiVocab(false);
        }
    };

    const handleDeleteCategory = async (catId) => {
        if (!await showConfirm('Bạn có chắc muốn xóa phân loại này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, 'vocabCategories', catId));
            setVocabCategories(vocabCategories.filter(c => c.id !== catId));
        } catch (e) {
            console.error('Error deleting category:', e);
        }
    };

    const toggleKanjiSelection = (id) => {
        setSelectedKanjiIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleVocabSelection = (id) => {
        setSelectedVocabIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAllKanji = () => {
        const filteredIds = filteredKanjiList.map(k => k.id);
        setSelectedKanjiIds(prev => prev.length === filteredIds.length ? [] : filteredIds);
    };

    const handleBulkDeleteKanji = async () => {
        if (selectedKanjiIds.length === 0) return;
        if (!await showConfirm(`Bạn có chắc muốn xóa ${selectedKanjiIds.length} kanji?`, { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            const batchSize = 500;
            for (let i = 0; i < selectedKanjiIds.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = selectedKanjiIds.slice(i, i + batchSize);
                chunk.forEach(id => { batch.delete(doc(db, 'kanji', id)); });
                await batch.commit();
            }
            selectedKanjiIds.forEach(id => deleteCachedKanji(id));
            setKanjiList(prev => prev.filter(k => !selectedKanjiIds.includes(k.id)));
            setSelectedKanjiIds([]);
            setBulkSelectMode(false);
            showToast('Đã xóa Kanji thành công!', 'success');
        } catch (e) {
            console.error('Error bulk deleting kanji:', e);
            showToast('Lỗi khi xóa: ' + e.message, 'error');
        }
    };

    const handleEditKanji = async () => {
        if (!editingKanji || (!editingKanji.character && !editingKanji.id)) return;
        const kanjiDoc = {
            ...editingKanji,
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
            imageUrl: editingKanji.imageUrl || '',
            updatedAt: Date.now()
        };

        try {
            const existingFbKanji = kanjiList.find(k => k.character === kanjiDoc.character || k.id === editingKanji.id);
            const targetId = String(editingKanji.id || existingFbKanji?.id || kanjiDoc.character);

            const kanjiDocToSave = { ...kanjiDoc, id: targetId };
            await setDoc(doc(db, 'kanji', targetId), kanjiDocToSave, { merge: true });

            setKanjiList(prev => prev.map(k => (k.id === targetId || k.character === kanjiDoc.character) ? kanjiDocToSave : k));
            updateCachedKanji(kanjiDocToSave);
            showToast(`Đã lưu thành công Kanji "${kanjiDoc.character}" vào Database!`, 'success');

            setShowEditKanjiModal(false);
            setEditingKanji(null);
        } catch (e) {
            console.error('Error saving kanji to Firestore:', e);
            showToast('Lỗi khi lưu kanji: ' + e.message, 'error');
        }
    };

    const handleDeleteKanji = async (kanjiId) => {
        if (!kanjiId || !await showConfirm('Bạn có chắc muốn xóa kanji này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, 'kanji', kanjiId));
            setKanjiList(kanjiList.filter(k => k.id !== kanjiId));
            deleteCachedKanji(kanjiId);
        } catch (e) {
            console.error('Error deleting kanji:', e);
        }
    };

    const handleSyncVocabToKanji = async () => {
        const kanjiInVocab = new Set();
        pureKanjiVocabList.forEach(v => {
            const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
            chars.forEach(c => kanjiInVocab.add(c));
        });

        const missingKanji = [...kanjiInVocab].filter(char => !kanjiList.some(k => k.character === char));
        if (missingKanji.length === 0) {
            showToast('Tất cả chữ Hán tự trong từ vựng đã tồn tại trong cơ sở dữ liệu!', 'info');
            return;
        }

        const confirmed = await showConfirm(
            `Tìm thấy ${missingKanji.length} chữ Hán tự trong từ vựng chưa có trong cơ sở dữ liệu. Bạn có muốn đồng bộ không?`,
            { type: 'info', confirmText: 'Đồng bộ' }
        );
        if (!confirmed) return;

        try {
            const BATCH_SIZE = 450;
            const now = Date.now();
            const addedKanjiList = [];

            for (let i = 0; i < missingKanji.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = missingKanji.slice(i, i + BATCH_SIZE);

                for (const char of chunk) {
                    const docRef = doc(collection(db, 'kanji'));
                    const k = getJotobaKanjiData(char);
                    let kanjiData = k ? {
                        character: k.literal,
                        meaning: k.meaningVi || k.meanings?.join(', ') || '',
                        meaningVi: k.meaningVi || '',
                        sinoViet: k.sinoViet || '',
                        onyomi: k.onyomi?.join('、') || '',
                        kunyomi: k.kunyomi?.join('、') || '',
                        level: k.level || 'N1',
                        strokeCount: String(k.stroke_count || ''),
                        mnemonic: '',
                        parts: (k.parts || []).join('、'),
                        updatedAt: now
                    } : {
                        character: char,
                        meaning: 'Hán tự tự động đồng bộ từ từ vựng',
                        meaningVi: 'Hán tự tự động đồng bộ từ từ vựng',
                        sinoViet: '', onyomi: '', kunyomi: '', level: 'N1',
                        strokeCount: '', mnemonic: '', parts: '', updatedAt: now
                    };
                    batch.set(docRef, kanjiData);
                    addedKanjiList.push({ ...kanjiData, id: docRef.id });
                }
                await batch.commit();
            }

            setKanjiList(prev => [...prev, ...addedKanjiList]);
            addedKanjiList.forEach(k => updateCachedKanji(k));
            showToast(`Đã đồng bộ thành công ${addedKanjiList.length} chữ Hán tự mới!`, 'success');
        } catch (e) {
            console.error('Lỗi khi đồng bộ Hán tự:', e);
            showToast('Đồng bộ thất bại: ' + e.message, 'error');
        }
    };

    const handleCDNSync = async () => {
        const confirmed = await showConfirm(
            'Xuất toàn bộ dữ liệu Kanji & Từ vựng mới nhất sang CDN Cloud Storage?',
            { type: 'info', confirmText: 'Đồng bộ CDN' }
        );
        if (!confirmed) return;

        setSyncingCDN(true);
        showToast('Đang tải và cập nhật dữ liệu CDN...', 'info');
        try {
            await syncKanjiAndVocabToCDN(true);
            showToast('Đồng bộ CDN thành công!', 'success');
        } catch (err) {
            console.error('Lỗi đồng bộ CDN:', err);
            showToast('Đồng bộ CDN thất bại: ' + err.message, 'error');
        } finally {
            setSyncingCDN(false);
        }
    };

    const handleMigrateComponents = async () => {
        const confirmed = await showConfirm(
            'Ghi đè bộ thủ chuẩn (từ kanjiComponents.json) cho toàn bộ Hán tự trong Firestore?',
            { type: 'info', confirmText: 'Ghi đè Bộ thủ' }
        );
        if (!confirmed) return;

        setMigratingComponents(true);
        showToast('Đang quét và ghi đè bộ thủ...', 'info');
        try {
            const kanjiSnap = await getDocs(collection(db, 'kanji'));
            let batch = writeBatch(db);
            let updateCount = 0;
            let batchCount = 0;

            for (const docSnap of kanjiSnap.docs) {
                const data = docSnap.data();
                const char = data.character;
                if (char && kanjiComponents[char]) {
                    const cleanParts = kanjiComponents[char].join('、');
                    if (data.parts !== cleanParts) {
                        batch.update(docSnap.ref, { parts: cleanParts, updatedAt: Date.now() });
                        updateCount++;
                        batchCount++;
                        if (batchCount === 500) {
                            await batch.commit();
                            batch = writeBatch(db);
                            batchCount = 0;
                        }
                    }
                }
            }
            if (batchCount > 0) await batch.commit();
            showToast(`Ghi đè thành công ${updateCount} chữ Kanji!`, 'success');
        } catch (err) {
            console.error('Lỗi khi ghi đè bộ thủ:', err);
            showToast('Ghi đè bộ thủ thất bại: ' + err.message, 'error');
        } finally {
            setMigratingComponents(false);
        }
    };

    const handleEditVocab = async () => {
        if (!editingVocab || !editingVocab.id) return;
        try {
            const kanjiChars = editingVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const vocabDoc = {
                word: editingVocab.word || '',
                reading: editingVocab.reading || '',
                meaning: editingVocab.meaning || '',
                level: editingVocab.level || 'N5',
                source: editingVocab.source || '',
                sinoViet: editingVocab.sinoViet || '',
                pos: editingVocab.pos || '',
                synonym: editingVocab.synonym || '',
                example: editingVocab.example || '',
                exampleMeaning: editingVocab.exampleMeaning || '',
                nuance: editingVocab.nuance || '',
                synonymSinoVietnamese: editingVocab.synonymSinoVietnamese || '',
                accent: editingVocab.accent !== undefined ? String(editingVocab.accent) : '0',
                category: editingVocab.category || '',
                kanjiList: kanjiChars,
                updatedAt: Date.now()
            };
            await updateDoc(doc(db, 'kanjiVocab', editingVocab.id), vocabDoc);
            const updatedVocab = { ...editingVocab, ...vocabDoc };
            setVocabList(vocabList.map(v => v.id === editingVocab.id ? updatedVocab : v));
            updateCachedVocab(updatedVocab);
            setShowEditVocabModal(false);
            setEditingVocab(null);
        } catch (e) {
            console.error('Error editing vocab:', e);
            showToast('Lỗi khi lưu từ vựng: ' + e.message, 'error');
        }
    };

    const handleDeleteVocab = async (vocabId) => {
        if (!vocabId || !await showConfirm('Bạn có chắc muốn xóa từ vựng này?', { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            await deleteDoc(doc(db, 'kanjiVocab', vocabId));
            setVocabList(vocabList.filter(v => v.id !== vocabId));
            deleteCachedVocab(vocabId);
        } catch (e) {
            console.error('Error deleting vocab:', e);
        }
    };

    const openEditKanji = (kanji) => {
        setEditingKanji({ ...kanji });
        setShowEditKanjiModal(true);
    };

    const openEditVocab = (vocab) => {
        setEditingVocab({ ...vocab });
        setShowEditVocabModal(true);
    };

    const handleAddVocabToSRS = (vocab) => {
        if (!onAddVocabToSRS || !vocab) return;
        const normalizedWord = vocab.word.split('（')[0].split('(')[0].trim();
        const alreadyExists = allUserCards.some(card => card.front.split('（')[0].split('(')[0].trim() === normalizedWord);
        if (alreadyExists) {
            setAddedVocabIds(prev => new Set([...prev, vocab.id]));
            showToast(`Từ vựng "${vocab.word.split('（')[0]}" đã có trong danh sách ôn tập`, 'warning');
            return;
        }
        setVocabToSave(vocab);
        setModalSearchQuery('');
        setShowFolderSelectModal(true);
    };

    const handleAddAllVocabToSRS = (vocabItems) => {
        if (!onAddVocabToSRS || !vocabItems?.length) return;
        const itemsToSave = vocabItems.filter(v => {
            const normalizedWord = v.word.split('（')[0].split('(')[0].trim();
            return !allUserCards.some(card => card.front.split('（')[0].split('(')[0].trim() === normalizedWord) && !addedVocabIds.has(v.id);
        });
        if (itemsToSave.length === 0) {
            showToast('Tất cả từ vựng đều đã có trong danh sách ôn tập', 'info');
            return;
        }
        setVocabToSave(itemsToSave);
        setModalSearchQuery('');
        setShowFolderSelectModal(true);
    };

    return {
        isUserAdmin, searchParams, params, navigate, location,
        userKanjiSRS, showFolderSelectModal, setShowFolderSelectModal,
        vocabToSave, selectedModalFolderId, setSelectedModalFolderId,
        modalSearchQuery, setModalSearchQuery, showPremiumModal, setShowPremiumModal,
        lockedPkgName, setLockedPkgName, selectedLevel, setSelectedLevel,
        searchQuery, setSearchQuery, visibleLimit, setVisibleLimit,
        selectedKanji, setSelectedKanji, showDetailModal, setShowDetailModal,
        showAddKanjiModal, setShowAddKanjiModal, showAddVocabModal, setShowAddVocabModal,
        showEditKanjiModal, setShowEditKanjiModal, showEditVocabModal, setShowEditVocabModal,
        editingKanji, setEditingKanji, editingVocab, setEditingVocab,
        syncingCDN, setSyncingCDN, migratingComponents, setMigratingComponents,
        vocabCategories, setVocabCategories, showCategoryModal, setShowCategoryModal,
        newCategoryName, setNewCategoryName, kanjiList, setKanjiList,
        vocabList, setVocabList, loading, setLoading,
        sidebarStrokeCtrl, detailStrokeCtrl, writerContainerRef, detailWriterContainerRef,
        strokeGuideRef, kanjiApiData, loadingApiData, showSearchResults, setShowSearchResults,
        showHandwritingPopup, setShowHandwritingPopup, searchInputRef, handwritingSuggestions, setHandwritingSuggestions, recognizeHandwriting,
        selectedStrokeCount, setSelectedStrokeCount, handwritingStrokesRef, currentStrokeRef,
        recognitionTimeoutRef, bulkSelectMode, setBulkSelectMode, selectedKanjiIds,
        setSelectedKanjiIds, selectedVocabIds, setSelectedVocabIds, diagramZoom, setDiagramZoom,
        diagramPan, setDiagramPan, addingVocabId, addedVocabIds, pitchAccentData,
        newKanji, setNewKanji, newVocab, setNewVocab, jsonKanjiInput, setJsonKanjiInput,
        jsonVocabInput, setJsonVocabInput, pureKanjiVocabList, kanjiMap,
        currentKanjiList, displayedKanjiList, filteredKanjiList, completedCount,
        searchResults, toggleKanjiSRS, openKanjiDetail, handleConfirmSaveVocab,
        handleSelectSearchResult, getKanjiDetail, getVocabForKanji, getRelatedKanji,
        handleAddKanji, handleImportKanjiJson, handleAddVocab, handleImportVocabJson, handleAutoFixVocabSinoViet, fixingSinoViet,
        handleGenerateAiVocabForSingleKanji, handleBatchGenerateAiVocabForNoVocabKanji, generatingAiVocab, handleDeleteCategory, toggleKanjiSelection,
        toggleVocabSelection, selectAllKanji, handleBulkDeleteKanji, handleEditKanji,
        handleDeleteKanji, handleSyncVocabToKanji, handleCDNSync, handleMigrateComponents,
        handleEditVocab, handleDeleteVocab, openEditKanji, openEditVocab,
        handleAddVocabToSRS, handleAddAllVocabToSRS
    };
};
