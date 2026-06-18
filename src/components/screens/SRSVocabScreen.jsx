import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layers, ArrowRight, CheckCircle2, RotateCw, RotateCcw, BookOpen, Calendar, Play, Plus, Zap, Award, ChevronLeft, ChevronRight, Target, Volume2, Settings, Headphones, Edit2, Lightbulb } from 'lucide-react'
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import { useNavigate } from 'react-router-dom';
import useMenuTransition from '../../hooks/useMenuTransition';
import { ROUTES } from '../../router';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { calculateAnkiSRS } from '../../utils/srs';
import { flashCorrect, launchFanfare } from '../../utils/celebrations';
import { playCompletionFanfare } from '../../utils/soundEffects';

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
const getPreviewIntervals = (card) => {
    const srsState = {
        interval: card.srsInterval || 0,
        ease: card.srsEase || 2.5,
        learningStep: card.srsLearningStep !== undefined ? card.srsLearningStep : null,
        isLapsed: card.srsIsLapsed || false,
        reps: card.srsReps || 0,
        lapseCount: card.srsLapseCount || 0,
        prelapseInterval: card.srsPrelapseInterval || null,
        state: card.srsState || null,
        intervalIndex_back: typeof card.intervalIndex_back === 'number' ? card.intervalIndex_back : -1,
        masteryState: card.masteryState || 'not_learned',
        seenCount: typeof card.seenCount === 'number' ? card.seenCount : 0,
        lastReviewed: card.lastReviewed || null
    };

    const ratings = ['again', 'hard', 'good', 'easy'];
    const result = {};
    for (const r of ratings) {
        const preview = calculateAnkiSRS(srsState, r);
        // Convert offset ms to minutes so formatInterval works seamlessly
        result[r] = Math.round((preview.nextReviewOffsetMs || 0) / 60000);
    }
    return result;
};

