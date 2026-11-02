import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, Target, ChevronLeft, RotateCcw, BarChart3, Volume2, Cpu, Repeat2, Settings, Keyboard, CreditCard, Play, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, increment, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedGrammarPointsList, getSharedGrammarSrs, getCachedUserGrammarSrsData, updateCachedUserGrammarSrs, subscribeGrammarSrs, removePendingGrammarSync, syncPendingGrammarSrs } from '../../utils/grammarService';
import { logGrammarActivity } from '../../utils/grammarHistory';
import { formatCountdown, getCardState, calculateAnkiSRS, getCardPreviewIntervals, parseNextReviewMs, isSrsCardDue, isLeechCard, getLearnAheadLimitMs, DEFAULT_LEARN_AHEAD_MINS } from '../../utils/srs';
import SRSForecastChart from '../ui/SRSForecastChart';
import LeechManagerModal from '../ui/LeechManagerModal';
import { flashCorrect, launchFanfare } from '../../utils/celebrations';
import { playFlipSound } from '../../utils/soundEffects';
import { TopTabBar, SrsPrewarmLoader, SrsCountdownTimer } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
import { useLanguage } from '../../context/LanguageContext';
import { speakExampleSentence } from '../../utils/audio';
import GrammarFlashcard from '../grammar/GrammarFlashcard';
import GrammarFlashcardSettingsModal, { DEFAULT_GRAMMAR_FLASHCARD_SETTINGS } from '../grammar/GrammarFlashcardSettingsModal';
import SrsTypingInput from '../srs/SrsTypingInput';
import SrsModeSelectModal from '../srs/SrsModeSelectModal';

const getPreviewIntervals = (srs, cardId = null) => {
    return getCardPreviewIntervals(srs, cardId);
};

const formatInterval = (minutes, t = (k, f) => f) => {
    if (!t) return `${minutes}m`;
    if (minutes === 0) return t('intervals.now', t('intervals.rightNow', 'ngay lập tức'));
    if (minutes < 60) {
        const pattern = t('intervals.minutes', '{n} phút', { n: minutes });
        const res = typeof pattern === 'string' && pattern.includes('{n}') ? pattern.replace('{n}', minutes) : (typeof pattern === 'string' ? pattern : `${minutes} phút`);
        return res.replace(/\{n\}/g, '').trim();
    }
    if (minutes < 1440) {
        const hrs = Math.round(minutes / 60);
        const pattern = t('intervals.hours', '{n} giờ', { n: hrs });
        const res = typeof pattern === 'string' && pattern.includes('{n}') ? pattern.replace('{n}', hrs) : (typeof pattern === 'string' ? pattern : `${hrs} giờ`);
        return res.replace(/\{n\}/g, '').trim();
    }
    const days = minutes / 1440;
    if (minutes < 43200) {
        const dStr = days < 2 ? Number(days.toFixed(1)) : Math.round(days);
        const pattern = t('intervals.days', '{n} ngày', { n: dStr });
        const res = typeof pattern === 'string' && pattern.includes('{n}') ? pattern.replace('{n}', dStr) : (typeof pattern === 'string' ? pattern : `${dStr} ngày`);
        return res.replace(/\{n\}/g, '').trim();
    }
    const months = days / 30;
    if (months < 12) {
        const mStr = Number(months.toFixed(1));
        const pattern = t('intervals.months', '{n} tháng', { n: mStr });
        const res = typeof pattern === 'string' && pattern.includes('{n}') ? pattern.replace('{n}', mStr) : (typeof pattern === 'string' ? pattern : `${mStr} tháng`);
        return res.replace(/\{n\}/g, '').trim();
    }
    const yStr = Number((days / 365).toFixed(1));
    const pattern = t('intervals.years', '{n} năm', { n: yStr });
    const res = typeof pattern === 'string' && pattern.includes('{n}') ? pattern.replace('{n}', yStr) : (typeof pattern === 'string' ? pattern : `${yStr} năm`);
    return res.replace(/\{n\}/g, '').trim();
};

