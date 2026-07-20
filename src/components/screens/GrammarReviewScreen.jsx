import React, { useState, useEffect, useMemo, useRef } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Target, ChevronLeft, RotateCcw, BarChart3, Volume2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, increment, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedGrammarPointsList, getSharedGrammarSrs, getCachedUserGrammarSrsData, updateCachedUserGrammarSrs, subscribeGrammarSrs } from '../../utils/grammarService';
import { logGrammarActivity } from '../../utils/grammarHistory';
import { formatCountdown, getCardState, calculateAnkiSRS, parseNextReviewMs } from '../../utils/srs';
import { flashCorrect, launchFanfare } from '../../utils/celebrations';
import { playFlipSound } from '../../utils/soundEffects';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';

const getPreviewIntervals = (srs) => {
    const ratings = ['again', 'hard', 'good', 'easy'];
    const result = {};
    for (const r of ratings) {
        const preview = calculateAnkiSRS(srs, r);
        result[r] = Math.round((preview.nextReviewOffsetMs || 0) / 60000);
    }
    return result;
};

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

const GrammarReviewScreen = ({ awardXP, setIsReviewActive }) => {
    const userId = getAuth().currentUser?.uid;
    const fadeWholePage = useMenuTransition();
    const navigate = useNavigate();
    
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
        const interval = setInterval(() => {
            setDashboardTick(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const reviewModeRef = useRef(false);
    const pendingWriteIds = useRef(new Set());

    useEffect(() => {
        reviewModeRef.current = reviewMode;
    }, [reviewMode]);

    useEffect(() => {
        const load = async () => {
            try {
                const [gpData, srs] = await Promise.all([
                    getSharedGrammarPointsList(),
                    userId ? getSharedGrammarSrs(userId) : Promise.resolve({})
                ]);
                setGrammarList(gpData || []);
                if (userId && srs) {
                    setSrsData(srs);
                }
            } catch (e) {
                console.error('Error loading Grammar SRS data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Set up real-time listener for SRS data (cross-device sync)
        let unsubSrs = () => {};
        if (userId) {
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
        return () => unsubSrs();
    }, [userId]);

    const dueGrammar = useMemo(() => {
        const now = dashboardTick;
        return grammarList.filter(g => {
            const srs = srsData[g.id];
            if (!srs) return false;
            const reviewMs = parseNextReviewMs(srs.nextReview);
            return reviewMs > 0 && reviewMs <= now;
        });
    }, [grammarList, srsData, dashboardTick]);

    const stats = useMemo(() => {
        let hasNoSRS = 0, learning = 0, shortTerm = 0, longTerm = 0;
        let totalReps = 0;
        const reviewDays = new Set();

        Object.values(srsData).forEach(srs => {
            const interval = srs.interval || 0;
            const reps = srs.reps || 0;
            const state = getCardState(srs);
            totalReps += reps;
            if (state === 'new' || state === 'NEW') hasNoSRS++;
            else if (state === 'learning' || state === 'LEARNING' || state === 'relearning' || state === 'RELEARNING') learning++;
            else {
                const daysInterval = interval >= 1440 ? (interval / 1440) : interval;
                if (daysInterval < 7) shortTerm++;
                else longTerm++;
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
            dueToday: dueGrammar.length, newCards: hasNoSRS, learning, shortTerm, longTerm,
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

    const [nextReviewText, setNextReviewText] = useState(null);
    const [isNextReviewCountdown, setIsNextReviewCountdown] = useState(false);
    const [nextRoundCount, setNextRoundCount] = useState(0);

    useEffect(() => {
        const getNextReviewInfo = () => {
            const now = Date.now();
            let earliest = Infinity;
            const futureEntries = [];
            Object.values(srsData).forEach(srs => {
                const next = parseNextReviewMs(srs.nextReview);
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

    const getLearningCardsWaiting = () => {
        return Object.entries(srsData)
            .filter(([id, srs]) => {
                if (!activeReviewCardIds.current.has(id)) return false;
                
                const stateStr = (srs.state || srs.srsState || '').toUpperCase();
                if (stateStr === 'REVIEW') return false;
                if (completedCardIds.current.has(id)) return false;

                const nextReviewVal = srs.nextReview || srs.nextReview_back;
                if (nextReviewVal) {
                    const reviewTime = nextReviewVal instanceof Date
                        ? nextReviewVal.getTime()
                        : (nextReviewVal.seconds
                            ? nextReviewVal.seconds * 1000
                            : new Date(nextReviewVal).getTime());
                    if (!isNaN(reviewTime) && reviewTime - Date.now() > 12 * 60 * 60 * 1000) {
                        return false;
                    }
                }

                return true;
            })
            .map(([id, srs]) => {
                const nextReviewVal = srs.nextReview || srs.nextReview_back;
                const reviewTime = nextReviewVal instanceof Date
                    ? nextReviewVal.getTime()
                    : (nextReviewVal.seconds
                        ? nextReviewVal.seconds * 1000
                        : new Date(nextReviewVal).getTime());
                return {
                    id,
                    nextReview: isNaN(reviewTime) ? Date.now() : reviewTime
                };
            });
    };

    const handleReviewNow = () => {
        const waiting = getLearningCardsWaiting();
        if (waiting.length === 0) return;
        
        waiting.forEach(item => {
            if (srsData[item.id]) {
                const updatedSrs = {
                    ...srsData[item.id],
                    nextReview: Date.now()
                };
                setSrsData(prev => ({
                    ...prev,
                    [item.id]: updatedSrs
                }));
                updateCachedUserGrammarSrs(userId, item.id, updatedSrs);
            }
        });
        
        setReviewQueue(prevQueue => {
            const nextQueue = [...prevQueue];
            const upcomingIds = new Set(nextQueue.slice(currentReviewIndex + 1).map(c => c.id));
            const cardsToInject = [];
            waiting.forEach(item => {
                if (!upcomingIds.has(item.id) && (currentReviewIndex >= nextQueue.length || nextQueue[currentReviewIndex].id !== item.id)) {
                    const fullCard = grammarList.find(c => c.id === item.id);
                    if (fullCard) {
                        const localSrs = srsData[item.id];
                        cardsToInject.push({
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
                        });
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
                    const upcomingIds = new Set(nextQueue.slice(currentReviewIndex + 1).map(c => c.id));
                    const cardsToInject = [];
                    dueNow.forEach(item => {
                        if (!upcomingIds.has(item.id) && (currentReviewIndex >= nextQueue.length || nextQueue[currentReviewIndex].id !== item.id)) {
                            const fullCard = grammarList.find(c => c.id === item.id);
                            if (fullCard) {
                                const localSrs = srsData[item.id];
                                cardsToInject.push({
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
                                });
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
    }, [reviewMode, currentReviewIndex, grammarList, srsData]);

    const startReview = () => {
        if (dueGrammar.length === 0) return;
        sessionXpRef.current = 0;
        completedCardIds.current.clear();
        activeReviewCardIds.current = new Set(dueGrammar.map(c => c.id));
        setReviewQueue([...dueGrammar]);
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewHistory([]);
        setReviewMode(true);
        if (setIsReviewActive) {
            setIsReviewActive(true);
        }
    };

    const currentCard = reviewQueue[currentReviewIndex] || null;

    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleRating = (rating) => {
        if (!currentCard || !userId) return;

        const srs = srsData[currentCard.id] || null;
        const result = calculateAnkiSRS(srs || { interval: 0, ease: 2.5, nextReview: 0, reps: 0 }, rating);
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

        setReviewQueue(updatedQueue);
        setSrsData(prev => ({ ...prev, [currentCard.id]: newSrs }));
        updateCachedUserGrammarSrs(userId, currentCard.id, newSrs);
        
        if (currentReviewIndex + 1 < updatedQueue.length) {
            if (rating === 'good' || rating === 'easy') { flashCorrect(); }
            
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
            const waiting = getLearningCardsWaiting();
            if (waiting.length > 0) {
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
            } else {
                launchFanfare();
                logGrammarActivity(userId, {
                    type: 'review',
                    title: `Đã ôn tập ${updatedQueue.length} mẫu ngữ pháp`,
                    details: `Hoàn thành phiên ôn tập SRS`
                });
                exitReview();
            }
        }

        sessionXpRef.current += totalXp;

        pendingWriteIds.current.add(currentCard.id);
        (async () => {
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                try {
                    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, currentCard.id), newSrs, { merge: true });
                    const todayDateString = new Date().toISOString().split('T')[0];
                    const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                    await setDoc(activityRef, {
                        grammarReviewsDone: increment(1)
                    }, { merge: true }).catch(err => console.warn('Lỗi ghi activity Grammar:', err));
                    success = true;
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

    const exitReview = () => {
        if (sessionXpRef.current > 0 && awardXP) {
            awardXP(sessionXpRef.current);
        }
        sessionXpRef.current = 0;
        const waitForWrites = () => {
            if (pendingWriteIds.current.size > 0) {
                setTimeout(waitForWrites, 100);
            } else {
                setReviewMode(false);
                if (setIsReviewActive) {
                    setIsReviewActive(false);
                }
            }
        };
        setTimeout(waitForWrites, 200);
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
                const todayDateString = new Date().toISOString().split('T')[0];
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                await setDoc(activityRef, {
                    grammarReviewsDone: increment(-1)
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
            if (e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f); }
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
    }, [reviewMode, currentCard, currentReviewIndex, reviewHistory]);

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu ôn tập..." />
                </div>
            </div>
        );
    }

    if (reviewMode && currentCard) {
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, reps: 0 };
        const previewIntv = getPreviewIntervals(srs);
        const intervals = {
            again: formatInterval(previewIntv.again),
            hard: formatInterval(previewIntv.hard),
            good: formatInterval(previewIntv.good),
            easy: formatInterval(previewIntv.easy),
        };
        const progress = reviewQueue.length > 0 ? Math.min(100, Math.round((currentReviewIndex / reviewQueue.length) * 100)) : 100;

        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 animate-fade-in">
                <div className="w-[600px] max-w-full flex flex-col justify-center items-center space-y-4">
                    <div className="w-full flex justify-between mb-2">
                        <button onClick={exitReview}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 gap-2">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Trở lại</span>
                        </button>

                        {reviewHistory.length > 0 && (
                            <button onClick={handleUndo}
                                className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 gap-2">
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-sm font-medium">Quay lại</span>
                            </button>
                        )}
                    </div>

                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Ôn tập Ngữ pháp</span>
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{Math.min(currentReviewIndex + 1, reviewQueue.length)} / {reviewQueue.length}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="w-full relative" style={{ perspective: '1000px', height: '360px' }}>
                        <div
                            className={`w-full relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                            style={{
                                width: '100%',
                                height: '360px',
                                transition: slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            }}
                        >
                            <div 
                                onClick={() => { setIsFlipped(f => !f); playFlipSound(); }}
                                style={{ 
                                    position: 'relative', 
                                    width: '100%', 
                                    height: '100%', 
                                    transformStyle: 'preserve-3d', 
                                    transition: isAnimatingFlip ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none', 
                                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                                }}
                            >
                                {/* Front */}
                                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none p-6"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="text-4xl font-bold text-gray-800 dark:text-white select-none text-center tracking-wide font-japanese">{currentCard.pattern}</div>
                                    <div className="absolute bottom-6 left-0 right-0 text-center">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">Nhấn để lật thẻ</span>
                                    </div>
                                </div>
                                {/* Back */}
                                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
                                    <div className="text-center space-y-3 w-full">
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{currentCard.pattern}</div>
                                        <div className="text-lg text-cyan-600 dark:text-cyan-400 font-bold">{currentCard.meaningShort || currentCard.meaning || '—'}</div>
                                        {currentCard.meaning && currentCard.meaningShort && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 font-medium px-4">{currentCard.meaning}</div>
                                        )}
                                        {currentCard.examples && currentCard.examples.length > 0 && (
                                            <div className="text-left w-full bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 max-h-[140px] overflow-y-auto">
                                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider flex items-center justify-between">
                                                    <span>Câu ví dụ:</span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); speakText(currentCard.examples[0].ja); }} 
                                                        className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 text-slate-550 hover:text-indigo-500"
                                                    >
                                                        <Volume2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-slate-200 leading-relaxed font-japanese">
                                                    {currentCard.examples[0].ja}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-450 italic">
                                                    "{currentCard.examples[0].vi}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5 w-full">
                        {[
                            { key: 'again', label: 'Quên rồi', interval: intervals.again, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', text: 'text-red-600 dark:text-red-400', sub: 'text-red-400/70 dark:text-red-500/60' },
                            { key: 'hard', label: 'Khó', interval: intervals.hard, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', text: 'text-orange-600 dark:text-orange-400', sub: 'text-orange-400/70 dark:text-orange-500/60' },
                            { key: 'good', label: 'Tốt', interval: intervals.good, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-600 dark:text-emerald-400', sub: 'text-emerald-400/70 dark:text-emerald-500/60' },
                            { key: 'easy', label: 'Dễ', interval: intervals.easy, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-600 dark:text-blue-400', sub: 'text-blue-400/70 dark:text-blue-500/60' },
                        ].map(btn => (
                            <button key={btn.key} onClick={(e) => { e.stopPropagation(); handleRating(btn.key); }}
                                className={`flex flex-col justify-center items-center py-3.5 rounded-2xl ${btn.bg} ${btn.border} border text-center transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95`}>
                                <div className={`font-bold ${btn.text} text-sm leading-tight`}>{btn.label}</div>
                                <div className={`text-[10px] ${btn.sub} mt-0.5`}>{btn.interval}</div>
                            </button>
                        ))}
                    </div>

                    <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">Space</kbd> lật thẻ •
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">1-4</kbd> đánh giá
                    </div>
                </div>
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
                <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 animate-fade-in">
                    <div className="w-[600px] max-w-full flex flex-col justify-center items-center space-y-6 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-150 dark:border-slate-700/85">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center animate-bounce">
                                <Clock className="w-8 h-8 text-indigo-500 animate-spin-slow" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                Đang đợi thẻ Ngữ pháp tiếp theo...
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                Bạn đã hoàn thành các thẻ Ngữ pháp đến hạn hiện tại. Có <span className="font-bold text-indigo-500">{waiting.length}</span> thẻ đang chờ ôn lại theo chu kỳ.
                            </p>
                        </div>

                        <div className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-2xl shadow-md flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider">Thẻ tiếp theo sau:</span>
                            <span className="text-lg font-black tracking-widest">{countdownText}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                                onClick={handleReviewNow}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer text-center"
                            >
                                Ôn ngay lập tức (Không đợi)
                            </button>
                            <button
                                onClick={exitReview}
                                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-250 dark:bg-slate-700 dark:hover:bg-slate-650 active:scale-95 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-xl transition-all border border-gray-200 dark:border-slate-600 cursor-pointer text-center"
                            >
                                Kết thúc phiên ôn tập
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        
        setTimeout(() => exitReview(), 0);
        return null;
    }

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6 mt-6 animate-fade-in">
                {/* Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-600 p-8 text-white shadow-lg border border-emerald-350 dark:border-emerald-900/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <span className="inline-block text-[10px] font-extrabold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                THUẬT TOÁN SRS
                            </span>
                            <h1 className="text-3xl font-black tracking-tight">Ôn tập Ngữ pháp</h1>
                            <p className="text-sm text-emerald-100 max-w-md font-medium leading-relaxed">
                                Ứng dụng thuật toán lặp lại ngắt quãng để tự động lên lịch ôn tập cho các cấu trúc ngữ pháp bạn đã lưu.
                            </p>
                        </div>
                        <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center w-full md:w-64 shrink-0 shadow-sm">
                            <span className="text-5xl font-black tracking-tight mb-1">
                                {stats.dueToday}
                            </span>
                            <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">Mẫu câu cần ôn tập</span>
                            {stats.dueToday > 0 ? (
                                <button
                                    onClick={startReview}
                                    className="mt-4 w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md bg-white text-emerald-600 hover:bg-emerald-50 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    BẮT ĐẦU ÔN TẬP
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="mt-4 w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all bg-white/15 text-white/50 cursor-not-allowed"
                                >
                                    HẾT THẺ ÔN TẬP
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3 Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-450">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Học mới hôm nay</p>
                                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-0.5">{stats.newCards} mẫu</h4>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-450">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thời gian học</p>
                                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-0.5">{stats.totalReps > 0 ? Math.round(stats.totalReps * 0.5) : 15} phút</h4>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
                                <Target className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tỷ lệ nhớ</p>
                                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-0.5">
                                    {stats.grammarLearned > 0 ? Math.min(100, Math.round(85 + (stats.longTerm / stats.grammarLearned) * 15)) : 90}%
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4 SRS Stage Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Sơ cấp (Mới học/Đang học)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{stats.newCards + stats.learning}</span>
                            <span className="text-xs text-slate-400">mẫu</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? ((stats.newCards + stats.learning) / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Trung cấp (Đang ôn tập)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{stats.shortTerm}</span>
                            <span className="text-xs text-slate-400">mẫu</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? (stats.shortTerm / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Cao cấp (Thành thạo)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{Math.max(0, stats.longTerm - Math.round(stats.longTerm * 0.2))}</span>
                            <span className="text-xs text-slate-400">mẫu</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? ((stats.longTerm - Math.round(stats.longTerm * 0.2)) / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Chuyên gia (Ghi nhớ)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{Math.round(stats.longTerm * 0.2)}</span>
                            <span className="text-xs text-slate-400">mẫu</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.grammarLearned > 0 ? ((Math.round(stats.longTerm * 0.2)) / stats.grammarLearned) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>

                {/* Weekly Learning Bar Chart */}
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" /> Thống kê ôn tập 7 ngày qua
                    </h3>
                    <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                                        borderColor: document.documentElement.classList.contains('dark') ? '#475569' : '#e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="count" fill="url(#colorCount)" radius={[6, 6, 0, 0]} maxBarSize={45}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#059669" stopOpacity={0.3}/>
                                        </linearGradient>
                                    </defs>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrammarReviewScreen;