const SRSVocabScreen = ({
    displayName,
    allCards = [],
    folders = [],
    cardFolders = {},
    setFlashcardCards,
    setNotification,
    playAudio,
    onUpdateVocabSrsRating,
    onRevertVocabSrsRating,
    dailyActivityLogs = [],
    onStudySet,
    onFlashcardSet,
    onMeaningSet,
    onDictationSet,
    awardXP,
    setIsReviewActive
}) => {
    const navigate = useNavigate();
    const fadeWholePage = useMenuTransition();
    const [vocabSetStartIndex, setVocabSetStartIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationDirection, setAnimationDirection] = useState('');

    const handlePrev = (e) => {
        e.stopPropagation();
        if (vocabSetStartIndex > 0) {
            setAnimationDirection('right');
            setIsAnimating(true);
            setVocabSetStartIndex(prev => Math.max(0, prev - 1));
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (vocabSetStartIndex + 3 < folderStats.length) {
            setAnimationDirection('left');
            setIsAnimating(true);
            setVocabSetStartIndex(prev => Math.min(folderStats.length - 3, prev + 1));
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const [showMistakeModal, setShowMistakeModal] = useState(false);
    const [selectedMistakeMode, setSelectedMistakeMode] = useState('flashcard');

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
                synonymFurigana: true
            },
            swapSides: false,
            autoPlayAudio: true
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
                    autoPlayAudio: parsed.autoPlayAudio !== undefined ? parsed.autoPlayAudio : true
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
        return allCards.filter(card => card.needsMistakeReview === true);
    }, [allCards]);

    // Local review queue state
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [reviewMode, setReviewModeState] = useState(false);
    const [reviewHistory, setReviewHistory] = useState([]);
    const sessionXpRef = useRef(0);

    useEffect(() => {
        setShowNuancePopup(false);
    }, [currentReviewIndex, reviewMode]);

    // Safely determine if a card is due
    const isDue = (card) => {
        if (card.srsEnabled !== true) return false;
        if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined || card.intervalIndex_back < 0) return true; // Always due if enabled but never reviewed
        if (!card.nextReview_back) return true; // Due if enabled but has no review time

        const reviewTime = card.nextReview_back instanceof Date
            ? card.nextReview_back.getTime()
            : (card.nextReview_back.seconds
                ? card.nextReview_back.seconds * 1000
                : new Date(card.nextReview_back).getTime());

        return reviewTime <= Date.now();
    };

    // Calculate comprehensive stats for each folder (including completed ones)
    const folderStats = useMemo(() => {
        const stats = {};

        // Initialize stats for all folders
        folders.forEach(f => {
            stats[f.id] = { id: f.id, name: f.name, newCards: [], dueCards: [], total: 0, masteredCount: 0, createdAt: f.createdAt };
        });

        // Unfiled folder
        stats['unfiled'] = { id: 'unfiled', name: 'Từ vựng lẻ', newCards: [], dueCards: [], total: 0, masteredCount: 0, createdAt: null };

        allCards.forEach(card => {
            const fId = cardFolders[card.id] || 'unfiled';
            if (!stats[fId]) {
                stats[fId] = { id: fId, name: 'Học phần ẩn', newCards: [], dueCards: [], total: 0, masteredCount: 0 };
            }
            stats[fId].total++;

            // Seen / Mastered calculation
            if (card.srsEnabled === true && (card.srsReps || 0) >= 5) {
                stats[fId].masteredCount++;
            } else if (card.srsEnabled !== true && (card.seenCount || 0) > 0) {
                // Fallback for non-SRS cards
                stats[fId].masteredCount++;
            }

            // Check if SRS Enabled & Due
            if (isDue(card)) {
                stats[fId].dueCards.push(card);
            }
            // Check if New (not yet added to spaced repetition)
            else if (!card.srsEnabled) {
                stats[fId].newCards.push(card);
            }
        });

        return Object.values(stats)
            .filter(f => f.total > 0) // only folders that have cards
            .map(f => {
                const masteredPct = f.total > 0 ? Math.round((f.masteredCount / f.total) * 100) : 0;

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
                    hasAction: f.newCards.length > 0 || f.dueCards.length > 0
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

    const globalStats = useMemo(() => {
        return folderStats.reduce((acc, curr) => ({
            new: acc.new + curr.newCards.length,
            due: acc.due + curr.dueCards.length,
        }), { new: 0, due: 0 });
    }, [folderStats]);

    const startFolderReview = (dueCards) => {
        if (dueCards.length === 0) return;
        sessionXpRef.current = 0;
        setReviewQueue(shuffleArray([...dueCards]));
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewHistory([]);
        setReviewModeState(true);
        if (setIsReviewActive) {
            setIsReviewActive(true);
        }
    };

    const handleAction = (folderId, actionType, cards) => {
        if (cards.length === 0) return;

        switch (actionType) {
            case 'new':
                // Navigate to the set detail page so user can activate SRS per card
                navigate(`/vocab/set/${folderId || 'unfiled'}`);
                break;
            case 'due':
                startFolderReview(cards);
                break;
        }
    };

    // "Ôn tập" top banner button — only launches SRS-enabled due cards
    const handleResumeGlobal = () => {
        const allDue = allCards.filter(isDue);
        if (allDue.length > 0) {
            startFolderReview(allDue);
        } else {
            if (setNotification) {
                setNotification("Không có thẻ nào cần ôn tập ngắt quãng lúc này. Hãy mở học phần và bấm \"Thêm vào ngắt quãng\"!");
            }
        }
    };

    const handleRating = (rating) => {
        const card = reviewQueue[currentReviewIndex];
        if (!card) return;

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

        // Call parent update vocab srs rating on Firestore asynchronously (no await!)
        if (onUpdateVocabSrsRating) {
            const xp = onUpdateVocabSrsRating(card.id, rating, true);
            sessionXpRef.current += (xp || 0);
        }

        // Play feedback sounds and animations
        try {
            if (rating === 'good' || rating === 'easy') {
                flashCorrect();
            }
        } catch (e) {
            console.error(e);
        }

        if (currentReviewIndex + 1 < reviewQueue.length) {
            setCurrentReviewIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            // Completed queue
            try {
                launchFanfare();
            } catch (e) {
                console.error(e);
            }
            exitReview();
            if (setNotification) {
                setNotification("Chúc mừng! Bạn đã hoàn thành tất cả các thẻ ôn tập hôm nay.");
            }
        }
    };

    const exitReview = () => {
        if (sessionXpRef.current > 0 && awardXP) {
            awardXP(sessionXpRef.current);
        }
        sessionXpRef.current = 0;
        setReviewModeState(false);
        if (setIsReviewActive) {
            setIsReviewActive(false);
        }
    };

    const handleUndo = () => {
        if (reviewHistory.length === 0) return;
        const lastAction = reviewHistory[reviewHistory.length - 1];
        setReviewHistory(prev => prev.slice(0, -1));

        const { cardIndex, cardId, srsFields, isFlipped: wasFlipped } = lastAction;

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

        // Restore index and flipped state
        setCurrentReviewIndex(cardIndex);
        setIsFlipped(wasFlipped || false);
    };

    // Keyboard controls for Flashcards review
    useEffect(() => {
        if (!reviewMode) return;
        const handler = (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                setIsFlipped(f => !f);
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

    // Auto-play audio when card is flipped
    useEffect(() => {
        if (reviewMode && reviewQueue.length > 0 && cardSettings.autoPlayAudio) {
            const currentCard = reviewQueue[currentReviewIndex];
            if (currentCard && currentCard.audioBase64 && isFlipped) {
                playAudio && playAudio(currentCard.audioBase64);
            }
        }
    }, [reviewMode, currentReviewIndex, isFlipped, cardSettings.autoPlayAudio, reviewQueue]);

    // ==================== LOCAL SRS REVIEW MODE ====================
    if (reviewMode && reviewQueue.length > 0) {
        const currentCard = reviewQueue[currentReviewIndex];
        if (currentCard) {
            const previewIntv = getPreviewIntervals(currentCard);
            const intervals = {
                again: formatInterval(previewIntv.again),
                hard: formatInterval(previewIntv.hard),
                good: formatInterval(previewIntv.good),
                easy: formatInterval(previewIntv.easy),
            };
            const progress = Math.round(((currentReviewIndex + 1) / reviewQueue.length) * 100);
            return (
                <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8">
                    <div className="w-[800px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6">
                        {/* Header with Exit */}
                        <div className="w-full flex justify-between items-center">
                            <button
                                onClick={exitReview}
                                className="flex items-center gap-1 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" /> Thoát ôn tập
                            </button>
                            {reviewHistory.length > 0 ? (
                                <button
                                    onClick={handleUndo}
                                    className="flex items-center gap-1 text-sm font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-650 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" /> Quay lại thẻ trước
                                </button>
                            ) : (
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">ÔN TẬP TỪ VỰNG NGẮT QUÃNG</span>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="w-full space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-500" /> Tiến độ</span>
                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{currentReviewIndex + 1} / {reviewQueue.length}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        {/* Flashcard Container Wrapper */}
                        <div className="w-full relative" data-tour-id="FLASHCARD_CONTAINER">
                            {/* Flashcard Container */}
                            <div className="w-full relative" style={{ height: '460px' }}>
                                <Flashcard
                                    card={currentCard}
                                    cardSettings={cardSettings}
                                    isFlipped={isFlipped}
                                    onFlip={() => {
                                        setIsFlipped(!isFlipped);
                                    }}
                                    variant="emerald"
                                    transitionEnabled={true}
                                />
                            </div>

                            {/* Nuance Button - OUTSIDE the flipping container */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNuancePopup(prev => !prev);
                                }}
                                className={`absolute top-6 right-[120px] p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 z-30 shadow-md border ${
                                    currentCard.nuance 
                                        ? 'bg-amber-50 dark:bg-amber-955/40 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100/80 dark:hover:bg-amber-900/60' 
                                        : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-700/90'
                                }`}
                                title="Sắc thái từ vựng"
                            >
                                <Lightbulb className="w-4 h-4" />
                            </button>

                            {/* Nuance Text Box */}
                            {showNuancePopup && (
                                <div 
                                    onClick={(e) => e.stopPropagation()} 
                                    className="absolute top-20 right-6 left-6 z-40 bg-amber-50/95 dark:bg-amber-955/95 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xl animate-fade-in text-slate-850 dark:text-slate-200"
                                >
                                    <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2 mb-2">
                                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                                            <Lightbulb className="w-4 h-4 fill-amber-300 animate-pulse" />
                                            <span>Sắc thái từ vựng</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-bold px-2 py-1 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                                        {currentCard.nuance || "Chưa có thông tin sắc thái cho từ vựng này."}
                                    </p>
                                </div>
                            )}

                            {/* Speaker Button - OUTSIDE the flipping container */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentCard && currentCard.audioBase64) {
                                        playAudio && playAudio(currentCard.audioBase64);
                                    }
                                }}
                                data-tour-id="FLASHCARD_SPEAKER"
                                className="absolute top-6 right-18 p-2.5 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-110 active:scale-95 z-30 shadow-md border border-slate-200 dark:border-slate-700"
                                title="Phát âm"
                            >
                                <Volume2 className="w-4 h-4" />
                            </button>

                            {/* Settings Button - OUTSIDE the flipping container */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                className="absolute top-6 right-6 p-2.5 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/90 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-110 active:scale-95 z-30 shadow-md border border-slate-200 dark:border-slate-700"
                                title="Cấu hình hiển thị"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Rating Buttons */}
                        <div className="grid grid-cols-4 gap-3 w-full animate-fade-in" data-tour-id="RATING_PANEL">
                            {[
                                { key: 'again', label: 'Quên rồi', interval: intervals.again, bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/50', text: 'text-red-600 dark:text-red-400', sub: 'text-red-400/80 dark:text-red-500/60' },
                                { key: 'hard', label: 'Khó', interval: intervals.hard, bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/50', text: 'text-orange-600 dark:text-orange-400', sub: 'text-orange-400/80 dark:text-orange-500/60' },
                                { key: 'good', label: 'Tốt', interval: intervals.good, bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/50', text: 'text-emerald-600 dark:text-emerald-400', sub: 'text-emerald-400/80 dark:text-emerald-500/60' },
                                { key: 'easy', label: 'Dễ', interval: intervals.easy, bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900/50', text: 'text-blue-600 dark:text-blue-400', sub: 'text-blue-400/80 dark:text-blue-500/60' },
                            ].map(btn => (
                                <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRating(btn.key); }}
                                    className={`py-3.5 rounded-2xl ${btn.bg} ${btn.border} border text-center transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer`}>
                                    <div className={`font-bold ${btn.text} text-sm`}>{btn.label}</div>
                                    <div className={`text-[10px] ${btn.sub} mt-0.5 font-medium`}>{btn.interval}</div>
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
    }

    return (
        <div className="min-h-screen pb-24 bg-transparent">
            <TopTabBar tabs={VOCAB_TABS} />
            <div className="max-w-5xl mx-auto space-y-8 px-4 md:px-8 mt-6 animate-fade-in">

                {/* Today's Focus Overview Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col lg:flex-row gap-6 justify-between items-stretch">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                    <div className="flex-1 space-y-6 z-10 flex flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 border border-sky-500/30 rounded-full text-[10px] font-black text-sky-300 tracking-wider uppercase mb-3">
                                <Zap className="w-3 h-3 text-sky-400 fill-current" />
                                Mục tiêu hôm nay
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black mb-1.5 tracking-tight">Mục tiêu hôm nay</h1>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">
                                Bạn đang tiến bộ rất tốt, {displayName || 'người dùng'}.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            <div className="flex gap-4">
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 min-w-[120px]">
                                    <div className="text-2xl font-black text-orange-400 mb-0.5">{globalStats.due}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SRS cần ôn</div>
                                </div>
                            </div>
                            {globalStats.due > 0 ? (
                                <button
                                    onClick={handleResumeGlobal}
                                    className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Ôn tập ngắt quãng
                                </button>
                            ) : (
                                <p className="text-[11px] text-slate-400 italic leading-relaxed max-w-[180px]">
                                    Mở học phần → bấm "Thêm vào ngắt quãng" để bắt đầu.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right side Mastery Streak panel */}
                    <div className="w-full lg:w-80 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col justify-between z-10 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-200">Chuỗi học tập</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Hãy tiếp tục học để duy trì chuỗi học tập!</p>
                            </div>
                            <Award className="w-8 h-8 text-amber-400" />
                        </div>
                        <div className="space-y-2">
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                {streak} <span className="text-xs font-bold text-slate-400 uppercase">Ngày</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${streakPct}%` }} />
                            </div>
                            <p className="text-[10px] text-amber-300 font-bold tracking-wide">
                                {streak > 0
                                    ? `${streak} ngày liên tục học tập chăm chỉ!`
                                    : "Bắt đầu học tập ngay để thiết lập chuỗi ngày học!"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Vocabulary Sets Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">Học phần từ vựng</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chọn một học phần để bắt đầu phiên học tập.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(ROUTES.VOCAB_LIST)}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {folderStats.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-gray-100 dark:border-slate-700/50 shadow-sm">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Tuyệt vời!</h3>
                            <p className="text-gray-500 dark:text-gray-400">Bạn chưa có thẻ từ vựng nào trong thư viện.</p>
                            <button onClick={() => navigate(ROUTES.BOOKS)} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-75 transition-colors text-xs cursor-pointer">
                                Đến Thư viện Sách
                            </button>
                        </div>
                    ) : (
                        <div className="relative px-8">
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
                                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer z-30"
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden ${
                                isAnimating 
                                    ? (animationDirection === 'left' ? 'animate-slide-in-right' : 'animate-slide-in-left')
                                    : ''
                            }`}>
                                {folderStats.slice(vocabSetStartIndex, vocabSetStartIndex + 3).map(folder => (
                                    <div
                                        key={folder.id}
                                        onClick={() => navigate(`/vocab/set/${folder.id}`)}
                                        className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-305 flex flex-col justify-between space-y-4 cursor-pointer hover:border-indigo-500/50 dark:hover:border-indigo-400/50"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start gap-3 w-full">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-extrabold text-lg text-gray-800 dark:text-white leading-tight line-clamp-1">{folder.name}</h3>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wide">
                                                        Đã thuộc {folder.masteredPct}%
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold shrink-0 mt-1">{folder.total} Thẻ</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons inside Card */}
                                        <div className="space-y-2 pt-2">
                                            {folder.newCards.length > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/vocab/set/${folder.id}`); }}
                                                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 transition-colors border border-cyan-100 dark:border-cyan-900/50 group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Layers className="w-4 h-4" />
                                                        <span className="font-bold text-xs">Thêm vào ngắt quãng</span>
                                                    </div>
                                                    <span className="bg-cyan-200/60 dark:bg-cyan-900/80 px-2 py-0.5 rounded-full text-[10px] font-black">{folder.newCards.length}</span>
                                                </button>
                                            )}

                                            {folder.dueCards.length > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startFolderReview(folder.dueCards); }}
                                                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors border border-orange-100 dark:border-orange-900/50 group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <RotateCw className="w-4 h-4" />
                                                        <span className="font-bold text-xs">Ôn tập ngắt quãng</span>
                                                    </div>
                                                    <span className="bg-orange-200/60 dark:bg-orange-900/80 px-2 py-0.5 rounded-full text-[10px] font-black">{folder.dueCards.length}</span>
                                                </button>
                                            )}

                                            {!folder.hasAction && (
                                                <div className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs border border-dashed border-slate-200 dark:border-slate-700/60">
                                                    ✓ Không có thẻ cần ôn tập hôm nay
                                                </div>
                                            )}
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

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate(ROUTES.VOCAB_ADD)}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">Thêm từ vựng mới</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Học danh sách từ vựng mới hoặc nhập từ các bộ sách.</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => {
                            if (mistakeCards.length > 0) {
                                setShowMistakeModal(true);
                            } else {
                                if (setNotification) {
                                    setNotification("Tuyệt vời! Bạn không có lỗi sai nào cần ôn tập.");
                                }
                            }
                        }}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                                <RotateCw className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-800 dark:text-white">Ôn tập lỗi sai</h3>
                                    {mistakeCards.length > 0 && (
                                        <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-black">
                                            {mistakeCards.length}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tập trung ôn tập những thẻ cần lặp lại.</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Last Studied Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">Học gần đây</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                        {recentSets.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 py-2 italic">
                                Chưa có học phần nào được học gần đây.
                            </p>
                        ) : (
                            recentSets.map(set => (
                                <div
                                    key={set.id}
                                    onClick={() => navigate(`/vocab/set/${set.id}`)}
                                    className="flex items-center justify-between py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-2 rounded-xl transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {set.name}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
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
                                                className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                                                title="Thêm từ vựng nhanh vào học phần này"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                            {formatTimeAgo(set.timestamp)}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
        </div>
    );
};

export default SRSVocabScreen;
