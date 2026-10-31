import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Layers, ArrowRight, CheckCircle2, RotateCw, RotateCcw, BookOpen, Calendar, Play, Plus, Zap, Award, ChevronLeft, ChevronRight, Target, Volume2, Settings, Headphones, Edit2, Lightbulb, Clock, Cpu, Repeat2 } from 'lucide-react'
import { TopTabBar, SrsPrewarmLoader, PersonalMnemonicModal, SrsCountdownTimer } from '../ui';
import SrsTypingInput from '../srs/SrsTypingInput';
import SrsModeSelectModal from '../srs/SrsModeSelectModal';
import VocabCardSettingsModal from '../srs/VocabCardSettingsModal';
import { VOCAB_TABS } from '../../config/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import useMenuTransition from '../../hooks/useMenuTransition';
import { ROUTES } from '../../router';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { preloadKuroshiro } from '../../utils/furiganaHelper';
import { calculateAnkiSRS, parseNextReviewMs, isVocabCardDue, isLeechCard, getCardPreviewIntervals, getLearnAheadLimitMs, DEFAULT_LEARN_AHEAD_MINS } from '../../utils/srs';
import SRSForecastChart from '../ui/SRSForecastChart';
import LeechManagerModal from '../ui/LeechManagerModal';
import { flashCorrect, launchFanfare } from '../../utils/celebrations';
import { playCompletionFanfare, playFlipSound } from '../../utils/soundEffects';
import { speakJapanese, preloadAudio } from '../../utils/audio';
import { POINTS } from '../../utils/scoring';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

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
const formatInterval = (minutes, t = (k, f) => f) => {
    if (!t) return `${minutes}m`;
    if (minutes === 0) return t('intervals.now', t('intervals.rightNow', 'ngay lập tức'));
    if (minutes < 60) {
        const pattern = t('intervals.minutes', '{n} phút');
        return pattern.includes('{n}') ? pattern.replace('{n}', minutes) : `${minutes} ${t('common.minutes', 'phút')}`;
    }
    if (minutes < 1440) {
        const hrs = Math.round(minutes / 60);
        const pattern = t('intervals.hours', '{n} giờ');
        return pattern.includes('{n}') ? pattern.replace('{n}', hrs) : `${hrs} ${t('common.hours', 'giờ')}`;
    }
    const days = minutes / 1440;
    if (minutes < 43200) {
        const dStr = days < 2 ? Number(days.toFixed(1)) : Math.round(days);
        const pattern = t('intervals.days', '{n} ngày');
        return pattern.includes('{n}') ? pattern.replace('{n}', dStr) : `${dStr} ${t('common.days', 'ngày')}`;
    }
    const months = days / 30;
    if (months < 12) {
        const mStr = Number(months.toFixed(1));
        const pattern = t('intervals.months', '{n} tháng');
        return pattern.includes('{n}') ? pattern.replace('{n}', mStr) : `${mStr} tháng`;
    }
    const yStr = Number((days / 365).toFixed(1));
    const pattern = t('intervals.years', '{n} năm');
    return pattern.includes('{n}') ? pattern.replace('{n}', yStr) : `${yStr} năm`;
};

