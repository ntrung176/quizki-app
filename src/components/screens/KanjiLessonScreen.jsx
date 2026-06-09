import React, { useState, useEffect, useMemo, useRef } from 'react'
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate, useSearchParams } from 'react-router-dom'
import HanziWriter from 'hanzi-writer';
import { ChevronLeft, ChevronRight, Plus, BookOpen, PenTool, Award, Volume2, Check, X, Sparkle, RotateCcw, Keyboard, Layers, RefreshCw, ArrowLeft, Search, User, Bookmark } from 'lucide-react'
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare, playFlipSound } from '../../utils/soundEffects';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { logKanjiActivity } from '../../utils/kanjiHistory';
import { fetchJotobaWordData } from '../../utils/pitchAccent';
import { renderMaziiStyleKanji, fetchKanjiSvg } from '../../utils/kanjiStroke';
// ── Module-level data cache ────────────────────────────────────────────────
// Survives component unmount/remount (e.g. Back from KanjiScreen detail).
// Cleared only when the browser tab is closed or hard-refreshed.
const _lessonDataCache = {
    kanjiList: null,
    vocabList: null,
    // UI state — persisted so back-navigation restores exact position
    currentIndex: 0,
    viewedSet: new Set([0]),
    isCompleted: false,
    level: null,
    day: null,
};
// ==================== MAIN COMPONENT ====================
const KanjiLessonScreen = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const level = searchParams.get('level') || 'N5';
    const day = parseInt(searchParams.get('day') || '1');
    // Data — seed from module cache if available (instant restore on back-navigation)
    const [kanjiList, setKanjiList] = useState(() => _lessonDataCache.kanjiList || []);
    const [vocabList, setVocabList] = useState(() => _lessonDataCache.vocabList || []);
    const [loading, setLoading] = useState(() => !_lessonDataCache.kanjiList);
    // UI State
    const [activeMode, setActiveMode] = useState('flashcard');
    const [flashcardType, setFlashcardType] = useState('kanji');
    const [testMode, setTestMode] = useState(null);
    // Kanji Flip Mode State
    const [showKanjiFlipMode, setShowKanjiFlipMode] = useState(false);
    const [kanjiFlipCards, setKanjiFlipCards] = useState([]);
    const [kanjiFlipIndex, setKanjiFlipIndex] = useState(0);
    const [kanjiFlipFlipped, setKanjiFlipFlipped] = useState(false);
    const [kanjiFlipKnownSet, setKanjiFlipKnownSet] = useState(new Set());
    const [kanjiFlipUnknownSet, setKanjiFlipUnknownSet] = useState(new Set());
    const [kanjiFlipComplete, setKanjiFlipComplete] = useState(false);
    const [kanjiFlipRound, setKanjiFlipRound] = useState(1);
    const [kanjiFlipAllDone, setKanjiFlipAllDone] = useState(false);
    // Restore UI state from cache if same lesson (same level+day), else start fresh
    const sameLesson = _lessonDataCache.level === (searchParams.get('level') || 'N5') &&
        _lessonDataCache.day === parseInt(searchParams.get('day') || '1');
    const [currentIndex, setCurrentIndex] = useState(() => sameLesson ? _lessonDataCache.currentIndex : 0);
    const [viewedSet, setViewedSet] = useState(() => sameLesson ? _lessonDataCache.viewedSet : new Set([0]));
    const [isCompleted, setIsCompleted] = useState(() => sameLesson ? _lessonDataCache.isCompleted : false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [srsAddedSet, setSrsAddedSet] = useState(new Set());
    const [srsDataMap, setSrsDataMap] = useState(new Map());
    const [toastMessage, setToastMessage] = useState(null);
    const [showSrsConfirm, setShowSrsConfirm] = useState(false); // SRS confirmation modal
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };
    // User Profile, Dark Mode, Search and Notifications
    const [profile, setProfile] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    // Writer ref
    const writerRef = useRef(null);
    const writerContainerRef = useRef(null);
    const userId = getAuth().currentUser?.uid;
    useEffect(() => {
        if (!userId) return;
        const loadProfile = async () => {
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
                const snap = await getDoc(profileRef);
                if (snap.exists()) {
                    setProfile(snap.data());
                }
            } catch (e) {
                console.error('Error loading profile:', e);
            }
        };
        loadProfile();
    }, [userId]);
    useEffect(() => {
        if (profile) {
            const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
            const isLockedLevel = ['N4', 'N3', 'N2', 'N1'].includes(level) && !userIsAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');
            if (isLockedLevel) {
                navigate(ROUTES.KANJI_STUDY);
            }
        }
    }, [profile, level, navigate]);
    useEffect(() => {
        if (!userId) return;
        const loadSrs = async () => {
            try {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
                const map = new Map();
                const ids = [];
                srsSnap.docs.forEach(doc => {
                    map.set(doc.id, doc.data());
                    ids.push(doc.id);
                });
                setSrsDataMap(map);
                setSrsAddedSet(new Set(ids));
            } catch (e) {
                console.error('Error loading kanjiSRS:', e);
            }
        };
        loadSrs();
    }, [userId]);
    // Load data — use getDocsFromServer to always get fresh data, bypassing stale IndexedDB cache
    // Skip fetch entirely when module cache already has data (e.g. back-navigation from detail view)
    useEffect(() => {
        if (_lessonDataCache.kanjiList) {
            // Cache hit: data already loaded, nothing to do
            return;
        }
        const load = async () => {
            try {
                const [kanjiSnap, vocabSnap] = await Promise.all([
                    getDocs(collection(db, 'kanji')),
                    getDocs(collection(db, 'kanjiVocab'))
                ]);
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const vocabData = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Populate module-level cache so back-navigation is instant
                _lessonDataCache.kanjiList = kanjiData;
                _lessonDataCache.vocabList = vocabData;
                setKanjiList(kanjiData);
                setVocabList(vocabData);
                // ── INLINE PREFETCH ────────────────────────────────────────────────
                // Kick off background prefetch immediately after data arrives
                // so caches (HanziWriter SVGs + Jotoba pitch) are warm before the
                // user ever taps "Xem chi tiết".
                const level_ = new URLSearchParams(window.location.search).get('level') || 'N5';
                const day_ = parseInt(new URLSearchParams(window.location.search).get('day') || '1');
                const filtered = kanjiData.filter(k => k.level === level_);
                // Use already-imported synchronous getJotobaKanjiData — sort cannot be async
                filtered.sort((a, b) => {
                    const jA = getJotobaKanjiData(a.character);
                    const jB = getJotobaKanjiData(b.character);
                    const sA = jA?.stroke_count || 999; const sB = jB?.stroke_count || 999;
                    if (sA !== sB) return sA - sB;
                    return (jA?.frequency || 9999) - (jB?.frequency || 9999);
                });
                const start = (day_ - 1) * 10;
                const todayK = filtered.slice(start, start + 10);
                const todayChars = todayK.map(k => k.character);
                const todayV = vocabData.filter(v => v.word && todayChars.some(c => v.word.includes(c)));
                // Fire-and-forget background prefetch — don't block UI
                (async () => {
                    // 1. Mazii-style SVG data for the 10 kanji
                    for (const k of todayK) {
                        try { await fetchKanjiSvg(k.character); } catch (_) { }
                    }
                    // 2. Jotoba pitch/audio cache for each vocab word
                    for (const v of todayV) {
                        try { await fetchJotobaWordData(v.word); } catch (_) { }
                    }
                })();
                // ── END PREFETCH ───────────────────────────────────────────────────
            } catch (e) {
                console.error('Error loading data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);
    // Keep module cache in sync with UI state so back-navigation restores correctly
    useEffect(() => {
        _lessonDataCache.currentIndex = currentIndex;
        _lessonDataCache.viewedSet = viewedSet;
        _lessonDataCache.isCompleted = isCompleted;
        _lessonDataCache.level = level;
        _lessonDataCache.day = day;
    }, [currentIndex, viewedSet, isCompleted, level, day]);
    // Reset when day/level changes (new lesson)
    useEffect(() => {
        if (sameLesson) return; // skip reset if restoring from cache
        setCurrentIndex(0);
        setViewedSet(new Set([0]));
        setIsCompleted(false);
        setShowCelebration(false);
        setActiveMode('flashcard');
        setFlashcardType('kanji');
        setTestMode(null);
    }, [day, level]);
    // Today's 10 kanji — MUST use same sorting as KanjiStudyScreen
    const todayKanji = useMemo(() => {
        const filtered = kanjiList.filter(k => k.level === level);
        // Sort by stroke count (fewer = easier), then frequency (lower = more common)
        filtered.sort((a, b) => {
            const jA = getJotobaKanjiData(a.character);
            const jB = getJotobaKanjiData(b.character);
            const strokeA = jA?.stroke_count || parseInt(a.strokeCount) || 999;
            const strokeB = jB?.stroke_count || parseInt(b.strokeCount) || 999;
            if (strokeA !== strokeB) return strokeA - strokeB;
            const freqA = jA?.frequency || 9999;
            const freqB = jB?.frequency || 9999;
            return freqA - freqB;
        });
        const start = (day - 1) * 10;
        return filtered.slice(start, start + 10);
    }, [kanjiList, level, day]);
    // Vocab for today's kanji
    const todayVocab = useMemo(() => {
        const chars = todayKanji.map(k => k.character);
        return vocabList.filter(v => {
            if (!v.word) return false;
            return chars.some(c => v.word.includes(c));
        });
    }, [todayKanji, vocabList]);
    // (Prefetch is now handled inline inside the load() above)
    const currentKanji = todayKanji[currentIndex] || null;
    // Vocab for current kanji
    const currentVocab = useMemo(() => {
        if (!currentKanji) return [];
        return vocabList.filter(v => v.word?.includes(currentKanji.character));
    }, [currentKanji, vocabList]);
    // HanziWriter stroke animation
    useEffect(() => {
        if (!currentKanji || !writerContainerRef.current || activeMode !== 'flashcard' || flashcardType !== 'kanji') return;
        let cancelled = false;
        let animTimer = null;
        // Cancel previous writer animation
        if (writerRef.current) {
            try { writerRef.current.cancelQuiz?.(); } catch (_) { }
            try { writerRef.current.hideCharacter?.(); } catch (_) { }
            writerRef.current = null;
        }
        writerContainerRef.current.innerHTML = '';
        const showFallback = () => {
            if (!cancelled && writerContainerRef.current) {
                writerContainerRef.current.innerHTML = `<span class="fallback-char" style="font-size:120px;color:#0891b2;font-family:'BIZ UDPMincho', 'MS Mincho', 'ＭＳ 明朝', 'Hiragino Mincho ProN', 'Yu Mincho', serif;line-height:1">${currentKanji.character}</span>`;
            }
        };
        renderMaziiStyleKanji(writerContainerRef.current, currentKanji.character, {
            animDuration: 0.5,
            delayBetween: 0.2,
            strokeWidth: 5,
        }).then((ctrl) => {
            if (cancelled) {
                ctrl.stop();
            } else {
                writerRef.current = ctrl;
            }
        }).catch((err) => {
            console.error('Mazii style render error:', err);
            showFallback();
        });
        return () => {
            cancelled = true;
            if (writerRef.current) writerRef.current.stop();
            writerRef.current = null;
        };
    }, [currentKanji, activeMode, flashcardType, showKanjiFlipMode]);
    // Navigation
    const goTo = (idx) => {
        if (idx < 0 || idx >= todayKanji.length) return;
        setCurrentIndex(idx);
        setViewedSet(prev => new Set([...prev, idx]));
    };
    // Check all viewed
    useEffect(() => {
        if (todayKanji.length > 0 && viewedSet.size >= todayKanji.length) {
            setIsCompleted(true);
        }
    }, [viewedSet, todayKanji]);
    // Initialize SRS for studied kanji
    const initializeSRS = async (kanjiIds) => {
        if (!userId) return;
        const now = Date.now();
        try {
            for (const kanjiId of kanjiIds) {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, kanjiId), {
                    interval: 0,
                    ease: 2.5,
                    nextReview: now, // Due immediately for first review
                    lastReview: now,
                    reps: 0,
                    learningStep: null,
                    isLapsed: false,
                    lapseCount: 0,
                    prelapseInterval: null,
                }, { merge: true });
            }
        } catch (e) {
            console.error('Error initializing SRS:', e);
        }
    };
    // Handle the "Complete day" button click
    const handleCompleteClick = () => {
        // If user has manually added some (but not all) kanji, ask for confirmation
        const allKanjiIds = todayKanji.map(k => k.id).filter(Boolean);
        const addedCount = allKanjiIds.filter(id => srsAddedSet.has(id)).length;
        if (addedCount > 0 && addedCount < allKanjiIds.length) {
            // Some kanji were manually added, ask what to do
            setShowSrsConfirm(true);
        } else {
            // No manual additions or all already added -> add all
            handleComplete('all');
        }
    };
    // Celebration
    const handleComplete = async (srsMode = 'all') => {
        setShowSrsConfirm(false);
        setShowCelebration(true);
        // Determine which kanji to add to SRS
        const allKanjiIds = todayKanji.map(k => k.id).filter(Boolean);
        let kanjiIdsToAdd;
        if (srsMode === 'added-only') {
            // Only add the ones user already manually added
            kanjiIdsToAdd = allKanjiIds.filter(id => srsAddedSet.has(id));
        } else {
            // Add all kanji
            kanjiIdsToAdd = allKanjiIds;
        }
        if (kanjiIdsToAdd.length > 0) {
            await initializeSRS(kanjiIdsToAdd);
        }
        // Save day completion progress
        if (userId) {
            try {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiProgress`, `${level}_day${day}`), {
                    level,
                    day,
                    completedAt: Date.now(),
                    kanjiCount: todayKanji.length,
                    srsCount: kanjiIdsToAdd.length,
                }, { merge: true });
            } catch (e) { console.error('Error saving progress:', e); }
        }
        // Log study history activities
        logKanjiActivity(userId, {
            type: 'lesson',
            title: `Hoàn thành ${level}: Ngày ${day}`,
            details: `Học xong ${todayKanji.length} chữ Kanji`
        });
        if (kanjiIdsToAdd.length > 0) {
            logKanjiActivity(userId, {
                type: 'save',
                title: `Đã lưu ${kanjiIdsToAdd.length} chữ Kanji ${level}`,
                details: `Lưu vào danh sách ôn tập`
            });
        }
        // Play celebration sound
        playCompletionFanfare();
    };
    // Navigate to next day
    const goToNextDay = () => {
        setSearchParams({ level, day: String(day + 1) });
    };
    // TTS
    const speakJapanese = (text) => {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text.split('（')[0].split('(')[0].trim());
        utt.lang = 'ja-JP';
        utt.rate = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const jpVoice = voices.find(v => v.lang.startsWith('ja'));
        if (jpVoice) utt.voice = jpVoice;
        window.speechSynthesis.speak(utt);
    };
    if (loading) {
        return <LoadingIndicator text="Đang tải dữ liệu bài học..." />;
    }
    if (todayKanji.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-gray-400 text-lg">Không có kanji cho ngày {day} cấp {level}</p>
                <button onClick={() => navigate(ROUTES.KANJI_STUDY)} className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors">
                    Quay lại lộ trình
                </button>
            </div>
        );
    }
    // ==================== CELEBRATION OVERLAY ====================
    if (showCelebration) {
        return (
            <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center">
                <div className="text-center space-y-6 animate-bounce-in">
                    <div className="relative">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="absolute animate-confetti" style={{
                                left: `${Math.random() * 300 - 150}px`,
                                top: `${Math.random() * -200 - 50}px`,
                                width: '8px', height: '8px', borderRadius: '2px',
                                backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a855f7', '#ec4899'][i % 6],
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }} />
                        ))}
                        <Award className="w-24 h-24 text-yellow-400 mx-auto" />
                    </div>
                    <h1 className="text-4xl font-bold text-white">🎉 Chúc mừng!</h1>
                    <p className="text-xl text-cyan-400">Hoàn thành ngày {day} - {level}</p>
                    <p className="text-gray-400">Bạn đã học {todayKanji.length} chữ Kanji hôm nay!</p>
                    <p className="text-gray-500 text-sm">Các chữ Kanji đã được thêm vào hệ thống ôn tập SRS</p>
                    <div className="flex flex-col gap-3 justify-center mt-8 w-full max-w-sm mx-auto">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { setShowCelebration(false); setActiveMode('test'); }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-1.5 focus:outline-none hover:scale-105">
                                <PenTool className="w-5 h-5" /><span className="text-xs">Học nâng cao</span>
                            </button>
                            <button onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 flex flex-col items-center justify-center gap-1.5 focus:outline-none hover:scale-105">
                                <RefreshCw className="w-5 h-5" /><span className="text-xs">Ôn tập</span>
                            </button>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => navigate(ROUTES.KANJI_STUDY)} className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                                <ArrowLeft className="w-4 h-4" /> Lộ trình
                            </button>
                            <button onClick={goToNextDay}
                                className="flex-1 px-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 text-xs flex items-center justify-center gap-1">
                                Ngày {day + 1} <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <style>{`
                    @keyframes confetti { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(400px) rotate(720deg);opacity:0} }
                    .animate-confetti{animation:confetti 3s ease-in infinite}
                    @keyframes bounce-in{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.95)}100%{transform:scale(1);opacity:1}}
                    .animate-bounce-in{animation:bounce-in 0.6s ease-out}
                `}</style>
            </div>
        );
    }
    // ==================== TEST MODES ====================
    if (testMode) {
        return <TestModeView
            testMode={testMode}
            todayKanji={todayKanji}
            todayVocab={todayVocab}
            vocabList={vocabList}
            onBack={() => setTestMode(null)}
            level={level}
            speakJapanese={speakJapanese}
        />;
    }
    if (activeMode === 'test') {
        const MODES = [
            { id: 'hanviet', label: 'Hán Việt', icon: BookOpen, desc: 'Kiểm tra nghĩa Hán Việt', color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
            { id: 'vocab', label: 'Từ vựng', icon: Layers, desc: 'Trắc nghiệm từ vựng Kanji', color: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/20' },
            { id: 'typing', label: 'Âm đọc', icon: Keyboard, desc: 'Nhập âm Onyomi/Kunyomi', color: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/20' },
            { id: 'writing', label: 'Viết Kanji', icon: PenTool, desc: 'Luyện viết nét Hán tự', color: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20' },
        ];
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={() => setActiveMode('flashcard')}
                        className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 dark:text-white">Học nâng cao</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Chọn một phương thức kiểm tra để củng cố các chữ vừa học</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    {MODES.map(m => (
                        <button key={m.id} onClick={() => setTestMode(m.id)}
                            className={`p-6 rounded-3xl bg-gradient-to-br ${m.color} text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 flex items-center gap-5 group border border-white/10 ${m.shadow}`}>
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                                <m.icon className="w-8 h-8 drop-shadow-md" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold mb-1 tracking-wide">{m.label}</h3>
                                <p className="text-white/80 text-sm leading-snug">{m.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    // ==================== KANJI FLIP MODE HANDLERS ====================
    const startKanjiFlipMode = () => {
        const cards = [...todayKanji];
        setKanjiFlipCards(cards);
        setKanjiFlipIndex(0);
        setKanjiFlipFlipped(false);
        setKanjiFlipKnownSet(new Set());
        setKanjiFlipUnknownSet(new Set());
        setKanjiFlipComplete(false);
        setKanjiFlipRound(1);
        setKanjiFlipAllDone(false);
        setShowKanjiFlipMode(true);
    };
    const handleKanjiFlipCard = () => {
        setKanjiFlipFlipped(!kanjiFlipFlipped);
        playFlipSound();
    };
    const handleKanjiFlipKnown = () => {
        if (!kanjiFlipFlipped) return;
        const currentCard = kanjiFlipCards[kanjiFlipIndex];
        setKanjiFlipKnownSet(prev => new Set([...prev, currentCard.id]));
        setTimeout(() => {
            if (kanjiFlipIndex < kanjiFlipCards.length - 1) {
                setKanjiFlipIndex(kanjiFlipIndex + 1);
                setKanjiFlipFlipped(false);
            } else {
                checkKanjiFlipCompletion();
            }
        }, 300);
    };
    const handleKanjiFlipUnknown = () => {
        if (!kanjiFlipFlipped) return;
        const currentCard = kanjiFlipCards[kanjiFlipIndex];
        setKanjiFlipUnknownSet(prev => new Set([...prev, currentCard.id]));
        setTimeout(() => {
            if (kanjiFlipIndex < kanjiFlipCards.length - 1) {
                setKanjiFlipIndex(kanjiFlipIndex + 1);
                setKanjiFlipFlipped(false);
            } else {
                checkKanjiFlipCompletion();
            }
        }, 300);
    };
    const checkKanjiFlipCompletion = () => {
        setKanjiFlipComplete(true);
    };
    const continueKanjiFlipUnknown = () => {
        // Filter cards that were marked unknown
        const remainingCards = kanjiFlipCards.filter(k => kanjiFlipUnknownSet.has(k.id));
        if (remainingCards.length === 0) {
            setKanjiFlipAllDone(true);
            return;
        }
        setKanjiFlipCards(remainingCards);
        setKanjiFlipIndex(0);
        setKanjiFlipFlipped(false);
        setKanjiFlipKnownSet(new Set());
        setKanjiFlipUnknownSet(new Set());
        setKanjiFlipComplete(false);
        setKanjiFlipRound(prev => prev + 1);
    };
    const resetKanjiFlip = () => {
        const cards = [...todayKanji];
        setKanjiFlipCards(cards);
        setKanjiFlipIndex(0);
        setKanjiFlipFlipped(false);
        setKanjiFlipKnownSet(new Set());
        setKanjiFlipUnknownSet(new Set());
        setKanjiFlipComplete(false);
        setKanjiFlipRound(1);
        setKanjiFlipAllDone(false);
    };
    // Count of remaining unknown kanji from last flip session
    const kanjiFlipUnknownCount = kanjiFlipUnknownSet.size;
    // ==================== KANJI FLIP MODE (INLINE) ====================
    if (showKanjiFlipMode) {
        const flipCard = kanjiFlipCards[kanjiFlipIndex];
        const flipProgress = kanjiFlipCards.length > 0 ? Math.round(((kanjiFlipIndex) / kanjiFlipCards.length) * 100) : 100;
        // Completion screen within flip mode
        if (kanjiFlipComplete || kanjiFlipAllDone) {
            const unknownCount = kanjiFlipUnknownSet.size;
            const knownCount = kanjiFlipKnownSet.size;
            const allDone = unknownCount === 0 || kanjiFlipAllDone;
            return (
                <div className="relative w-full h-full flex flex-col justify-center">
                    <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3">
                        {/* Back button */}
                        <div className="w-full flex justify-start mb-1">
                            <button onClick={() => setShowKanjiFlipMode(false)}
                                className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                                <ArrowLeft className="w-5 h-5" />
                                <span className="text-sm font-medium">Trở lại</span>
                            </button>
                        </div>
                        {/* Completion card */}
                        <div className="w-full rounded-2xl p-6 space-y-5 text-center">
                            {allDone ? (
                                <>
                                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                                        <Award className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">🎉 Xuất sắc!</h2>
                                    <p className="text-gray-400 text-sm">Bạn đã thuộc hết {todayKanji.length} chữ Kanji!</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                        <RefreshCw className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">Hoàn thành vòng {kanjiFlipRound}!</h2>
                                    <p className="text-gray-400 text-sm">Còn {unknownCount} thẻ chưa thuộc</p>
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                                <div className="p-3 bg-emerald-900/30 rounded-xl border border-emerald-700">
                                    <div className="text-2xl font-bold text-emerald-400">{knownCount}</div>
                                    <div className="text-xs text-emerald-400/70">Đã thuộc</div>
                                </div>
                                <div className="p-3 bg-red-900/30 rounded-xl border border-red-700">
                                    <div className="text-2xl font-bold text-red-400">{unknownCount}</div>
                                    <div className="text-xs text-red-400/70">Chưa thuộc</div>
                                </div>
                            </div>
                            <div className="space-y-2 max-w-sm mx-auto">
                                {!allDone && unknownCount > 0 && (
                                    <button onClick={continueKanjiFlipUnknown}
                                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        Lật tiếp {unknownCount} thẻ chưa thuộc
                                    </button>
                                )}
                                {allDone && (
                                    <button onClick={resetKanjiFlip}
                                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                                        <RotateCcw className="w-4 h-4" />
                                        Đặt lại thẻ
                                    </button>
                                )}
                                <button onClick={() => setShowKanjiFlipMode(false)}
                                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-xl font-bold text-sm transition-all border border-slate-600">
                                    Trở lại
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (!flipCard) {
            setShowKanjiFlipMode(false);
            return null;
        }
        return (
            <div className="relative w-full h-full flex flex-col justify-center">
                <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3">
                    {/* Back button */}
                    <div className="w-full flex justify-start mb-1">
                        <button onClick={() => setShowKanjiFlipMode(false)}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Trở lại</span>
                        </button>
                    </div>
                    {/* Main flashcard container */}
                    <div className="w-full rounded-2xl p-4 flex flex-col gap-3">
                        {/* Header: Round + Counter + Progress */}
                        <div className="flex items-center justify-between flex-shrink-0">
                            <span className="px-2.5 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">Vòng {kanjiFlipRound}</span>
                            <span className="text-white font-bold text-sm">{kanjiFlipIndex + 1}/{kanjiFlipCards.length}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 flex-shrink-0">
                            <span className="text-emerald-400">{kanjiFlipKnownSet.size} thuộc</span>
                            <span className="text-red-400">{kanjiFlipUnknownSet.size} chưa thuộc</span>
                        </div>
                        {/* Flip card - contained with explicit height */}
                        <div className="w-full relative min-h-[380px]" style={{ perspective: '1000px' }}>
                            <div
                                className={`w-full h-full absolute inset-0 cursor-pointer transition-transform duration-500 ${kanjiFlipFlipped ? 'rotate-y-180' : ''}`}
                                onClick={handleKanjiFlipCard}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front: Kanji character */}
                                <div className="absolute inset-0 w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-inner p-6 flex flex-col items-center justify-center w-full h-full border border-gray-200 dark:border-slate-700">
                                        <div className="text-[120px] leading-none text-indigo-500 dark:text-cyan-400 font-japanese font-bold" style={{ fontFamily: "'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif" }}>
                                            {flipCard.character}
                                        </div>
                                        <div className="mt-6 text-gray-500 dark:text-gray-400 text-sm">Nhấn để lật</div>
                                    </div>
                                </div>
                                {/* Back: Hán Việt + Mnemonic + Image */}
                                <div className="absolute inset-0 w-full h-full rotate-y-180" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-inner p-5 flex flex-col items-center justify-center w-full h-full border border-emerald-500/30 overflow-y-auto text-center">
                                        {flipCard.imageBase64 && (
                                            <img src={flipCard.imageBase64} alt={flipCard.character} className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-slate-700 mb-3 flex-shrink-0" />
                                        )}
                                        <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{flipCard.sinoViet || flipCard.meaning || ''}</div>
                                        {flipCard.meaning && (
                                            <div className="text-lg text-gray-700 dark:text-gray-300 mb-3">{flipCard.meaning}</div>
                                        )}
                                        {flipCard.mnemonic && (
                                            <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-600 max-w-md w-full mx-auto text-left">
                                                <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                                                    <Sparkle className="w-3.5 h-3.5" /> CÁCH NHỚ
                                                </div>
                                                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-center">{flipCard.mnemonic}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Action buttons - positioned below the card with z-index */}
                        <div className="flex items-center justify-center gap-3 relative z-10 flex-shrink-0">
                            <button onClick={handleKanjiFlipUnknown} disabled={!kanjiFlipFlipped}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${!kanjiFlipFlipped
                                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-slate-700'
                                    : 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/60 border border-red-200 dark:border-red-700 hover:scale-[1.02] shadow-md'}`}>
                                <X className="w-4 h-4" /> Chưa thuộc
                            </button>
                            <button onClick={handleKanjiFlipKnown} disabled={!kanjiFlipFlipped}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${!kanjiFlipFlipped
                                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-slate-700'
                                    : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 border border-emerald-200 dark:border-emerald-700 hover:scale-[1.02] shadow-md'}`}>
                                <Check className="w-4 h-4" /> Đã thuộc
                            </button>
                            <button onClick={resetKanjiFlip}
                                className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300 transition-all border border-gray-200 dark:border-slate-700" title="Đặt lại">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Keyboard shortcuts hint */}
                        <p className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1 flex-shrink-0">
                            Space: Lật | ←: Chưa thuộc | →: Đã thuộc | Ctrl+Z: Hoàn tác
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`${ROUTES.KANJI_LIST}?search=${encodeURIComponent(searchTerm.trim())}`);
        }
    };
    const toggleDarkMode = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        localStorage.setItem('darkMode', String(nextMode));
        if (nextMode) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
    };
    // ==================== MAIN RENDER ====================
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Top Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700/50 pb-5">
                {/* Breadcrumbs */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-400 text-[10px] font-bold tracking-wider uppercase">
                        <button onClick={() => navigate(ROUTES.KANJI_STUDY)} className="hover:text-indigo-500 transition-colors">
                            Lộ trình {level}
                        </button>
                        <span>/</span>
                        <span>Ngày {day}</span>
                        <span>/</span>
                        <span className="text-gray-600 dark:text-gray-200">Chữ Kanji thứ {(day - 1) * 10 + currentIndex + 1}</span>
                    </div>
                </div>
            </div>
            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500 font-bold">
                    <span>Tiến độ bài học</span>
                    <span>{currentIndex + 1} / {todayKanji.length} chữ Kanji</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / todayKanji.length) * 100}%` }} />
                </div>
            </div>
            {/* Flip Flashcard Button & Kanji navigation indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button onClick={startKanjiFlipMode}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-[1.02] shadow-sm">
                    <Layers className="w-4 h-4 text-purple-500" />
                    {kanjiFlipAllDone ? 'Đặt lại thẻ' : kanjiFlipUnknownCount > 0 ? `Lật thẻ (${kanjiFlipUnknownCount} chưa thuộc)` : '🃏 Lật thẻ ghi nhớ'}
                </button>
                <div className="flex justify-center gap-1.5 py-1">
                    {todayKanji.map((k, i) => (
                        <button
                            key={k.id || i}
                            onClick={() => goTo(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex
                                    ? 'w-8 bg-indigo-500 dark:bg-cyan-400 shadow-sm shadow-indigo-500/20'
                                    : viewedSet.has(i)
                                        ? 'w-3 bg-indigo-300 dark:bg-cyan-600/50'
                                        : 'w-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300'
                                }`}
                            title={k.character}
                        />
                    ))}
                </div>
            </div>
            {/* Kanji Flashcard content - always show kanji flashcard */}
            <KanjiFlashcard
                kanji={currentKanji}
                vocab={currentVocab}
                writerContainerRef={writerContainerRef}
                writerRef={writerRef}
                speakJapanese={speakJapanese}
                navigate={navigate}
                userId={userId}
                srsAddedSet={srsAddedSet}
                setSrsAddedSet={setSrsAddedSet}
                srsDataMap={srsDataMap}
                showToast={showToast}
                kanjiList={kanjiList}
                vocabList={vocabList}
                currentIndex={currentIndex}
                totalKanjiCount={todayKanji.length}
                onPrev={() => goTo(currentIndex - 1)}
                onNext={() => goTo(currentIndex + 1)}
                onComplete={handleCompleteClick}
                isLastKanji={currentIndex === todayKanji.length - 1}
                level={level}
                day={day}
            />
            {/* Completion button */}
            {isCompleted && (
                <div className="text-center pt-2">
                    <button onClick={handleCompleteClick}
                        className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30 animate-pulse">
                        🎉 Hoàn thành ngày {day}
                    </button>
                </div>
            )}
            {/* SRS Confirmation Modal */}
            {showSrsConfirm && (() => {
                const allKanjiIds = todayKanji.map(k => k.id).filter(Boolean);
                const addedCount = allKanjiIds.filter(id => srsAddedSet.has(id)).length;
                const notAddedCount = allKanjiIds.length - addedCount;
                const addedKanjiChars = todayKanji.filter(k => srsAddedSet.has(k.id)).map(k => k.character);
                const notAddedKanjiChars = todayKanji.filter(k => k.id && !srsAddedSet.has(k.id)).map(k => k.character);
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl animate-bounce-in">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Thêm Kanji vào ôn tập SRS</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Bạn đã thêm <span className="text-emerald-500 font-bold">{addedCount}/{allKanjiIds.length}</span> chữ Kanji vào danh sách ôn tập.
                            </p>
                            {/* Show which kanji were added */}
                            <div className="mb-3">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Đã thêm:</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {addedKanjiChars.map(c => (
                                        <span key={c} className="w-9 h-9 flex items-center justify-center bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 rounded-lg text-lg font-bold font-japanese">{c}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-5">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Chưa thêm:</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {notAddedKanjiChars.map(c => (
                                        <span key={c} className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 rounded-lg text-lg font-bold font-japanese">{c}</span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">Bạn muốn thêm những Kanji nào vào hệ thống ôn tập?</p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleComplete('all')}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Thêm tất cả {allKanjiIds.length} chữ Kanji
                                </button>
                                <button
                                    onClick={() => handleComplete('added-only')}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all border border-gray-200 dark:border-slate-600 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Chỉ thêm {addedCount} chữ đã chọn
                                </button>
                                <button
                                    onClick={() => setShowSrsConfirm(false)}
                                    className="w-full px-4 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs transition-colors"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                    <div className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                        <Check className="w-4 h-4" /> {toastMessage}
                    </div>
                </div>
            )}
        </div>
    );
};
// ==================== KANJI FLASHCARD ====================
const KanjiFlashcard = ({
    kanji,
    vocab,
    writerContainerRef,
    writerRef,
    speakJapanese,
    navigate,
    userId,
    srsAddedSet,
    setSrsAddedSet,
    srsDataMap,
    showToast,
    kanjiList,
    vocabList,
    currentIndex,
    totalKanjiCount,
    onPrev,
    onNext,
    onComplete,
    isLastKanji,
    level,
    day
}) => {
    const isBookmarked = kanji?.id && srsAddedSet.has(kanji.id);
    const handleBookmarkToggle = async () => {
        if (!kanji?.id || !userId) return;
        if (isBookmarked) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, kanji.id));
                setSrsAddedSet(prev => {
                    const n = new Set(prev);
                    n.delete(kanji.id);
                    return n;
                });
                showToast(`Đã xóa ${kanji.character} khỏi danh sách ôn tập`);
            } catch (e) {
                console.error('Error removing from SRS:', e);
            }
        } else {
            try {
                const now = Date.now();
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, kanji.id), {
                    interval: 0, ease: 2.5, nextReview: now, lastReview: now, reps: 0,
                    learningStep: null, isLapsed: false, lapseCount: 0, prelapseInterval: null,
                }, { merge: true });
                setSrsAddedSet(prev => new Set([...prev, kanji.id]));
                showToast(`Đã thêm ${kanji.character} vào danh sách ôn tập`);
                logKanjiActivity(userId, {
                    type: 'save',
                    title: `Đã lưu Kanji ${kanji.character}`,
                    details: `Lưu từ mới vào danh sách ôn tập`
                });
            } catch (e) {
                console.error('Error adding to SRS:', e);
            }
        }
    };
    if (!kanji) return null;
    const jotobaData = getJotobaKanjiData(kanji.character);
    const isHighFreq = (jotobaData?.frequency && jotobaData.frequency <= 1000) || (kanji.frequency && parseInt(kanji.frequency) <= 1000);
    const parseReadings = (str) => {
        if (!str) return [];
        if (Array.isArray(str)) {
            return str.map(s => typeof s === 'string' ? s.trim() : '').filter(Boolean);
        }
        if (typeof str !== 'string') {
            return [];
        }
        return str.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
    };
    const onyomiList = parseReadings(kanji.onyomi || jotobaData?.onyomi);
    const kunyomiList = parseReadings(kanji.kunyomi || jotobaData?.kunyomi);
    const srsCard = srsDataMap ? srsDataMap.get(kanji.id) : null;
    const seenCount = srsCard ? (srsCard.reps || 1) : isBookmarked ? 1 : 0;
    const srsIntervalText = srsCard
        ? (srsCard.interval === 0 ? 'Sẵn sàng' : `${srsCard.interval} ngày`)
        : isBookmarked ? 'Sẵn sàng' : 'Chưa bắt đầu';
    const masteryPercent = srsCard
        ? Math.min(100, Math.round((srsCard.interval || 0) * 15 + 20))
        : isBookmarked ? 20 : 0;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            {/* Left Column: Drawing and Vocabulary */}
            <div className="contents lg:block lg:space-y-6">
                {/* Main/Drawing Card (white in light mode, slate in dark mode) */}
                <div className="order-1 lg:order-none bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm relative">
                    {/* Tags + Bookmark top row */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            {isHighFreq && (
                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                    Tần suất cao
                                </span>
                            )}
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                Cấp độ {level}
                            </span>
                        </div>
                        <button
                            onClick={handleBookmarkToggle}
                            className={`p-2 rounded-xl transition-all ${isBookmarked
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            title={isBookmarked ? "Xóa khỏi ôn tập" : "Thêm vào ôn tập"}
                        >
                            <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                    </div>
                    {/* Animated Stroke box */}
                    <div className="relative w-52 h-52 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700/50 flex items-center justify-center shadow-inner mx-auto mb-6 overflow-hidden">
                        {/* Plus pattern grid guidelines */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="w-full h-full border-b border-dashed border-gray-200 dark:border-slate-700/50 absolute top-1/2 left-0 -translate-y-1/2" />
                            <div className="w-full h-full border-r border-dashed border-gray-200 dark:border-slate-700/50 absolute left-1/2 top-0 -translate-x-1/2" />
                        </div>
                        {/* Target for HanziWriter */}
                        <div ref={writerContainerRef} className="z-10 flex items-center justify-center" />
                        {/* Replay stroke button */}
                        <button
                            onClick={() => writerRef.current?.replay?.()}
                            className="absolute bottom-3 right-3 z-20 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl shadow-sm transition-all"
                            title="Xem lại nét viết"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Onyomi & Kunyomi Badges */}
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-700/50 pt-4">
                        <div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">Âm On</span>
                            <div className="flex flex-wrap gap-1.5">
                                {onyomiList.length > 0 ? onyomiList.map((o, idx) => (
                                    <span key={`${o}-${idx}`} className="px-2.5 py-1 bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700/40 rounded-lg text-xs text-gray-700 dark:text-slate-200 font-medium font-japanese">{o}</span>
                                )) : <span className="text-xs text-gray-400">-</span>}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">Âm Kun</span>
                            <div className="flex flex-wrap gap-1.5">
                                {kunyomiList.length > 0 ? kunyomiList.map((k, idx) => (
                                    <span key={`${k}-${idx}`} className="px-2.5 py-1 bg-gray-50 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-700/40 rounded-lg text-xs text-gray-700 dark:text-slate-200 font-medium font-japanese">{k}</span>
                                )) : <span className="text-xs text-gray-400">-</span>}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Usage Examples Section */}
                <div className="order-5 lg:order-none bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-4">Ví dụ sử dụng</span>
                    <div className="space-y-4">
                        {vocab.length > 0 ? vocab.map((v, i) => (
                            <div key={v.id || i} className="flex justify-between items-start pb-4 border-b border-gray-50 dark:border-slate-700/30 last:border-0 last:pb-0">
                                <div className="space-y-1 pr-4 text-left">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg font-bold text-gray-900 dark:text-white font-japanese">{v.word}</span>
                                        {v.sinoViet && (
                                            <span className="px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold uppercase rounded">{v.sinoViet}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-slate-400 font-medium">{v.reading}</div>
                                    <div className="text-sm text-gray-600 dark:text-slate-300 font-medium mt-1">{v.meaning}</div>
                                </div>
                                <button
                                    onClick={() => speakJapanese(v.word)}
                                    className="p-2 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all shadow-sm flex-shrink-0"
                                    title="Nghe phát âm"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                Chưa có câu ví dụ cho chữ Kanji này
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Right Column: Widgets */}
            <div className="contents lg:block lg:space-y-6 lg:sticky lg:top-6 text-left">
                {/* Meaning Card */}
                <div className="order-2 lg:order-none bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-2">Ý nghĩa</span>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-cyan-400 tracking-wide">{kanji.sinoViet || ''}</h3>
                        <p className="text-base text-gray-700 dark:text-slate-200 font-bold leading-relaxed">{kanji.meaning || '-'}</p>
                    </div>
                </div>
                {/* Mnemonics Card */}
                <div className="order-3 lg:order-none bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-3">Mẹo ghi nhớ</span>
                    {kanji.mnemonic ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{kanji.mnemonic}</p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Không có mẹo ghi nhớ cho chữ này</p>
                    )}
                    {kanji.imageBase64 && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2 shadow-inner">
                            <img src={kanji.imageBase64} alt="illustration" className="w-full max-h-48 object-contain mx-auto" />
                        </div>
                    )}
                </div>
                {/* Learning Status Card */}
                <div className="order-4 lg:order-none bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 shadow-sm">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-3">Trạng thái học tập</span>
                    {/* Mastery bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 font-bold">
                            <span>Độ thành thục</span>
                            <span className="text-indigo-500 dark:text-cyan-400">{masteryPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                                style={{ width: `${masteryPercent}%` }}
                            />
                        </div>
                    </div>
                    {/* Status details */}
                    <div className="grid grid-cols-2 gap-4 mt-5 border-t border-gray-50 dark:border-slate-700/30 pt-4 text-xs">
                        <div>
                            <span className="text-gray-400 dark:text-slate-500 font-medium block">Số lần học</span>
                            <span className="text-gray-800 dark:text-slate-200 font-bold text-sm mt-0.5 block">{seenCount} lần</span>
                        </div>
                        <div>
                            <span className="text-gray-400 dark:text-slate-500 font-medium block">Chu kỳ ôn tập</span>
                            <span className="text-gray-800 dark:text-slate-200 font-bold text-sm mt-0.5 block">{srsIntervalText}</span>
                        </div>
                    </div>
                </div>
                {/* Bottom Action buttons */}
                <div className="order-6 lg:order-none flex gap-4 pt-2">
                    <button
                        onClick={onPrev}
                        disabled={currentIndex === 0}
                        className="flex-1 px-6 py-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> Trước
                    </button>
                    <button
                        onClick={isLastKanji ? onComplete : onNext}
                        className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        {isLastKanji ? 'Hoàn thành ngày' : 'Tiếp theo'} <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
// ==================== VOCAB FLASHCARD LIST ====================
const VocabFlashcardList = ({ vocab, speakJapanese }) => {
    const [flipped, setFlipped] = useState(new Set());
    const toggle = (i) => setFlipped(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500">Bấm vào thẻ để lật xem nghĩa</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {vocab.map((v, i) => (
                    <div key={v.id || i} onClick={() => toggle(i)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-cyan-600 rounded-xl p-4 cursor-pointer transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white font-japanese">{v.word}</span>
                                {flipped.has(i) && (
                                    <div className="mt-1 text-sm">
                                        <div className="text-orange-400 font-japanese">{v.reading}</div>
                                        <div className="text-gray-600 dark:text-gray-300">{v.meaning}</div>
                                        {v.sinoViet && <div className="text-gray-500 text-xs">{v.sinoViet}</div>}
                                    </div>
                                )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); speakJapanese(v.word); }}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <Volume2 className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {vocab.length === 0 && <p className="text-gray-500 text-center py-8">Chưa có từ vựng cho các kanji này</p>}
        </div>
    );
};
// ==================== TEST MODE VIEW (Styled like ReviewScreen) ====================
const TestModeView = ({ testMode, todayKanji, todayVocab, vocabList, onBack, level, speakJapanese }) => {
    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [typingInput, setTypingInput] = useState('');
    const [testDone, setTestDone] = useState(false);
    const [total, setTotal] = useState(0);
    const [failedCards, setFailedCards] = useState(new Set());
    // Writing test state
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [writingResult, setWritingResult] = useState(null);
    const [writingRecognized, setWritingRecognized] = useState(''); // what Google recognized
    const [writingChecking, setWritingChecking] = useState(false); // loading state
    const writingStrokesRef = useRef([]); // [[{xs,ys}], ...]
    const currentWritingStrokeRef = useRef({ xs: [], ys: [] });
    const inputRef = useRef(null);
    // Generate questions
    const questions = useMemo(() => {
        if (testMode === 'hanviet') {
            return todayKanji.filter(k => k.sinoViet).map(k => {
                const correct = k.sinoViet;
                const others = todayKanji.filter(o => o.character !== k.character && o.sinoViet).map(o => o.sinoViet);
                const wrong = shuffle(others).slice(0, 3);
                return { kanji: k.character, question: `Âm Hán Việt của "${k.character}" là gì?`, correct, options: shuffle([correct, ...wrong]), type: 'mc' };
            });
        }
        if (testMode === 'vocab') {
            return todayVocab.filter(v => v.meaning).slice(0, 10).map(v => {
                const correct = v.meaning;
                const others = vocabList.filter(o => o.id !== v.id && o.meaning).map(o => o.meaning);
                const wrong = shuffle(others).slice(0, 3);
                return { kanji: v.word, sub: v.reading, question: `"${v.word}" nghĩa là gì?`, correct, options: shuffle([correct, ...wrong]), type: 'mc' };
            });
        }
        if (testMode === 'typing') {
            return todayKanji.filter(k => k.sinoViet || k.onyomi).map(k => ({
                kanji: k.character, question: `Gõ âm Hán Việt hoặc cách đọc On của "${k.character}"`,
                answers: [k.sinoViet?.toLowerCase(), k.onyomi?.toLowerCase()].filter(Boolean), type: 'typing'
            }));
        }
        if (testMode === 'writing') {
            return todayKanji.filter(k => k.sinoViet).map(k => ({
                kanji: k.sinoViet, actualChar: k.character,
                question: `Viết chữ Kanji có âm Hán Việt "${k.sinoViet}"`,
                meaning: k.meaning || '', type: 'writing'
            }));
        }
        return [];
    }, [testMode, todayKanji, todayVocab, vocabList]);
    useEffect(() => { setTotal(questions.length); }, [questions]);
    // Auto-focus input for typing mode
    useEffect(() => {
        if (testMode === 'typing' && inputRef.current && !answered) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [qIndex, answered, testMode]);
    const currentQ = questions[qIndex];
    // Canvas drawing
    useEffect(() => {
        if (testMode !== 'writing' || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 250; canvas.height = 250;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 250, 250);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(125, 0); ctx.lineTo(125, 250); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 125); ctx.lineTo(250, 125); ctx.stroke();
    }, [testMode, qIndex]);
    const getCanvasCoords = (e) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };
    const startDraw = (e) => {
        if (!canvasRef.current || writingChecking) return;
        if (e.touches) e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getCanvasCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        currentWritingStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] };
    };
    const draw = (e) => {
        if (!isDrawing || !canvasRef.current) return;
        if (e.touches) e.preventDefault();
        const { x, y } = getCanvasCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y); ctx.stroke();
        currentWritingStrokeRef.current.xs.push(Math.round(x));
        currentWritingStrokeRef.current.ys.push(Math.round(y));
    };
    const endDraw = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentWritingStrokeRef.current.xs.length > 1) {
            writingStrokesRef.current = [...writingStrokesRef.current, { ...currentWritingStrokeRef.current }];
            currentWritingStrokeRef.current = { xs: [], ys: [] };
        }
    };
    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 250, 250);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(125, 0); ctx.lineTo(125, 250); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 125); ctx.lineTo(250, 125); ctx.stroke();
        writingStrokesRef.current = [];
        currentWritingStrokeRef.current = { xs: [], ys: [] };
        setWritingResult(null);
        setWritingRecognized('');
        setWritingChecking(false);
    };
    // Google Handwriting Recognition check
    const checkWriting = async () => {
        if (!canvasRef.current || writingStrokesRef.current.length === 0) {
            setWritingResult(0); setWritingRecognized(''); return;
        }
        setWritingChecking(true);
        const canvas = canvasRef.current;
        const W = canvas.width, H = canvas.height;
        const target = currentQ.actualChar;
        try {
            const ink = writingStrokesRef.current.map(s => [s.xs, s.ys]);
            const payload = JSON.stringify({
                options: 'enable_pre_space',
                requests: [{
                    writing_guide: { writing_area_width: W, writing_area_height: H },
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
                const candidates = (data[1][0][1] || []).filter(c => c.length === 1);
                const topChar = candidates[0] || '';
                setWritingRecognized(topChar);
                const rank = candidates.indexOf(target);
                let similarity = 0;
                if (rank === 0) similarity = 100;
                else if (rank === 1) similarity = 85;
                else if (rank === 2) similarity = 70;
                else if (rank >= 3 && rank <= 5) similarity = 55;
                else if (rank >= 6 && rank <= 9) similarity = 40;
                else similarity = 0; // not found in top candidates
                console.log(`Writing check: target=${target}, top=${topChar}, rank=${rank}, score=${similarity}%, candidates=${candidates.slice(0, 10).join('')}`);
                setWritingResult(similarity);
                // Pass threshold: 70%
                if (similarity >= 70) {
                    playCorrectSound();
                    setAnswered(true);
                    setScore(s => s + 1);
                } else {
                    // Don't setAnswered - let user retry
                    if (similarity === 0) {
                        playIncorrectSound();
                        setFailedCards(prev => new Set([...prev, qIndex]));
                    }
                }
            } else {
                setWritingResult(0); setWritingRecognized('');
            }
        } catch (err) {
            console.warn('Google handwriting API failed:', err.message);
            setWritingResult(null); setWritingRecognized('⚠');
        }
        setWritingChecking(false);
        // Show the correct kanji faintly on canvas
        const overlayCtx = canvas.getContext('2d');
        overlayCtx.globalAlpha = 0.15;
        overlayCtx.fillStyle = '#10b981';
        overlayCtx.font = `bold ${Math.floor(W * 0.72)}px 'BIZ UDPMincho', 'MS Mincho', 'Noto Sans JP', 'Yu Gothic', serif`;
        overlayCtx.textAlign = 'center';
        overlayCtx.textBaseline = 'middle';
        overlayCtx.fillText(target, W / 2, H / 2 + 5);
        overlayCtx.globalAlpha = 1.0;
    };
    const handleMCAnswer = (opt) => {
        if (answered) return;
        setSelectedAnswer(opt);
        setAnswered(true);
        const isCorrect = opt === currentQ.correct;
        if (isCorrect) {
            playCorrectSound();
            setScore(s => s + 1);
        } else {
            playIncorrectSound();
            setFailedCards(prev => new Set([...prev, qIndex]));
        }
        // Auto-advance after delay
        setTimeout(() => {
            nextQuestion();
        }, isCorrect ? 1200 : 2000);
    };
    const handleTypingSubmit = () => {
        if (answered) return;
        setAnswered(true);
        const input = typingInput.trim().toLowerCase();
        const isCorrect = currentQ.answers.some(a => a === input);
        if (isCorrect) {
            playCorrectSound();
            setScore(s => s + 1);
        } else {
            playIncorrectSound();
            setFailedCards(prev => new Set([...prev, qIndex]));
        }
        // Auto-advance after delay
        setTimeout(() => {
            nextQuestion();
        }, isCorrect ? 1500 : 2500);
    };
    const nextQuestion = () => {
        if (qIndex + 1 >= questions.length) { setTestDone(true); return; }
        setQIndex(q => q + 1);
        setAnswered(false);
        setSelectedAnswer(null);
        setTypingInput('');
        setWritingResult(null);
        setWritingRecognized('');
        setWritingChecking(false);
        writingStrokesRef.current = [];
        currentWritingStrokeRef.current = { xs: [], ys: [] };
    };
    // Keyboard shortcut: Enter to advance only in writing mode
    useEffect(() => {
        const handler = (e) => {
            if (answered && currentQ?.type === 'writing' && e.key === 'Enter') {
                e.preventDefault();
                nextQuestion();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [answered, qIndex, questions.length, currentQ]);
    if (testDone) {
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="w-[600px] max-w-[95vw] text-center space-y-6 flex flex-col items-center justify-center">
                    <Award className={`w-20 h-20 mx-auto ${pct >= 80 ? 'text-yellow-400' : pct >= 50 ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Kết quả kiểm tra</h2>
                    <div className="text-5xl font-bold text-cyan-400">{score}/{total}</div>
                    <div className="text-gray-400">{pct}% chính xác</div>
                    {failedCards.size > 0 && <div className="text-sm text-red-400">({failedCards.size} câu sai)</div>}
                    <div className="flex gap-3 justify-center">
                        <button onClick={onBack} className="px-6 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl font-bold transition-colors">Quay lại</button>
                        <button onClick={() => { setQIndex(0); setScore(0); setAnswered(false); setSelectedAnswer(null); setTypingInput(''); setTestDone(false); setFailedCards(new Set()); }}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors">Làm lại</button>
                    </div>
                </div>
            </div>
        );
    }
    if (!currentQ) return <div className="text-gray-400 text-center py-12">Không có câu hỏi</div>;
    const modeLabels = { hanviet: 'Kiểm tra âm Hán Việt', vocab: 'Kiểm tra từ vựng', typing: 'Chế độ khó', writing: 'Kiểm tra viết' };
    const modeColors = { hanviet: 'cyan', vocab: 'emerald', typing: 'orange', writing: 'purple' };
    const progress = Math.round(((qIndex + 1) / total) * 100);
    return (
        <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="w-[600px] max-w-[95vw] flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
                {/* Progress bar */}
                <div className="w-full space-y-1 flex-shrink-0">
                    <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <button onClick={onBack} className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-orange-500 text-sm">🔥</span>
                            <span className="text-gray-800 dark:text-white font-bold text-sm">{modeLabels[testMode]}</span>
                        </div>
                        <span>{qIndex + 1} / {total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                {/* Card area */}
                <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden border-2 border-indigo-500/50" style={{ minHeight: '280px' }}>
                    {/* Display: for writing mode show sinoViet hint only, for others show kanji */}
                    {currentQ.type === 'writing' ? (
                        <>
                            <div className="text-3xl font-bold text-emerald-400 mb-2">{currentQ.kanji}</div>
                            {currentQ.meaning && <div className="text-lg text-gray-400 mb-2">{currentQ.meaning}</div>}
                            <p className="text-sm text-gray-500">{currentQ.question}</p>
                        </>
                    ) : (
                        <>
                            <div className="text-7xl font-bold text-gray-900 dark:text-white font-japanese mb-3">{currentQ.kanji}</div>
                            {currentQ.sub && <div className="text-lg text-orange-400 font-japanese mb-2">({currentQ.sub})</div>}
                            <p className="text-sm text-gray-400">{currentQ.question}</p>
                        </>
                    )}
                </div>
                {/* MC options - styled like ReviewScreen */}
                {currentQ.type === 'mc' && (
                    <div className="w-full grid grid-cols-2 gap-2">
                        {currentQ.options.map((opt, i) => {
                            let cls = 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10';
                            if (answered) {
                                if (opt === currentQ.correct) cls = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10';
                                else if (opt === selectedAnswer) cls = 'bg-red-500/20 border-red-500 text-red-400';
                                else cls = 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-600';
                            }
                            return (
                                <button key={i} onClick={() => handleMCAnswer(opt)} disabled={answered}
                                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${cls}`}>
                                    <span className="text-gray-500 mr-2 text-xs">{i + 1}</span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                )}
                {/* Typing input - styled like ReviewScreen */}
                {currentQ.type === 'typing' && (
                    <div className="w-full space-y-3">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={typingInput}
                                onChange={e => setTypingInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !answered && handleTypingSubmit()}
                                placeholder="Gõ câu trả lời..."
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 focus:border-indigo-500 rounded-xl text-gray-900 dark:text-white text-center text-lg focus:outline-none transition-colors"
                                disabled={answered}
                            />
                        </div>
                        {!answered && (
                            <button onClick={handleTypingSubmit} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Kiểm tra
                            </button>
                        )}
                        {answered && (
                            <div className={`p-3 rounded-xl text-center font-bold border-2 ${currentQ.answers.some(a => a === typingInput.trim().toLowerCase())
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                                {currentQ.answers.some(a => a === typingInput.trim().toLowerCase())
                                    ? '✅ Chính xác!'
                                    : `❌ Sai! Đáp án: ${currentQ.answers.join(' / ')}`}
                            </div>
                        )}
                    </div>
                )}
                {/* Writing canvas */}
                {currentQ.type === 'writing' && (
                    <div className="w-full flex flex-col items-center gap-3">
                        <canvas ref={canvasRef} className="rounded-xl border-2 border-slate-600 cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                        <div className="flex gap-2">
                            <button onClick={clearCanvas} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1">
                                <RotateCcw className="w-3.5 h-3.5" /> Xoá
                            </button>
                            {!answered && (
                                <button onClick={checkWriting} disabled={writingChecking}
                                    className={`px-4 py-2 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${writingChecking ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                    {writingChecking ? (
                                        <React.Fragment>
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang chấm...
                                        </React.Fragment>
                                    ) : (
                                        <React.Fragment>
                                            <Check className="w-3.5 h-3.5" /> Kiểm tra
                                        </React.Fragment>
                                    )}
                                </button>
                            )}
                        </div>
                        {/* Recognition result */}
                        {writingResult !== null && (
                            <div className={`p-3 rounded-xl text-center font-bold w-full border-2 ${writingResult >= 70
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : writingResult >= 40
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                    : 'bg-red-500/20 border-red-500 text-red-400'
                                }`}>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-2xl font-japanese">{writingRecognized || '?'}</span>
                                    <div>
                                        <div>Độ chính xác: {writingResult}%</div>
                                        <div className="text-xs font-normal mt-0.5 opacity-80">
                                            {writingResult >= 70
                                                ? '✅ Chính xác! Bạn viết rất tốt'
                                                : writingResult >= 40
                                                    ? `⚠️ Gần đúng — hệ thống nhận dạng: "${writingRecognized}", đáp án: "${currentQ.actualChar}"`
                                                    : `❌ Sai — hệ thống nhận dạng: "${writingRecognized}", đáp án: "${currentQ.actualChar}"`
                                            }
                                        </div>
                                    </div>
                                </div>
                                {!answered && writingResult < 70 && (
                                    <div className="mt-2 text-xs font-normal opacity-70">Nhấn "Xoá" để vẽ lại, hoặc nhấn "Bỏ qua" để qua câu tiếp theo</div>
                                )}
                            </div>
                        )}
                        {/* Skip button when failed */}
                        {!answered && writingResult !== null && writingResult < 70 && (
                            <button onClick={() => { setAnswered(true); setFailedCards(prev => new Set([...prev, qIndex])); }}
                                className="w-full py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1">
                                Bỏ qua câu này →
                            </button>
                        )}
                    </div>
                )}
                {/* Feedback message */}
                {answered && currentQ.type === 'mc' && (
                    <div className={`w-full p-3 rounded-xl text-center text-sm font-medium ${selectedAnswer === currentQ.correct
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'}`}>
                        {selectedAnswer === currentQ.correct ? `✅ Chính xác!` : `❌ Đáp án đúng: ${currentQ.correct}`}
                    </div>
                )}
                {/* Next button - only for writing mode */}
                {answered && currentQ.type === 'writing' && (
                    <button onClick={nextQuestion}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        {qIndex + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo →'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};
// Shuffle helper
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
export default KanjiLessonScreen;
