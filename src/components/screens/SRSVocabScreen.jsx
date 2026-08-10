import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layers, ArrowRight, CheckCircle2, RotateCw, RotateCcw, BookOpen, Calendar, Play, Plus, Zap, Award, ChevronLeft, ChevronRight, Target, Volume2, Settings, Headphones, Edit2, Lightbulb, Clock, Cpu, FlaskConical } from 'lucide-react'
import { TopTabBar, SrsPrewarmLoader, SrsTestingPanelModal, PersonalMnemonicModal, SrsCountdownTimer } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import useMenuTransition from '../../hooks/useMenuTransition';
import { ROUTES } from '../../router';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { calculateAnkiSRS, parseNextReviewMs, isVocabCardDue, isLeechCard } from '../../utils/srs';
import SRSForecastChart from '../ui/SRSForecastChart';
import LeechManagerModal from '../ui/LeechManagerModal';
import { flashCorrect, launchFanfare } from '../../utils/celebrations';
import { playCompletionFanfare, playFlipSound } from '../../utils/soundEffects';
import { speakJapanese } from '../../utils/audio';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';

// Helper to shuffle array
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Helper to format intervals for display
const formatInterval = (minutes) => {
    if (minutes === 0) return 'ngay lập tức';
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
    if (minutes < 43200) {
        const days = minutes / 1440;
        return days < 2 ? `${Number(days.toFixed(1))} ngày` : `${Math.round(days)} ngày`;
    }
    const months = minutes / 43200;
    return months < 2 ? `${Number(months.toFixed(1))} tháng` : `${Math.round(months)} tháng`;
};

// Helper to preview intervals based on SRS state
const getPreviewIntervals = (card, sessionSrs = null) => {
    const srsState = sessionSrs ? {
        interval: sessionSrs.srsInterval !== undefined ? sessionSrs.srsInterval : (sessionSrs.interval !== undefined ? sessionSrs.interval : (card.srsInterval !== undefined ? card.srsInterval : (card.interval !== undefined ? card.interval : (card.currentInterval_back || 0)))),
        ease: sessionSrs.srsEase !== undefined ? sessionSrs.srsEase : (sessionSrs.ease !== undefined ? sessionSrs.ease : (card.srsEase !== undefined ? card.srsEase : (card.ease || 2.5))),
        learningStep: sessionSrs.srsLearningStep !== undefined ? sessionSrs.srsLearningStep : (sessionSrs.learningStep !== undefined ? sessionSrs.learningStep : (card.srsLearningStep !== undefined ? card.srsLearningStep : (card.learningStep !== undefined ? card.learningStep : null))),
        isLapsed: sessionSrs.srsIsLapsed !== undefined ? sessionSrs.srsIsLapsed : (sessionSrs.isLapsed !== undefined ? sessionSrs.isLapsed : (card.srsIsLapsed !== undefined ? card.srsIsLapsed : (card.isLapsed || false))),
        reps: sessionSrs.srsReps !== undefined ? sessionSrs.srsReps : (sessionSrs.reps !== undefined ? sessionSrs.reps : (card.srsReps !== undefined ? card.srsReps : (card.reps || 0))),
        lapseCount: sessionSrs.srsLapseCount !== undefined ? sessionSrs.srsLapseCount : (sessionSrs.lapseCount !== undefined ? sessionSrs.lapseCount : (card.srsLapseCount !== undefined ? card.srsLapseCount : (card.lapseCount || 0))),
        prelapseInterval: sessionSrs.srsPrelapseInterval !== undefined ? sessionSrs.srsPrelapseInterval : (sessionSrs.prelapseInterval !== undefined ? sessionSrs.prelapseInterval : (card.srsPrelapseInterval !== undefined ? card.srsPrelapseInterval : (card.prelapseInterval || null))),
        state: sessionSrs.srsState || sessionSrs.state || card.srsState || card.state || null,
        intervalIndex_back: typeof card.intervalIndex_back === 'number' ? card.intervalIndex_back : -1,
        masteryState: card.masteryState || 'not_learned',
        seenCount: typeof card.seenCount === 'number' ? card.seenCount : 0,
        lastReviewed: sessionSrs.lastReviewed || card.lastReviewed || null
    } : {
        interval: card.srsInterval !== undefined ? card.srsInterval : (card.interval !== undefined ? card.interval : (card.currentInterval_back || 0)),
        ease: card.srsEase !== undefined ? card.srsEase : (card.ease || 2.5),
        learningStep: card.srsLearningStep !== undefined ? card.srsLearningStep : (card.learningStep !== undefined ? card.learningStep : null),
        isLapsed: card.srsIsLapsed !== undefined ? card.srsIsLapsed : (card.isLapsed || false),
        reps: card.srsReps !== undefined ? card.srsReps : (card.reps || 0),
        lapseCount: card.srsLapseCount !== undefined ? card.srsLapseCount : (card.lapseCount || 0),
        prelapseInterval: card.srsPrelapseInterval !== undefined ? card.srsPrelapseInterval : (card.prelapseInterval || null),
        state: card.srsState || card.state || null,
        intervalIndex_back: typeof card.intervalIndex_back === 'number' ? card.intervalIndex_back : -1,
        masteryState: card.masteryState || 'not_learned',
        seenCount: typeof card.seenCount === 'number' ? card.seenCount : 0,
        lastReviewed: card.lastReviewed || null
    };

    const ratings = ['again', 'hard', 'good', 'easy'];
    const result = {};
    for (const r of ratings) {
        const preview = calculateAnkiSRS(srsState, r);
        if (preview.state === 'REVIEW') {
            const days = Math.round(preview.fuzzedInterval || preview.interval || 1);
            result[r] = days * 1440;
        } else {
            result[r] = preview.interval || 1;
        }
    }
    return result;
};