// Helper to preview intervals based on SRS state
const getPreviewIntervals = (card, sessionSrs = null) => {
    const cardId = card.id || card.cardId || card.word || card.kanji || card.term;
    const srsState = sessionSrs ? {
        id: cardId,
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
        id: cardId,
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

    return getCardPreviewIntervals(srsState, cardId);
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
    isAdmin = false,
    onUpdateCard,
    onSaveChanges,
    vocabCollectionPath
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const fadeWholePage = useMenuTransition();
    const { t } = useLanguage();
    const { targetLanguage, isEnglishMode, isKoreanMode } = useTargetLanguage();

    const handleSaveCardMnemonic = async (cardOrId, newText) => {
        const cardId = typeof cardOrId === 'object' ? (cardOrId?.id || cardOrId?.cardId) : cardOrId;
        if (!cardId) return;
        const mnemonicPayload = {
            userMnemonic: newText,
            mnemonic: newText,
            customMnemonic: newText
        };

        // 1. Update in-memory review queue
        setReviewQueue(prev => prev.map(c => {
            if (String(c.id) === String(cardId) || String(c.cardId) === String(cardId) || (typeof cardOrId === 'object' && c.front === cardOrId.front)) {
                return { ...c, ...mnemonicPayload };
            }
            return c;
        }));

        // 2. Persist via onUpdateCard / onSaveChanges if provided
        if (onUpdateCard) {
            await onUpdateCard(cardId, mnemonicPayload);
        } else if (onSaveChanges) {
            await onSaveChanges(cardId, mnemonicPayload);
        } else if (userId) {
            try {
                const collectionPath = vocabCollectionPath || `artifacts/${appId}/users/${userId}/vocabulary`;
                const cardRef = doc(db, collectionPath, String(cardId));
                await setDoc(cardRef, { ...mnemonicPayload, updatedAt: Date.now() }, { merge: true });
            } catch (err) {
                console.warn('Failed to save mnemonic to Firestore directly:', err);
            }
        }
    };

    const filteredCards = useMemo(() => {
        const existingFolderIds = new Set((folders || []).map(f => f.id));
        existingFolderIds.add('unfiled');

        return (allCards || []).filter(c => {
            if (c.srsEnabled === false) return false;
            const lang = c.targetLanguage || 'ja';
            if (lang !== targetLanguage) return false;

            const fId = cardFolders[c.id] || c.folderId || 'unfiled';
            // Không hiển thị từ vựng thuộc học phần đã bị xóa
            if (fId !== 'unfiled' && !existingFolderIds.has(fId)) {
                return false;
            }
            return true;
        });
    }, [allCards, targetLanguage, folders, cardFolders]);

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
    const [editingMnemonicCard, setEditingMnemonicCard] = useState(null);

    // Modal chọn chế độ ôn tập (Flashcard vs Typing)
    const [srsModeModalData, setSrsModeModalData] = useState({
        isOpen: false,
        cards: [],
        folderId: 'global',
        title: '',
        count: 0
    });

    const requestStartReview = (cards, folderId = 'global', title = '') => {
        if (!cards || cards.length === 0) return;
        setSrsModeModalData({
            isOpen: true,
            cards,
            folderId,
            title: title || t('srs.selectModeTitle', 'Chọn chế độ ôn tập'),
            count: cards.length
        });
    };

    const leechVocabCards = useMemo(() => filteredCards.filter(c => isLeechCard(c) || isLeechCard(c.srsData)), [filteredCards]);

    const handleStartLeechReview = (items) => {
        if (!items || items.length === 0) return;
        requestStartReview(items, 'leech', t('vocab.reviewLeechCardsTitle', 'Ôn tập thẻ khó nhớ'));
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
            (log.reviewsDone || 0) > 0 ||
            (log.cardsReviewed || 0) > 0 ||
            (log.xpGained || 0) > 0 ||
            (log.count || 0) > 0
        );
        if (activeLogs.length === 0) return 0;

        const logMap = new Map(activeLogs.map(l => [l.id, l]));

        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const getUtcDateStr = (d) => d.toISOString().split('T')[0];

        const hasActivityOnDate = (d) => {
            const localStr = getLocalDateStr(d);
            const utcStr = getUtcDateStr(d);
            return logMap.has(localStr) || logMap.has(utcStr);
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const hasToday = hasActivityOnDate(today);
        const hasYesterday = hasActivityOnDate(yesterday);

        if (!hasToday && !hasYesterday) return 0;

        let currentStreak = 0;
        let checkDate = new Date();
        if (!hasToday) checkDate = yesterday;

        while (true) {
            if (hasActivityOnDate(checkDate)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
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
            audioEnabled: true,
            reviewType: 'flashcard' // 'flashcard' | 'typing'
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
                    audioEnabled: parsed.audioEnabled !== undefined ? parsed.audioEnabled : true,
                    reviewType: parsed.reviewType || 'flashcard'
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
                        name: t('vocab.unfiled', 'Từ vựng lẻ'),
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
        if (!timestamp) return '';
        const diffMs = Date.now() - timestamp;
        if (diffMs < 60000) return t('vocab.timeAgo.justNow', 'Vừa xong');
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return (t('vocab.timeAgo.minutesAgo', '{count} phút trước') || '').replace('{count}', diffMins);
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return (t('vocab.timeAgo.hoursAgo', '{count} giờ trước') || '').replace('{count}', diffHours);
        const diffDays = Math.floor(diffHours / 24);
        return (t('vocab.timeAgo.daysAgo', '{count} ngày trước') || '').replace('{count}', diffDays);
    };

    const mistakeCards = useMemo(() => {
        return filteredCards.filter(card => card.needsMistakeReview === true);
    }, [filteredCards]);

    // Local review queue state
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isPreparingSession, setIsPreparingSession] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [hasCheckedTyping, setHasCheckedTyping] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [slideDirection, setSlideDirection] = useState('');
    const [reviewMode, setReviewModeState] = useState(false);
    const [reviewUndoNonce, setReviewUndoNonce] = useState(0);
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
        if (setIsReviewActive) {
            setIsReviewActive(reviewMode);
        }
        return () => {
            if (setIsReviewActive) {
                setIsReviewActive(false);
            }
        };
    }, [reviewMode, setIsReviewActive]);

    // Flush session XP and sync when user leaves app or switches tabs on mobile
    useEffect(() => {
        const handleFlushOnLeave = () => {
            if (sessionXpRef.current > 0 && awardXP) {
                const xp = sessionXpRef.current;
                sessionXpRef.current = 0;
                try {
                    const p = awardXP(xp);
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch (_) {}
            }
        };

        window.addEventListener('pagehide', handleFlushOnLeave);
        const handleVisChange = () => {
            if (document.visibilityState === 'hidden') {
                handleFlushOnLeave();
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);

        return () => {
            window.removeEventListener('pagehide', handleFlushOnLeave);
            document.removeEventListener('visibilitychange', handleVisChange);
        };
    }, [awardXP]);

    useEffect(() => {
        setShowNuancePopup(false);
        setHasCheckedTyping(false);
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
                        img.decode().catch(() => { });
                    }
                }
            }
        });
    }, [currentReviewIndex, reviewQueue]);

    // Safely determine if a card is due (honoring Learn Ahead Limit by default)
    const isDue = (card, targetNow = null) => {
        if (!card || card.srsEnabled === false) return false;
        const now = targetNow !== null ? targetNow : (dashboardTick + getLearnAheadLimitMs());
        // Merge with local session SRS data if available
        const localSrs = sessionSrsData.current[card.id];
        if (localSrs) {
            const nextReviewVal = localSrs.nextReview_back || localSrs.nextReview;
            const reviewTime = parseNextReviewMs(nextReviewVal);
            if (reviewTime === 0) return true;
            return reviewTime <= now;
        }
        return isVocabCardDue(card, now);
    };

    // Calculate comprehensive stats for each folder (including completed ones)
    const folderStats = useMemo(() => {
        const stats = {};

        // Initialize stats for all folders
        folders.forEach(f => {
            stats[f.id] = { id: f.id, name: f.name, newCards: [], dueCards: [], allCards: [], total: 0, masteredCount: 0, createdAt: f.createdAt };
        });

        // Unfiled folder
        stats['unfiled'] = { id: 'unfiled', name: t('vocab.unfiledFolder', 'Từ vựng lẻ'), newCards: [], dueCards: [], allCards: [], total: 0, masteredCount: 0, createdAt: null };

        filteredCards.forEach(card => {
            const fId = cardFolders[card.id] || card.folderId || 'unfiled';
            if (!stats[fId]) {
                return;
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
                else if (nameLower.includes('giao tiếp') || nameLower.includes('daily') || nameLower.includes('conversation') || nameLower.includes('communication')) levelBadge = 'COMMUNICATION';
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
    }, [allCards, folders, cardFolders, filteredCards, dashboardTick]);

    useEffect(() => {
        if (vocabSetStartIndex >= folderStats.length) {
            const pageStart = Math.max(0, Math.floor((folderStats.length - 1) / 3) * 3);
            setVocabSetStartIndex(pageStart);
        }
    }, [folderStats.length, vocabSetStartIndex]);

    const savedSessionInfo = null;

    const nextDueVocabInfo = useMemo(() => {
        const now = dashboardTick;
        let earliest = Infinity;
        filteredCards.forEach(c => {
            if (c.srsEnabled !== false) {
                const localSrs = sessionSrsData.current[c.id];
                const nextReviewVal = localSrs
                    ? (localSrs.nextReview_back || localSrs.nextReview)
                    : (c.nextReview_back !== undefined ? c.nextReview_back : (c.nextReview !== undefined ? c.nextReview : (c.srsData?.nextReview || c.srsData?.nextReview_back)));
                if (!nextReviewVal) return;

                const reviewTime = parseNextReviewMs(nextReviewVal);

                if (reviewTime > now && reviewTime < earliest) {
                    earliest = reviewTime;
                }
            }
        });
        return earliest === Infinity ? null : earliest;
    }, [filteredCards, dashboardTick]);

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

        // Re-sync freshest card settings from localStorage so Card #1 always applies latest user settings
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                setCardSettings(prev => ({
                    ...prev,
                    ...parsed,
                    front: { ...prev.front, ...parsed.front },
                    back: { ...prev.back, ...parsed.back }
                }));
            }
        } catch (_) { }

        // Pre-calculate preview intervals & fuzz factors for all queue cards during prewarming screen
        intervalCacheRef.current = {};
        uniqueDueCards.forEach(c => {
            intervalCacheRef.current[c.id] = getPreviewIntervals(c, sessionSrsData.current[c.id] || null);
        });

        // Show calculating & prewarming screen before Card #1
        setIsPreparingSession(true);

        // Pre-warm Kuroshiro dictionary and WebKit AudioContext
        try {
            preloadKuroshiro();
            if (typeof window !== 'undefined') {
                if (window.speechSynthesis) window.speechSynthesis.getVoices();
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    const tempCtx = new AudioCtxClass();
                    if (tempCtx.state === 'suspended') tempCtx.resume().catch(() => { });
                }
            }
        } catch (_) { }

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
            case 'due': {
                const folderObj = folders.find(f => f.id === folderId);
                const folderTitle = folderObj
                    ? (t('vocab.reviewStudySetTitle', 'Ôn tập học phần: {name}') || '').replace('{name}', folderObj.name)
                    : t('vocab.dueSetsTitle', 'Ôn tập học phần');
                requestStartReview(cards, folderId || 'unfiled', folderTitle);
                break;
            }
        }
    };

    // "Ôn tập" top banner button — launches review queue for due cards
    const handleResumeGlobal = () => {
        const allAvailable = folderStats.flatMap(f => f.dueCards);
        if (allAvailable.length > 0) {
            requestStartReview(allAvailable, 'global', t('vocab.reviewSpacedTitle', 'Ôn tập từ vựng ngắt quãng'));
        } else {
            // Check if there are cards in Learn Ahead window
            const learnAheadMs = getLearnAheadLimitMs();
            const now = Date.now();
            const learnAheadCards = filteredCards.filter(c => {
                if (c.srsEnabled === false) return false;
                const nextReviewVal = c.nextReview_back || c.nextReview;
                if (!nextReviewVal) return false;
                const reviewTime = parseNextReviewMs(nextReviewVal);
                return reviewTime > now && reviewTime <= (now + learnAheadMs);
            });

            if (learnAheadCards.length > 0) {
                const aheadTitle = (t('vocab.studyAheadTitle', 'Ôn tập học trước ({count} thẻ trong {mins} phút)') || '')
                    .replace('{count}', learnAheadCards.length)
                    .replace('{mins}', Math.round(learnAheadMs / 60000));
                requestStartReview(learnAheadCards, 'global', aheadTitle);
                return;
            }

            if (setNotification) {
                setNotification(t('vocab.noCardsDue', 'Không có thẻ nào cần ôn tập ngắt quãng lúc này.'));
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
                if (location.state?.reviewType) {
                    setCardSettings(prev => ({
                        ...prev,
                        reviewType: location.state.reviewType
                    }));
                }
                startFolderReview(dueCardsOnly, 'global');
            } else {
                hasAutoStartedRef.current = true; // No due cards, stay on overview tab
            }
        }
    }, [location.state, filteredCards, reviewMode]);

    const [lastTick, setLastTick] = useState(Date.now());

    const getLearningCardsWaiting = useCallback(() => {
        const waitingMap = new Map();
        const now = Date.now();
        const learnAheadMs = getLearnAheadLimitMs();

        const upcomingIds = new Set(
            (reviewQueue || []).slice(currentReviewIndex).map(c => String(c.id))
        );

        // 1. Thẻ đã được chấm điểm trong phiên hiện tại (sessionSrsData)
        Object.entries(sessionSrsData.current).forEach(([id, srs]) => {
            const idStr = String(id);
            if (completedCardIds.current.has(idStr)) return;
            if (upcomingIds.has(idStr)) return;
            const stateStr = (srs.state || srs.srsState || '').toUpperCase();
            if (stateStr === 'REVIEW') return;

            const nextReviewVal = srs.nextReview_back || srs.nextReview;
            if (nextReviewVal) {
                const reviewTime = parseNextReviewMs(nextReviewVal);
                if (reviewTime > 0 && reviewTime - now <= learnAheadMs && reviewTime - now >= -7 * 24 * 60 * 60 * 1000) {
                    waitingMap.set(idStr, {
                        id: idStr,
                        nextReview: reviewTime
                    });
                }
            }
        });

        // 2. Thẻ trong phạm vi học phần đang ôn (active scope) sắp đến hạn trong vòng Learn Ahead Limit
        const fId = activeFolderIdRef.current;
        const candidateCards = (!fId || fId === 'global')
            ? (filteredCards || [])
            : (filteredCards || []).filter(c => {
                const cFolderId = cardFolders[c.id] || c.folderId || 'unfiled';
                return cFolderId === fId;
            });

        candidateCards.forEach(c => {
            const cId = String(c.id);
            if (c.srsEnabled === false) return;
            if (completedCardIds.current.has(cId)) return;
            if (upcomingIds.has(cId)) return;
            if (waitingMap.has(cId)) return;

            const localSrs = sessionSrsData.current[c.id];
            // Nếu thẻ trong session đã tốt nghiệp (REVIEW), bỏ qua
            if (localSrs && (localSrs.state || '').toUpperCase() === 'REVIEW') return;

            const nextReviewVal = localSrs ? (localSrs.nextReview_back || localSrs.nextReview) : (c.nextReview_back || c.nextReview);
            if (!nextReviewVal) return;

            const reviewTime = parseNextReviewMs(nextReviewVal);
            if (reviewTime === 0) return;

            const diff = reviewTime - now;
            // Thẻ đến hạn hoặc nằm trong phạm vi Learn Ahead Limit
            if (diff <= learnAheadMs && diff >= -7 * 24 * 60 * 60 * 1000) {
                const isStudied = (c.seenCount > 0) || (c.intervalIndex_back !== undefined && c.intervalIndex_back >= 0) || c.srsState || c.lastReviewed;
                if (isStudied) {
                    waitingMap.set(cId, {
                        id: cId,
                        nextReview: reviewTime
                    });
                }
            }
        });

        return Array.from(waitingMap.values());
    }, [filteredCards, cardFolders, reviewQueue, currentReviewIndex]);

    const createCardFromWaiting = useCallback((itemId) => {
        const itemIdStr = String(itemId);
        const fullCard = (allCards || []).find(c => String(c.id) === itemIdStr);
        if (!fullCard) return null;
        const localSrs = sessionSrsData.current[itemId];
        return {
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
        };
    }, [allCards]);

    const handleStudyAhead = useCallback(() => {
        const waiting = getLearningCardsWaiting();
        if (waiting.length === 0) return;
        const sortedWaiting = [...waiting].sort((a, b) => a.nextReview - b.nextReview);
        const cardsToPull = sortedWaiting
            .map(w => createCardFromWaiting(w.id))
            .filter(Boolean);

        if (cardsToPull.length === 0) return;

        setReviewQueue(prevQueue => {
            const upcomingQueueIds = new Set(prevQueue.slice(currentReviewIndex).map(c => String(c.id)));
            const newCards = cardsToPull.filter(c => !upcomingQueueIds.has(String(c.id)));
            if (newCards.length === 0) return prevQueue;
            newCards.forEach(c => {
                activeReviewCardIds.current.add(String(c.id));
                if (!intervalCacheRef.current[c.id]) {
                    intervalCacheRef.current[c.id] = getPreviewIntervals(c, sessionSrsData.current[c.id] || null);
                }
            });
            return [...prevQueue, ...newCards];
        });

        setHasCheckedTyping(false);
        setIsAnimatingFlip(false);
        setIsFlipped(false);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setIsAnimatingFlip(true);
            });
        });
    }, [createCardFromWaiting, currentReviewIndex, getLearningCardsWaiting]);

    useEffect(() => {
        if (!reviewMode) return;
        const intervalId = setInterval(() => {
            const now = Date.now();
            setLastTick(now);
            const waiting = getLearningCardsWaiting();
            if (waiting.length === 0) return;

            // Only cards whose countdown timer has genuinely reached 0 are due to be re-injected!
            const dueNow = waiting.filter(w => w.nextReview <= now);
            if (dueNow.length > 0) {
                setReviewQueue(prevQueue => {
                    const nextQueue = [...prevQueue];
                    const upcomingQueueIds = new Set(nextQueue.slice(currentReviewIndex).map(c => String(c.id)));
                    const cardsToInject = [];
                    dueNow.forEach(item => {
                        const itemIdStr = String(item.id);
                        if (!upcomingQueueIds.has(itemIdStr) && !completedCardIds.current.has(itemIdStr)) {
                            const cardObj = createCardFromWaiting(item.id);
                            if (cardObj) {
                                upcomingQueueIds.add(itemIdStr);
                                activeReviewCardIds.current.add(itemIdStr);
                                if (!intervalCacheRef.current[cardObj.id]) {
                                    intervalCacheRef.current[cardObj.id] = getPreviewIntervals(cardObj, sessionSrsData.current[cardObj.id] || null);
                                }
                                cardsToInject.push(cardObj);
                            }
                        }
                    });

                    if (cardsToInject.length > 0) {
                        const insertIndex = Math.min(currentReviewIndex + 1, nextQueue.length);
                        nextQueue.splice(insertIndex, 0, ...cardsToInject);
                        return nextQueue;
                    }
                    return prevQueue;
                });
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [reviewMode, currentReviewIndex, reviewQueue.length, createCardFromWaiting, getLearningCardsWaiting]);

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
            isFlipped: isFlipped,
            queue: [...reviewQueue]
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
            nextReview_back: nowTime + nextReviewOffset,
            lastReviewed: nowTime,
            state: result.state,
            interval: result.interval,
            ease: result.ease,
            nextReview: nowTime + nextReviewOffset,
            masteryState: result.state === 'REVIEW' ? 'memorized' : 'learning'
        };

        sessionSrsData.current[card.id] = newSrs;
        if (intervalCacheRef.current) {
            delete intervalCacheRef.current[card.id];
        }

        // Calculate XP reward synchronously
        const ratingStr = String(rating || 'good').toLowerCase();
        const xpReward = POINTS?.SRS_VOCAB?.[ratingStr] || POINTS?.SRS_VOCAB?.good || 4;
        sessionXpRef.current += xpReward;

        // Call parent update vocab srs rating on Firestore asynchronously
        if (onUpdateVocabSrsRating) {
            pendingWriteIds.current.add(card.id);
            try {
                const res = onUpdateVocabSrsRating(card.id, { ...newSrs, rating }, (success) => {
                    pendingWriteIds.current.delete(card.id);
                });
                if (res && typeof res.catch === 'function') {
                    res.catch(() => {
                        pendingWriteIds.current.delete(card.id);
                    });
                }
            } catch (err) {
                pendingWriteIds.current.delete(card.id);
            }
        }

        // 1. Determine if card graduated/completed in this session or needs waiting for next review
        let updatedQueue = [...reviewQueue];
        if (result.state === 'REVIEW') {
            completedCardIds.current.add(card.id);
        }
        // Thẻ có chu kỳ ngắn (1, 5, 10 phút) sẽ ở trạng thái chờ và được tự động chèn ngay sau thẻ hiện tại khi đúng thời gian hẹn

        if (currentReviewIndex + 1 < updatedQueue.length) {
            setReviewQueue(updatedQueue);
            setHasCheckedTyping(false);
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
            const learnAheadMs = getLearnAheadLimitMs();

            // 1. When Learn Ahead Limit is ON (learnAheadMs > 0), all cards in waiting (diff <= learnAheadMs) are eligible!
            // When Learn Ahead Limit is OFF (learnAheadMs === 0), only cards whose actual time has expired (<= nowTime) are eligible.
            const eligibleWaiting = learnAheadMs > 0
                ? waiting
                : waiting.filter(w => w.nextReview <= nowTime);

            if (eligibleWaiting.length > 0) {
                const upcomingQueueIds = new Set(updatedQueue.slice(currentReviewIndex + 1).map(c => String(c.id)));
                const sortedWaiting = [...eligibleWaiting].sort((a, b) => a.nextReview - b.nextReview);
                const cardsToPull = sortedWaiting
                    .filter(w => !upcomingQueueIds.has(String(w.id)))
                    .map(w => createCardFromWaiting(w.id))
                    .filter(Boolean);

                if (cardsToPull.length > 0) {
                    cardsToPull.forEach(c => {
                        activeReviewCardIds.current.add(String(c.id));
                        if (!intervalCacheRef.current[c.id]) {
                            intervalCacheRef.current[c.id] = getPreviewIntervals(c, sessionSrsData.current[c.id] || null);
                        }
                    });
                    updatedQueue.push(...cardsToPull);
                    setReviewQueue(updatedQueue);
                    setHasCheckedTyping(false);
                    setIsAnimatingFlip(false);
                    setIsFlipped(false);
                    setCurrentReviewIndex(prev => prev + 1);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setIsAnimatingFlip(true);
                        });
                    });
                    console.timeEnd('⚡ SRS_RATING_VOCAB');
                    return;
                }
            }

            // 2. If Learn Ahead Limit is OFF and cards are waiting for their countdown timer:
            // Show WAITING SCREEN with countdown timer and manual options!
            if (waiting.length > 0) {
                setReviewQueue(updatedQueue);
                setHasCheckedTyping(false);
                setIsAnimatingFlip(false);
                setIsFlipped(false);
                setCurrentReviewIndex(updatedQueue.length);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsAnimatingFlip(true);
                    });
                });
                return;
            }

            // 3. When 0 learning cards are waiting: check if any cards in current scope became newly due/learn-ahead
            const fId = activeFolderIdRef.current;
            const candidateCards = (!fId || fId === 'global')
                ? (filteredCards || [])
                : (filteredCards || []).filter(c => {
                    const cFolderId = cardFolders[c.id] || c.folderId || 'unfiled';
                    return cFolderId === fId;
                });

            const newlyDueCards = candidateCards.filter(c => {
                if (c.srsEnabled === false) return false;
                const localSrs = sessionSrsData.current[c.id];
                if (localSrs && (localSrs.state || '').toUpperCase() === 'REVIEW') return false;
                if (completedCardIds.current.has(String(c.id))) return false;

                const nextReviewVal = localSrs ? (localSrs.nextReview_back || localSrs.nextReview) : (c.nextReview_back || c.nextReview);
                if (!nextReviewVal) return false;
                const reviewTime = parseNextReviewMs(nextReviewVal);
                return reviewTime > 0 && reviewTime <= (nowTime + learnAheadMs);
            });

            if (learnAheadMs > 0 && newlyDueCards.length > 0) {
                const upcomingQueueIds = new Set(updatedQueue.map(c => String(c.id)));
                const cardsToPull = newlyDueCards.filter(c => !upcomingQueueIds.has(String(c.id)));
                if (cardsToPull.length > 0) {
                    cardsToPull.forEach(c => {
                        activeReviewCardIds.current.add(String(c.id));
                        if (!intervalCacheRef.current[c.id]) {
                            intervalCacheRef.current[c.id] = getPreviewIntervals(c, sessionSrsData.current[c.id] || null);
                        }
                    });
                    updatedQueue.push(...cardsToPull);
                    setReviewQueue(updatedQueue);
                    setHasCheckedTyping(false);
                    setIsAnimatingFlip(false);
                    setIsFlipped(false);
                    setCurrentReviewIndex(prev => prev + 1);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setIsAnimatingFlip(true);
                        });
                    });
                    console.timeEnd('⚡ SRS_RATING_VOCAB');
                    return;
                }
            }

            // 4. Truly completed session!
            setReviewQueue(updatedQueue);
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
        console.timeEnd('⚡ SRS_RATING_VOCAB');
    };

    const saveSessionState = () => { };
    const handleResumeSavedSession = () => { };
    const handleDiscardSavedSession = () => { };

    const isExitingRef = useRef(false);

    const exitReview = (shouldAwardXp = true) => {
        if (isExitingRef.current) return;
        isExitingRef.current = true;

        if (typeof shouldAwardXp !== 'boolean') shouldAwardXp = true;
        if (shouldAwardXp && sessionXpRef.current > 0 && awardXP) {
            try {
                const p = awardXP(sessionXpRef.current);
                if (p && typeof p.catch === 'function') p.catch(e => console.warn('AwardXP catch:', e));
            } catch (e) {
                console.warn('AwardXP error:', e);
            }
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
            try {
                window.dispatchEvent(new Event('srs-updated'));
            } catch (e) { }
            if (onRefreshCards) {
                try { onRefreshCards(); } catch (e) { console.warn('onRefreshCards error:', e); }
            }
            if (setIsReviewActive) {
                try { setIsReviewActive(false); } catch (e) { }
            }
            isExitingRef.current = false;
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
            if (cardSettings?.reviewType === 'typing') {
                setIsFlipped(false);
                setHasCheckedTyping(false);
            } else {
                setIsFlipped(wasFlipped !== undefined ? wasFlipped : true);
            }
            setReviewUndoNonce(n => n + 1);
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
            // Khi đang ở chế độ gõ và chưa nộp đáp án: không nuốt phím tắt và auto focus input nếu bị mất focus
            if (cardSettings?.reviewType === 'typing' && !hasCheckedTyping) {
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    const inputEl = document.querySelector('[data-tour-id="SRS_TYPING_PANEL"] input');
                    if (inputEl && document.activeElement !== inputEl) {
                        inputEl.focus();
                    }
                }
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                setIsFlipped(f => !f);
                playFlipSound();
            }
            if (cardSettings?.reviewType !== 'typing' || hasCheckedTyping) {
                if (e.key === '1') { e.preventDefault(); handleRating('again'); }
                if (e.key === '2') { e.preventDefault(); handleRating('hard'); }
                if (e.key === '3') { e.preventDefault(); handleRating('good'); }
                if (e.key === '4') { e.preventDefault(); handleRating('easy'); }
            }
            if (e.key === 'Backspace' || e.key === 'z' || (e.key === 'z' && e.ctrlKey)) {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [reviewMode, currentReviewIndex, reviewQueue, reviewHistory, hasCheckedTyping, cardSettings?.reviewType]);

    const lastPlayedKeyRef = useRef('');

    // Preload audio for current & upcoming cards for instant 0ms playback on flip
    useEffect(() => {
        if (!reviewMode || !reviewQueue || reviewQueue.length === 0) return;
        const current = reviewQueue[currentReviewIndex];
        const next1 = reviewQueue[currentReviewIndex + 1];
        const next2 = reviewQueue[currentReviewIndex + 2];
        if (current) preloadAudio(current).catch(() => { });
        if (next1) preloadAudio(next1).catch(() => { });
        if (next2) preloadAudio(next2).catch(() => { });
    }, [reviewMode, currentReviewIndex, reviewQueue]);

    // Auto-play audio when flipped to answer side
    useEffect(() => {
        if (!isFlipped) {
            lastPlayedKeyRef.current = null;
            return;
        }
        if (reviewMode && reviewQueue.length > 0 && isFlipped && cardSettings.autoPlayAudio !== false && cardSettings.audioEnabled !== false) {
            const currentCard = reviewQueue[currentReviewIndex];
            if (currentCard) {
                const playKey = `${currentCard.id}_${currentReviewIndex}_${isFlipped}`;
                if (lastPlayedKeyRef.current !== playKey) {
                    lastPlayedKeyRef.current = playKey;
                    speakJapanese(
                        currentCard,
                        null,
                        onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null
                    );
                }
            }
        }
    }, [reviewMode, currentReviewIndex, isFlipped, cardSettings.autoPlayAudio, cardSettings.audioEnabled, reviewQueue]);

    if (isPreparingSession) {
        return <SrsPrewarmLoader title={t('vocab.title', 'Từ Vựng')} count={reviewQueue.length} />;
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
            again: formatInterval(previewIntv.again, t),
            hard: formatInterval(previewIntv.hard, t),
            good: formatInterval(previewIntv.good, t),
            easy: formatInterval(previewIntv.easy, t),
        };

        const progress = reviewQueue.length > 0 ? Math.min(100, Math.round((currentReviewIndex / reviewQueue.length) * 100)) : 100;
        return (
            <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center px-3 sm:px-4 py-2 sm:py-3.5 bg-transparent animate-fade-in overflow-y-auto">
                <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3 sm:space-y-4 md:space-y-4.5 transition-all duration-300">
                    {/* Header with Exit */}
                    <div className="w-full flex justify-between items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                        >
                            <ChevronLeft className="w-4 h-4" /> {t('vocab.exitReview', 'Thoát ôn tập')}
                        </button>
                        {reviewHistory.length > 0 ? (
                            <button
                                onClick={handleUndo}
                                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                            >
                                <RotateCcw className="w-4 h-4" /> {t('vocab.previousCard', 'Quay lại thẻ trước')}
                            </button>
                        ) : (
                            <span className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('vocab.srsTitleBanner', 'ÔN TẬP TỪ VỰNG NGẮT QUÃNG')}</span>
                        )}
                    </div>

                    {/* Progress Header with Action Buttons OUTSIDE Flashcard */}
                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                                <Target className="w-3.5 h-3.5" /> {t('vocab.progress', 'Tiến độ')}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-black text-xs">
                                    {Math.min(currentReviewIndex + 1, reviewQueue.length)} / {reviewQueue.length}
                                </span>

                                {/* Action Buttons Toolbar OUTSIDE Flashcard */}
                                <div className="flex items-center gap-1.5 z-30">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowNuancePopup(prev => !prev);
                                        }}
                                        className={`p-2 min-h-[40px] min-w-[40px] rounded-2xl flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 shadow-xs border-2 border-b-4 ${currentCard.nuance
                                            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        title={t('vocab.nuanceTitle', 'Sắc thái từ vựng')}
                                    >
                                        <Lightbulb className="w-4 h-4" />
                                    </button>
                                    {cardSettings.audioEnabled !== false && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (currentCard) {
                                                    speakJapanese(
                                                        currentCard,
                                                        null,
                                                        onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null
                                                    );
                                                }
                                            }}
                                            data-tour-id="FLASHCARD_SPEAKER"
                                            className="p-2 min-h-[40px] min-w-[40px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 cursor-pointer"
                                            title={t('vocab.pronounce', 'Phát âm')}
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {/* Quick Swap Sides Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCardSettings(prev => ({
                                                ...prev,
                                                swapSides: !prev.swapSides
                                            }));
                                        }}
                                        className={`p-2 min-h-[40px] min-w-[40px] rounded-2xl flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 shadow-xs border-2 border-b-4 cursor-pointer ${cardSettings.swapSides
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400 dark:border-amber-600'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        title={cardSettings.swapSides ? t('vocab.swapSidesPromptToBack', 'Đang hiện Nghĩa tiếng Việt trước. Nhấn để đổi sang hiện Tiếng Nhật trước') : t('vocab.swapSidesPromptToFront', 'Đang hiện Tiếng Nhật trước. Nhấn để đổi sang hiện Nghĩa tiếng Việt trước')}
                                    >
                                        <RotateCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                        className="p-2 min-h-[40px] min-w-[40px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 cursor-pointer"
                                        title={t('vocab.cardSettingsBtn', 'Cấu hình hiển thị')}
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs" style={{ width: `${progress}%` }}></div>
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
                                    key={`${currentCard.id}_${currentReviewIndex}_${cardSettings.reviewType}_${cardSettings.swapSides ? 'rev' : 'fwd'}`}
                                    card={currentCard}
                                    cardSettings={cardSettings}
                                    isFlipped={isFlipped}
                                    hasCheckedTyping={hasCheckedTyping}
                                    onFlip={() => {
                                        setIsAnimatingFlip(true);
                                        setIsFlipped(!isFlipped);
                                        playFlipSound();
                                    }}
                                    onEditMnemonic={(card) => setEditingMnemonicCard(card)}
                                    onSaveMnemonic={(card, newText) => handleSaveCardMnemonic(card, newText)}
                                    variant="default"
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
                                            <span>{t('vocab.nuanceTitle', 'Sắc thái từ vựng')}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-bold px-2.5 py-1.5 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                                        >
                                            {t('common.close', 'Đóng')}
                                        </button>
                                    </div>
                                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                                        {currentCard.nuance || t('vocab.noNuance', 'Chưa có thông tin sắc thái cho từ vựng này.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Typing Input Component */}
                    {cardSettings.reviewType === 'typing' && (
                        <div className="w-full mt-1 sm:mt-2">
                            <SrsTypingInput
                                key={`${currentCard.id}_${currentReviewIndex}_${reviewUndoNonce}`}
                                card={currentCard}
                                isFlipped={isFlipped}
                                isReversed={cardSettings.swapSides}
                                expectedLanguage={cardSettings.swapSides ? (isKoreanMode ? 'ko' : isEnglishMode ? 'en' : 'ja') : 'vi'}
                                onFlip={() => {
                                    setIsAnimatingFlip(true);
                                    setIsFlipped(true);
                                    playFlipSound();
                                }}
                                onCheck={() => {
                                    setHasCheckedTyping(true);
                                    setIsAnimatingFlip(true);
                                    setIsFlipped(true);
                                    playFlipSound();
                                }}
                                onQuickRate={(rating) => handleRating(rating)}
                                placeholder={cardSettings.swapSides ? (isKoreanMode ? t('vocab.typeKoreanPlaceholder', 'Nhập từ tiếng Hàn (Hangul)...') : isEnglishMode ? t('vocab.typeEnglishPlaceholder', 'Nhập từ tiếng Anh...') : t('vocab.typeJapanesePlaceholder', 'Nhập từ tiếng Nhật (Kanji hoặc Hiragana)...')) : t('vocab.typeVietnamesePlaceholder', 'Nhập nghĩa tiếng Việt...')}
                            />
                        </div>
                    )}

                    {/* SRS Rating Buttons: Hidden in typing mode until user checks answer */}
                    {(cardSettings.reviewType !== 'typing' || hasCheckedTyping) && (
                        <div className="w-full space-y-2 sm:space-y-3 animate-fade-in mt-2 sm:mt-3.5">
                            <div className="grid grid-cols-4 gap-1.5 sm:gap-3.5 w-full" data-tour-id="RATING_PANEL">
                                {[
                                    { key: 'again', num: '1', label: t('studyModes.again', 'Quên rồi'), interval: intervals.again, bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-2 border-b-4 border-rose-300 dark:border-rose-800' },
                                    { key: 'hard', num: '2', label: t('studyModes.hard', 'Khó'), interval: intervals.hard, bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-2 border-b-4 border-amber-300 dark:border-amber-800' },
                                    { key: 'good', num: '3', label: t('studyModes.good', 'Tốt'), interval: intervals.good, bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-2 border-b-4 border-emerald-400 dark:border-emerald-700' },
                                    { key: 'easy', num: '4', label: t('studyModes.easy', 'Dễ'), interval: intervals.easy, bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-2 border-b-4 border-sky-300 dark:border-sky-800' },
                                ].map(btn => (
                                    <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRating(btn.key); }}
                                        className={`relative flex flex-col justify-center items-center py-2 sm:py-3 px-1.5 sm:px-2 min-h-[50px] sm:min-h-[58px] rounded-2xl ${btn.bg} text-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer select-none`}>
                                        <span className="absolute top-1 sm:top-1.5 right-1.5 sm:right-2 px-1 py-0.2 rounded-md bg-white/60 dark:bg-slate-800/60 text-[8px] sm:text-[9px] font-mono font-bold opacity-75 hidden sm:block">
                                            {btn.num}
                                        </span>
                                        <div className="font-black text-[11px] sm:text-sm md:text-base leading-tight">{btn.label}</div>
                                        <div className="text-[9px] sm:text-[10px] md:text-xs font-semibold opacity-80 mt-0.5 leading-none font-mono">{btn.interval}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Keyboard Hint */}
                            <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px] mx-0.5">Space</kbd> {t('studyModes.spaceFlipHint', 'lật thẻ')} •
                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px] mx-0.5">1-4</kbd> {t('studyModes.numberRateHint', 'đánh giá')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Flashcard Settings Modal */}
                <VocabCardSettingsModal
                    isOpen={showSettingsMenu}
                    onClose={() => setShowSettingsMenu(false)}
                    cardSettings={cardSettings}
                    setCardSettings={setCardSettings}
                    isKoreanMode={isKoreanMode}
                    isEnglishMode={isEnglishMode}
                />
            </div>
        );
    }

    if (reviewMode && !currentCard) {
        const waiting = getLearningCardsWaiting();
        if (waiting.length > 0) {
            const now = lastTick;
            const earliestNextReview = Math.min(...waiting.map(w => w.nextReview));
            const secondsLeft = Math.max(0, Math.ceil((earliestNextReview - now) / 1000));

            const pad = (n) => String(n).padStart(2, '0');
            const hours = Math.floor(secondsLeft / 3600);
            const mins = Math.floor((secondsLeft % 3600) / 60);
            const secs = secondsLeft % 60;
            const formattedCountdown = hours > 0
                ? `${pad(hours)}:${pad(mins)}:${pad(secs)}`
                : `${pad(mins)}:${pad(secs)}`;

            return (
                <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8 animate-fade-in">
                    <div className="w-[600px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-cyan-500/30">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 rounded-2xl flex items-center justify-center animate-bounce">
                                <Clock className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {t('vocab.waitingTitle', 'Đang đợi thẻ từ vựng tiếp theo...')}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                                {(t('vocab.waitingDesc', 'Bạn đã hoàn thành các thẻ từ vựng đến hạn hiện tại. Có {count} thẻ đang chờ ôn lại theo chu kỳ.') || '').replace('{count}', waiting.length)}
                            </p>
                        </div>

                        <div className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl border-2 border-slate-700 flex items-center gap-2.5 font-mono">
                            <Clock className="w-4 h-4 animate-spin-slow shrink-0 text-amber-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider">{t('common.nextAfter', 'TIẾP SAU:')}</span>
                            <span className="text-xl font-black tracking-widest">{formattedCountdown}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStudyAhead(); }}
                                className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 select-none touch-manipulation"
                            >
                                <Zap className="w-4 h-4 fill-current text-white" />
                                <span>{(t('vocab.studyAheadNow', 'Học trước ngay ({count} thẻ)') || '').replace('{count}', waiting.length)}</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                                className="w-full sm:w-auto py-3.5 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 border-b-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center relative z-30 touch-manipulation select-none"
                            >
                                {t('vocab.finishReviewSession', 'Kết thúc phiên ôn tập')}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Check for any newly due cards or cards within Learn Ahead Limit while staying on the completion screen
        const learnAheadMs = getLearnAheadLimitMs();
        const checkWindow = learnAheadMs > 0 ? learnAheadMs : (20 * 60 * 1000);
        const fId = activeFolderIdRef.current;
        const candidateCards = (!fId || fId === 'global')
            ? (filteredCards || [])
            : (filteredCards || []).filter(c => {
                const cFolderId = cardFolders[c.id] || c.folderId || 'unfiled';
                return cFolderId === fId;
            });

        const newlyDueCards = candidateCards.filter(c => {
            if (c.srsEnabled === false) return false;
            const localSrs = sessionSrsData.current[c.id];
            if (localSrs && (localSrs.state || '').toUpperCase() === 'REVIEW') return false;
            if (completedCardIds.current.has(String(c.id))) return false;

            const nextReviewVal = localSrs ? (localSrs.nextReview_back || localSrs.nextReview) : (c.nextReview_back || c.nextReview);
            if (!nextReviewVal) return false;
            const reviewTime = parseNextReviewMs(nextReviewVal);
            return reviewTime > 0 && reviewTime <= (lastTick + checkWindow);
        });

        // When 0 cards are waiting (session 100% completed) -> Render Completion Congratulation Screen
        return (
            <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8 animate-fade-in">
                <div className="w-[600px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-emerald-500/30">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl flex items-center justify-center text-4xl animate-bounce">
                            🎉
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            {t('vocab.completedTitle', 'Hoàn thành phiên ôn tập!')}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                            {newlyDueCards.length > 0
                                ? (t('vocab.completedDescMore', 'Hiện tại có thêm {count} thẻ đến hạn (trong vòng {mins} phút). Bạn có muốn ôn tiếp không?').replace('{count}', newlyDueCards.length).replace('{mins}', Math.round(learnAheadMs / 60000)))
                                : t('vocab.completedDescAll', 'Chúc mừng! Bạn đã hoàn thành xuất sắc tất cả các thẻ từ vựng trong phiên ôn tập này.')}
                        </p>
                    </div>

                    <div className="w-full pt-4">
                        {newlyDueCards.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startFolderReview(newlyDueCards, activeFolderIdRef.current || 'global');
                                    }}
                                    className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 select-none"
                                >
                                    <Repeat2 className="w-4 h-4" />
                                    <span>{(t('vocab.continueReviewing', 'Tiếp tục ôn tập ({count} thẻ)') || '').replace('{count}', newlyDueCards.length)}</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                                    className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 cursor-pointer text-center select-none"
                                >
                                    {t('common.finish', 'Kết thúc')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center w-full">
                                <button
                                    onClick={(e) => { e.stopPropagation(); exitReview(true); }}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center relative z-30 touch-manipulation select-none"
                                >
                                    {t('vocab.finishReviewSession', 'Kết thúc phiên ôn tập')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 bg-transparent">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-8 mt-6 animate-fade-in">



                {/* Unified Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 text-slate-800 dark:text-slate-100 shadow-sm group">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                        <div className="space-y-1.5 text-center md:text-left max-w-lg flex-1">
                            <div className="flex items-center justify-center md:justify-start gap-2.5">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {t('vocab.title', 'Ôn tập Từ vựng')}
                                </h1>
                                {leechVocabCards.length > 0 && (
                                    <button
                                        onClick={() => setShowLeechManager(true)}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                    >
                                        <span>{t('vocab.leechCards', 'Thẻ Khó')} ({leechVocabCards.length})</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {t('vocab.subtitle', 'Củng cố trí nhớ dài hạn bằng phương pháp lặp lại ngắt quãng thông minh.')}
                            </p>
                        </div>

                        <div className="flex flex-row md:flex-col items-center justify-between bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center w-full md:w-64 shrink-0 gap-3">
                            <div className="flex flex-col items-start md:items-center text-left md:text-center">
                                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono leading-none">
                                    {savedSessionInfo ? savedSessionInfo.remaining : globalStats.due}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">{t('vocab.dueWordsLabel', 'TỪ VỰNG ĐẾN HẠN ÔN')}</span>
                            </div>
                            {savedSessionInfo ? (
                                <button
                                    onClick={handleResumeSavedSession}
                                    className="md:mt-2 px-5 py-3 md:w-full rounded-2xl text-xs font-black tracking-wider uppercase transition-all bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-amber-700 text-white flex items-center justify-center gap-2 cursor-pointer shrink-0 min-h-[44px] select-none shadow-sm"
                                >
                                    <Play className="w-4 h-4 fill-white text-white ml-0.5 shrink-0" />
                                    <span>{t('vocab.resumeReviewBtn', 'TIẾP TỤC ÔN TẬP')}</span>
                                </button>
                            ) : globalStats.due > 0 ? (
                                <button
                                    onClick={handleResumeGlobal}
                                    className="md:mt-2 px-5 py-3 md:w-full rounded-2xl text-xs font-black tracking-wider uppercase transition-all bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-sky-700 text-white flex items-center justify-center gap-2 cursor-pointer shrink-0 min-h-[44px] select-none shadow-sm"
                                >
                                    <Play className="w-4 h-4 fill-white text-white ml-0.5 shrink-0" />
                                    <span>{t('vocab.startReviewBtn', 'BẮT ĐẦU ÔN TẬP')}</span>
                                </button>
                            ) : nextDueVocabInfo > 0 ? (
                                <SrsCountdownTimer targetMs={nextDueVocabInfo} onExpire={() => setDashboardTick(Date.now())} />
                            ) : (
                                <button
                                    disabled
                                    className="md:mt-2 px-5 py-3 md:w-full rounded-2xl text-xs font-black tracking-wider uppercase transition-all bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 shrink-0 min-h-[44px] select-none"
                                >
                                    <span>{t('vocab.allReviewed', 'HẾT THẺ ÔN TẬP')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* SRS Forecast Chart */}
                {filteredCards.length > 0 && (
                    <SRSForecastChart
                        items={filteredCards}
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
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('vocab.allDoneGreat', 'Tuyệt vời!')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {allCards.length > 0
                                    ? t('vocab.allDoneDesc', 'Bạn đã ôn tập hết các từ vựng cần học hôm nay. Hãy học thêm bài mới nhé!')
                                    : t('vocab.noCardsInLibrary', 'Bạn chưa có thẻ từ vựng nào trong thư viện.')}
                            </p>
                            {allCards.length === 0 && (
                                <button
                                    onClick={() => navigate(ROUTES.BOOKS)}
                                    className="mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-wider cursor-pointer select-none"
                                >
                                    {t('vocab.goToBookLibrary', 'Đến Thư viện Sách')}
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
                                    title={t('vocab.prevPage', 'Trang trước')}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 overflow-hidden ${isAnimating
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requestStartReview(folder.dueCards, folder.id, `${t('vocab.dueSetsTitle', 'Ôn tập học phần')}: ${folder.name}`);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 border-b-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer min-h-[44px] select-none"
                                            >
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <RotateCw className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                    <span className="font-bold text-xs truncate">{t('vocab.srsReviewBtn', 'Ôn ngắt quãng')}</span>
                                                </div>
                                                <span className="bg-sky-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black font-mono shrink-0">{folder.dueCards.length}</span>
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
                                    title={t('vocab.nextPage', 'Trang sau')}
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
                                {t('vocab.noRecentSets', 'Chưa có học phần nào được học gần đây.')}
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
                                                {t('vocab.setUnit', 'Học phần')} • {set.count} {t('vocab.cardsUnit', 'từ vựng')}
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
                                                title={t('vocab.quickAddWordsToSet', 'Thêm từ vựng nhanh vào học phần này')}
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
            <VocabCardSettingsModal
                isOpen={showSettingsMenu}
                onClose={() => setShowSettingsMenu(false)}
                cardSettings={cardSettings}
                setCardSettings={setCardSettings}
                isKoreanMode={isKoreanMode}
                isEnglishMode={isEnglishMode}
            />

            {showMistakeModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowMistakeModal(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">
                            {t('srs.selectModeTitle', 'Chọn chế độ ôn tập')}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                            {t('vocab.reviewingGroup', 'Bạn đang ôn tập nhóm:')} <span className="font-black text-red-650 dark:text-red-400">{t('vocab.reviewMistakesGroup', 'Từ vựng lỗi sai')}</span> ({mistakeCards.length} {t('vocab.wordsUnit', 'từ')})
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedMistakeMode('flashcard')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'flashcard' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Layers className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('vocab.flashcardMode', 'Thẻ ghi nhớ')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('study')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'study' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <BookOpen className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('vocab.studyMode', 'Học tập')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('meaning')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'meaning' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Edit2 className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('vocab.meaningMode', 'Nhập ý nghĩa')}</span>
                            </button>

                            <button
                                onClick={() => setSelectedMistakeMode('dictation')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1.5 ${selectedMistakeMode === 'dictation' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Headphones className="w-6 h-6" />
                                <span className="font-bold text-xs">{t('vocab.dictationMode', 'Nghe Chép')}</span>
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowMistakeModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                            >
                                {t('common.cancel', 'Huỷ')}
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
                                {t('vocab.startReview', 'Bắt đầu ôn')}
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
                onSaveMnemonic={(item, newText) => handleSaveCardMnemonic(item, newText)}
            />
            <PersonalMnemonicModal
                isOpen={!!editingMnemonicCard}
                onClose={() => setEditingMnemonicCard(null)}
                card={editingMnemonicCard}
                onSaveMnemonic={async (mnemonicText) => {
                    if (editingMnemonicCard) {
                        await handleSaveCardMnemonic(editingMnemonicCard, mnemonicText);
                    }
                }}
            />

            {/* SRS Mode Selection Modal (Flashcard vs Anki Typing) */}
            <SrsModeSelectModal
                isOpen={srsModeModalData.isOpen}
                onClose={() => setSrsModeModalData(prev => ({ ...prev, isOpen: false }))}
                title={srsModeModalData.title}
                cardCount={srsModeModalData.count}
                onSelectMode={(mode) => {
                    setCardSettings(prev => ({ ...prev, reviewType: mode }));
                    startFolderReview(srsModeModalData.cards, srsModeModalData.folderId);
                }}
            />
        </div>
    );
};

export default SRSVocabScreen;