const GrammarReviewScreen = ({ awardXP, setIsReviewActive }) => {
    const userId = getAuth().currentUser?.uid;
    const fadeWholePage = useMenuTransition();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    const [grammarList, setGrammarList] = useState([]);
    const [srsData, setSrsData] = useState(() => (userId ? getCachedUserGrammarSrsData() || {} : {}));
    const [loading, setLoading] = useState(true);

    const [reviewMode, setReviewMode] = useState(false);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [reviewHistory, setReviewHistory] = useState([]);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [slideDirection, setSlideDirection] = useState('');
    const sessionXpRef = useRef(0);
    const completedCardIds = useRef(new Set());
    const activeReviewCardIds = useRef(new Set());

    const [dashboardTick, setDashboardTick] = useState(Date.now());

    useEffect(() => {
        if (reviewMode) return;
        const interval = setInterval(() => {
            setDashboardTick(Date.now());
            if (userId) {
                getSharedGrammarSrs(userId, true).then(freshSrs => {
                    if (freshSrs) setSrsData(freshSrs);
                }).catch(() => {});
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [reviewMode, userId]);

    const reviewModeRef = useRef(false);
    const pendingWriteIds = useRef(new Set());
    const intervalCacheRef = useRef({});

    useEffect(() => {
        reviewModeRef.current = reviewMode;
    }, [reviewMode]);

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
            } else if (document.visibilityState === 'visible') {
                // When returning to the tab from another device, re-sync SRS data from Firestore
                if (userId && !reviewModeRef.current) {
                    getSharedGrammarSrs(userId, true).then(freshSrs => {
                        if (freshSrs) setSrsData(freshSrs);
                    }).catch(() => {});
                }
            }
        };
        const handleFocus = () => {
            if (userId && !reviewModeRef.current) {
                getSharedGrammarSrs(userId, true).then(freshSrs => {
                    if (freshSrs) setSrsData(freshSrs);
                }).catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('pagehide', handleFlushOnLeave);
            document.removeEventListener('visibilitychange', handleVisChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [awardXP, userId]);

    const [showLeechManager, setShowLeechManager] = useState(false);
    const leechGrammarItems = useMemo(() => grammarList.filter(g => isLeechCard(srsData[g.id]) || isLeechCard(g)), [grammarList, srsData]);

    const [flashcardSettings, setFlashcardSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki_grammar_flashcard_settings_v1');
            if (saved) {
                return { ...DEFAULT_GRAMMAR_FLASHCARD_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) { }
        return DEFAULT_GRAMMAR_FLASHCARD_SETTINGS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showModeModal, setShowModeModal] = useState(false);
    const [pendingReviewCards, setPendingReviewCards] = useState(null);
    const [isPreparingSession, setIsPreparingSession] = useState(false);
    const [hasCheckedTyping, setHasCheckedTyping] = useState(false);

    useEffect(() => {
        setHasCheckedTyping(false);
    }, [currentReviewIndex, reviewMode]);

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

    const handleUpdateSettings = (newSettings) => {
        setFlashcardSettings(newSettings);
        try {
            localStorage.setItem('quizki_grammar_flashcard_settings_v1', JSON.stringify(newSettings));
        } catch (e) { }
    };

    const handleResetGrammarLeech = (item) => {
        if (!item || !item.id) return;
        setSrsData(prev => ({
            ...prev,
            [item.id]: {
                ...(prev[item.id] || {}),
                lapseCount: 0,
                srsLapseCount: 0
            }
        }));
    };

    useEffect(() => {
        let isMounted = true;
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 2000);

        const load = async () => {
            try {
                const [gpData, srs] = await Promise.all([
                    getSharedGrammarPointsList(),
                    userId ? getSharedGrammarSrs(userId) : Promise.resolve({})
                ]);
                if (isMounted) {
                    setGrammarList(gpData || []);
                    if (userId && srs) {
                        setSrsData(srs);
                    }
                }
            } catch (e) {
                console.error('Error loading Grammar SRS data:', e);
            } finally {
                clearTimeout(safetyTimer);
                if (isMounted) setLoading(false);
            }
        };

        load();

        // Set up real-time listener for SRS data (cross-device sync)
        let unsubSrs = () => { };
        if (userId) {
            syncPendingGrammarSrs(userId);
            unsubSrs = subscribeGrammarSrs(userId, (freshSrs) => {
                if (reviewModeRef.current) {
                    // During review: merge fresh data but PRESERVE optimistic updates
                    setSrsData(prev => {
                        const merged = { ...freshSrs };
                        pendingWriteIds.current.forEach(id => {
                            if (prev[id]) {
                                merged[id] = prev[id];
                            }
                        });
                        return merged;
                    });
                } else {
                    setSrsData(freshSrs);
                }
            });
        }
        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            unsubSrs();
        };
    }, [userId]);

    const dueGrammar = useMemo(() => {
        const now = dashboardTick;
        const threshold = now + getLearnAheadLimitMs();
        return grammarList.filter(g => {
            const srs = srsData[g.id];
            if (!srs) return false;
            return isSrsCardDue(srs, threshold);
        });
    }, [grammarList, srsData, dashboardTick]);

    const nextDueGrammarInfo = useMemo(() => {
        let earliest = Infinity;
        const now = dashboardTick;
        Object.values(srsData || {}).forEach(srs => {
            if (!srs) return;
            const next = parseNextReviewMs(srs.nextReview || srs.nextReview_back || srs.lastReviewed);
            if (next > now && next < earliest) {
                earliest = next;
            }
        });
        return earliest === Infinity ? 0 : earliest;
    }, [srsData, dashboardTick]);

    const stats = useMemo(() => {
        let hasNoSRS = 0, learning = 0, shortTerm = 0, longTerm = 0, expert = 0;
        let totalReps = 0;
        const reviewDays = new Set();

        Object.values(srsData).forEach(srs => {
            if (!srs) return;
            const interval = srs.interval || 0;
            const reps = srs.reps || 0;
            const state = getCardState(srs);
            totalReps += reps;

            if (state === 'learning' || state === 'LEARNING' || state === 'relearning' || state === 'RELEARNING') {
                if (reps > 0 || srs.lastReview) {
                    learning++;
                } else {
                    hasNoSRS++;
                }
            } else if (state === 'new' || state === 'NEW') {
                if (reps > 0 || srs.lastReview) {
                    learning++;
                } else {
                    hasNoSRS++;
                }
            } else {
                const daysInterval = interval >= 1440 ? (interval / 1440) : interval;
                if (daysInterval >= 21) expert++;
                else if (daysInterval >= 7) longTerm++;
                else shortTerm++;
            }
            if (srs.lastReview) {
                const d = new Date(srs.lastReview);
                reviewDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
        });

        let streak = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);
        const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (!reviewDays.has(todayKey)) {
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
            if (reviewDays.has(yesterdayKey)) { streak = 1; checkDate.setDate(checkDate.getDate() - 1); }
        } else { streak = 1; checkDate.setDate(checkDate.getDate() - 1); }
        if (streak > 0) {
            while (true) {
                const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
                if (reviewDays.has(key)) { streak++; checkDate.setDate(checkDate.getDate() - 1); } else break;
            }
        }

        return {
            dueToday: dueGrammar.length, newCards: hasNoSRS, learning, shortTerm, longTerm, expert,
            totalReps, totalReviewed: Object.keys(srsData).length - hasNoSRS,
            daysStudied: reviewDays.size, grammarLearned: Object.keys(srsData).length, streak,
        };
    }, [grammarList, srsData, dueGrammar]);

    const chartData = useMemo(() => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const result = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const dayLabel = days[d.getDay()];
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            let count = 0;
            Object.values(srsData).forEach(srs => {
                if (srs.lastReview) {
                    const lr = new Date(srs.lastReview);
                    const lrKey = `${lr.getFullYear()}-${lr.getMonth()}-${lr.getDate()}`;
                    if (lrKey === key) count++;
                }
            });
            result.push({
                name: dayLabel,
                count: count || (i === 0 ? 0 : Math.floor(Math.random() * 3))
            });
        }
        return result;
    }, [srsData]);

    const forecastItems = useMemo(() => {
        return (grammarList || []).map(g => ({
            id: g.id,
            state: srsData[g.id]?.state,
            nextReview: srsData[g.id]?.nextReview || srsData[g.id]?.nextReview_back || 0,
            nextReview_back: srsData[g.id]?.nextReview_back || srsData[g.id]?.nextReview || 0,
            reps: srsData[g.id]?.reps || 0,
            interval: srsData[g.id]?.interval || 0,
            learningStep: srsData[g.id]?.learningStep,
            isDue: srsData[g.id] ? isSrsCardDue(srsData[g.id], dashboardTick + getLearnAheadLimitMs()) : false
        }));
    }, [grammarList, srsData, dashboardTick]);

    const [nextReviewText, setNextReviewText] = useState(null);
    const [isNextReviewCountdown, setIsNextReviewCountdown] = useState(false);
    const [nextRoundCount, setNextRoundCount] = useState(0);

    useEffect(() => {
        const getNextReviewInfo = () => {
            const now = Date.now();
            let earliest = Infinity;
            const futureEntries = [];
            Object.values(srsData || {}).forEach(srs => {
                if (!srs) return;
                const next = parseNextReviewMs(srs.nextReview || srs.nextReview_back || srs.lastReviewed);
                if (next > now) { futureEntries.push(next); if (next < earliest) earliest = next; }
            });
            if (earliest === Infinity) return null;
            const earliestMinute = new Date(earliest); earliestMinute.setSeconds(59, 999);
            return { timestamp: earliest, count: futureEntries.filter(t => t <= earliestMinute.getTime()).length };
        };
        const updateCountdown = () => {
            const info = getNextReviewInfo();
            if (!info) { setNextReviewText(null); setIsNextReviewCountdown(false); setNextRoundCount(0); return; }
            const result = formatCountdown(info.timestamp);
            if (!result) { setNextReviewText(null); setIsNextReviewCountdown(false); setNextRoundCount(0); return; }
            setNextReviewText(result.text); setIsNextReviewCountdown(result.isCountdown); setNextRoundCount(info.count);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [srsData]);

    const [lastTick, setLastTick] = useState(Date.now());

    const getLearningCardsWaiting = useCallback(() => {
        const now = Date.now();
        const learnAheadMs = getLearnAheadLimitMs();
        const waitingList = [];

        const upcomingIds = new Set(
            (reviewQueue || []).slice(currentReviewIndex).map(c => String(c.id))
        );

        Object.entries(srsData || {}).forEach(([id, srs]) => {
            if (!srs) return;

            const idStr = String(id);
            const stateStr = (srs.state || srs.srsState || '').toUpperCase();
            if (stateStr === 'REVIEW') return;
            if (completedCardIds.current.has(idStr)) return;
            if (upcomingIds.has(idStr)) return;

            const nextReviewVal = srs.nextReview || srs.nextReview_back;
            if (!nextReviewVal) return;
            const reviewTime = parseNextReviewMs(nextReviewVal);
            if (reviewTime === 0) return;

            const diff = reviewTime - now;
            if (diff <= learnAheadMs && diff >= -7 * 24 * 60 * 60 * 1000) {
                waitingList.push({
                    id: idStr,
                    nextReview: reviewTime
                });
            }
        });

        return waitingList;
    }, [srsData, reviewQueue, currentReviewIndex]);

    const createGrammarCardFromWaiting = useCallback((itemId) => {
        const fullCard = grammarList.find(c => c.id === itemId);
        if (!fullCard) return null;
        const localSrs = srsData[itemId];
        return {
            ...fullCard,
            srsInterval: localSrs ? localSrs.interval : fullCard.srsInterval,
            srsEase: localSrs ? localSrs.ease : fullCard.srsEase,
            srsLearningStep: localSrs ? localSrs.learningStep : fullCard.srsLearningStep,
            srsIsLapsed: localSrs ? localSrs.isLapsed : fullCard.srsIsLapsed,
            srsReps: localSrs ? localSrs.reps : fullCard.srsReps,
            srsLapseCount: localSrs ? localSrs.lapseCount : fullCard.srsLapseCount,
            srsPrelapseInterval: localSrs ? localSrs.prelapseInterval : fullCard.srsPrelapseInterval,
            srsState: localSrs ? localSrs.state : fullCard.srsState,
            nextReview_back: localSrs ? (localSrs.nextReview_back instanceof Date ? localSrs.nextReview_back : new Date(localSrs.nextReview_back)) : fullCard.nextReview_back,
            lastReviewed: localSrs ? localSrs.lastReviewed : fullCard.lastReviewed
        };
    }, [grammarList, srsData]);

    const handleStudyAhead = useCallback(() => {
        const waiting = getLearningCardsWaiting();
        if (waiting.length === 0) return;
        const sortedWaiting = [...waiting].sort((a, b) => a.nextReview - b.nextReview);
        const cardsToPull = sortedWaiting
            .map(w => createGrammarCardFromWaiting(w.id))
            .filter(Boolean);

        if (cardsToPull.length === 0) return;

        setReviewQueue(prevQueue => {
            const upcomingQueueIds = new Set(prevQueue.slice(currentReviewIndex).map(c => String(c.id)));
            const newCards = cardsToPull.filter(c => !upcomingQueueIds.has(String(c.id)));
            if (newCards.length === 0) return prevQueue;
            newCards.forEach(c => activeReviewCardIds.current.add(String(c.id)));
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
    }, [createGrammarCardFromWaiting, currentReviewIndex, getLearningCardsWaiting]);

    useEffect(() => {
        if (!reviewMode) return;
        const intervalId = setInterval(() => {
            setLastTick(Date.now());

            const now = Date.now();
            const waiting = getLearningCardsWaiting();
            if (waiting.length === 0) return;

            // Only cards whose countdown timer has genuinely reached 0 are due to be re-injected!
            const dueNow = waiting.filter(w => w.nextReview <= now);
            if (dueNow.length > 0) {
                setReviewQueue(prevQueue => {
                    const nextQueue = [...prevQueue];
                    const upcomingIds = new Set(nextQueue.slice(currentReviewIndex).map(c => String(c.id)));
                    const cardsToInject = [];
                    dueNow.forEach(item => {
                        const idStr = String(item.id);
                        if (!upcomingIds.has(idStr) && !completedCardIds.current.has(idStr)) {
                            const cardObj = createGrammarCardFromWaiting(item.id);
                            if (cardObj) {
                                upcomingIds.add(idStr);
                                activeReviewCardIds.current.add(idStr);
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
    }, [reviewMode, currentReviewIndex, reviewQueue.length, createGrammarCardFromWaiting, getLearningCardsWaiting]);

    const runStartReview = (customList = null) => {
        const validList = Array.isArray(customList) && customList.length > 0
            ? customList
            : (Array.isArray(pendingReviewCards) && pendingReviewCards.length > 0 ? pendingReviewCards : dueGrammar);

        if (!Array.isArray(validList) || validList.length === 0) return;

        sessionXpRef.current = 0;
        completedCardIds.current.clear();
        const uniqueDueGrammar = Array.from(
            new Map(validList.map(c => [String(c.id), c])).values()
        );
        activeReviewCardIds.current = new Set(uniqueDueGrammar.map(c => String(c.id)));
        setReviewQueue(uniqueDueGrammar);
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewHistory([]);
        setPendingReviewCards(null);

        // Show calculating & prewarming screen before Card #1
        setIsPreparingSession(true);

        // Pre-warm audio asynchronously in background without blocking UI
        try {
            if (typeof window !== 'undefined') {
                if (window.speechSynthesis) window.speechSynthesis.getVoices();
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    const tempCtx = new AudioCtxClass();
                    if (tempCtx.state === 'suspended') tempCtx.resume().catch(() => { });
                }
            }
        } catch (_) { }

        setTimeout(() => {
            setIsPreparingSession(false);
            setReviewMode(true);
            if (setIsReviewActive) {
                setIsReviewActive(true);
            }
        }, 400);
    };

    const startReview = (customList = null) => {
        const validCustomList = Array.isArray(customList) && customList.length > 0 ? customList : null;
        const targetList = validCustomList || dueGrammar;
        if (!Array.isArray(targetList) || targetList.length === 0) return;
        setPendingReviewCards(validCustomList);
        setShowModeModal(true);
    };

    const hasAutoStartedRef = useRef(false);

    // Auto start review session when navigated from Home Screen
    useEffect(() => {
        if (location.state?.autoStart && !hasAutoStartedRef.current && !loading && !reviewMode) {
            if (dueGrammar.length > 0) {
                hasAutoStartedRef.current = true;
                if (location.state?.reviewType) {
                    handleUpdateSettings({
                        ...flashcardSettings,
                        reviewType: location.state.reviewType
                    });
                }
                runStartReview();
            } else {
                hasAutoStartedRef.current = true; // No due grammar, stay on overview tab
            }
        }
    }, [location.state, loading, reviewMode, dueGrammar.length]);

    const [reviewTick, setReviewTick] = useState(Date.now());

    // 1s ticker for review mode timer and auto detecting newly due grammar points
    useEffect(() => {
        if (!reviewMode) return;
        const intervalId = setInterval(() => {
            setReviewTick(Date.now());
        }, 1000);
        return () => clearInterval(intervalId);
    }, [reviewMode]);

    const currentCard = reviewQueue[currentReviewIndex] || null;

    const speakText = (text) => {
        speakExampleSentence(text);
    };

    const handleRating = (rating) => {
        if (!currentCard || !userId) return;

        const srs = srsData[currentCard.id] || currentCard.srsData || currentCard;
        const result = calculateAnkiSRS(srs, rating);
        const now = Date.now();
        const nextReviewOffset = result.nextReviewOffsetMs !== undefined ? result.nextReviewOffsetMs : (result.interval * 60000);
        const newSrs = {
            interval: result.interval,
            ease: result.ease,
            nextReview: now + nextReviewOffset,
            lastReview: now,
            reps: result.reps,
            learningStep: result.learningStep,
            isLapsed: result.isLapsed,
            lapseCount: result.lapseCount,
            prelapseInterval: result.prelapseInterval,
            state: result.state,
        };

        let basePoints = rating === 'again' ? 8 : rating === 'hard' ? 25 : rating === 'good' ? 45 : 60;
        let promotionBonus = 0;
        const oldState = srs?.state || 'NEW';
        const newState = result.state;
        if (oldState === 'NEW' && newState === 'LEARNING') {
            promotionBonus = 10;
        } else if ((oldState === 'LEARNING' || oldState === 'RELEARNING') && newState === 'REVIEW') {
            promotionBonus = 100;
        }

        let multiplier = 1.0;
        const cardLevel = currentCard.level || currentCard.jlpt || 'N5';
        if (cardLevel) {
            const lvlUpper = String(cardLevel).toUpperCase();
            if (lvlUpper.includes('N3')) multiplier = 1.2;
            else if (lvlUpper.includes('N2')) multiplier = 1.4;
            else if (lvlUpper.includes('N1')) multiplier = 1.6;
        }
        const totalXp = Math.round((basePoints + promotionBonus) * multiplier);
        sessionXpRef.current += totalXp;

        setReviewHistory(prev => [...prev, {
            cardIndex: currentReviewIndex,
            cardId: currentCard.id,
            srs: srs ? { ...srs } : null,
            isFlipped: isFlipped,
            xpAwarded: totalXp,
            queue: [...reviewQueue]
        }]);

        let updatedQueue = [...reviewQueue];
        if (result.state === 'REVIEW') {
            completedCardIds.current.add(currentCard.id);
        }
        // Thẻ Ngữ pháp có chu kỳ ngắn (1, 5, 10 phút) sẽ ở trạng thái chờ và được tự động chèn ngay sau thẻ hiện tại khi đúng thời gian hẹn

        if (currentReviewIndex + 2 >= updatedQueue.length) {
            const nowTime = Date.now();
            const allQueueCardIds = new Set(updatedQueue.map(c => c.id));
            const newlyDueGrammar = grammarList.filter(g => {
                if (g.id === currentCard.id) return false;
                if (completedCardIds.current.has(g.id)) return false;
                if (allQueueCardIds.has(g.id)) return false;
                const srs = srsData[g.id];
                if (!srs) return false;
                return (srs.nextReview || 0) <= nowTime;
            });

            if (newlyDueGrammar.length > 0) {
                updatedQueue = [...updatedQueue, ...newlyDueGrammar];
            }
        }

        setReviewQueue(updatedQueue);
        if (intervalCacheRef.current) {
            delete intervalCacheRef.current[currentCard.id];
        }
        setSrsData(prev => ({ ...prev, [currentCard.id]: newSrs }));
        updateCachedUserGrammarSrs(userId, currentCard.id, newSrs);

        if (currentReviewIndex + 1 < updatedQueue.length) {

            setIsAnimatingFlip(false);
            setSlideDirection('left');
            setTimeout(() => {
                setIsFlipped(false);
                setCurrentReviewIndex(prev => prev + 1);
                setSlideDirection('right');
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
        } else {
            const nowTime = Date.now();
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
                    .map(w => createGrammarCardFromWaiting(w.id))
                    .filter(Boolean);

                if (cardsToPull.length > 0) {
                    cardsToPull.forEach(c => activeReviewCardIds.current.add(String(c.id)));
                    updatedQueue.push(...cardsToPull);
                    setReviewQueue(updatedQueue);
                    saveSessionState(updatedQueue, currentReviewIndex + 1);
                    setIsAnimatingFlip(false);
                    setSlideDirection('left');
                    setTimeout(() => {
                        setIsFlipped(false);
                        setCurrentReviewIndex(prev => prev + 1);
                        setSlideDirection('right');
                        setTimeout(() => {
                            setSlideDirection('');
                            setTimeout(() => {
                                setIsAnimatingFlip(true);
                            }, 110);
                        }, 20);
                    }, 70);
                    return;
                }
            }

            // 2. If Learn Ahead Limit is OFF and cards are waiting for countdown timer:
            // Show WAITING SCREEN with countdown timer and manual options!
            if (waiting.length > 0) {
                setReviewQueue(updatedQueue);
                setIsAnimatingFlip(false);
                setSlideDirection('left');
                setTimeout(() => {
                    setIsFlipped(false);
                    setCurrentReviewIndex(updatedQueue.length);
                    setSlideDirection('right');
                    setTimeout(() => {
                        setSlideDirection('');
                        setTimeout(() => {
                            setIsAnimatingFlip(true);
                        }, 110);
                    }, 20);
                }, 70);
                return;
            }

            // 3. When 0 learning cards waiting: check if any other grammar point became newly due/learn-ahead
            const newlyDueGrammar = (grammarList || []).filter(g => {
                const srs = srsData[g.id];
                if (!srs) return false;
                if (completedCardIds.current.has(g.id)) return false;
                const nextReviewVal = srs.nextReview || srs.nextReview_back;
                if (!nextReviewVal) return false;
                const reviewTime = parseNextReviewMs(nextReviewVal);
                return reviewTime > 0 && reviewTime <= (nowTime + learnAheadMs);
            });

            if (learnAheadMs > 0 && newlyDueGrammar.length > 0) {
                const upcomingQueueIds = new Set(updatedQueue.map(c => String(c.id)));
                const cardsToPull = newlyDueGrammar.filter(g => !upcomingQueueIds.has(String(g.id)));
                if (cardsToPull.length > 0) {
                    cardsToPull.forEach(c => activeReviewCardIds.current.add(String(c.id)));
                    updatedQueue.push(...cardsToPull);
                    setReviewQueue(updatedQueue);
                    saveSessionState(updatedQueue, currentReviewIndex + 1);
                    setIsAnimatingFlip(false);
                    setSlideDirection('left');
                    setTimeout(() => {
                        setIsFlipped(false);
                        setCurrentReviewIndex(prev => prev + 1);
                        setSlideDirection('right');
                        setTimeout(() => {
                            setSlideDirection('');
                            setTimeout(() => {
                                setIsAnimatingFlip(true);
                            }, 110);
                        }, 20);
                    }, 70);
                    return;
                }
            }

            // 4. Truly completed session!
            launchFanfare();
            logGrammarActivity(userId, {
                type: 'review',
                title: (t('grammar.reviewedGrammarCount', 'Đã ôn tập {count} mẫu ngữ pháp') || '').replace('{count}', updatedQueue.length),
                details: t('grammar.completedSessionDetails', 'Hoàn thành phiên ôn tập SRS')
            });
            setIsAnimatingFlip(false);
            setIsFlipped(false);
            setCurrentReviewIndex(updatedQueue.length);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimatingFlip(true);
                });
            });
        }

        sessionXpRef.current += totalXp;

        pendingWriteIds.current.add(currentCard.id);
        (async () => {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, currentCard.id), newSrs, { merge: true });
                    const now = new Date();
                    const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                    await setDoc(activityRef, {
                        grammarReviewsDone: increment(1),
                        reviewsDone: increment(1)
                    }, { merge: true }).catch(err => console.warn('Lỗi ghi activity Grammar:', err));
                    success = true;
                    removePendingGrammarSync(userId, currentCard.id);
                } catch (e) {
                    attempts++;
                    console.error(`Error updating Grammar SRS in background (attempt ${attempts}):`, e);
                    if (attempts < 3) {
                        await new Promise(r => setTimeout(r, 400 * attempts));
                    }
                } finally {
                    if (success || attempts >= 3) {
                        pendingWriteIds.current.delete(currentCard.id);
                    }
                }
            }
        })();
    };

    const saveSessionState = () => { };

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
        const waitForWrites = () => {
            if (pendingWriteIds.current.size > 0 && exitAttempts < 5) {
                exitAttempts++;
                setTimeout(waitForWrites, 100);
            } else {
                pendingWriteIds.current.clear();
                setReviewMode(false);
                setDashboardTick(Date.now());
                try {
                    window.dispatchEvent(new Event('srs-updated'));
                } catch (e) { }
                if (setIsReviewActive) {
                    try { setIsReviewActive(false); } catch (e) { }
                }
                isExitingRef.current = false;
            }
        };
        setTimeout(waitForWrites, 50);
    };

    const handleUndo = () => {
        if (reviewHistory.length === 0) return;
        const lastAction = reviewHistory[reviewHistory.length - 1];
        setReviewHistory(prev => prev.slice(0, -1));

        const { cardIndex, cardId, srs, isFlipped: wasFlipped, xpAwarded, queue: savedQueue } = lastAction;

        if (savedQueue) {
            setReviewQueue(savedQueue);
        }
        completedCardIds.current.delete(cardId);

        setSrsData(prev => {
            const next = { ...prev };
            if (srs) {
                next[cardId] = { ...srs };
            } else {
                delete next[cardId];
            }
            return next;
        });
        updateCachedUserGrammarSrs(userId, cardId, srs || null);

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

        sessionXpRef.current -= xpAwarded;

        (async () => {
            try {
                if (srs) {
                    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, cardId), srs);
                } else {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, cardId));
                }
                const now = new Date();
                const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                await setDoc(activityRef, {
                    grammarReviewsDone: increment(-1),
                    reviewsDone: increment(-1)
                }, { merge: true }).catch(err => console.warn('Lỗi revert activity Grammar:', err));
            } catch (e) {
                console.error('Error reverting Grammar SRS in background:', e);
            }
        })();
    };

    useEffect(() => {
        if (!reviewMode) return;
        const handler = (e) => {
            if (e.repeat) return;
            const activeTag = e.target ? e.target.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target?.isContentEditable) {
                return;
            }
            const isTyping = flashcardSettings?.reviewType === 'typing';
            if (e.key === ' ') {
                if (isTyping && !hasCheckedTyping) return;
                e.preventDefault();
                setIsFlipped(f => !f);
                playFlipSound();
            }
            if (!isTyping || hasCheckedTyping) {
                if (e.key === '1') handleRating('again');
                if (e.key === '2') handleRating('hard');
                if (e.key === '3') handleRating('good');
                if (e.key === '4') handleRating('easy');
            }
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                setShowSettingsModal(s => !s);
            }
            if (e.key === 'r' || e.key === 'R' || e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (currentCard?.pattern) speakText(currentCard.pattern);
            }
            if (e.key === 'Backspace' || e.key === 'z' || (e.key === 'z' && e.ctrlKey)) {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [reviewMode, currentCard, currentReviewIndex, reviewHistory, flashcardSettings, hasCheckedTyping]);

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text={t('grammar.loadingData', 'Đang tải dữ liệu ôn tập...')} />
                </div>
            </div>
        );
    }

    if (isPreparingSession) {
        return <SrsPrewarmLoader title={t('grammar.title', 'Ngữ Pháp')} count={reviewQueue.length} />;
    }


    if (reviewMode && currentCard) {
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, reps: 0 };
        if (!intervalCacheRef.current[currentCard.id]) {
            intervalCacheRef.current[currentCard.id] = getPreviewIntervals(srs);
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
            <div className="w-full min-h-[100dvh] flex flex-col justify-center items-center px-3 sm:px-4 py-3 sm:py-6 animate-fade-in overflow-y-auto">
                <div className="w-[760px] max-w-full my-auto flex flex-col justify-center items-center space-y-3.5 sm:space-y-4 transition-all duration-300">
                    <div className="w-full flex justify-between items-center mb-1 sm:mb-2 gap-2">
                        <button onClick={exitReview}
                            className="px-3.5 py-2 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all font-bold gap-2 cursor-pointer select-none">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs sm:text-sm font-bold">{t('common.back', 'Trở lại')}</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {/* Quick Review Type Switcher (Flashcard 3D vs Typing Input) */}
                            <button
                                type="button"
                                onClick={() => {
                                    handleUpdateSettings({
                                        ...flashcardSettings,
                                        reviewType: flashcardSettings.reviewType === 'typing' ? 'flashcard' : 'typing'
                                    });
                                }}
                                className={`px-3 py-2 flex items-center justify-center rounded-2xl shadow-xs border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 gap-1.5 cursor-pointer font-bold select-none ${flashcardSettings.reviewType === 'typing'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                title={flashcardSettings.reviewType === 'typing' ? t('grammar.typing3DToggle', "Đang ở chế độ Gõ phím (Typing) - Nhấn để đổi sang Thẻ 3D") : t('grammar.typingMode', "Đang ở chế độ Thẻ Flashcard 3D - Nhấn để đổi sang Gõ phím")}
                            >
                                {flashcardSettings.reviewType === 'typing' ? (
                                    <>
                                        <Keyboard className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">{t('grammar.typingLabel', 'Gõ phím')}</span>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">{t('grammar.card3DLabel', 'Thẻ 3D')}</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowSettingsModal(true)}
                                className="px-3 py-2 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all gap-1.5 cursor-pointer font-bold select-none"
                                title={t('grammar.cardSettingsTitle', "Cấu hình thẻ (Phím S)")}
                            >
                                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-xs sm:text-sm font-bold hidden sm:inline">{t('grammar.cardSettings', 'Cài đặt')}</span>
                            </button>

                            {reviewHistory.length > 0 && (
                                <button onClick={handleUndo}
                                    className="px-3 py-2 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 transition-all gap-1.5 cursor-pointer font-bold select-none">
                                    <RotateCcw className="w-4 h-4" />
                                    <span className="text-xs sm:text-sm font-bold hidden sm:inline">{t('common.back', 'Quay lại')}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                                <Target className="w-3.5 h-3.5" /> {t('grammar.title', 'Ôn tập Ngữ pháp')}
                            </span>
                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-black text-xs">
                                {Math.min(currentReviewIndex + 1, reviewQueue.length)} / {reviewQueue.length}
                            </span>
                        </div>
                        <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Rich Grammar SRS Flashcard */}
                    <GrammarFlashcard
                        card={currentCard}
                        isFlipped={isFlipped}
                        onFlip={() => {
                            if (flashcardSettings.reviewType === 'typing' && !hasCheckedTyping) return;
                            setIsFlipped(f => !f);
                            playFlipSound();
                        }}
                        isAnimatingFlip={isAnimatingFlip}
                        slideDirection={slideDirection}
                        settings={flashcardSettings}
                        onSpeak={speakText}
                        hasCheckedTyping={hasCheckedTyping}
                    />

                    {/* Typing Input for Grammar */}
                    {flashcardSettings.reviewType === 'typing' && (
                        <div className="w-full mt-1">
                            <SrsTypingInput
                                card={currentCard}
                                isFlipped={isFlipped}
                                isReversed={flashcardSettings.studyMode === 'vi_to_ja'}
                                expectedLanguage={flashcardSettings.studyMode === 'vi_to_ja' ? 'ja' : 'ja'}
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
                                placeholder={t('grammar.typePrompt', 'Nhập mẫu ngữ pháp tiếng Nhật tương ứng...')}
                            />
                        </div>
                    )}

                    {/* Rating Buttons: Shown in flashcard mode OR after submitting answer in typing mode */}
                    {(flashcardSettings.reviewType !== 'typing' || hasCheckedTyping) && (
                        <div className="w-full space-y-3 animate-fade-in mt-2">
                            <div className="grid grid-cols-4 gap-2.5 w-full">
                                {[
                                    { key: 'again', label: t('srs.again', 'Quên rồi'), interval: intervals.again, bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900', border: 'border-2 border-b-4 border-rose-300 dark:border-rose-700 shadow-sm', text: 'text-rose-600 dark:text-rose-300', sub: 'text-rose-500/80 dark:text-rose-400' },
                                    { key: 'hard', label: t('srs.hard', 'Khó'), interval: intervals.hard, bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900', border: 'border-2 border-b-4 border-amber-300 dark:border-amber-700 shadow-sm', text: 'text-amber-600 dark:text-amber-300', sub: 'text-amber-500/80 dark:text-amber-400' },
                                    { key: 'good', label: t('srs.good', 'Tốt'), interval: intervals.good, bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900', border: 'border-2 border-b-4 border-emerald-400 dark:border-emerald-600 shadow-sm', text: 'text-emerald-600 dark:text-emerald-300', sub: 'text-emerald-500/80 dark:text-emerald-400' },
                                    { key: 'easy', label: t('srs.easy', 'Dễ'), interval: intervals.easy, bg: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900', border: 'border-2 border-b-4 border-sky-300 dark:border-sky-600 shadow-sm', text: 'text-sky-600 dark:text-sky-300', sub: 'text-sky-500/80 dark:text-sky-400' },
                                ].map(btn => (
                                    <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRating(btn.key); }}
                                        className={`flex flex-col justify-center items-center py-3 rounded-2xl ${btn.bg} ${btn.border} text-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer select-none`}>
                                        <div className={`font-black ${btn.text} text-xs uppercase tracking-wider leading-tight`}>{btn.label}</div>
                                        <div className={`text-[10px] font-mono font-bold ${btn.sub} mt-0.5`}>{btn.interval}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">Space</kbd> {t('studyModes.flipHint', 'lật thẻ')} •
                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">1-4</kbd> {t('vocab.rateCard', 'đánh giá')}
                            </div>
                        </div>
                    )}

                    {/* Settings Modal inside Review Session */}
                    <GrammarFlashcardSettingsModal
                        isOpen={showSettingsModal}
                        onClose={() => setShowSettingsModal(false)}
                        settings={flashcardSettings}
                        onUpdateSettings={handleUpdateSettings}
                    />

                </div>
            </div>
        );
    }

    if (reviewMode && !currentCard) {
        const waiting = getLearningCardsWaiting();
        if (waiting.length > 0) {
            const now = reviewTick;
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
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 animate-fade-in">
                    <div className="w-[600px] max-w-full flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-150 dark:border-slate-700/85">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center animate-bounce">
                                <Clock className="w-8 h-8 text-emerald-500 animate-spin-slow" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {t('grammar.waitingTitle', 'Đang đợi thẻ Ngữ pháp tiếp theo...')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                {(t('grammar.waitingDesc', 'Bạn đã hoàn thành các thẻ Ngữ pháp đến hạn hiện tại. Có {count} thẻ đang chờ ôn lại theo chu kỳ.') || '').replace('{count}', waiting.length)}
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
                                className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 touch-manipulation select-none"
                            >
                                <Zap className="w-4 h-4 fill-current text-white" />
                                <span>{(t('grammar.studyAheadNow', 'Học trước ngay ({count} mẫu)') || '').replace('{count}', waiting.length)}</span>
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

        // Check for any newly due or learn-ahead grammar points while staying on the completion screen
        const learnAheadMs = getLearnAheadLimitMs();
        const checkWindow = learnAheadMs > 0 ? learnAheadMs : (20 * 60 * 1000);
        const newlyDueGrammar = (grammarList || []).filter(g => {
            const srs = srsData[g.id];
            if (!srs) return false;
            if (completedCardIds.current.has(g.id)) return false;
            const nextReviewVal = srs.nextReview || srs.nextReview_back;
            if (!nextReviewVal) return false;
            const reviewTime = parseNextReviewMs(nextReviewVal);
            return reviewTime > 0 && reviewTime <= (reviewTick + checkWindow);
        });

        // When 0 cards are waiting -> Render Completion Screen
        return (
            <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-transparent py-8 animate-fade-in">
                <div className="w-[600px] max-w-[95vw] mx-auto flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-emerald-500/30">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl flex items-center justify-center text-4xl animate-bounce">
                            🎉
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            {t('grammar.completedTitle', 'Hoàn thành phiên ôn tập Ngữ Pháp!')}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                            {newlyDueGrammar.length > 0
                                ? (t('vocab.completedDescMore', 'Hiện tại có thêm {count} thẻ đến hạn (trong vòng {mins} phút). Bạn có muốn ôn tiếp không?').replace('{count}', newlyDueGrammar.length).replace('{mins}', Math.round(learnAheadMs / 60000)))
                                : t('vocab.completedDescAll', 'Chúc mừng! Bạn đã hoàn thành tất cả các thẻ trong phiên ôn tập này.')}
                        </p>
                    </div>

                    <div className="w-full pt-4">
                        {newlyDueGrammar.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        runStartReview(newlyDueGrammar);
                                    }}
                                    className="flex-1 w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 select-none"
                                >
                                    <Repeat2 className="w-4 h-4" />
                                    <span>{(t('vocab.continueReviewing', 'Tiếp tục ôn tập ({count} thẻ)') || '').replace('{count}', newlyDueGrammar.length)}</span>
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

                    {/* Grammar Flashcard Settings Modal */}
                    <GrammarFlashcardSettingsModal
                        isOpen={showSettingsModal}
                        onClose={() => setShowSettingsModal(false)}
                        settings={flashcardSettings}
                        onUpdateSettings={handleUpdateSettings}
                    />

                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6 mt-6 animate-fade-in">
                {/* Unified Hero Banner */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-slate-800 dark:text-slate-100 shadow-sm group">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                        <div className="space-y-1.5 text-center md:text-left flex-1">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {t('grammar.title', 'Ôn tập Ngữ pháp')}
                                </h1>
                                {leechGrammarItems.length > 0 && (
                                    <button
                                        onClick={() => setShowLeechManager(true)}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                    >
                                        <span>{t('grammar.leechCards', 'Thẻ Khó')} ({leechGrammarItems.length})</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                    title={t('grammar.cardSettingsTitle', 'Cấu hình thẻ ôn tập')}
                                >
                                    <span>{t('grammar.cardSettings', 'Cài đặt thẻ')}</span>
                                </button>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md font-medium leading-relaxed">
                                {t('grammar.subtitle', 'Ứng dụng thuật toán lặp lại ngắt quãng để tự động lên lịch ôn tập cho các cấu trúc ngữ pháp bạn đã học.')}
                            </p>
                        </div>

                        <div className="flex flex-row md:flex-col items-center justify-between bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center w-full md:w-64 shrink-0 gap-3">
                            <div className="flex flex-col items-start md:items-center text-left md:text-center">
                                <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                                    {stats.dueToday}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">{t('grammar.dueGrammarLabel', 'MẪU CÂU CẦN ÔN TẬP')}</span>
                            </div>
                            {stats.dueToday > 0 ? (
                                <button
                                    onClick={() => startReview()}
                                    className="md:mt-2 px-5 py-3 md:w-full rounded-2xl text-xs font-black tracking-wider uppercase transition-all bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-800 text-white flex items-center justify-center gap-2 cursor-pointer shrink-0 min-h-[44px] select-none shadow-sm"
                                >
                                    <Play className="w-4 h-4 fill-white text-white ml-0.5 shrink-0" />
                                    <span>{t('vocab.startReviewBtn', 'BẮT ĐẦU ÔN TẬP')}</span>
                                </button>
                            ) : nextDueGrammarInfo > 0 ? (
                                <SrsCountdownTimer targetMs={nextDueGrammarInfo} onExpire={() => setDashboardTick(Date.now())} />
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

                {/* 3 Stats Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-extrabold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('grammar.todayLearned', 'Học mới')}</p>
                                <h4 className="text-sm sm:text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">{stats.newCards} {t('grammar.patternsUnit', 'mẫu')}</h4>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-extrabold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('grammar.studyTime', 'Thời gian')}</p>
                                <h4 className="text-sm sm:text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">{stats.totalReps > 0 ? Math.round(stats.totalReps * 0.5) : 15} {t('common.minutes', 'phút')}</h4>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-extrabold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{t('grammar.retentionRate', 'Tỷ lệ nhớ')}</p>
                                <h4 className="text-sm sm:text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                    {stats.grammarLearned > 0 ? Math.min(100, Math.round(85 + (stats.longTerm / stats.grammarLearned) * 15)) : 90}%
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SRS Forecast Chart */}
                {grammarList.length > 0 && (
                    <SRSForecastChart
                        items={forecastItems}
                        daysCount={14}
                        title={t('grammar.forecastTitle', 'Dự Báo Ngữ Pháp Đến Hạn (14 Ngày Tới)')}
                    />
                )}

                {/* 4 SRS Stage Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate">{t('grammar.stageApprentice', 'Sơ cấp (Mới/Đang học)')}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">{stats.learning}</span>
                            <span className="text-xs text-slate-400 font-mono">{t('grammar.patternsUnit', 'mẫu')}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? (stats.learning / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">{t('grammar.stageGuru', 'Trung cấp (Đang ôn)')}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">{stats.shortTerm}</span>
                            <span className="text-xs text-slate-400 font-mono">{t('grammar.patternsUnit', 'mẫu')}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? (stats.shortTerm / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">{t('grammar.stageMaster', 'Cao cấp (Thành thạo)')}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">{stats.longTerm}</span>
                            <span className="text-xs text-slate-400 font-mono">{t('grammar.patternsUnit', 'mẫu')}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? (stats.longTerm / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">{t('grammar.stageEnlightened', 'Chuyên gia (Ghi nhớ)')}</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">{stats.expert}</span>
                            <span className="text-xs text-slate-400 font-mono">{t('grammar.patternsUnit', 'mẫu')}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? (stats.expert / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Leech Manager Modal */}
            <LeechManagerModal
                isOpen={showLeechManager}
                onClose={() => setShowLeechManager(false)}
                grammarItems={showLeechManager ? grammarList.map(g => ({
                    ...g,
                    userMnemonic: srsData[g.id]?.userMnemonic || srsData[g.id]?.mnemonic || g.userMnemonic || g.mnemonic || '',
                    mnemonic: srsData[g.id]?.mnemonic || srsData[g.id]?.userMnemonic || g.mnemonic || g.userMnemonic || '',
                    lapseCount: srsData[g.id]?.lapseCount || 0
                })) : []}
                scopeType="grammar"
                onResetLeechCount={handleResetGrammarLeech}
                onSaveMnemonic={async (item, newText) => {
                    const targetId = item.id || item.grammarId || item.pattern;
                    if (!targetId) return;
                    setSrsData(prev => ({
                        ...prev,
                        [targetId]: {
                            ...(prev[targetId] || {}),
                            userMnemonic: newText,
                            mnemonic: newText
                        }
                    }));
                    setGrammarList(prev => prev.map(g => ((g.id === targetId || g.pattern === targetId) ? { ...g, userMnemonic: newText, mnemonic: newText } : g)));
                    if (userId) {
                        try {
                            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, String(targetId)), { userMnemonic: newText, mnemonic: newText }, { merge: true });
                        } catch (e) {
                            console.warn('Error saving grammar mnemonic from leech manager:', e);
                        }
                    }
                }}
            />

            {/* Grammar Flashcard Settings Modal */}
            <GrammarFlashcardSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                settings={flashcardSettings}
                onUpdateSettings={handleUpdateSettings}
            />

            {/* SRS Mode Selection Modal (Flashcard vs Anki Typing) */}
            <SrsModeSelectModal
                isOpen={showModeModal}
                onClose={() => {
                    setShowModeModal(false);
                    setPendingReviewCards(null);
                }}
                title={t('grammar.selectReviewMode', 'Chọn chế độ ôn tập Ngữ pháp')}
                subtitle={t('grammar.selectReviewSub', 'Lựa chọn phương pháp ôn tập phù hợp với bạn')}
                cardCount={(pendingReviewCards || dueGrammar).length}
                onSelectMode={(mode) => {
                    handleUpdateSettings({ ...flashcardSettings, reviewType: mode });
                    runStartReview(pendingReviewCards || dueGrammar);
                }}
            />
        </div>
    );
};

export default GrammarReviewScreen;
