import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, Grid, PenTool, BookOpen, Folder, Layers, X, Plus, Save, Trash2, Volume2, ArrowLeft, Upload, FileJson, Edit, Check, Copy, Tag, FolderPlus, RotateCcw, RefreshCw, ChevronUp, ChevronDown, Sparkle, Bookmark } from 'lucide-react'
import { db, appId } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import { recordRecentKanji } from '../../utils/kanjiHistory';
import { collection, getDocs, addDoc, deleteDoc, doc, query, updateDoc, setDoc, writeBatch, increment } from 'firebase/firestore'
import { playAudio } from '../../utils/audio';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import HanziWriter from 'hanzi-writer';
import { showToast, showConfirm } from '../../utils/toast';
import { renderStrokeGuide, renderMaziiStyleKanji } from '../../utils/kanjiStroke';
import { RADICALS_214, KANJI_TREE } from '../../data/radicals214';
import { getSharedKanjiList, getSharedVocabList, getSharedVocabCategories, updateCachedKanji, deleteCachedKanji, updateCachedVocab, deleteCachedVocab, getCachedKanjiList, getCachedVocabList, getCachedVocabCategories } from '../../utils/kanjiService';
import { JOTOBA_KANJI_DATA, getJotobaKanjiChars, getJotobaKanjiData } from '../../data/jotobaKanjiData'
import { TopTabBar, PremiumLockedModal } from '../ui';
import { KANJI_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
// JLPT Levels
const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
// Colors for each JLPT level (grid buttons)
const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500 dark:bg-emerald-600/80', hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-500', text: 'text-white' },
    N4: { bg: 'bg-sky-500 dark:bg-sky-600/80', hover: 'hover:bg-sky-600 dark:hover:bg-sky-500', text: 'text-white' },
    N3: { bg: 'bg-sky-500 dark:bg-sky-600/80', hover: 'hover:bg-sky-600 dark:hover:bg-sky-500', text: 'text-white' },
    N2: { bg: 'bg-amber-500 dark:bg-amber-600/80', hover: 'hover:bg-amber-600 dark:hover:bg-amber-500', text: 'text-white' },
    N1: { bg: 'bg-rose-500 dark:bg-rose-600/80', hover: 'hover:bg-rose-600 dark:hover:bg-rose-500', text: 'text-white' },
    'Bộ thủ': { bg: 'bg-orange-500 dark:bg-orange-600/80', hover: 'hover:bg-orange-600 dark:hover:bg-orange-500', text: 'text-white' },
    'Mới thêm': { bg: 'bg-indigo-500 dark:bg-indigo-600/80', hover: 'hover:bg-indigo-600 dark:hover:bg-indigo-500', text: 'text-white' },
    'Chưa có từ vựng': { bg: 'bg-fuchsia-500 dark:bg-fuchsia-600/80', hover: 'hover:bg-fuchsia-600 dark:hover:bg-fuchsia-500', text: 'text-white' },
    'Đã có từ vựng': { bg: 'bg-teal-500 dark:bg-teal-600/80', hover: 'hover:bg-teal-600 dark:hover:bg-teal-500', text: 'text-white' },
};
// Tab colors for level selector
const LEVEL_TAB_COLORS = {
    N5: 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/50',
    N4: 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/50',
    N3: 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/50',
    N2: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50',
    N1: 'bg-rose-500 text-white shadow-md shadow-rose-900/50',
    'Bộ thủ': 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/50',
    'Mới thêm': 'bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50',
    'Chưa có từ vựng': 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-200 dark:shadow-fuchsia-900/50',
    'Đã có từ vựng': 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/50',
};
const KanjiScreen = ({ isAdmin = false, onAddVocabToSRS, onGeminiAssist, allUserCards = [], profile = null, folders = [], userId, awardXP }) => {
    const fadeWholePage = useMenuTransition();
    const [searchParams] = useSearchParams();
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Kanji SRS and Folder select states
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
    // Vocab Categories
    const [vocabCategories, setVocabCategories] = useState(() => getCachedVocabCategories() || []);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    // Firebase data
    // If navigating from KanjiLessonScreen, use the pre-loaded data immediately (zero flash)
    // then update with server data in the background.
    const [kanjiList, setKanjiList] = useState(() => getCachedKanjiList() || location.state?.kanjiList || []);
    const [vocabList, setVocabList] = useState(() => getCachedVocabList() || location.state?.vocabList || []);
    const [loading, setLoading] = useState(() => !getCachedKanjiList() && !location.state?.kanjiList);
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
    const [showHandwritingPopup, setShowHandwritingPopup] = useState(false);
    const searchInputRef = useRef(null);
    // Handwriting search state
    const [handwritingSuggestions, setHandwritingSuggestions] = useState([]);
    const [selectedStrokeCount, setSelectedStrokeCount] = useState(0); // 0 = auto
    const handwritingStrokesRef = useRef([]); // stores [[xs, ys], ...] for each stroke
    const currentStrokeRef = useRef({ xs: [], ys: [] });
    const recognitionTimeoutRef = useRef(null);

    const pureKanjiVocabList = useMemo(() => {
        return vocabList.filter(v => !v.category || !v.category.startsWith('📚'));
    }, [vocabList]);

    // Load user's saved Kanji SRS items on mount
    useEffect(() => {
        if (!userId) return;
        const loadUserSRS = async () => {
            try {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
                const ids = srsSnap.docs.map(doc => doc.id);
                setUserKanjiSRS(new Set(ids));
            } catch (e) {
                console.error('Error loading user kanjiSRS:', e);
            }
        };
        loadUserSRS();
    }, [userId]);

    const toggleKanjiSRS = async (e, kanjiChar) => {
        if (e) e.stopPropagation(); // Stop click from opening detail modal

        const auth = getAuth();
        const userId = auth.currentUser?.uid;
        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu Kanji', 'error');
            return;
        }

        const kanjiDoc = kanjiMap.get(kanjiChar);
        if (!kanjiDoc || !kanjiDoc.id) {
            showToast('Chữ Kanji này chưa được khởi tạo trong hệ thống dữ liệu', 'warning');
            return;
        }

        const isSRSAdded = userKanjiSRS.has(kanjiDoc.id);

        if (isSRSAdded) {
            // No cancel function needed here, users will manage removal from the saved Kanji screen.
            return;
        }

        // Optimistic UI Update: add the Kanji ID to userKanjiSRS Set immediately
        setUserKanjiSRS(prev => new Set([...prev, kanjiDoc.id]));
        showToast(`Đã thêm ${kanjiChar} vào danh sách ôn tập SRS`);

        try {
            const now = Date.now();
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, kanjiDoc.id), {
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
            }, { merge: true });

            // Award XP for Kanji addition
            let multiplier = 1.0;
            const kLevel = kanjiDoc.level || selectedLevel || 'N5';
            if (kLevel) {
                const lvlUpper = String(kLevel).toUpperCase();
                if (lvlUpper.includes('N3')) multiplier = 1.2;
                else if (lvlUpper.includes('N2')) multiplier = 1.4;
                else if (lvlUpper.includes('N1')) multiplier = 1.6;
            }
            const xpAmount = Math.round(15 * multiplier);
            if (xpAmount > 0 && awardXP) {
                awardXP(xpAmount);
            }

            // Cập nhật hoạt động Kanji mới hàng ngày
            try {
                const todayDateString = new Date().toISOString().split('T')[0];
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                await setDoc(activityRef, {
                    newKanjiAdded: increment(1)
                }, { merge: true });
            } catch (err) {
                console.warn('Lỗi ghi activity Kanji mới:', err);
            }
        } catch (err) {
            console.error('Error adding to SRS:', err);
            showToast('Lỗi khi lưu vào SRS', 'error');
            // Revert state update if firestore write failed
            setUserKanjiSRS(prev => {
                const next = new Set(prev);
                next.delete(kanjiDoc.id);
                return next;
            });
        }
    };

    const handleConfirmSaveVocab = async (folderId) => {
        if (!vocabToSave) return;
        const targetFolderId = folderId === 'unfiled' ? null : folderId;
        setShowFolderSelectModal(false);
        setSelectedModalFolderId(null);
        setModalSearchQuery('');
        const items = Array.isArray(vocabToSave) ? vocabToSave : [vocabToSave];
        const isBulk = Array.isArray(vocabToSave);
        setVocabToSave(null);

        if (isBulk) {
            setAddingAllVocab(true);
        } else {
            setAddingVocabId(items[0].id);
        }

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
            showToast(isBulk ? 'Đã lưu tất cả từ vựng vào học phần' : `Đã lưu "${items[0].word}" vào học phần`);
        } catch (e) {
            console.error('Error adding vocab to SRS:', e);
            showToast('Lỗi khi lưu từ vựng: ' + e.message, 'error');
        } finally {
            setAddingVocabId(null);
            setAddingAllVocab(false);
        }
    };

    // Build a Map for O(1) kanji lookups (avoid repeated kanjiList.find() calls)
    const kanjiMap = useMemo(() => {
        const map = new Map();
        kanjiList.forEach(k => { if (k.character) map.set(k.character, k); });
        return map;
    }, [kanjiList]);

    // Helper function to navigate to kanji detail with path params
    const openKanjiDetail = useCallback((char) => {
        const fbData = kanjiMap.get(char);
        const jData = getJotobaKanjiData(char);
        const lvl = fbData?.level || jData?.level || 'N5';
        const isLvlLocked = ['N4', 'N3', 'N2', 'N1'].includes(lvl) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');

        if (isLvlLocked) {
            setLockedPkgName('Thư viện Kanji Zen');
            setShowPremiumModal(true);
            return;
        }

        navigate(`/kanji/list/${char}`);
        setSelectedKanji(char);
        setShowDetailModal(true);
    }, [navigate, kanjiMap, isAdmin, profile]);
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
                        const kanjiDoc = kanjiMap.get(char);
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
        level: 'N5', sinoViet: '', mnemonic: '', radical: '', imageUrl: ''
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
            // If we already have pre-loaded data from navigation state (coming from KanjiLessonScreen),
            // skip the heavy kanji+vocab fetch entirely — use the pre-loaded data.
            const hasPreloadedData = !!(location.state?.kanjiList);
            try {
                if (hasPreloadedData) {
                    // Only fetch lightweight auxiliary data (categories)
                    const catData = await getSharedVocabCategories();
                    setVocabCategories(catData);
                    // Also seed the global cache with our preloaded lists so other screens get them immediately
                    location.state.kanjiList.forEach(k => updateCachedKanji(k));
                    location.state.vocabList.forEach(v => updateCachedVocab(v));
                } else {
                    console.log('Loading kanji data from shared cache...');
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
    // Listen to cache updates and sync state across all screens
    useEffect(() => {
        const handleCacheUpdate = (e) => {
            const { type, data } = e.detail;
            if (type === 'kanji') {
                setKanjiList(prev => {
                    const idx = prev.findIndex(k => k.id === data.id);
                    if (idx !== -1) {
                        return prev.map(k => k.id === data.id ? { ...k, ...data } : k);
                    } else {
                        return [...prev, data];
                    }
                });
            } else if (type === 'kanji-delete') {
                setKanjiList(prev => prev.filter(k => k.id !== data));
            } else if (type === 'vocab') {
                setVocabList(prev => {
                    const idx = prev.findIndex(v => v.id === data.id);
                    if (idx !== -1) {
                        return prev.map(v => v.id === data.id ? { ...v, ...data } : v);
                    } else {
                        return [...prev, data];
                    }
                });
            } else if (type === 'vocab-delete') {
                setVocabList(prev => prev.filter(v => v.id !== data));
            }
        };

        window.addEventListener('kanji-cache-updated', handleCacheUpdate);
        return () => window.removeEventListener('kanji-cache-updated', handleCacheUpdate);
    }, []);
    // Auto-open detail if :char param or ?char= param is present
    // FAST PATH: Open immediately using static Jotoba data, don't wait for full Firebase load
    useEffect(() => {
        const charParam = params.char || searchParams.get('char');
        if (charParam) {
            setSelectedKanji(charParam);
            setShowDetailModal(true);
        }
    }, [params.char, searchParams]);
    // Handle search query and level parameters from URL
    useEffect(() => {
        const queryParam = searchParams.get('search');
        if (queryParam) {
            setSearchQuery(queryParam);
        }
        const levelParam = searchParams.get('level');
        if (levelParam && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(levelParam)) {
            setSelectedLevel(levelParam);
        }
    }, [searchParams]);
    // Fetch Kanji API data + set up data when kanji is selected
    useEffect(() => {
        if (!selectedKanji) return;
        setLoadingApiData(true);
        // Use Jotoba static data + local data
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
    }, [selectedKanji]);
    // Record recently viewed Kanji
    useEffect(() => {
        if (!selectedKanji) return;
        const auth = getAuth();
        const userId = auth.currentUser?.uid;
        recordRecentKanji(userId, selectedKanji);
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
                container.innerHTML = `<span style="font-size:${Math.floor(size * 0.8)}px;color:#0891b2;font-family:'BIZ UDPMincho', 'MS Mincho', 'ＭＳ 明朝', 'Hiragino Mincho ProN', 'Yu Mincho', serif;line-height:1;user-select:none">${selectedKanji}</span>`;
            }
        };
        renderMaziiStyleKanji(container, selectedKanji, {
            animDuration: 0.5,
            delayBetween: 0.2,
            strokeWidth: 4,
        }).then((ctrl) => {
            if (cancelled) {
                ctrl.stop();
            } else {
                sidebarStrokeCtrl.current = ctrl;
            }
        }).catch(err => {
            console.error('Mazii style render error:', err);
            showFallback();
        });
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
                    container.innerHTML = `<span style="font-size:${Math.floor(size * 0.8)}px;color:#0891b2;font-family:'BIZ UDPMincho', 'MS Mincho', 'ＭＳ 明朝', 'Hiragino Mincho ProN', 'Yu Mincho', serif;line-height:1;user-select:none">${selectedKanji}</span>`;
                }
            };
            renderMaziiStyleKanji(container, selectedKanji, {
                animDuration: 0.5,
                delayBetween: 0.2,
                strokeWidth: 6, // thicker for detail modal
            }).then((ctrl) => {
                if (cancelled) {
                    ctrl.stop();
                } else {
                    detailStrokeCtrl.current = ctrl;
                }
            }).catch(err => {
                console.error('Mazii style detail error:', err);
                showFallback();
            });
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
            return Object.keys(RADICALS_214);
        }
        
        let sorted;
        if (selectedLevel === 'Mới thêm') {
            const list = kanjiList
                .filter(k => k.updatedAt)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            sorted = list.map(k => k.character);
        } else if (selectedLevel === 'Chưa có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c));
            });
            const list = kanjiList.filter(k => !kanjiInVocab.has(k.character));
            sorted = list.map(k => k.character);
        } else if (selectedLevel === 'Đã có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c));
            });
            const list = kanjiList.filter(k => kanjiInVocab.has(k.character));
            sorted = list.map(k => k.character);
        } else {
            const jotobaChars = getJotobaKanjiChars(selectedLevel);
            const firebaseChars = [];
            kanjiMap.forEach((v, k) => { if (v.level === selectedLevel) firebaseChars.push(k); });
            const mergedSet = new Set([...jotobaChars, ...firebaseChars]);
            let merged = [...mergedSet];
            // Sort by stroke count (simple → complex) — using Map for O(1) lookups
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

        if (!searchQuery.trim()) return sorted;
        const query = searchQuery.toLowerCase().trim();
        return sorted.filter(k => {
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
        return currentKanjiList.slice(0, visibleLimit);
    }, [currentKanjiList, selectedLevel, visibleLimit]);
    // Get filtered kanji list with id for bulk operations (Firebase items only - need IDs for delete/edit)
    const filteredKanjiList = useMemo(() => {
        if (selectedLevel === 'Bộ thủ') return []; // No bulk ops for radicals
        let filtered;
        if (selectedLevel === 'Mới thêm') {
            filtered = kanjiList
                .filter(k => k.updatedAt)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        } else if (selectedLevel === 'Chưa có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c));
            });
            filtered = kanjiList.filter(k => !kanjiInVocab.has(k.character));
        } else if (selectedLevel === 'Đã có từ vựng') {
            const kanjiInVocab = new Set();
            pureKanjiVocabList.forEach(v => {
                const chars = (v.word || '').match(/[\u4e00-\u9faf]/g) || [];
                chars.forEach(c => kanjiInVocab.add(c));
            });
            filtered = kanjiList.filter(k => kanjiInVocab.has(k.character));
        } else {
            filtered = kanjiList.filter(k => k.level === selectedLevel);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(k => k.character.includes(query) || (k.meaning && String(k.meaning).toLowerCase().includes(query)) || (k.sinoViet && String(k.sinoViet).toLowerCase().includes(query)));
        }
        return filtered;
    }, [selectedLevel, kanjiList, pureKanjiVocabList, searchQuery]);
    // Calculate completed count for level
    const completedCount = useMemo(() => {
        const savedKanjiSet = new Set(allUserCards.map(c => c.front || c.character).filter(Boolean));
        return currentKanjiList.filter(k => savedKanjiSet.has(k)).length;
    }, [currentKanjiList, allUserCards]);
    // Search results for dropdown (search across ALL kanji: Firebase + Jotoba)
    // Priority: 1. sinoViet match  2. meaning match  3. Japanese reading match
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase().trim();
        const allResults = [];
        const seenChars = new Set();
        // Helper: compute match priority score (lower = higher priority)
        const getMatchScore = (char, sinoViet, meaning, meanings, onyomi, kunyomi) => {
            const cleanSino = sinoViet ? String(sinoViet).toLowerCase() : '';
            const cleanMeaning = meaning ? String(meaning).toLowerCase() : '';
            // Exact sinoViet match
            if (cleanSino === query) return 0;
            // sinoViet starts with query
            if (cleanSino.startsWith(query)) return 1;
            // sinoViet contains query
            if (cleanSino.includes(query)) return 2;
            // Exact character match
            if (char === query) return 3;
            // Meaning exact match
            if (cleanMeaning === query) return 4;
            // Meaning/meanings contain query
            if (cleanMeaning.includes(query)) return 5;
            if (meanings?.some(m => m && String(m).toLowerCase().includes(query))) return 5;

            // Handle onyomi/kunyomi (either array or string)
            const checkReading = (readingVal) => {
                if (!readingVal) return false;
                if (Array.isArray(readingVal)) {
                    return readingVal.some(r => r && String(r).toLowerCase().includes(query));
                }
                return String(readingVal).toLowerCase().includes(query);
            };

            if (checkReading(onyomi)) return 6;
            if (checkReading(kunyomi)) return 6;

            // Character contains query
            if (char.includes(query)) return 7;
            return 99;
        };

        const firebaseCharsSet = new Set(kanjiList.map(k => k.character).filter(Boolean));

        // Search Firebase kanji
        for (const k of kanjiList) {
            if (seenChars.has(k.character)) continue;
            const score = getMatchScore(k.character, k.sinoViet, k.meaning, null, k.onyomi, k.kunyomi);
            if (score < 99) {
                seenChars.add(k.character);
                allResults.push({ ...k, _score: score });
            }
        }
        // Search Jotoba static data
        for (const k of Object.values(JOTOBA_KANJI_DATA)) {
            if (firebaseCharsSet.has(k.literal)) {
                // If it is in Firebase, we ONLY use the Firebase data for matching.
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
        let filtered;
        if (selectedLevel === 'Mới thêm') {
            filtered = vocabList
                .filter(v => v.updatedAt)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        } else {
            filtered = vocabList.filter(v => v.level === selectedLevel);
        }
        if (searchQuery.trim()) {
            filtered = filtered.filter(v => v.word?.includes(searchQuery) || v.meaning?.includes(searchQuery));
        }
        return filtered;
    }, [selectedLevel, vocabList, searchQuery]);
    // Get kanji detail (Firebase first, then Jotoba static data as fallback)
    const getKanjiDetail = (char) => {
        const fbData = kanjiMap.get(char);
        const jData = getJotobaKanjiData(char);
        if (fbData) {
            const onyomiStr = Array.isArray(fbData.onyomi) ? fbData.onyomi.join('、') : (fbData.onyomi || '');
            const kunyomiStr = Array.isArray(fbData.kunyomi) ? fbData.kunyomi.join('、') : (fbData.kunyomi || '');
            // Merge: Firebase data + Jotoba fills gaps
            return {
                ...fbData,
                sinoViet: fbData.sinoViet || jData?.sinoViet || '',
                meaning: fbData.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                meaningVi: jData?.meaningVi || fbData.meaning || '',
                onyomi: onyomiStr || jData?.onyomi?.join('、') || '',
                kunyomi: kunyomiStr || jData?.kunyomi?.join('、') || '',
                strokeCount: fbData.strokeCount || jData?.stroke_count || '',
                parts: fbData.parts || jData?.parts?.join('、') || '',
                radical: fbData.radical || '',
                mnemonic: fbData.mnemonic || '',
                level: fbData.level || jData?.level || 'N5',
                imageUrl: fbData.imageUrl || '',
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
                radical: '',
                parts: jData.parts?.join('、') || '',
                _fromJotoba: true
            };
        }
        return {
            character: char, meaning: 'Chưa có thông tin', meaningVi: '', sinoViet: '',
            onyomi: '', kunyomi: '', level: selectedLevel, strokeCount: '', mnemonic: '', radical: '', parts: '', imageUrl: ''
        };
    };
    // Get vocab containing this kanji (from kanjiVocab + linked book vocab)
    const getVocabForKanji = (char) => {
        const list = pureKanjiVocabList.filter(v => (v.word || '').includes(char));
        const levelOrder = { 'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5 };
        return list.sort((a, b) => {
            const orderA = levelOrder[a.level] || 99;
            const orderB = levelOrder[b.level] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.word || '').length - (b.word || '').length;
        });
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
            showToast(`Kanji "${newKanji.character}" đã tồn tại trong hệ thống!`, 'warning');
            return;
        }
        try {
            const docRef = await addDoc(collection(db, 'kanji'), newKanji);
            const addedKanji = { ...newKanji, id: docRef.id };
            setKanjiList([...kanjiList, addedKanji]);
            updateCachedKanji(addedKanji);
            setNewKanji({
                character: '', meaning: '', onyomi: '', kunyomi: '',
                level: 'N5', sinoViet: '', mnemonic: '', radical: '', imageUrl: ''
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
            showToast(`Từ vựng "${newVocab.word}" đã tồn tại trong hệ thống!`, 'warning');
            return;
        }
        try {
            const kanjiChars = newVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const vocabData = {
                ...newVocab,
                kanjiList: kanjiChars,
                updatedAt: Date.now()
            };
            const docRef = await addDoc(collection(db, 'kanjiVocab'), vocabData);
            const addedVocab = { ...vocabData, id: docRef.id };
            setVocabList([...vocabList, addedVocab]);
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
    // Delete Vocab Category
    const handleDeleteCategory = async (catId) => {
        if (!await showConfirm('Bạn có chắc muốn xóa phân loại này?', { type: 'danger', confirmText: 'Xóa' })) return;
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
        if (!await showConfirm(`Bạn có chắc muốn xóa ${selectedKanjiIds.length} kanji?`, { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            const batchSize = 500;
            for (let i = 0; i < selectedKanjiIds.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = selectedKanjiIds.slice(i, i + batchSize);
                chunk.forEach(id => {
                    batch.delete(doc(db, 'kanji', id));
                });
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
    // Bulk delete vocab
    const handleBulkDeleteVocab = async () => {
        if (selectedVocabIds.length === 0) return;
        if (!await showConfirm(`Bạn có chắc muốn xóa ${selectedVocabIds.length} từ vựng?`, { type: 'danger', confirmText: 'Xóa' })) return;
        try {
            const batchSize = 500;
            for (let i = 0; i < selectedVocabIds.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = selectedVocabIds.slice(i, i + batchSize);
                chunk.forEach(id => {
                    batch.delete(doc(db, 'kanjiVocab', id));
                });
                await batch.commit();
            }
            selectedVocabIds.forEach(id => deleteCachedVocab(id));
            setVocabList(prev => prev.filter(v => !selectedVocabIds.includes(v.id)));
            setSelectedVocabIds([]);
            setBulkSelectMode(false);
            showToast('Đã xóa từ vựng thành công!', 'success');
        } catch (e) {
            console.error('Error bulk deleting vocab:', e);
            showToast('Lỗi khi xóa: ' + e.message, 'error');
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
            imageUrl: editingKanji.imageUrl || '',
        };
        try {
            const existingFbKanji = kanjiList.find(k => k.character === kanjiDoc.character);
            const targetId = editingKanji.id || existingFbKanji?.id;

            const kanjiDocToSave = { ...kanjiDoc, updatedAt: Date.now() };
            if (targetId) {
                // Update existing
                await updateDoc(doc(db, 'kanji', targetId), kanjiDocToSave);
                const updatedKanji = { ...editingKanji, ...kanjiDocToSave, id: targetId };
                setKanjiList(kanjiList.map(k => k.id === targetId ? updatedKanji : k));
                updateCachedKanji(updatedKanji);
            } else {
                // Create new (from Jotoba data that admin customized)
                const docRef = await addDoc(collection(db, 'kanji'), kanjiDocToSave);
                const addedKanji = { ...kanjiDocToSave, id: docRef.id };
                setKanjiList([...kanjiList, addedKanji]);
                updateCachedKanji(addedKanji);
            }
            setShowEditKanjiModal(false);
            setEditingKanji(null);
        } catch (e) {
            console.error('Error saving kanji:', e);
            showToast('Lỗi khi lưu kanji: ' + e.message, 'error');
        }
    };
    // Delete Kanji
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
    // Sync missing Kanji from Vocabulary list
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
            `Tìm thấy ${missingKanji.length} chữ Hán tự trong từ vựng chưa có trong cơ sở dữ liệu. Bạn có muốn đồng bộ và tự động thêm các chữ này không?`,
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

                    let kanjiData;
                    if (k) {
                        kanjiData = {
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
                        };
                    } else {
                        kanjiData = {
                            character: char,
                            meaning: 'Hán tự tự động đồng bộ từ từ vựng',
                            meaningVi: 'Hán tự tự động đồng bộ từ từ vựng',
                            sinoViet: '',
                            onyomi: '',
                            kunyomi: '',
                            level: 'N1',
                            strokeCount: '',
                            mnemonic: '',
                            parts: '',
                            updatedAt: now
                        };
                    }

                    batch.set(docRef, kanjiData);
                    addedKanjiList.push({ ...kanjiData, id: docRef.id });
                }

                await batch.commit();
            }

            // Update state and cache
            setKanjiList(prev => [...prev, ...addedKanjiList]);
            addedKanjiList.forEach(k => updateCachedKanji(k));

            showToast(`Đã đồng bộ thành công ${addedKanjiList.length} chữ Hán tự mới!`, 'success');
        } catch (e) {
            console.error('Lỗi khi đồng bộ Hán tự:', e);
            showToast('Đồng bộ thất bại: ' + e.message, 'error');
        }
    };
    // Edit Vocab
    const handleEditVocab = async () => {
        if (!editingVocab || !editingVocab.id) return;
        try {
            const kanjiChars = editingVocab.word.match(/[\u4e00-\u9faf]/g) || [];
            const vocabDoc = {
                word: editingVocab.word,
                reading: editingVocab.reading,
                meaning: editingVocab.meaning,
                level: editingVocab.level,
                source: editingVocab.source,
                sinoViet: editingVocab.sinoViet,
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
    // Delete Vocab
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
    const handleAddVocabToSRS = (vocab) => {
        if (!onAddVocabToSRS || !vocab) return;
        // Check if already in user's vocab list
        const normalizedWord = vocab.word.split('（')[0].split('(')[0].trim();
        const alreadyExists = allUserCards.some(card => {
            const cardFront = card.front.split('（')[0].split('(')[0].trim();
            return cardFront === normalizedWord;
        });
        if (alreadyExists) {
            setAddedVocabIds(prev => new Set([...prev, vocab.id]));
            showToast(`Từ vựng "${vocab.word.split('（')[0]}" đã có trong danh sách ôn tập`, 'warning');
            return;
        }
        setVocabToSave(vocab);
        setModalSearchQuery('');
        setShowFolderSelectModal(true);
    };
    // Add ALL vocab for a kanji to SRS
    const handleAddAllVocabToSRS = (vocabItems) => {
        if (!onAddVocabToSRS || !vocabItems?.length) return;
        const itemsToSave = vocabItems.filter(v => {
            const normalizedWord = v.word.split('（')[0].split('(')[0].trim();
            return !allUserCards.some(card => {
                const cardFront = card.front.split('（')[0].split('(')[0].trim();
                return cardFront === normalizedWord;
            }) && !addedVocabIds.has(v.id);
        });
        if (itemsToSave.length === 0) {
            showToast('Tất cả từ vựng đều đã có trong danh sách ôn tập', 'info');
            return;
        }
        setVocabToSave(itemsToSave);
        setModalSearchQuery('');
        setShowFolderSelectModal(true);
    };
    // Auto-fetch pitch accent + audio data from Jotoba when detail modal opens
    useEffect(() => {
        if (!showDetailModal || !selectedKanji) return;
        const vocab = getVocabForKanji(selectedKanji);
        if (vocab.length === 0) return;
        // Only fetch for words we don't already have pitch data for
        const wordsToFetch = vocab.filter(v => !v.pitch && !pitchAccentData[v.word] && v.word);
        if (wordsToFetch.length === 0) return;
        let cancelled = false;
        const fetchAll = async () => {
            try {
                const results = [];
                const chunkSize = 3;
                for (let i = 0; i < wordsToFetch.length; i += chunkSize) {
                    if (cancelled) return;
                    const chunk = wordsToFetch.slice(i, i + chunkSize);
                    const chunkResults = await Promise.all(
                        chunk.map(async (v) => {
                            try {
                                const jotobaData = await fetchJotobaWordData(v.word);
                                const pitch = jotobaData?.pitch || null;
                                const currentUserEmail = getAuth().currentUser?.email || '';
                                const userHasAdmin = isAdmin || ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(currentUserEmail);
                                if (userHasAdmin && pitch && v.id) {
                                    try {
                                        const updatePayload = {
                                            pitch: pitch,
                                            updatedAt: Date.now()
                                        };
                                        if (jotobaData.reading && !v.reading) {
                                            updatePayload.reading = jotobaData.reading;
                                        }
                                        await updateDoc(doc(db, 'kanjiVocab', v.id), updatePayload);
                                        // Update the local vocab object to avoid refetching it or rendering stale values
                                        v.pitch = pitch;
                                        if (updatePayload.reading) v.reading = updatePayload.reading;
                                        updateCachedVocab(v);
                                        console.log(`💾 Auto-saved missing pitch to Firestore for kanjiVocab word: "${v.word}"`);
                                    } catch (fsErr) {
                                        console.warn(`Failed to auto-save pitch for kanjiVocab word ${v.word}:`, fsErr);
                                    }
                                }
                                return { word: v.word, pitch };
                            } catch (e) {
                                return { word: v.word, pitch: null };
                            }
                        })
                    );
                    results.push(...chunkResults);
                    if (i + chunkSize < wordsToFetch.length) {
                        await new Promise(resolve => setTimeout(resolve, 80));
                    }
                }

                if (cancelled) return;

                const newData = { ...pitchAccentData };
                results.forEach(({ word, pitch }) => {
                    if (pitch) {
                        newData[word] = pitch;
                    }
                });

                setPitchAccentData(newData);
            } catch (e) {
                console.error('Error fetching pitch accent in parallel:', e);
            }
        };
        fetchAll();
        return () => { cancelled = true; };
    }, [showDetailModal, selectedKanji, isAdmin]);
    // Kanji Detail Modal - rendered as a helper function to ensure it always gets fresh state
    const KanjiDetailModal = ({ isFullPage = false } = {}) => {
        if (!selectedKanji) return null;
        const detail = getKanjiDetail(selectedKanji);
        const vocab = getVocabForKanji(selectedKanji);
        const related = getRelatedKanji(selectedKanji);
        const content = (
            <div className="w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <button onClick={() => { setShowDetailModal(false); if (location.state?.fromLesson) { navigate(-1); } else { navigate('/kanji/list'); } }} className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <div className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                        Chi tiết Kanji
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                    {/* Left: Kanji Display with Animation */}
                    <div className="space-y-4 lg:h-full lg:overflow-y-auto pr-1">
                        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-6 aspect-square flex items-center justify-center relative shadow-2xl shadow-indigo-100/50 dark:shadow-black/30 overflow-hidden">
                            {/* KanjiVG Stroke Animation Container */}
                            <div
                                key={`kanji-display-${selectedKanji}`}
                                ref={detailWriterContainerRef}
                                className="w-full h-full flex items-center justify-center"
                            />
                            {/* Replay Button */}
                            <button
                                onClick={() => detailStrokeCtrl.current?.replay()}
                                className="absolute bottom-3 right-3 p-2.5 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 rounded-xl text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 hover:shadow-xl"
                                title="Xem lại nét vẽ"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            {/* Stroke Count Badge */}
                            <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-orange-500/30">
                                {kanjiApiData?.stroke_count || detail.strokeCount || '?'} nét
                            </div>
                        </div>
                        {/* Stroke Order Guide Strip (Jotoba Style) */}
                        <div className="bg-gray-100 dark:bg-slate-900 rounded-xl p-2 shadow-lg border border-gray-200 dark:border-slate-700">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5 px-1 font-medium">Hướng dẫn nét viết</p>
                            <div
                                ref={strokeGuideRef}
                                className="flex flex-wrap gap-1 pb-1"
                            />
                        </div>
                    </div>
                    {/* Center: Kanji Info */}
                    <div className="space-y-4 lg:h-full lg:overflow-y-auto pr-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white font-japanese">{selectedKanji}</span>
                            <span className="text-2xl text-gray-400">-</span>
                            <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{detail.sinoViet || ''}</span>
                            {(() => {
                                const kanjiDoc = kanjiMap.get(selectedKanji);
                                const isSRSAdded = kanjiDoc ? userKanjiSRS.has(kanjiDoc.id) : false;
                                return (
                                    <button
                                        onClick={(e) => !isSRSAdded && toggleKanjiSRS(e, selectedKanji)}
                                        disabled={isSRSAdded}
                                        className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm border ${isSRSAdded
                                                ? 'bg-emerald-500 text-white border-transparent cursor-default'
                                                : 'bg-white hover:bg-gray-50 text-gray-750 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-slate-700 active:scale-95 hover:scale-[1.02]'
                                            }`}
                                    >
                                        {isSRSAdded ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                Đã lưu
                                            </>
                                        ) : (
                                            <>
                                                <Bookmark className="w-3.5 h-3.5" />
                                                Thêm Kanji Vào Học
                                            </>
                                        )}
                                    </button>
                                );
                            })()}
                            {isAdmin && (
                                <div className="ml-auto flex gap-2">
                                    <button
                                        onClick={() => openEditKanji(detail)}
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
                            <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                                <div className="space-y-2.5 flex-1 min-w-0 w-full">
                                    <p><span className="text-gray-500 dark:text-gray-400">Trình độ JLPT:</span> <span className="text-gray-900 dark:text-white font-medium">{detail.level || (kanjiApiData?.jlpt ? `N${kanjiApiData.jlpt}` : '-')}</span></p>
                                    <p><span className="text-gray-500 dark:text-gray-400">Số nét:</span> <span className="text-gray-900 dark:text-white font-bold">{detail.strokeCount || kanjiApiData?.stroke_count || getJotobaKanjiData(selectedKanji)?.stroke_count || '?'}</span></p>
                                    <p><span className="text-gray-500 dark:text-gray-400">Âm Kun:</span> <span className="text-red-500 dark:text-red-400 font-japanese font-bold">{detail.kunyomi || (kanjiApiData?.kunyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.kunyomi?.join('、') || '-'}</span></p>
                                    <p><span className="text-gray-500 dark:text-gray-400">Âm On:</span> <span className="text-cyan-600 dark:text-cyan-400 font-japanese font-bold">{detail.onyomi || (kanjiApiData?.onyomi?.join('、')) || getJotobaKanjiData(selectedKanji)?.onyomi?.join('、') || '-'}</span></p>
                                    {/* Parts / Thành phần chiết tự */}
                                    {(() => {
                                        const parts = detail.parts || kanjiApiData?.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
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
                                                            className="px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg text-base font-japanese hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors cursor-pointer"
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {detail.imageUrl && (
                                    <div className="w-full sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden border border-gray-150 dark:border-slate-600 flex items-center justify-center p-1.5 group shadow-inner">
                                        <img src={detail.imageUrl} alt={detail.character} className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105" />
                                    </div>
                                )}
                            </div>
                            {detail.mnemonic && (
                                <p className="pt-1 border-t border-gray-100 dark:border-slate-700"><span className="text-gray-500 dark:text-gray-400">💡 Cách nhớ:</span> <span className="text-gray-900 dark:text-white">{detail.mnemonic}</span></p>
                            )}
                        </div>
                        {/* Radical Breakdown - Thành phần bộ thủ */}
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Thành phần bộ thủ
                            </h4>
                            <div className="relative bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden p-6" style={{ minHeight: '280px' }}>
                                {loadingApiData ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : (() => {
                                    const parseRads = (str) => {
                                        if (!str) return [];
                                        if (Array.isArray(str)) return str.map(s => String(s).trim()).filter(Boolean);
                                        const strVal = String(str);
                                        const withoutParens = strVal.replace(/[（(][^)）]*[)）]/g, '');
                                        return withoutParens.split(/[,，、\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                                    };
                                    const det = getKanjiDetail(selectedKanji);
                                    const parts = det.parts || kanjiApiData?.parts || getJotobaKanjiData(selectedKanji)?.parts || [];
                                    const partsArr = (typeof parts === 'string' ? parseRads(parts) : parts).filter(p => p !== selectedKanji);
                                    const resultKanji = [
                                        ...Object.entries(KANJI_TREE)
                                            .filter(([k, v]) => v.components?.includes(selectedKanji) && k !== selectedKanji)
                                            .map(([k]) => k),
                                        ...kanjiList
                                            .filter(k => {
                                                if (k.character === selectedKanji) return false;
                                                const rads = parseRads(k.radical || '');
                                                const kParts = parseRads(k.parts || '');
                                                return rads.includes(selectedKanji) || kParts.includes(selectedKanji);
                                            })
                                            .map(k => k.character)
                                    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
                                    if (partsArr.length === 0 && resultKanji.length === 0) {
                                        return <p className="text-center text-gray-400 dark:text-gray-500 py-8">Không có dữ liệu thành phần</p>;
                                    }
                                    return (
                                        <div className="flex flex-col items-center gap-4">
                                            {partsArr.length > 0 && (
                                                <>
                                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">Cấu tạo từ</span>
                                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                                        {partsArr.map((p, i) => (
                                                            <button key={i} onClick={() => { navigate(`/kanji/list/${p}`); setSelectedKanji(p); }} className="group relative">
                                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 border-2 border-sky-200 dark:border-sky-700/50 flex items-center justify-center text-2xl font-japanese text-sky-700 dark:text-sky-300 hover:scale-110 hover:shadow-lg hover:shadow-sky-200/50 dark:hover:shadow-sky-900/50 transition-all cursor-pointer">
                                                                    {p}
                                                                </div>
                                                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-sky-500 dark:text-sky-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {kanjiMap.get(p)?.sinoViet || getJotobaKanjiData(p)?.sinoViet || ''}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
                                                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"></div>
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"></div>
                                                    </div>
                                                </>
                                            )}
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-2xl shadow-cyan-500/30 dark:shadow-cyan-900/50 flex items-center justify-center">
                                                    <span className="text-5xl font-japanese text-white font-bold drop-shadow-lg">{selectedKanji}</span>
                                                </div>
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white dark:bg-slate-800 rounded-full text-xs font-bold text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 shadow-sm whitespace-nowrap">
                                                    {det.sinoViet || ''}
                                                </div>
                                            </div>
                                            {resultKanji.length > 0 && (
                                                <>
                                                    <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600 mt-2">
                                                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"></div>
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"></div>
                                                    </div>
                                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">Tạo thành</span>
                                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                                        {resultKanji.map((k, i) => (
                                                            <button key={i} onClick={() => { navigate(`/kanji/list/${k}`); setSelectedKanji(k); }} className="group relative">
                                                                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center text-lg font-japanese text-emerald-700 dark:text-emerald-300 hover:scale-110 hover:shadow-lg transition-all cursor-pointer">
                                                                    {k}
                                                                </div>
                                                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-emerald-500 dark:text-emerald-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {kanjiMap.get(k)?.sinoViet || ''}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    {/* Right: Vocabulary - grouped by category */}
                    <div className="flex flex-col gap-4 bg-white dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700 lg:h-full lg:overflow-hidden">
                        {/* Header with Add All and Category Management */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-orange-500 dark:text-orange-400 font-medium flex items-center gap-1.5">
                                <Tag className="w-4 h-4" /> Từ vựng ({vocab.length})
                            </h3>
                        </div>
                        {/* Render vocab grouped by Kun yomi and On yomi */}
                        {(() => {
                            // Helper to determine reading type (Kun or On)
                            const checkReadingType = (v) => {
                                const kanjiDetail = kanjiMap.get(selectedKanji);
                                if (!kanjiDetail || !v.reading) return null;
                                
                                const toHiragana = (str) => str.replace(/[\u30A1-\u30F6]/g, ch =>
                                    String.fromCharCode(ch.charCodeAt(0) - 0x60)
                                );

                                const onyomiReadings = [];
                                if (kanjiDetail.onyomi) {
                                    String(kanjiDetail.onyomi || '').split(/[、,]/).forEach(r => {
                                        const clean = r.trim().replace(/[-\.。]/g, '');
                                        if (clean) onyomiReadings.push(toHiragana(clean));
                                    });
                                }

                                const kunyomiReadings = [];
                                if (kanjiDetail.kunyomi) {
                                    String(kanjiDetail.kunyomi || '').split(/[、,]/).forEach(r => {
                                        const clean = r.trim().split('.')[0].replace(/[-。]/g, '');
                                        if (clean) kunyomiReadings.push(toHiragana(clean));
                                    });
                                }

                                const hiraReading = toHiragana(v.reading);
                                const wordClean = (v.word || '').split('（')[0].split('(')[0].trim();

                                // Check Case 1: Word starts with/equals target Kanji
                                if (wordClean.startsWith(selectedKanji)) {
                                    const okurigana = wordClean.slice(selectedKanji.length);
                                    // If it has okurigana (e.g. 食べる)
                                    if (okurigana && hiraReading.endsWith(toHiragana(okurigana))) {
                                        const kanjiPart = hiraReading.slice(0, hiraReading.length - toHiragana(okurigana).length);
                                        if (kunyomiReadings.includes(kanjiPart)) return 'Kunyomi';
                                        if (onyomiReadings.includes(kanjiPart)) return 'Onyomi';
                                    }
                                    // If it's a single kanji word (e.g. 水)
                                    if (wordClean === selectedKanji) {
                                        if (kunyomiReadings.includes(hiraReading)) return 'Kunyomi';
                                        if (onyomiReadings.includes(hiraReading)) return 'Onyomi';
                                    }
                                }

                                // Fallback: does reading contain Kun or On readings?
                                const hasKun = kunyomiReadings.some(kr => hiraReading.includes(kr));
                                const hasOn = onyomiReadings.some(or => hiraReading.includes(or));
                                
                                if (hasKun && !hasOn) return 'Kunyomi';
                                if (hasOn && !hasKun) return 'Onyomi';
                                
                                // Default fallback: 1-character word is usually Kun, multi-character word is usually On
                                if (wordClean.length === 1) return 'Kunyomi';
                                return 'Onyomi';
                            };

                            // Render a single vocab item
                            const renderVocabItem = (v, i, rType) => {
                                const isSpecialReading = v.specialReading || false;
                                const apiPitch = pitchAccentData[v.word];
                                const storedPitch = v.accent !== undefined && v.accent !== '' ? accentNumberToPitchParts(v.reading, v.accent) : null;
                                const pitchParts = apiPitch || v.pitch || storedPitch;

                                const renderWord = () => {
                                    const wordClean = (v.word || '').split('（')[0].split('(')[0].trim();
                                    if (isSpecialReading) {
                                        return <span className="text-blue-600 dark:text-blue-400 font-japanese font-bold">{wordClean}</span>;
                                    }
                                    if (rType === 'Kunyomi') {
                                        return <span className="text-red-500 dark:text-red-400 font-japanese font-bold">{wordClean}</span>;
                                    }
                                    return <span className="text-cyan-600 dark:text-cyan-400 font-japanese font-bold">{wordClean}</span>;
                                };

                                const renderReading = () => {
                                    if (!v.reading) return null;
                                    if (isSpecialReading) {
                                        return <span className="text-blue-400 font-japanese">{v.reading}</span>;
                                    }
                                    const kanjiDetail = kanjiMap.get(selectedKanji);
                                    const kanjiReadings = [];
                                    if (kanjiDetail) {
                                        if (kanjiDetail.onyomi) {
                                            String(kanjiDetail.onyomi || '').split(/[、,]/).forEach(r => {
                                                const clean = r.trim().replace(/[-\.。]/g, '');
                                                if (clean) kanjiReadings.push(clean);
                                            });
                                        }
                                        if (kanjiDetail.kunyomi) {
                                            String(kanjiDetail.kunyomi || '').split(/[、,]/).forEach(r => {
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
                                                                <span className={isHighlighted ? (rType === 'Kunyomi' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-cyan-600 dark:text-cyan-400 font-bold') : 'text-slate-800 dark:text-slate-200'}>{char}</span>
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
                                                    <span key={ci} className={isHighlighted ? (rType === 'Kunyomi' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-cyan-600 dark:text-cyan-400 font-bold') : 'text-slate-800 dark:text-slate-200'}>{char}</span>
                                                );
                                            })}
                                        </span>
                                    );
                                };

                                return (
                                    <div key={`vocab-${v.id || i}`} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/80 transition-colors border border-gray-200 dark:border-slate-700/50">
                                        <div className="flex-1 min-w-0 flex flex-col gap-1 text-sm">
                                            {/* Line 1: Word (Reading)  SinoViet */}
                                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                {renderWord()}
                                                <span className="text-slate-800 dark:text-slate-200 font-medium">（</span>{renderReading()}<span className="text-slate-800 dark:text-slate-200 font-medium">）</span>
                                                <span className="text-cyan-600 dark:text-cyan-500 font-bold uppercase text-xs ml-3">{v.sinoViet ? `[${v.sinoViet}]` : ''}</span>
                                                {v.category && (
                                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium border border-gray-150 dark:border-slate-700 px-1 py-0.2 rounded ml-auto">
                                                        {v.category.replace('📚', '').trim()}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Line 2: Vietnamese Meaning */}
                                            <div className="text-gray-700 dark:text-gray-200 pl-1 font-normal">
                                                {v.meaning}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                                            {v.audioBase64 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); playAudio(v.audioBase64, v.word); }}
                                                    className="p-1.5 text-sky-500 hover:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors rounded-md"
                                                    title="Nghe phát âm"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
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

                            // Group all vocabulary by checkReadingType
                            const kunyomiVocab = [];
                            const onyomiVocab = [];
                            for (const v of vocab) {
                                if (checkReadingType(v) === 'Kunyomi') {
                                    kunyomiVocab.push(v);
                                } else {
                                    onyomiVocab.push(v);
                                }
                            }

                            if (vocab.length === 0) {
                                return <p className="text-gray-400 dark:text-gray-500 text-center py-4">Chưa có từ vựng</p>;
                            }

                            return (
                                <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] lg:max-h-none pr-1">
                                    {/* Kun yomi block */}
                                    {kunyomiVocab.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl sticky top-0 bg-white dark:bg-slate-900/90 z-10">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                                                    Kun yomi (Âm Kun)
                                                </span>
                                                <span className="text-xs font-bold text-red-600 dark:text-red-500/80 ml-auto">({kunyomiVocab.length} từ)</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {kunyomiVocab.map((v, i) => renderVocabItem(v, i, 'Kunyomi'))}
                                            </div>
                                        </div>
                                    )}

                                    {/* On yomi block */}
                                    {onyomiVocab.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 rounded-xl sticky top-0 bg-white dark:bg-slate-900/90 z-10">
                                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                                                    On yomi (Âm On)
                                                </span>
                                                <span className="text-xs font-bold text-cyan-500 dark:text-cyan-500/80 ml-auto">({onyomiVocab.length} từ)</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {onyomiVocab.map((v, i) => renderVocabItem(v, i, 'Onyomi'))}
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
        );
        if (isFullPage) {
            return (
                <div className="w-full h-screen p-4 lg:p-8 bg-gradient-to-br from-indigo-50/95 via-white/95 to-sky-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
                    {content}
                </div>
            );
        }
        return (
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 lg:p-8">
                <div className="w-full max-w-[92vw] lg:max-w-[1550px] h-[90vh] bg-gradient-to-br from-indigo-50/95 via-white/95 to-sky-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {content}
                </div>
            </div>
        );
    };
    // Loading screen - show lazy load if data is still loading
    if (loading) {
        if (location.state?.fromLesson) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                    <LoadingIndicator text="Đang tải chi tiết Kanji..." />
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white pb-8">
                <TopTabBar tabs={KANJI_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu Kanji..." />
                </div>
            </div>
        );
    }
    // ── LESSON DETAIL MODE ──────────────────────────────────────────────────
    // When coming from KanjiLessonScreen, render ONLY the detail view —
    // no list, no header flash. KanjiDetailModal renders in full-page mode.
    if (location.state?.fromLesson) {
        // Skeleton while selectedKanji is being resolved from URL params
        if (!selectedKanji) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                        <div className="h-4 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            );
        }
        // Call as function (useCallback result) with isFullPage=true
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-gray-900 dark:text-white animate-fade-in">
                {KanjiDetailModal({ isFullPage: true })}
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 text-gray-900 dark:text-white pb-12 transition-colors duration-300">
            <TopTabBar tabs={KANJI_TABS} />
            <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6 mt-6 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            Tra cứu Kanji
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Khám phá và tra cứu hệ thống Kanji, nghĩa và âm Hán-Việt.
                        </p>
                    </div>
                    {/* Search & Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        {/* Search Input */}
                        <div className="relative flex-1" ref={searchInputRef}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                                onFocus={() => setShowSearchResults(true)}
                                placeholder="Tìm kiếm Kanji, nghĩa hoặc âm Hán-Việt..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl px-5 py-3.5 pr-20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400/50 focus:border-transparent shadow-sm transition-all text-sm"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                <button
                                    onClick={() => setShowHandwritingPopup(!showHandwritingPopup)}
                                    className={`p-2 rounded-xl transition-all hover:scale-105 ${showHandwritingPopup ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-400'}`}
                                    title="Vẽ Kanji để tìm kiếm"
                                >
                                    <PenTool className="w-4 h-4" />
                                </button>
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            {/* Search Results Dropdown */}
                            {showSearchResults && searchQuery.trim() && (searchResults.length > 0 || vocabList.some(v => v.word?.includes(searchQuery) || (v.meaning && String(v.meaning).toLowerCase().includes(searchQuery.toLowerCase())) || v.reading?.includes(searchQuery))) && (
                                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {searchResults.length > 0 && (
                                        <>
                                            <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-850/50 flex items-center gap-1.5">
                                                <span className="w-4.5 h-4.5 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[10px] text-sky-600 dark:text-sky-400 font-bold font-japanese">漢</span>
                                                KANJI ({searchResults.length})
                                            </div>
                                            {searchResults.slice(0, 10).map((kanji, idx) => (
                                                <button key={kanji.id || idx} onClick={() => { openKanjiDetail(kanji.character); setSearchQuery(''); setShowSearchResults(false); }}
                                                    className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                                                    <span className="text-2xl font-japanese font-bold text-sky-600 dark:text-sky-400 w-10 text-center">{kanji.character}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{kanji.sinoViet || '---'}</span>
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md font-bold uppercase">{kanji.level}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{kanji.meaning}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {(() => {
                                        const q = searchQuery.toLowerCase().trim();
                                        const vocabResults = vocabList.filter(v => v.word?.includes(q) || (v.meaning && String(v.meaning).toLowerCase().includes(q)) || v.reading?.includes(q) || (v.sinoViet && String(v.sinoViet).toLowerCase().includes(q))).slice(0, 10);
                                        if (vocabResults.length === 0) return null;
                                        return (
                                            <>
                                                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-850/50 flex items-center gap-1.5">
                                                    <span className="w-4.5 h-4.5 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-[10px] text-orange-600 dark:text-orange-400 font-bold font-japanese">語</span>
                                                    TỪ VỰNG ({vocabResults.length})
                                                </div>
                                                {vocabResults.map((v, idx) => (
                                                    <button key={v.id || idx} onClick={() => {
                                                        const kanjiChar = v.word?.split('').find(ch => { const code = ch.charCodeAt(0); return code >= 0x4E00 && code <= 0x9FFF; });
                                                        if (kanjiChar) { openKanjiDetail(kanjiChar); }
                                                        setSearchQuery(''); setShowSearchResults(false);
                                                    }}
                                                        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                                                        <span className="text-xl font-japanese font-bold text-orange-500 dark:text-orange-400 w-10 text-center">{v.word}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{v.reading}</span>
                                                                {v.sinoViet && <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase">{v.sinoViet}</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{v.meaning}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        {showSearchResults && <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />}
                        {/* JLPT Level Tags */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {[...JLPT_LEVELS, 'Bộ thủ', ...(isUserAdmin ? ['Mới thêm', 'Chưa có từ vựng', 'Đã có từ vựng'] : [])].map(level => {
                                const isActive = selectedLevel === level;
                                const isLocked = ['N4', 'N3', 'N2', 'N1'].includes(level) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');
                                return (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            if (isLocked) {
                                                setLockedPkgName('Thư viện Kanji Zen');
                                                setShowPremiumModal(true);
                                            } else {
                                                setSelectedLevel(level);
                                            }
                                        }}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border flex items-center gap-1.5 ${isActive
                                            ? LEVEL_TAB_COLORS[level] + ' border-transparent'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200/80 dark:border-slate-700/50'
                                            }`}
                                    >
                                        <span>{level}</span>
                                        {isLocked && <span className="text-[10px]" title="Cấp độ Premium">🔒</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {/* Handwriting Popup Modal */}
                {showHandwritingPopup && (
                    <div className="flex justify-center">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm">
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <PenTool className="w-3.5 h-3.5 text-sky-500" /> Vẽ Kanji để tìm kiếm
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {handwritingStrokesRef.current.length > 0 && (
                                        <span className="text-[9px] text-gray-400 mr-1 font-mono">{handwritingStrokesRef.current.length} nét</span>
                                    )}
                                    <button
                                        onClick={() => {
                                            const canvas = document.getElementById('handwriting-canvas');
                                            if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
                                            handwritingStrokesRef.current = []; currentStrokeRef.current = { xs: [], ys: [] };
                                            if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                            setHandwritingSuggestions([]); setSelectedStrokeCount(0);
                                        }}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors" title="Xóa và vẽ lại"
                                    ><RotateCcw className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setShowHandwritingPopup(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="relative bg-slate-50 dark:bg-slate-900" style={{ height: '240px' }}>
                                <canvas
                                    id="handwriting-canvas" width="280" height="240"
                                    className="w-full h-full cursor-crosshair touch-none" style={{ touchAction: 'none' }}
                                    onMouseDown={(e) => { const canvas = e.currentTarget; const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (canvas.width / rect.width); const y = (e.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); canvas.dataset.drawing = 'true'; currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] }; }}
                                    onMouseMove={(e) => { const canvas = e.currentTarget; if (canvas.dataset.drawing !== 'true') return; const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (canvas.width / rect.width); const y = (e.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.lineTo(x, y); ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#38bdf8' : '#0284c7'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); currentStrokeRef.current.xs.push(Math.round(x)); currentStrokeRef.current.ys.push(Math.round(y)); }}
                                    onMouseUp={(e) => { const canvas = e.currentTarget; canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } }}
                                    onMouseLeave={(e) => { const canvas = e.currentTarget; if (canvas.dataset.drawing === 'true') { canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } } }}
                                    onTouchStart={(e) => { e.preventDefault(); const canvas = e.currentTarget; const rect = canvas.getBoundingClientRect(); const touch = e.touches[0]; const x = (touch.clientX - rect.left) * (canvas.width / rect.width); const y = (touch.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); canvas.dataset.drawing = 'true'; currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] }; }}
                                    onTouchMove={(e) => { e.preventDefault(); const canvas = e.currentTarget; if (canvas.dataset.drawing !== 'true') return; const rect = canvas.getBoundingClientRect(); const touch = e.touches[0]; const x = (touch.clientX - rect.left) * (canvas.width / rect.width); const y = (touch.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.lineTo(x, y); ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#38bdf8' : '#0284c7'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); currentStrokeRef.current.xs.push(Math.round(x)); currentStrokeRef.current.ys.push(Math.round(y)); }}
                                    onTouchEnd={(e) => { const canvas = e.currentTarget; canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } }}
                                />
                            </div>
                            {handwritingSuggestions.length > 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-700/50 p-3 bg-slate-50 dark:bg-slate-900/30 max-h-40 overflow-y-auto">
                                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Chọn Kanji phù hợp:</div>
                                    <div className="grid grid-cols-6 gap-2">
                                        {handwritingSuggestions.map((kanji, idx) => (
                                            <button key={kanji.id || idx}
                                                onClick={() => { openKanjiDetail(kanji.character); const canvas = document.getElementById('handwriting-canvas'); if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); } handwritingStrokesRef.current = []; setHandwritingSuggestions([]); setShowHandwritingPopup(false); }}
                                                className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-lg font-japanese font-bold transition-all hover:scale-105 active:scale-95 ${kanji.inDatabase === false ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 text-slate-400' : 'bg-white dark:bg-slate-700 border-slate-200/80 dark:border-slate-650 text-slate-800 dark:text-white'}`}
                                            >
                                                <span>{kanji.character}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Progress Overview Bar Section */}
                {selectedLevel !== 'Bộ thủ' && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm gap-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Danh sách Kanji {selectedLevel}</h3>
                            <p className="text-xs text-slate-400 mt-1.5 font-medium">
                                Bạn đã hoàn thành <span className="text-slate-700 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">{completedCount}</span> / {currentKanjiList.length} chữ Kanji
                            </p>
                        </div>
                        <div className="flex-1 max-w-md w-full">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1.5">
                                <span>TIẾN ĐỘ TỔNG THỂ</span>
                                <span>{currentKanjiList.length > 0 ? Math.round((completedCount / currentKanjiList.length) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${selectedLevel === 'N5' ? 'from-emerald-400 to-teal-500' :
                                        selectedLevel === 'N4' ? 'from-sky-400 to-cyan-500' :
                                            selectedLevel === 'N3' ? 'from-sky-400 to-indigo-500' :
                                                selectedLevel === 'N2' ? 'from-amber-400 to-orange-500' :
                                                    selectedLevel === 'N1' ? 'from-rose-400 to-pink-500' :
                                                        selectedLevel === 'Mới thêm' ? 'from-indigo-400 to-violet-500' :
                                                            selectedLevel === 'Chưa có từ vựng' ? 'from-fuchsia-400 to-pink-500' : 'from-orange-400 to-amber-500'
                                        }`}
                                    style={{ width: `${currentKanjiList.length > 0 ? (completedCount / currentKanjiList.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* Admin Tools Section */}
                {isAdmin && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-3xl p-5 shadow-sm space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Admin Control Panel</p>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setShowAddKanjiModal(true)} className="py-2.5 bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-250 dark:border-slate-650 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                <Plus className="w-4 h-4 text-sky-500" /> Thêm Hán tự
                            </button>
                            <button onClick={handleSyncVocabToKanji} className="py-2.5 bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-250 dark:border-slate-650 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                <RefreshCw className="w-4 h-4 text-emerald-500" /> Đồng bộ Hán tự
                            </button>
                            <button
                                onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedKanjiIds([]); setSelectedVocabIds([]); }}
                                className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${bulkSelectMode ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                {bulkSelectMode ? <><X className="w-4 h-4" /> Thoát</> : <><Trash2 className="w-4 h-4" /> Xóa hàng loạt</>}
                            </button>
                        </div>
                    </div>
                )}
                {/* Bulk Select Control Bar */}
                {bulkSelectMode && isAdmin && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedKanjiIds.length === filteredKanjiList.length && filteredKanjiList.length > 0}
                                        onChange={selectAllKanji}
                                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    Chọn tất cả Kanji ({selectedKanjiIds.length}/{filteredKanjiList.length})
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedVocabIds.length === filteredVocabList.length && filteredVocabList.length > 0}
                                        onChange={selectAllVocab}
                                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    Chọn tất cả Vocab ({selectedVocabIds.length}/{filteredVocabList.length})
                                </label>
                            </div>
                            <div className="flex gap-2">
                                {selectedKanjiIds.length > 0 && (
                                    <button onClick={handleBulkDeleteKanji} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/10">
                                        <Trash2 className="w-3.5 h-3.5" /> Xóa {selectedKanjiIds.length} Kanji
                                    </button>
                                )}
                                {selectedVocabIds.length > 0 && (
                                    <button onClick={handleBulkDeleteVocab} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/10">
                                        <Trash2 className="w-3.5 h-3.5" /> Xóa {selectedVocabIds.length} Vocab
                                    </button>
                                )}
                            </div>
                        </div>
                        {selectedKanjiIds.length > 0 && (
                            <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">💡 Gợi ý: Chọn kanji để hiển thị các từ vựng đi kèm ở phía dưới.</p>
                        )}
                    </div>
                )}
                {/* Grid Layout (Normal, Bulk-Select or Radicals) */}
                <div className="space-y-6">
                    {bulkSelectMode && isAdmin ? (
                        /* Bulk select mode - show list with checkboxes */
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                {filteredKanjiList.map(kanji => (
                                    <div
                                        key={kanji.id}
                                        onClick={() => toggleKanjiSelection(kanji.id)}
                                        className={`relative aspect-square flex items-center justify-center text-xl font-bold rounded-2xl cursor-pointer transition-all hover:scale-105 active:scale-95 ${selectedKanjiIds.includes(kanji.id)
                                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-450'
                                            : `${LEVEL_COLORS[selectedLevel]?.bg || 'bg-emerald-500 dark:bg-emerald-600/80'} text-white`
                                            }`}
                                    >
                                        <span className="font-japanese">{kanji.character}</span>
                                        {selectedKanjiIds.includes(kanji.id) && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-rose-600 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Vocab related to selected kanji */}
                            {(() => {
                                const selectedKanjiChars = filteredKanjiList
                                    .filter(k => selectedKanjiIds.includes(k.id))
                                    .map(k => k.character);
                                const relatedVocab = selectedKanjiChars.length > 0
                                    ? vocabList.filter(v => selectedKanjiChars.some(char => v.word?.includes(char)))
                                    : [];
                                return relatedVocab.length > 0 && (
                                    <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-500">
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
                                                className="text-xs px-2.5 py-1 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 font-bold"
                                            >
                                                {relatedVocab.every(v => selectedVocabIds.includes(v.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                            {relatedVocab.map(vocab => (
                                                <div
                                                    key={vocab.id}
                                                    onClick={() => toggleVocabSelection(vocab.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedVocabIds.includes(vocab.id)
                                                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVocabIds.includes(vocab.id)}
                                                        onChange={() => { }}
                                                        className="w-4 h-4 rounded text-rose-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-japanese text-sm font-bold text-slate-800 dark:text-slate-200">{vocab.word}</span>
                                                        <span className="text-xs text-slate-400 ml-2">({vocab.reading})</span>
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">{vocab.meaning}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : selectedLevel === 'Bộ thủ' ? (
                        /* Bộ thủ (Radicals) mode - show radicals grid with info */
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-4 uppercase">214 bộ thủ Kangxi ({currentKanjiList.length} bộ)</p>
                            {(() => {
                                const grouped = {};
                                currentKanjiList.forEach(radical => {
                                    const info = RADICALS_214[radical];
                                    const strokes = info?.strokes || 0;
                                    if (!grouped[strokes]) grouped[strokes] = [];
                                    grouped[strokes].push(radical);
                                });
                                return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([strokes, radicals]) => (
                                    <div key={strokes} className="mb-6 last:mb-0">
                                        <p className="text-xs font-bold text-orange-500 dark:text-orange-400 mb-3 border-b border-orange-100 dark:border-orange-950 pb-1.5">{strokes} NÉT ({radicals.length})</p>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                            {radicals.map((radical, i) => {
                                                const info = RADICALS_214[radical];
                                                return (
                                                    <button
                                                        key={`${radical}-${i}`}
                                                        onClick={() => openKanjiDetail(radical)}
                                                        className={`group relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm border ${selectedKanji === radical
                                                            ? 'bg-orange-500 text-white border-transparent shadow-lg shadow-orange-500/20 scale-105'
                                                            : 'bg-orange-500/10 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 hover:border-orange-400'
                                                            }`}
                                                        title={`${info?.name || ''} - ${info?.meaning || ''}`}
                                                    >
                                                        <span className="font-japanese text-xl font-bold">{radical}</span>
                                                        <span className="text-[9px] font-bold opacity-80 mt-1 truncate max-w-full px-1">{info?.name || ''}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {displayedKanjiList.map((kanji, i) => {
                                    const jData = getJotobaKanjiData(kanji);
                                    const fbData = kanjiMap.get(kanji);
                                    const meaningTip = fbData?.sinoViet || jData?.sinoViet || '';
                                    const isSaved = allUserCards.some(card => (card.front || card.character) === kanji);
                                    return (
                                        <div
                                            key={`${kanji}-${i}`}
                                            onClick={() => openKanjiDetail(kanji)}
                                            className={`group relative aspect-[4/5] flex flex-col items-center justify-between text-center bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700/60 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 select-none cursor-pointer ${selectedKanji === kanji ? 'ring-2 ring-sky-500 dark:ring-sky-400' : ''
                                                }`}
                                        >
                                            {/* Left Corner: Indicators */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                                                {isSaved && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20 shrink-0" title="Đã lưu vào từ vựng" />
                                                )}
                                                {(() => {
                                                    const kanjiDoc = kanjiMap.get(kanji);
                                                    const isSRSAdded = kanjiDoc ? userKanjiSRS.has(kanjiDoc.id) : false;
                                                    return isSRSAdded && (
                                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider select-none shrink-0" title="Đã thêm vào học">
                                                            Đã lưu
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            {/* Right Corner: Bookmark button to save to SRS */}
                                            <div className="absolute top-2 right-2 flex items-center justify-center z-10 animate-fade-in">
                                                {(() => {
                                                    const kanjiDoc = kanjiMap.get(kanji);
                                                    const isSRSAdded = kanjiDoc ? userKanjiSRS.has(kanjiDoc.id) : false;
                                                    return (
                                                        <button
                                                            onClick={(e) => !isSRSAdded && toggleKanjiSRS(e, kanji)}
                                                            disabled={isSRSAdded}
                                                            className={`p-1.5 rounded-lg transition-all duration-200 ${isSRSAdded
                                                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 opacity-100 shadow-sm cursor-default'
                                                                    : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 group-hover:opacity-100 sm:opacity-0 transition-opacity active:scale-95 hover:scale-110'
                                                                }`}
                                                            title={isSRSAdded ? "Đã lưu vào ôn tập SRS" : "Thêm vào ôn tập SRS"}
                                                        >
                                                            {isSRSAdded ? (
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            ) : (
                                                                <Bookmark className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            {/* Center Kanji character */}
                                            <div className="text-5xl font-japanese font-bold text-slate-800 dark:text-white mt-4 tracking-normal">
                                                {kanji}
                                            </div>
                                            {/* Info readings & meanings */}
                                            <div className="w-full flex flex-col items-center gap-1 mb-3">
                                                {/* Sino-Vietnamese */}
                                                <div className="text-xs font-extrabold tracking-widest text-indigo-600 dark:text-sky-400 uppercase">
                                                    {meaningTip || '—'}
                                                </div>
                                                {/* Meaning */}
                                                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-full px-2 mt-0.5">
                                                    {fbData?.meaning || jData?.meaningVi || jData?.meanings?.slice(0, 2).join(', ') || '—'}
                                                </div>
                                            </div>
                                            {/* Progress / Level Accent Bar */}
                                            <div className={`absolute bottom-0 left-0 right-0 h-1.5 rounded-b-3xl bg-gradient-to-r ${selectedLevel === 'N5' ? 'from-emerald-400 to-teal-500' :
                                                selectedLevel === 'N4' ? 'from-sky-400 to-cyan-500' :
                                                    selectedLevel === 'N3' ? 'from-sky-400 to-indigo-500' :
                                                        selectedLevel === 'N2' ? 'from-amber-400 to-orange-500' :
                                                            selectedLevel === 'N1' ? 'from-rose-400 to-pink-500' :
                                                                selectedLevel === 'Mới thêm' ? 'from-indigo-400 to-violet-500' :
                                                                    selectedLevel === 'Chưa có từ vựng' ? 'from-fuchsia-400 to-pink-500' : 'from-orange-400 to-amber-500'
                                                }`} />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Load more button */}
                            {currentKanjiList.length > visibleLimit && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={() => setVisibleLimit(prev => prev + 100)}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 text-xs tracking-wider uppercase flex items-center gap-2"
                                    >
                                        Xem thêm ({currentKanjiList.length - visibleLimit} Kanji còn lại)
                                    </button>
                                </div>
                            )}

                            {/* Footer Action: Clear filters and view all */}
                            {searchQuery.trim() !== '' && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => { setSearchQuery(''); }}
                                        className="px-6 py-3 border border-sky-500/30 dark:border-sky-400/20 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 rounded-2xl font-bold text-xs tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> DUYỆT TẤT CẢ KANJI
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Detail Modal */}
            {showDetailModal && KanjiDetailModal()}
            {/* Add Kanji Modal */}
            {
                showAddKanjiModal && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[360px] max-w-[90vw] space-y-3 shadow-2xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thêm Kanji mới</h3>
                                <button onClick={() => setShowAddKanjiModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                        <Sparkle className="w-3 h-3" /> Paste dữ liệu JSON Kanji (nếu có)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const sample = {
                                                character: "丈",
                                                meaning: "trượng (đơn vị đo), tráng sĩ",
                                                onyomi: "ジョウ",
                                                kunyomi: "たけ",
                                                level: "N3",
                                                sinoViet: "TRƯỢNG",
                                                radical: "一",
                                                parts: "一、乂",
                                                strokeCount: 3,
                                                mnemonic: "Cách nhớ chữ Trượng",
                                                imageUrl: "https://example.com/image.png"
                                            };
                                            navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                                            showToast('Đã copy JSON mẫu!', 'success');
                                        }}
                                        className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                    >
                                        <Copy className="w-2.5 h-2.5" /> Copy JSON mẫu
                                    </button>
                                </div>
                                <textarea
                                    placeholder={`{ "character": "...", "meaning": "...", "onyomi": "...", "hanViet": "...", ... }`}
                                    className="w-full h-12 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-800 dark:text-amber-200 resize-none border border-indigo-100 dark:border-slate-600"
                                    onChange={(e) => {
                                        try {
                                            const json = JSON.parse(e.target.value);
                                            const updates = {};
                                            if (json.character) updates.character = json.character;
                                            if (json.meaning || json.nghia) updates.meaning = json.meaning || json.nghia;
                                            if (json.onyomi || json.on) updates.onyomi = json.onyomi || json.on;
                                            if (json.kunyomi || json.kun) updates.kunyomi = json.kunyomi || json.kun;
                                            if (json.level || json.jlpt) updates.level = json.level || json.jlpt;
                                            if (json.sinoViet || json.hanViet || json.hv) updates.sinoViet = json.sinoViet || json.hanViet || json.hv;
                                            if (json.radical || json.boThu) updates.radical = json.radical || json.boThu;
                                            if (json.parts) updates.parts = json.parts;
                                            if (json.strokeCount) updates.strokeCount = json.strokeCount;
                                            if (json.mnemonic || json.cachNho) updates.mnemonic = json.mnemonic || json.cachNho;
                                            if (json.imageUrl || json.image) updates.imageUrl = json.imageUrl || json.image;
                                            setNewKanji(prev => ({ ...prev, ...updates }));
                                            showToast('Đã điền tự động từ JSON!', 'success');
                                        } catch (err) {
                                            // Ignore format error while typing
                                        }
                                    }}
                                />
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
                            <input
                                value={newKanji.imageUrl || ''}
                                onChange={e => setNewKanji({ ...newKanji, imageUrl: e.target.value })}
                                placeholder="Link hình ảnh minh họa (nếu có)"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 mb-2"
                            />
                            <button onClick={handleAddKanji} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white text-sm">Lưu Kanji</button>
                        </div>
                    </div>
                )
            }
            {/* Add Vocab Modal */}
            {
                showAddVocabModal && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 w-[400px] max-w-[90vw] max-h-[90vh] overflow-y-auto space-y-3 shadow-2xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Từ vựng</h3>
                                <button onClick={() => setShowAddVocabModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                        <Sparkle className="w-3 h-3" /> Paste dữ liệu JSON Từ vựng (nếu có)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const sample = {
                                                word: "水道",
                                                reading: "すいどう",
                                                sinoViet: "THỦY ĐẠO",
                                                meaning: "Đường ống nước, nước máy",
                                                level: "N5",
                                                pos: "noun",
                                                synonym: "上水",
                                                example: "水道의水を飲みます。",
                                                exampleMeaning: "Tôi uống nước máy.",
                                                nuance: "Sắc thái / ghi chú khác",
                                                category: "Từ vựng chung"
                                            };
                                            navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                                            showToast('Đã copy JSON mẫu!', 'success');
                                        }}
                                        className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                    >
                                        <Copy className="w-2.5 h-2.5" /> Copy JSON mẫu
                                    </button>
                                </div>
                                <textarea
                                    placeholder={`{ "word": "...", "reading": "...", "meaning": "...", "level": "...", ... }`}
                                    className="w-full h-12 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-800 dark:text-amber-200 resize-none border border-indigo-100 dark:border-slate-600"
                                    onChange={(e) => {
                                        try {
                                            const json = JSON.parse(e.target.value);
                                            const updates = {};
                                            if (json.word) updates.word = json.word;
                                            if (json.reading) updates.reading = json.reading;
                                            if (json.sinoViet || json.hanViet) updates.sinoViet = json.sinoViet || json.hanViet;
                                            if (json.meaning || json.nghia) updates.meaning = json.meaning || json.nghia;
                                            if (json.level || json.jlpt) updates.level = json.level || json.jlpt;
                                            if (json.pos) updates.pos = json.pos;
                                            if (json.synonym) updates.synonym = json.synonym;
                                            if (json.example) updates.example = json.example;
                                            if (json.exampleMeaning) updates.exampleMeaning = json.exampleMeaning;
                                            if (json.nuance) updates.nuance = json.nuance;
                                            if (json.category) updates.category = json.category;
                                            setNewVocab(prev => ({ ...prev, ...updates }));
                                            showToast('Đã điền tự động từ JSON!', 'success');
                                        } catch (err) {
                                            // Ignore format error while typing
                                        }
                                    }}
                                />
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
                )
            }

            {/* Edit Kanji Modal */}
            {
                showEditKanjiModal && editingKanji && (
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
                            {/* Quick JSON paste inside Kanji Edit */}
                            {!editingKanji.id && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                            <Sparkle className="w-3 h-3" /> Paste dữ liệu JSON Kanji (nếu có)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const sample = {
                                                    character: "丈",
                                                    meaning: "trượng (đơn vị đo), tráng sĩ",
                                                    onyomi: "ジョウ",
                                                    kunyomi: "たけ",
                                                    level: "N3",
                                                    sinoViet: "TRƯỢNG",
                                                    radical: "一",
                                                    parts: "adv、乂",
                                                    strokeCount: 3,
                                                    mnemonic: "Cách nhớ chữ Trượng",
                                                    imageUrl: "https://example.com/image.png"
                                                };
                                                navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                                                showToast('Đã copy JSON mẫu!', 'success');
                                            }}
                                            className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                        >
                                            <Copy className="w-2.5 h-2.5" /> Copy JSON mẫu
                                        </button>
                                    </div>
                                    <textarea
                                        placeholder={`{ "character": "...", "meaning": "...", "onyomi": "...", "hanViet": "...", ... }`}
                                        className="w-full h-12 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-800 dark:text-amber-200 resize-none border border-indigo-100 dark:border-slate-600"
                                        onChange={(e) => {
                                            try {
                                                const json = JSON.parse(e.target.value);
                                                const updates = {};
                                                if (json.character) updates.character = json.character;
                                                if (json.meaning || json.nghia) updates.meaning = json.meaning || json.nghia;
                                                if (json.onyomi || json.on) updates.onyomi = json.onyomi || json.on;
                                                if (json.kunyomi || json.kun) updates.kunyomi = json.kunyomi || json.kun;
                                                if (json.level || json.jlpt) updates.level = json.level || json.jlpt;
                                                if (json.sinoViet || json.hanViet || json.hv) updates.sinoViet = json.sinoViet || json.hanViet || json.hv;
                                                if (json.radical || json.boThu) updates.radical = json.radical || json.boThu;
                                                if (json.parts) updates.parts = json.parts;
                                                if (json.strokeCount) updates.strokeCount = json.strokeCount;
                                                if (json.mnemonic || json.cachNho) updates.mnemonic = json.mnemonic || json.cachNho;
                                                if (json.imageUrl || json.image) updates.imageUrl = json.imageUrl || json.image;
                                                setEditingKanji({ ...editingKanji, ...updates });
                                                showToast('Đã điền tự động từ JSON!', 'success');
                                            } catch (err) {
                                                // Ignore format error while typing
                                            }
                                        }}
                                    />
                                </div>
                            )}
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
                            <input
                                value={editingKanji.imageUrl || ''}
                                onChange={e => setEditingKanji({ ...editingKanji, imageUrl: e.target.value })}
                                placeholder="Link hình ảnh minh họa (nếu có)"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 mb-2"
                            />
                            <button onClick={handleEditKanji} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold flex items-center justify-center gap-2 text-white">
                                <Save className="w-5 h-5" /> {editingKanji.id ? 'Lưu thay đổi' : 'Lưu vào Firebase'}
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Edit Vocab Modal */}
            {
                showEditVocabModal && editingVocab && (
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
                )
            }
            {/* Category Management Modal */}
            {
                showCategoryModal && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[400px] max-w-[90vw] space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                    <FolderPlus className="w-5 h-5 text-sky-500 dark:text-sky-400" /> Quản lý phân loại từ vựng
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
                                    className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm flex items-center gap-1 transition-colors"
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
                                            'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
                                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                                            'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
                                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                                        ];
                                        return (
                                            <div key={cat.id} className={`flex items-center justify-between p-3 rounded-lg border ${colors[idx % colors.length]} transition-all`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Tag className="w-4 h-4 shrink-0" />
                                                    <span className="font-medium text-sm truncate">{cat.name}</span>
                                                    <span className="text-xs opacity-70 shrink-0">({catVocabCount} từ)</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-1 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors shrink-0"
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
                )
            }
            {/* Folder Select Modal */}
            {showFolderSelectModal && (() => {
                const activeFolder = folders.find(f => f.id === selectedModalFolderId);
                const parentFolderId = activeFolder ? (activeFolder.parentId || null) : null;

                // Get items based on navigation or search query
                let itemsToShow = [];
                if (modalSearchQuery.trim()) {
                    // Global search
                    itemsToShow = folders.filter(item =>
                        (item.name || '').toLowerCase().includes(modalSearchQuery.toLowerCase())
                    );
                } else {
                    // Folder-based navigation
                    itemsToShow = folders.filter(f => (f.parentId || null) === selectedModalFolderId);
                }

                // Helper to extract creation time in milliseconds
                const getCreationTime = (item) => {
                    if (!item.createdAt) return 0;
                    if (typeof item.createdAt === 'number') return item.createdAt;
                    if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
                    if (typeof item.createdAt.toDate === 'function') return item.createdAt.toDate().getTime();
                    if (item.createdAt instanceof Date) return item.createdAt.getTime();
                    return 0;
                };

                // Sort: folders first, then study sets, both sorted newest to oldest
                const sortedItems = [...itemsToShow].sort((a, b) => {
                    if (a.type === 'folder' && b.type !== 'folder') return -1;
                    if (a.type !== 'folder' && b.type === 'folder') return 1;

                    const timeA = getCreationTime(a);
                    const timeB = getCreationTime(b);
                    return timeB - timeA;
                });

                const getParentFolderName = (parentId) => {
                    if (!parentId) return '';
                    const parent = folders.find(f => f.id === parentId);
                    return parent ? parent.name : '';
                };

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl animate-bounce-in text-left" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {modalSearchQuery.trim()
                                    ? 'Tìm kiếm học phần'
                                    : (selectedModalFolderId ? `Thư mục: ${activeFolder?.name}` : 'Thêm vào học phần nào?')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {modalSearchQuery.trim()
                                    ? `Tìm thấy ${sortedItems.length} kết quả phù hợp.`
                                    : (selectedModalFolderId
                                        ? 'Chọn một học phần bên trong thư mục này để lưu từ vựng.'
                                        : 'Chọn học phần hoặc thư mục bạn muốn lưu từ vựng này vào để bắt đầu ôn tập.'
                                    )
                                }
                            </p>

                            {/* Search input with premium styling */}
                            <div className="relative mb-4">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm học phần, thư mục..."
                                    value={modalSearchQuery}
                                    onChange={(e) => setModalSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {modalSearchQuery && (
                                    <button
                                        onClick={() => setModalSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2 mb-6 custom-scrollbar pr-1">
                                {selectedModalFolderId && !modalSearchQuery.trim() && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedModalFolderId(parentFolderId); }}
                                        className="w-full text-left p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-500 dark:hover:text-sky-400 transition-all flex items-center gap-2 mb-2 font-medium text-xs text-gray-500 dark:text-gray-400"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        Quay lại {parentFolderId ? '' : '(Thư mục chính)'}
                                    </button>
                                )}

                                {folders.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                                        Chưa có học phần nào. Vui lòng tạo học phần ở trang Thư viện để lưu từ vựng.
                                    </p>
                                ) : sortedItems.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                                        {modalSearchQuery.trim()
                                            ? 'Không tìm thấy học phần hoặc thư mục nào.'
                                            : 'Không tìm thấy học phần hoặc thư mục con nào ở đây.'}
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {sortedItems.map(folder => (
                                            <button
                                                key={folder.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (folder.type === 'folder') {
                                                        setSelectedModalFolderId(folder.id);
                                                        setModalSearchQuery('');
                                                    } else {
                                                        handleConfirmSaveVocab(folder.id);
                                                    }
                                                }}
                                                className="w-full text-left p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-2"
                                            >
                                                {folder.type === 'folder' ? (
                                                    <span className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-500 dark:text-amber-400 rounded-lg">
                                                        <Folder className="w-3.5 h-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 rounded-lg">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        {folder.name}
                                                        <span className="text-[9px] px-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded font-normal">
                                                            {folder.type === 'folder' ? 'Thư mục' : 'Học phần'}
                                                        </span>
                                                    </div>
                                                    {/* Show parent folder path in global search */}
                                                    {modalSearchQuery.trim() && folder.parentId && (
                                                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <Folder className="w-3 h-3 text-gray-450" />
                                                            <span>Thư mục: {getParentFolderName(folder.parentId)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFolderSelectModal(false);
                                        setVocabToSave(null);
                                        setSelectedModalFolderId(null);
                                        setModalSearchQuery('');
                                    }}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Premium Locked Modal */}
            <PremiumLockedModal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                pkgName={lockedPkgName}
            />
        </div >
    );
};
export default KanjiScreen;