const SRSVocabScreen = ({
    displayName,
    userId,
    allCards = [],
    folders = [],
    cardFolders = {},
    setFlashcardCards,
    setNotification,
    playAudio,
    onSaveCardAudio,
    onUpdateVocabSrsRating,
    onRevertVocabSrsRating,
    onRefreshCards,
    dailyActivityLogs = [],
    onStudySet,
    onFlashcardSet,
    onMeaningSet,
    onDictationSet,
    awardXP,
    setIsReviewActive,
    isAdmin = false
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const fadeWholePage = useMenuTransition();
    const { t } = useLanguage();
    const [editingMnemonicCard, setEditingMnemonicCard] = useState(null);
    const { targetLanguage } = useTargetLanguage();

    const filteredCards = useMemo(() => {
        return (allCards || []).filter(c => {
            if (c.srsEnabled === false) return false;
            const lang = c.targetLanguage || 'ja';
            return lang === targetLanguage;
        });
    }, [allCards, targetLanguage]);

    const [dashboardTick, setDashboardTick] = useState(Date.now());
    const reviewModeTickRef = useRef(false);
    useEffect(() => {
        // Refresh dashboard stats every 30 seconds to prevent screen flickering/stuttering
        const intervalId = setInterval(() => {
            if (!reviewModeTickRef.current) {
                setDashboardTick(Date.now());
            }
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);
    const [vocabSetStartIndex, setVocabSetStartIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationDirection, setAnimationDirection] = useState('');

    const handlePrev = (e) => {
        e.stopPropagation();
        if (vocabSetStartIndex > 0) {
            setAnimationDirection('right');
            setIsAnimating(true);
            setVocabSetStartIndex(prev => Math.max(0, prev - 3));
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (vocabSetStartIndex + 3 < folderStats.length) {
            setAnimationDirection('left');
            setIsAnimating(true);
            setVocabSetStartIndex(prev => prev + 3);
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const [showMistakeModal, setShowMistakeModal] = useState(false);
    const [selectedMistakeMode, setSelectedMistakeMode] = useState('flashcard');
    const [showLeechManager, setShowLeechManager] = useState(false);
    const [showSrsTestModal, setShowSrsTestModal] = useState(false);

    const leechVocabCards = useMemo(() => filteredCards.filter(c => isLeechCard(c) || isLeechCard(c.srsData)), [filteredCards]);

    const handleStartLeechReview = (items) => {
        if (!items || items.length === 0) return;
        setReviewQueue(shuffleArray(items));
        setCurrentReviewIndex(0);
        setReviewHistory([]);
        setReviewMode(true);
    };

    const handleResetLeech = (item) => {
        if (!item) return;
        item.srsLapseCount = 0;
        item.lapseCount = 0;
        setDashboardTick(Date.now());
    };

    // Calculate streak from dailyActivityLogs
    const streak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;
        const activeLogs = dailyActivityLogs.filter(log => 
            (log.newWordsAdded || 0) > 0 || 
            (log.newKanjiAdded || 0) > 0 || 
            (log.reviewsDone || 0) > 0
        );
        if (activeLogs.length === 0) return 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const reversedLogs = [...activeLogs].reverse();
        const lastLog = reversedLogs[0];
        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) return 0;
        
        let currentStreak = 0;
        let checkDate = new Date();
        if (lastLog.id !== todayStr) checkDate.setDate(checkDate.getDate() - 1);
        for (const log of reversedLogs) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (log.id === checkDateStr) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        return currentStreak;
    }, [dailyActivityLogs]);

    const streakPct = useMemo(() => {
        if (streak === 0) return 0;
        return Math.min(100, Math.max(15, streak * 10));
    }, [streak]);

    // Load recently studied sets
    const [recentSets, setRecentSets] = useState([]);

    // Card Settings State (stored in localStorage with v2 version to apply new defaults)
    const [cardSettings, setCardSettings] = useState(() => {
        const defaultSettings = {
            front: {
                word: true,
                furigana: false,
                hanviet: false,
                example: false
            },
            back: {
                meaning: true,
                hanviet: true,
                synonym: false,
                example: false,
                word: false,
                furigana: false,
                reading: false,
                exampleFurigana: true,
                exampleMeaning: true,
                synonymFurigana: true,
                nuance: false
            },
            swapSides: false,
            autoPlayAudio: true,
            audioEnabled: true
        };
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...defaultSettings,
                    ...parsed,
                    front: { ...defaultSettings.front, ...parsed.front },
                    back: { ...defaultSettings.back, ...parsed.back },
                    autoPlayAudio: parsed.autoPlayAudio !== undefined ? parsed.autoPlayAudio : true,
                    audioEnabled: parsed.audioEnabled !== undefined ? parsed.audioEnabled : true
                };
            }
        } catch (e) { }
        return defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('quizki_flashcard_settings_v2', JSON.stringify(cardSettings));
    }, [cardSettings]);

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showNuancePopup, setShowNuancePopup] = useState(false);

    useEffect(() => {
        try {
            const recentKey = 'recently_studied_sets';
            const recentData = JSON.parse(localStorage.getItem(recentKey) || '[]');

            const mapped = recentData.map(item => {
                if (item.id === 'unfiled') {
                    const count = allCards.filter(c => !cardFolders[c.id]).length;
                    return {
                        id: 'unfiled',
                        name: 'Từ vựng lẻ',
                        count,
                        timestamp: item.timestamp
                    };
                }
                const folder = folders.find(f => f.id === item.id);
                if (folder) {
                    const count = allCards.filter(c => cardFolders[c.id] === item.id).length;
                    return {
                        id: item.id,
                        name: folder.name,
                        count,
                        timestamp: item.timestamp
                    };
                }
                return null;
            }).filter(Boolean);

            setRecentSets(mapped);
        } catch (e) {
            console.error('Error loading recently studied sets:', e);
        }
    }, [folders, allCards, cardFolders]);

    const formatTimeAgo = (timestamp) => {
        const diffMs = Date.now() - timestamp;
        if (diffMs < 60000) return 'Vừa xong';
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ngày trước`;
    };

    const mistakeCards = useMemo(() => {
        return filteredCards.filter(card => card.needsMistakeReview === true);
    }, [filteredCards]);

    // Local review queue state
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isPreparingSession, setIsPreparingSession] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [slideDirection, setSlideDirection] = useState('');
    const [reviewMode, setReviewModeState] = useState(false);
    const setReviewMode = (val) => {
        reviewModeTickRef.current = val;
        setReviewModeState(val);
    };
    const [reviewHistory, setReviewHistory] = useState([]);
    const sessionXpRef = useRef(0);
    const completedCardIds = useRef(new Set());
    const activeReviewCardIds = useRef(new Set());
    const sessionSrsData = useRef({});
    const pendingWriteIds = useRef(new Set());

    useEffect(() => {
        setShowNuancePopup(false);
    }, [currentReviewIndex, reviewMode]);

    // Preload adjacent cards' base64 images for seamless transitions
    useEffect(() => {
        if (!reviewQueue || reviewQueue.length === 0) return;
        const indicesToPreload = [currentReviewIndex - 1, currentReviewIndex + 1, currentReviewIndex + 2];
        indicesToPreload.forEach(idx => {
            if (idx >= 0 && idx < reviewQueue.length) {
                const card = reviewQueue[idx];
                if (card && card.imageBase64) {
                    const img = new Image();
                    img.src = card.imageBase64;
                    if (typeof img.decode === 'function') {
                        img.decode().catch(() => {});
                    }
                }
            }
        });
    }, [currentReviewIndex, reviewQueue]);

    // Safely determine if a card is due
    const isDue = (card) => {
        if (!card || card.srsEnabled === false) return false;
        // Merge with local session SRS data if available
        const localSrs = sessionSrsData.current[card.id];
        if (localSrs) {
            const nextReviewVal = localSrs.nextReview_back || localSrs.nextReview;
            const reviewTime = parseNextReviewMs(nextReviewVal);
            if (reviewTime === 0) return true;
            return reviewTime <= dashboardTick;
        }
        return isVocabCardDue(card, dashboardTick);
    };

    // Calculate comprehensive stats for each folder (including completed ones)
    const folderStats = useMemo(() => {
        const stats = {};

        // Initialize stats for all folders
        folders.forEach(f => {
            stats[f.id] = { id: f.id, name: f.name, newCards: [], dueCards: [], allCards: [], total: 0, masteredCount: 0, createdAt: f.createdAt };
        });

        // Unfiled folder
        stats['unfiled'] = { id: 'unfiled', name: 'Từ vựng lẻ', newCards: [], dueCards: [], allCards: [], total: 0, masteredCount: 0, createdAt: null };

        filteredCards.forEach(card => {
            const fId = cardFolders[card.id] || 'unfiled';
            if (!stats[fId]) {
                stats[fId] = { id: fId, name: 'Học phần ẩn', newCards: [], dueCards: [], allCards: [], total: 0, masteredCount: 0 };
            }
            stats[fId].total++;
            stats[fId].allCards.push(card);

            // Seen / Mastered calculation based on masteryState 'memorized'
            if (card.masteryState === 'memorized') {
                stats[fId].masteredCount++;
            }

            // Check if SRS Enabled & Due
            if (isDue(card)) {
                stats[fId].dueCards.push(card);
            }
            else if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined) {
                stats[fId].newCards.push(card);
            }
        });

        return Object.values(stats)
            .filter(f => f.dueCards.length > 0)
            .map(f => {
                const masteredPct = f.total > 0 ? Math.round((f.masteredCount / f.total) * 100) : 0;
                const cardsToReview = f.dueCards;

                // Nice default badges based on name
                let levelBadge = 'VOCAB';
                const nameLower = f.name.toLowerCase();
                if (nameLower.includes('n1')) levelBadge = 'N1 LEVEL';
                else if (nameLower.includes('n2')) levelBadge = 'N2 LEVEL';
                else if (nameLower.includes('n3')) levelBadge = 'N3 LEVEL';
                else if (nameLower.includes('n4')) levelBadge = 'N4 LEVEL';
                else if (nameLower.includes('n5')) levelBadge = 'N5 LEVEL';
                else if (nameLower.includes('giao tiếp') || nameLower.includes('daily')) levelBadge = 'COMMUNICATION';
                else if (nameLower.includes('kinh doanh') || nameLower.includes('business')) levelBadge = 'BUSINESS';

                return {
                    ...f,
                    levelBadge,
                    masteredPct,
                    cardsToReview,
                    hasAction: f.dueCards.length > 0
                };
            })
            .sort((a, b) => {
                // Ưu tiên hiển thị các học phần có từ vựng ôn tập (dueCards.length > 0)
                const hasDueA = a.dueCards.length > 0 ? 1 : 0;
                const hasDueB = b.dueCards.length > 0 ? 1 : 0;
                if (hasDueB !== hasDueA) {
                    return hasDueB - hasDueA;
                }

                // Sắp xếp theo thời gian tạo mới nhất trước đến cũ nhất
                const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
                const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
                if (timeB !== timeA) {
                    return timeB - timeA;
                }
                return b.total - a.total;
            });
    }, [allCards, folders, cardFolders]);

    useEffect(() => {
        if (vocabSetStartIndex >= folderStats.length) {
            const pageStart = Math.max(0, Math.floor((folderStats.length - 1) / 3) * 3);
            setVocabSetStartIndex(pageStart);
        }
    }, [folderStats.length, vocabSetStartIndex]);

    const savedSessionInfo = null;

    const nextDueVocabInfo = useMemo(() => {
        const now = Date.now();
        let earliest = Infinity;
        allCards.forEach(c => {
            if (c.srsEnabled !== false) {
                const localSrs = sessionSrsData.current[c.id];
                const nextReviewVal = localSrs ? localSrs.nextReview_back : c.nextReview_back;
                if (!nextReviewVal) return;

                const reviewTime = nextReviewVal instanceof Date
                    ? nextReviewVal.getTime()
                    : (nextReviewVal.seconds
                        ? nextReviewVal.seconds * 1000
                        : new Date(nextReviewVal).getTime());

                if (reviewTime > now && reviewTime < earliest) {
                    earliest = reviewTime;
                }
            }
        });
        return earliest === Infinity ? null : earliest;
    }, [allCards]);

    const countdownText = useMemo(() => {
        if (!nextDueVocabInfo) return null;
        const secondsLeft = Math.max(0, Math.ceil((nextDueVocabInfo - dashboardTick) / 1000));
        if (secondsLeft <= 0) return null;
        
        const pad = (n) => String(n).padStart(2, '0');
        if (secondsLeft < 60) return `00:00:${pad(secondsLeft)}`;
        
        const hours = Math.floor(secondsLeft / 3600);
        const mins = Math.floor((secondsLeft % 3600) / 60);
        const secs = secondsLeft % 60;
        return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }, [nextDueVocabInfo, dashboardTick]);

    const activeFolderIdRef = useRef('global');

    const globalStats = useMemo(() => {
        return folderStats.reduce((acc, curr) => ({
            new: acc.new + curr.newCards.length,
            due: acc.due + curr.dueCards.length,
        }), { new: 0, due: 0 });
    }, [folderStats]);

    const startFolderReview = (dueCards, folderId = 'global') => {
        if (dueCards.length === 0) return;
        activeFolderIdRef.current = folderId;
        sessionXpRef.current = 0;
        completedCardIds.current.clear();
        sessionSrsData.current = {};
        const uniqueDueCards = Array.from(
            new Map(dueCards.map(c => [String(c.id), c])).values()
        );
        activeReviewCardIds.current = new Set(uniqueDueCards.map(c => String(c.id)));
        setReviewQueue(shuffleArray(uniqueDueCards));
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewHistory([]);

        // Show calculating & prewarming screen before Card #1
        setIsPreparingSession(true);

        // Pre-warm WebKit AudioContext and SpeechSynthesis on initial user tap
        try {
            if (typeof window !== 'undefined') {
                if (window.speechSynthesis) window.speechSynthesis.getVoices();
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    const tempCtx = new AudioCtxClass();
                    if (tempCtx.state === 'suspended') tempCtx.resume().catch(() => {});
                }
            }
        } catch (_) {}

        // Transition seamlessly to Card #1 after pre-warming phase
        setTimeout(() => {
            setIsPreparingSession(false);
            setReviewMode(true);
            if (setIsReviewActive) {
                setIsReviewActive(true);
            }
        }, 400);
    };

    const handleAction = (folderId, actionType, cards) => {
        if (cards.length === 0) return;

        switch (actionType) {
            case 'new':
                // Navigate to the set detail page so user can activate SRS per card
                navigate(`/vocab/set/${folderId || 'unfiled'}`);
                break;
            case 'due':
                startFolderReview(cards, folderId || 'unfiled');
                break;
        }
    };

    // "Ôn tập" top banner button — launches review queue for due cards
    const handleResumeGlobal = () => {
        const allAvailable = folderStats.flatMap(f => f.dueCards);
        if (allAvailable.length > 0) {
            startFolderReview(allAvailable, 'global');
        } else {
            if (setNotification) {
                setNotification("Không có thẻ nào cần ôn tập ngắt quãng lúc này.");
            }
        }
    };

    const hasAutoStartedRef = useRef(false);
    const intervalCacheRef = useRef({});
    const isRatingProcessingRef = useRef(false);
    const lastRatedCardIdRef = useRef(null);
    const lastRatedTimeRef = useRef(0);

    // Auto start review session when navigated from Home Screen
    useEffect(() => {
        if (location.state?.autoStart && !hasAutoStartedRef.current && !reviewMode) {
            const dueCardsOnly = filteredCards.filter(c => isDue(c));
            if (dueCardsOnly.length > 0) {
                hasAutoStartedRef.current = true;
                startFolderReview(dueCardsOnly, 'global');
            } else {
                hasAutoStartedRef.current = true; // No due cards, stay on overview tab
            }
        }
    }, [location.state, filteredCards, reviewMode]);

    const [lastTick, setLastTick] = useState(Date.now());

    const getLearningCardsWaiting = () => {
        return Object.entries(sessionSrsData.current)
            .filter(([id, srs]) => {
                if (!activeReviewCardIds.current.has(id)) return false;
                
                const stateStr = (srs.state || srs.srsState || '').toUpperCase();
                if (stateStr === 'REVIEW') return false;
                if (completedCardIds.current.has(id)) return false;

                // Safely parse nextReview date and check if it is more than 12 hours in the future
                const nextReviewVal = srs.nextReview_back || srs.nextReview;
                if (nextReviewVal) {
                    const reviewTime = parseNextReviewMs(nextReviewVal);
                    if (reviewTime > 0 && reviewTime - Date.now() > 12 * 60 * 60 * 1000) {
                        return false;
                    }
                }

                return true;
            })
            .map(([id, srs]) => {
                const nextReviewVal = srs.nextReview_back || srs.nextReview;
                const reviewTime = parseNextReviewMs(nextReviewVal);
                return {
                    id,
                    nextReview: reviewTime === 0 ? Date.now() : reviewTime
                };
            });
    };



    useEffect(() => {
        if (!reviewMode) return;
        const intervalId = setInterval(() => {
            setLastTick(Date.now());
            
            const now = Date.now();
            const waiting = getLearningCardsWaiting();
            const dueNow = waiting.filter(w => w.nextReview <= now);
            if (dueNow.length > 0) {
                setReviewQueue(prevQueue => {
                    const nextQueue = [...prevQueue];
                    const allQueueIds = new Set(nextQueue.map(c => String(c.id)));
                    const cardsToInject = [];
                    dueNow.forEach(item => {
                        const itemIdStr = String(item.id);
                        if (!allQueueIds.has(itemIdStr) && !completedCardIds.current.has(itemIdStr)) {
                            const fullCard = allCards.find(c => String(c.id) === itemIdStr);
                            if (fullCard) {
                                const localSrs = sessionSrsData.current[item.id];
                                cardsToInject.push({
                                    ...fullCard,
                                    srsInterval: localSrs ? localSrs.srsInterval : fullCard.srsInterval,
                                    srsEase: localSrs ? localSrs.srsEase : fullCard.srsEase,
                                    srsLearningStep: localSrs ? localSrs.srsLearningStep : fullCard.srsLearningStep,
                                    srsIsLapsed: localSrs ? localSrs.srsIsLapsed : fullCard.srsIsLapsed,
                                    srsReps: localSrs ? localSrs.srsReps : fullCard.srsReps,
                                    srsLapseCount: localSrs ? localSrs.srsLapseCount : fullCard.srsLapseCount,
                                    srsPrelapseInterval: localSrs ? localSrs.srsPrelapseInterval : fullCard.srsPrelapseInterval,
                                    srsState: localSrs ? localSrs.srsState : fullCard.srsState,
                                    nextReview_back: localSrs ? (localSrs.nextReview_back instanceof Date ? localSrs.nextReview_back : new Date(localSrs.nextReview_back)) : fullCard.nextReview_back,
                                    lastReviewed: localSrs ? localSrs.lastReviewed : fullCard.lastReviewed
                                });
                            }
                        }
                    });
                    
                    if (cardsToInject.length > 0) {
                        const minSpacing = 3;
                        const insertIndex = Math.min(currentReviewIndex + minSpacing, nextQueue.length);
                        nextQueue.splice(insertIndex, 0, ...cardsToInject);
                        return nextQueue;
                    }
                    return prevQueue;
                });
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [reviewMode, currentReviewIndex, allCards]);

    // 60fps keep-alive ticker for Mobile Safari to prevent timer throttling on mobile browsers
    useEffect(() => {
        if (!reviewMode) return;
        let animId;
        const keepAlive = () => {
            animId = requestAnimationFrame(keepAlive);
        };
        animId = requestAnimationFrame(keepAlive);
        return () => cancelAnimationFrame(animId);
    }, [reviewMode]);

    const handleRating = (rating) => {
        console.time('⚡ SRS_RATING_VOCAB');
        const card = reviewQueue[currentReviewIndex];
        if (!card) return;

        const now = Date.now();
        // Guard against duplicate double-click / rapid requests on the same card during network lag
        if (isRatingProcessingRef.current) return;
        if (lastRatedCardIdRef.current === card.id && (now - lastRatedTimeRef.current < 400)) {
            return;
        }

        isRatingProcessingRef.current = true;
        lastRatedCardIdRef.current = card.id;
        lastRatedTimeRef.current = now;

        setTimeout(() => {
            isRatingProcessingRef.current = false;
        }, 350);

        // Save card's previous SRS fields to history stack for Undo
        const prevSrsFields = {
            srsInterval: card.srsInterval || 0,
            srsEase: card.srsEase || 2.5,
            srsLearningStep: card.srsLearningStep !== undefined ? card.srsLearningStep : null,
            srsIsLapsed: card.srsIsLapsed || false,
            srsReps: card.srsReps || 0,
            srsLapseCount: card.srsLapseCount || 0,
            srsPrelapseInterval: card.srsPrelapseInterval || null,
            srsState: card.srsState || null,
            intervalIndex_back: typeof card.intervalIndex_back === 'number' ? card.intervalIndex_back : -1,
            nextReview_back: card.nextReview_back || null,
            lastReviewed: card.lastReviewed || null,
            needsMistakeReview: card.needsMistakeReview || false,
            masteryState: card.masteryState || 'not_learned'
        };

        setReviewHistory(prev => [...prev, {
            cardIndex: currentReviewIndex,
            cardId: card.id,
            srsFields: prevSrsFields,
            isFlipped: isFlipped
        }]);

        // Calculate next SRS state locally
        const currentSrs = sessionSrsData.current[card.id] || {
            interval: card.srsInterval !== undefined ? card.srsInterval : (card.interval !== undefined ? card.interval : (card.currentInterval_back || 0)),
            ease: card.srsEase !== undefined ? card.srsEase : (card.ease || 2.5),
            learningStep: card.srsLearningStep !== undefined ? card.srsLearningStep : (card.learningStep !== undefined ? card.learningStep : null),
            isLapsed: card.srsIsLapsed !== undefined ? card.srsIsLapsed : (card.isLapsed || false),
            reps: card.srsReps !== undefined ? card.srsReps : (card.reps || 0),
            lapseCount: card.srsLapseCount !== undefined ? card.srsLapseCount : (card.lapseCount || 0),
            prelapseInterval: card.srsPrelapseInterval !== undefined ? card.srsPrelapseInterval : (card.prelapseInterval || null),
            state: card.srsState || card.state || null,
            intervalIndex_back: typeof card.intervalIndex_back === 'number' ? card.intervalIndex_back : -1,
            masteryState: card.masteryState || 'not_learned',
            seenCount: typeof card.seenCount === 'number' ? card.seenCount : 0,
            lastReviewed: card.lastReviewed || null
        };

        const result = calculateAnkiSRS(currentSrs, rating);
        const nowTime = Date.now();
        const nextReviewOffset = result.nextReviewOffsetMs !== undefined ? result.nextReviewOffsetMs : (result.interval * 60000);
        
        const newSrs = {
            ...currentSrs,
            srsInterval: result.interval,
            srsEase: result.ease,
            srsLearningStep: result.learningStep,
            srsIsLapsed: result.isLapsed,
            srsReps: result.reps,
            srsLapseCount: result.lapseCount,
            srsPrelapseInterval: result.prelapseInterval,
            srsState: result.state,
            nextReview_back: new Date(nowTime + nextReviewOffset),
            lastReviewed: nowTime,
            state: result.state,
            interval: result.interval,
            ease: result.ease,
            nextReview: nowTime + nextReviewOffset
        };

        sessionSrsData.current[card.id] = newSrs;
        if (intervalCacheRef.current) {
            delete intervalCacheRef.current[card.id];
        }

        // Call parent update vocab srs rating on Firestore asynchronously
        if (onUpdateVocabSrsRating) {
            pendingWriteIds.current.add(card.id);
            const xp = onUpdateVocabSrsRating(card.id, { ...newSrs, rating }, (success) => {
                pendingWriteIds.current.delete(card.id);
            });
            sessionXpRef.current += (xp || 0);
        }



        // 1. Determine if card graduated/completed in this session
        let updatedQueue = [...reviewQueue];
        if (result.state === 'REVIEW') {
            completedCardIds.current.add(card.id);
        }

        setReviewQueue(updatedQueue);

        if (currentReviewIndex + 1 < updatedQueue.length) {
            setIsAnimatingFlip(false);
            setIsFlipped(false);
            setCurrentReviewIndex(prev => prev + 1);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimatingFlip(true);
                });
            });
        } else {
            const waiting = getLearningCardsWaiting();
            if (waiting.length > 0) {
                // Show waiting screen (by advancing index to updatedQueue.length)
                setIsAnimatingFlip(false);
                setIsFlipped(false);
                setCurrentReviewIndex(updatedQueue.length);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsAnimatingFlip(true);
                    });
                });
            } else {
                try {
                    playCompletionFanfare();
                    launchFanfare();
                } catch (e) { }
                setIsAnimatingFlip(false);
                setIsFlipped(false);
                setCurrentReviewIndex(updatedQueue.length);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsAnimatingFlip(true);
                    });
                });
            }
        }
        console.timeEnd('⚡ SRS_RATING_VOCAB');
    };

    const saveSessionState = () => {};
    const handleResumeSavedSession = () => {};
    const handleDiscardSavedSession = () => {};

    const exitReview = (shouldAwardXp = true) => {
        if (typeof shouldAwardXp !== 'boolean') shouldAwardXp = true;
        if (shouldAwardXp && sessionXpRef.current > 0 && awardXP) {
            awardXP(sessionXpRef.current);
        }
        sessionXpRef.current = 0;

        let exitAttempts = 0;
        const checkPendingAndExit = () => {
            if (pendingWriteIds.current.size > 0 && exitAttempts < 5) {
                exitAttempts++;
                setTimeout(checkPendingAndExit, 100);
                return;
            }
            pendingWriteIds.current.clear();
            setReviewMode(false);
            setDashboardTick(Date.now());
            window.dispatchEvent(new Event('srs-updated'));
            if (onRefreshCards) {
                onRefreshCards();
            }
            if (setIsReviewActive) {
                setIsReviewActive(false);
            }
        };
        checkPendingAndExit();
    };

    const handleUndo = () => {
        if (reviewHistory.length === 0) return;
        const lastAction = reviewHistory[reviewHistory.length - 1];
        setReviewHistory(prev => prev.slice(0, -1));

        const { cardIndex, cardId, srsFields, isFlipped: wasFlipped, queue: savedQueue } = lastAction;

        if (savedQueue) {
            setReviewQueue(savedQueue);
        }
        completedCardIds.current.delete(cardId);

        // Revert sessionSrsData local cache
        if (srsFields) {
            sessionSrsData.current[cardId] = { ...srsFields };
        } else {
            delete sessionSrsData.current[cardId];
        }

        // 1. Revert local states immediately in current reviewQueue
        setReviewQueue(prevQueue => {
            const nextQueue = [...prevQueue];
            const idx = nextQueue.findIndex(c => c.id === cardId);
            if (idx !== -1) {
                nextQueue[idx] = {
                    ...nextQueue[idx],
                    ...srsFields
                };
            }
            return nextQueue;
        });

        // 2. Revert in App.jsx's setAllCards state immediately & Firestore doc in background
        if (onRevertVocabSrsRating) {
            const revertedXp = onRevertVocabSrsRating(cardId, srsFields, true);
            sessionXpRef.current -= (revertedXp || 0);
        }

        // Restore index and flipped state with slide animation
        setIsAnimatingFlip(false);
        setSlideDirection('right');
        setTimeout(() => {
            setCurrentReviewIndex(cardIndex);
            setIsFlipped(wasFlipped || false);
            setSlideDirection('left');
            setTimeout(() => {
                setSlideDirection('');
                setTimeout(() => {
                    setIsAnimatingFlip(true);
                }, 110);
            }, 20);
        }, 70);
    };

    // Keyboard controls for Flashcards review
    useEffect(() => {
        if (!reviewMode) return;
        const handler = (e) => {
            if (e.repeat) return;
            const activeTag = e.target ? e.target.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target?.isContentEditable) {
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                setIsFlipped(f => !f);
                playFlipSound();
            }
            if (e.key === '1') handleRating('again');
            if (e.key === '2') handleRating('hard');
            if (e.key === '3') handleRating('good');
            if (e.key === '4') handleRating('easy');
            if (e.key === 'Backspace' || e.key === 'z' || (e.key === 'z' && e.ctrlKey)) {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [reviewMode, currentReviewIndex, reviewQueue, reviewHistory]);

    const lastPlayedKeyRef = useRef('');

    // Auto-play audio ONLY when card is flipped to back
    useEffect(() => {
        if (reviewMode && reviewQueue.length > 0 && isFlipped && cardSettings.autoPlayAudio !== false && cardSettings.audioEnabled !== false) {
            const currentCard = reviewQueue[currentReviewIndex];
            if (currentCard) {
                const playKey = `${currentCard.id}_${isFlipped}`;
                if (lastPlayedKeyRef.current !== playKey) {
                    lastPlayedKeyRef.current = playKey;
                    const cardText = currentCard.front || currentCard.vocabulary || currentCard.word || currentCard.kanji || currentCard.term || '';
                    if (cardText) {
                        speakJapanese(
                            cardText,
                            currentCard.audioBase64 || currentCard.audioUrl || null,
                            onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null,
                            currentCard.audioVoiceId
                        );
                    }
                }
            }
        }
    }, [reviewMode, currentReviewIndex, isFlipped, cardSettings.autoPlayAudio, cardSettings.audioEnabled, reviewQueue]);

    if (isPreparingSession) {
        return <SrsPrewarmLoader title="Từ Vựng" count={reviewQueue.length} />;
    }

    // ==================== LOCAL SRS REVIEW MODE ====================
    const currentCard = (reviewMode && reviewQueue.length > 0) ? reviewQueue[currentReviewIndex] : null;
    if (reviewMode && currentCard) {
        if (!intervalCacheRef.current[currentCard.id]) {
            const currentSessionSrs = sessionSrsData.current[currentCard.id] || null;
            intervalCacheRef.current[currentCard.id] = getPreviewIntervals(currentCard, currentSessionSrs);
        }
        const previewIntv = intervalCacheRef.current[currentCard.id];
        const intervals = {
            again: formatInterval(previewIntv.again),
            hard: formatInterval(previewIntv.hard),
            good: formatInterval(previewIntv.good),
            easy: formatInterval(previewIntv.easy),
        };

        const progress = reviewQueue.length > 0 ? Math.min(100, Math.round((currentReviewIndex / reviewQueue.length) * 100)) : 100;
        return (
                <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8">
                    <div className="w-[800px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6">
                        {/* Header with Exit */}
                        <div className="w-full flex justify-between items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer select-none active:scale-95 touch-manipulation"
                            >
                                <ChevronLeft className="w-4 h-4" /> Thoát ôn tập
                            </button>
                            {reviewHistory.length > 0 ? (
                                <button
                                    onClick={handleUndo}
                                    className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-650 dark:hover:text-indigo-300 transition-colors cursor-pointer select-none active:scale-95"
                                >
                                    <RotateCcw className="w-4 h-4" /> Quay lại thẻ trước
                                </button>
                            ) : (
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">ÔN TẬP TỪ VỰNG NGẮT QUÃNG</span>
                            )}
                        </div>

                        {/* Progress Header with Action Buttons OUTSIDE Flashcard */}
                        <div className="w-full space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-500" /> Tiến độ</span>
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{Math.min(currentReviewIndex + 1, reviewQueue.length)} / {reviewQueue.length}</span>
                                    
                                    {/* Action Buttons Toolbar OUTSIDE Flashcard */}
                                    <div className="flex items-center gap-1.5 z-30">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowNuancePopup(prev => !prev);
                                            }}
                                            className={`p-2 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm border ${
                                                currentCard.nuance 
                                                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300' 
                                                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                            title="Sắc thái từ vựng"
                                        >
                                            <Lightbulb className="w-4 h-4" />
                                        </button>
                                        {cardSettings.audioEnabled !== false && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (currentCard) {
                                                        const cardText = currentCard.front || currentCard.vocabulary || currentCard.word || currentCard.kanji || currentCard.term || '';
                                                        if (cardText) {
                                                            speakJapanese(
                                                                cardText,
                                                                currentCard.audioBase64 || currentCard.audioUrl || null,
                                                                onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null,
                                                                currentCard.audioVoiceId
                                                            );
                                                        }
                                                    }
                                                }}
                                                data-tour-id="FLASHCARD_SPEAKER"
                                                className="p-2 min-h-[44px] min-w-[44px] bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                                                title="Phát âm"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSrsTestModal(true); }}
                                                className="p-2 min-h-[44px] min-w-[44px] bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm border border-emerald-500/30 cursor-pointer"
                                                title="Bảng Test Thuật Toán SRS"
                                            >
                                                <FlaskConical className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                            className="p-2 min-h-[44px] min-w-[44px] bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                                            title="Cấu hình hiển thị"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        {/* Flashcard Container Wrapper */}
                        <div className="w-full relative group perspective flex-shrink-0" data-tour-id="FLASHCARD_CONTAINER">
                            <div className="perspective-1000 w-full mx-auto relative">
                                <div
                                    className={`cursor-pointer relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                                    style={{
                                        width: '100%',
                                        transition: slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                    }}
                                >
                                    <Flashcard
                                        card={currentCard}
                                        cardSettings={cardSettings}
                                        isFlipped={isFlipped}
                                        onFlip={() => {
                                            setIsAnimatingFlip(true);
                                            setIsFlipped(!isFlipped);
                                            playFlipSound();
                                        }}
                                        onEditMnemonic={(card) => setEditingMnemonicCard(card)}
                                        variant="emerald"
                                        transitionEnabled={isAnimatingFlip}
                                    />
                                </div>

                                {/* Nuance Text Box */}
                                {showNuancePopup && (
                                    <div 
                                        onClick={(e) => e.stopPropagation()} 
                                        className="absolute top-16 right-4 left-4 z-40 bg-amber-50/95 dark:bg-amber-950/95 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xl animate-fade-in text-slate-850 dark:text-slate-200"
                                    >
                                        <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2 mb-2">
                                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                                                <Lightbulb className="w-4 h-4 fill-amber-300 animate-pulse" />
                                                <span>Sắc thái từ vựng</span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-bold px-2.5 py-1.5 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                                            >
                                                Đóng
                                            </button>
                                        </div>
                                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                                            {currentCard.nuance || "Chưa có thông tin sắc thái cho từ vựng này."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Anti-Slop High-End SRS Rating Buttons */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3.5 w-full animate-fade-in mt-4" data-tour-id="RATING_PANEL">
                            {[
                                { key: 'again', num: '1', label: 'Quên rồi', interval: intervals.again, gradient: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-500/10 text-rose-500', shadow: 'shadow-rose-500/5' },
                                { key: 'hard', num: '2', label: 'Khó', interval: intervals.hard, gradient: 'from-amber-500/10 to-orange-600/5', border: 'border-amber-500/30 hover:border-amber-500/60', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-500/10 text-amber-500', shadow: 'shadow-amber-500/5' },
                                { key: 'good', num: '3', label: 'Tốt', interval: intervals.good, gradient: 'from-emerald-500/10 to-teal-600/5', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-500', shadow: 'shadow-emerald-500/5' },
                                { key: 'easy', num: '4', label: 'Dễ', interval: intervals.easy, gradient: 'from-sky-500/10 to-blue-600/5', border: 'border-sky-500/30 hover:border-sky-500/60', text: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-500/10 text-sky-500', shadow: 'shadow-sky-500/5' },
                            ].map(btn => (
                                <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRating(btn.key); }}
                                    className={`relative flex flex-col justify-center items-center py-3 sm:py-4 px-2 min-h-[58px] sm:min-h-[64px] rounded-2xl bg-gradient-to-b ${btn.gradient} bg-white dark:bg-slate-900 border ${btn.border} text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-95 cursor-pointer select-none ${btn.shadow}`}>
                                    <span className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 hidden sm:block">
                                        {btn.num}
                                    </span>
                                    <div className={`font-black ${btn.text} text-xs sm:text-base leading-tight`}>{btn.label}</div>
                                    <div className={`text-[10px] sm:text-xs font-semibold ${btn.text} opacity-80 mt-0.5 leading-none font-mono`}>{btn.interval}</div>
                                </button>
                            ))}
                        </div>

                        {/* Keyboard Hint */}
                        <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px] mx-0.5">Space</kbd> lật thẻ •
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px] mx-0.5">1-4</kbd> đánh giá
                        </div>
                    </div>

                    {/* Flashcard Settings Modal */}
                    {showSettingsMenu && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                                <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                                <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Phát âm thanh từ vựng</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={cardSettings.audioEnabled !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))} className="sr-only peer" />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Tự động phát âm thanh khi lật</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={cardSettings.autoPlayAudio} onChange={(e) => setCardSettings(prev => ({ ...prev, autoPlayAudio: e.target.checked }))} className="sr-only peer" />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                        <div className="space-y-2.5 pl-1 text-[13px]">
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                        <div className="space-y-2.5 pl-1 text-[13px]">
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.reading} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Cách đọc (Hiragana)</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                            {cardSettings.back.synonym && (
                                                <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonymFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonymFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana đồng nghĩa</span></label>
                                                </div>
                                            )}
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.nuance === true} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, nuance: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Sắc thái / Ghi chú (trong thẻ)</span></label>
                                            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                            {cardSettings.back.example && (
                                                <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana ví dụ</span></label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleMeaning !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Dịch câu ví dụ</span></label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3">
                                    <button onClick={() => setShowSettingsMenu(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm">
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            );
        }

    if (reviewMode && !currentCard) {
        const waiting = getLearningCardsWaiting();
        if (waiting.length > 0) {
            const now = Date.now();
            const earliestNextReview = Math.min(...waiting.map(w => w.nextReview));
            const secondsLeft = Math.max(0, Math.ceil((earliestNextReview - now) / 1000));
            
            let countdownText = "";
            if (secondsLeft < 60) {
                countdownText = `${secondsLeft} giây`;
            } else {
                const mins = Math.floor(secondsLeft / 60);
                const secs = secondsLeft % 60;
                countdownText = `${mins} phút ${secs} giây`;
            }

            return (
                <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8 animate-fade-in">
                    <div className="w-[600px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-cyan-500/30">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 rounded-2xl flex items-center justify-center animate-bounce">
                                <Clock className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                Đang đợi thẻ từ vựng tiếp theo...
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                                Bạn đã hoàn thành các thẻ từ vựng đến hạn hiện tại. Có <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{waiting.length}</span> thẻ đang chờ ôn lại theo chu kỳ.
                            </p>
                        </div>

                        <div className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-sky-500 text-white rounded-2xl shadow-lg flex items-center gap-2 font-mono">
                            <span className="text-xs font-semibold uppercase tracking-wider">Thẻ tiếp theo sau:</span>
                            <span className="text-lg font-black tracking-widest">{countdownText}</span>
                        </div>

                        <div className="flex justify-center w-full">
                            <button
                                onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer text-center relative z-30 touch-manipulation"
                            >
                                Kết thúc phiên ôn tập
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // When 0 cards are waiting (session 100% completed) -> Render Completion Congratulation Screen with 'Kết thúc phiên ôn tập' button!
        return (
            <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8 animate-fade-in">
                <div className="w-[600px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-emerald-500/30">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl flex items-center justify-center text-4xl animate-bounce">
                            🎉
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Hoàn thành phiên ôn tập!
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                            Chúc mừng! Bạn đã hoàn thành xuất sắc tất cả các thẻ từ vựng trong phiên ôn tập này.
                        </p>
                    </div>

                    <div className="flex justify-center w-full pt-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer text-center relative z-30 touch-manipulation"
                        >
                            Kết thúc phiên ôn tập
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 bg-transparent">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-8 mt-6 animate-fade-in">



                {/* Today's Focus Overview Banner - Cyber-AI HUD Header */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 p-4 sm:p-6 md:p-8 text-slate-800 dark:text-slate-100 shadow-xl group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                        <div className="space-y-2 sm:space-y-3 text-center md:text-left max-w-lg">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider">
                                    <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                                    <span>[NEURAL SRS ENGINE] {t('vocab.srsEngine', 'ÔN TẬP NGẮT QUÃNG')}</span>
                                </div>
                                <button
                                    onClick={() => setShowLeechManager(true)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm ${
                                        leechVocabCards.length > 0
                                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>🩸 {t('vocab.leechCards', 'Thẻ Khó')} ({leechVocabCards.length})</span>
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowSrsTestModal(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-mono font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                                    >
                                        <FlaskConical className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>🧪 Bảng Test SRS</span>
                                    </button>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {t('vocab.title', 'Ôn tập Từ vựng')}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                {t('vocab.subtitle', 'Củng cố trí nhớ dài hạn bằng phương pháp lặp lại ngắt quãng thông minh.')}
                            </p>
                        </div>

                        <div className="flex flex-row md:flex-col items-center justify-between bg-slate-50 dark:bg-slate-950/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-cyan-500/30 text-center w-full md:w-64 shrink-0 shadow-md gap-3">
                            <div className="flex flex-col items-start md:items-center text-left md:text-center">
                                <span className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono leading-none">
                                    {savedSessionInfo ? savedSessionInfo.remaining : globalStats.due}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono font-extrabold uppercase tracking-wider mt-0.5">{t('vocab.dueWordsLabel', 'TỪ VỰNG ĐẾN HẠN ÔN')}</span>
                            </div>
                            {savedSessionInfo ? (
                                <button
                                    onClick={handleResumeSavedSession}
                                    className="md:mt-4 px-4 py-2.5 md:w-full rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-md bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:scale-105 active:scale-95 animate-pulse flex items-center justify-center gap-1.5 cursor-pointer shrink-0 min-h-[44px]"
                                >
                                    {t('vocab.resumeReviewBtn', 'TIẾP TỤC ÔN TẬP')}
                                </button>
                            ) : globalStats.due > 0 ? (
                                <button
                                    onClick={handleResumeGlobal}
                                    className="md:mt-4 px-4 py-2.5 md:w-full rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-md bg-gradient-to-r from-cyan-500 via-indigo-600 to-sky-500 text-white hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer shrink-0 min-h-[44px]"
                                >
                                    {t('vocab.startReviewBtn', 'BẮT ĐẦU ÔN TẬP')}
                                </button>
                            ) : nextDueVocabInfo > 0 ? (
                                <SrsCountdownTimer targetMs={nextDueVocabInfo} onExpire={() => setDashboardTick(Date.now())} />
                            ) : (
                                <button
                                    disabled
                                    className="md:mt-4 px-3 py-2 md:w-full rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shrink-0"
                                >
                                    {t('vocab.allReviewed', 'HẾT THẺ ÔN TẬP')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* SRS Forecast Chart */}
                {allCards.length > 0 && (
                    <SRSForecastChart 
                        items={allCards} 
                        daysCount={14} 
                    />
                )}

                {/* Vocabulary Sets Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t('vocab.dueSetsTitle', 'Học phần cần ôn')}</h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">{t('vocab.dueSetsSub', 'Các học phần có từ vựng đã đến hạn ôn tập.')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(ROUTES.VOCAB_LIST)}
                                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
                            >
                                {t('common.viewAll', 'Xem tất cả')} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {folderStats.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-md">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tuyệt vời!</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {allCards.length > 0 
                                    ? "Bạn đã ôn tập hết các từ vựng cần học hôm nay. Hãy học thêm bài mới nhé!" 
                                    : "Bạn chưa có thẻ từ vựng nào trong thư viện."}
                            </p>
                            {allCards.length === 0 && (
                                <button onClick={() => navigate(ROUTES.BOOKS)} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl hover:opacity-95 transition-all text-xs cursor-pointer shadow-md">
                                    Đến Thư viện Sách
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="relative px-0 sm:px-8">
                            <style>{`
                              @keyframes slideInFromRight {
                                0% { transform: translateX(35px); opacity: 0.4; filter: blur(2px); }
                                100% { transform: translateX(0); opacity: 1; filter: blur(0); }
                              }
                              @keyframes slideInFromLeft {
                                0% { transform: translateX(-35px); opacity: 0.4; filter: blur(2px); }
                                100% { transform: translateX(0); opacity: 1; filter: blur(0); }
                              }
                              .animate-slide-in-right {
                                animation: slideInFromRight 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                              }
                              .animate-slide-in-left {
                                animation: slideInFromLeft 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                              }
                            `}</style>

                            {/* Left outer arrow */}
                            {folderStats.length > 3 && (
                                <button
                                    disabled={vocabSetStartIndex === 0}
                                    onClick={handlePrev}
                                    className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer z-30 shadow-md"
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 overflow-hidden ${
                                isAnimating 
                                    ? (animationDirection === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left')
                                    : ''
                            }`}>
                                {folderStats.slice(vocabSetStartIndex, vocabSetStartIndex + 3).map(folder => (
                                    <div
                                        key={folder.id}
                                        onClick={() => navigate(`/vocab/set/${folder.id}`)}
                                        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-3 sm:space-y-4 cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-500/50"
                                    >
                                        <div className="space-y-2 sm:space-y-3">
                                            <div className="flex justify-between items-start gap-2 w-full">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-extrabold text-xs sm:text-lg text-slate-900 dark:text-white leading-tight line-clamp-1">{folder.name}</h3>
                                                    <p className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono font-bold mt-0.5 sm:mt-1 uppercase tracking-wide">
                                                        {folder.masteredPct === 0 ? t('vocab.notLearned', 'CHƯA HỌC') : `${t('vocab.masteredPrefix', 'Đã thuộc')} ${folder.masteredPct}%`}
                                                    </p>
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full font-bold shrink-0 mt-0.5">{folder.total} {t('vocab.cardsUnit', 'Thẻ')}</span>
                                            </div>
                                        </div>

                                        {/* Action Button inside Card */}
                                        <div className="space-y-2 pt-1 sm:pt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startFolderReview(folder.dueCards, folder.id); }}
                                                className="w-full flex items-center justify-between px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-400 transition-colors border border-orange-200 dark:border-orange-800/50 group cursor-pointer min-h-[44px]"
                                            >
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <RotateCw className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                    <span className="font-bold text-[11px] sm:text-xs truncate">{t('vocab.srsReviewBtn', 'Ôn ngắt quãng')}</span>
                                                </div>
                                                <span className="bg-orange-200 dark:bg-orange-900 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-black font-mono text-orange-800 dark:text-orange-200 shrink-0">{folder.dueCards.length}</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right outer arrow */}
                            {folderStats.length > 3 && (
                                <button
                                    disabled={vocabSetStartIndex + 3 >= folderStats.length}
                                    onClick={handleNext}
                                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer z-30"
                                    title="Trang sau"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>



                {/* Last Studied Section */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('vocab.recentLearningTitle', 'Học gần đây')}</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentSets.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 py-2 italic">
                                Chưa có học phần nào được học gần đây.
                            </p>
                        ) : (
                            recentSets.map(set => (
                                <div
                                    key={set.id}
                                    onClick={() => navigate(`/vocab/set/${set.id}`)}
                                    className="flex items-center justify-between py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                {set.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Học phần • {set.count} từ vựng
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {set.id !== 'unfiled' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/vocab/edit-set/${set.id}`);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/50 text-slate-400 hover:text-cyan-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                                                title="Thêm từ vựng nhanh vào học phần này"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span className="text-xs font-bold font-mono text-slate-400 dark:text-slate-500">
                                            {formatTimeAgo(set.timestamp)}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Flashcard Settings Modal */}
            {showSettingsMenu && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                        <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.reading} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Cách đọc (Hiragana)</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button onClick={() => setShowSettingsMenu(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showMistakeModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowMistakeModal(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">
                            Chọn chế độ ôn tập
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                            Bạn đang ôn tập nhóm: <span className="font-black text-red-650 dark:text-red-400">Từ vựng lỗi sai</span> ({mistakeCards.length} từ)
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedMistakeMode('flashcard')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'flashcard' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Layers className="w-6 h-6" />
                                <span className="font-bold text-xs">Thẻ ghi nhớ</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('study')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'study' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <BookOpen className="w-6 h-6" />
                                <span className="font-bold text-xs">Học tập</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('meaning')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'meaning' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Edit2 className="w-6 h-6" />
                                <span className="font-bold text-xs">Nhập ý nghĩa</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('dictation')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'dictation' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Headphones className="w-6 h-6" />
                                <span className="font-bold text-xs">Nghe Chép</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowMistakeModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={() => {
                                    setShowMistakeModal(false);
                                    if (selectedMistakeMode === 'flashcard') {
                                        onFlashcardSet('mistakes', mistakeCards);
                                    } else if (selectedMistakeMode === 'study') {
                                        onStudySet('mistakes', mistakeCards);
                                    } else if (selectedMistakeMode === 'meaning') {
                                        onMeaningSet('mistakes', mistakeCards);
                                    } else if (selectedMistakeMode === 'dictation') {
                                        onDictationSet('mistakes', mistakeCards);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md cursor-pointer"
                            >
                                Bắt đầu ôn
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Leech Manager Modal */}
            <LeechManagerModal 
                isOpen={showLeechManager}
                onClose={() => setShowLeechManager(false)}
                vocabCards={allCards}
                scopeType="vocab"
                onStartLeechReview={handleStartLeechReview}
                onResetLeechCount={handleResetLeech}
            />
            <SrsTestingPanelModal 
                isOpen={showSrsTestModal}
                onClose={() => setShowSrsTestModal(false)}
            />
            <PersonalMnemonicModal
                isOpen={!!editingMnemonicCard}
                onClose={() => setEditingMnemonicCard(null)}
                card={editingMnemonicCard}
                onSaveMnemonic={async (mnemonicText) => {
                    if (!editingMnemonicCard) return;
                    const cardId = editingMnemonicCard.id || editingMnemonicCard.cardId;
                    setReviewQueue(prev => prev.map(c => {
                        if (c.id === cardId || c.cardId === cardId || c.front === editingMnemonicCard.front) {
                            return { ...c, userMnemonic: mnemonicText, mnemonic: mnemonicText, customMnemonic: mnemonicText };
                        }
                        return c;
                    }));
                }}
            />
        </div>
    );
};

export default SRSVocabScreen;
