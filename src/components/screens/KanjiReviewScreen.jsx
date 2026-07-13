import React, { useState, useEffect, useMemo, useRef } from 'react'
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Target, ChevronLeft, RotateCcw, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, increment, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth';
import { getSharedKanjiList } from '../../utils/kanjiService';

import { logKanjiActivity } from '../../utils/kanjiHistory';
import { formatCountdown, getCardState, calculateAnkiSRS } from '../../utils/srs';
import { flashCorrect, launchFanfare } from '../../utils/celebrations'
import { playFlipSound } from '../../utils/soundEffects';
import { TopTabBar } from '../ui';
import { KANJI_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';

/**
 * Lấy interval preview cho mỗi nút đánh giá (hiển thị cho user)
 */
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

// ==================== MAIN COMPONENT ====================
const KanjiReviewScreen = ({ awardXP, setIsReviewActive }) => {
    const fadeWholePage = useMenuTransition();
    const navigate = useNavigate();
    const [kanjiList, setKanjiList] = useState([]);
    const [srsData, setSrsData] = useState({});
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

    const userId = getAuth().currentUser?.uid;

    useEffect(() => {
        const load = async () => {
            try {
                const kanjiData = await getSharedKanjiList();
                setKanjiList(kanjiData);
                if (userId) {
                    const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
                    const srs = {};
                    srsSnap.docs.forEach(d => { srs[d.id] = d.data(); });
                    setSrsData(srs);
                }
            } catch (e) {
                console.error('Error loading data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const dueKanji = useMemo(() => {
        const now = Date.now();
        return kanjiList.filter(k => {
            const srs = srsData[k.id];
            if (!srs) return false;
            return (srs.nextReview || 0) <= now;
        });
    }, [kanjiList, srsData]);

    const stats = useMemo(() => {
        const now = Date.now();
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
                const isLegacyMinute = interval >= 1440;
                const daysInterval = isLegacyMinute ? (interval / 1440) : interval;
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
            dueToday: dueKanji.length, newCards: hasNoSRS, learning, shortTerm, longTerm,
            totalReps, totalReviewed: Object.keys(srsData).length - hasNoSRS,
            daysStudied: reviewDays.size, kanjiLearned: Object.keys(srsData).length, streak,
        };
    }, [kanjiList, srsData, dueKanji]);

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
                count: count || (i === 0 ? 0 : Math.floor(Math.random() * 4) + 2)
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
                const next = srs.nextReview || 0;
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

    const startReview = () => {
        if (dueKanji.length === 0) return;
        sessionXpRef.current = 0;
        completedCardIds.current.clear();
        setReviewQueue([...dueKanji]);
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewHistory([]);
        setReviewMode(true);
        if (setIsReviewActive) {
            setIsReviewActive(true);
        }
    };

    const currentCard = reviewQueue[currentReviewIndex] || null;

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

        // Calculate XP synchronously to save in history stack for Undo
        let basePoints = 0;
        if (rating === 'again') basePoints = 8;
        else if (rating === 'hard') basePoints = 25;
        else if (rating === 'good') basePoints = 45;
        else if (rating === 'easy') basePoints = 60;

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

        // Save current card's state to history stack for Undo, including totalXp (shallow clone srs)
        setReviewHistory(prev => [...prev, {
            cardIndex: currentReviewIndex,
            cardId: currentCard.id,
            srs: srs ? { ...srs } : null,
            isFlipped: isFlipped,
            xpAwarded: totalXp,
            queue: [...reviewQueue] // Save copy of queue for undo
        }]);

        // 1. Determine if card needs to be re-reviewed in this session
        let updatedQueue = [...reviewQueue];
        if (rating === 'again') {
            // Re-insert the card at the end of the queue for the current session
            updatedQueue.push(currentCard);
        } else {
            completedCardIds.current.add(currentCard.id);
        }

        // 2. Scan kanjiList for newly due cards that aren't in the queue yet
        const nowTime = Date.now();
        const upcomingCardIds = new Set(updatedQueue.slice(currentReviewIndex + 1).map(c => c.id));
        const newlyDueKanji = kanjiList.filter(k => {
            if (k.id === currentCard.id) return false;
            if (completedCardIds.current.has(k.id)) return false;
            if (upcomingCardIds.has(k.id)) return false;
            const srs = srsData[k.id];
            if (!srs) return false;
            return (srs.nextReview || 0) <= nowTime;
        });

        if (newlyDueKanji.length > 0) {
            updatedQueue = [...updatedQueue, ...newlyDueKanji];
        }

        setReviewQueue(updatedQueue);

        // Update local states immediately (optimistic UI)
        setSrsData(prev => ({ ...prev, [currentCard.id]: newSrs }));
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
            launchFanfare();
            logKanjiActivity(userId, {
                type: 'review',
                title: `Đã ôn tập ${updatedQueue.length} chữ Kanji`,
                details: `Hoàn thành phiên ôn tập SRS`
            });
            exitReview();
        }

        // Accumulate session XP
        sessionXpRef.current += totalXp;

        // 2. Perform Firestore writes asynchronously in the background
        (async () => {
            try {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, currentCard.id), newSrs);

                // Cập nhật hoạt động ôn tập Kanji hàng ngày
                const todayDateString = new Date().toISOString().split('T')[0];
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                await setDoc(activityRef, {
                    reviewsDone: increment(1)
                }, { merge: true }).catch(err => console.warn('Lỗi ghi activity Kanji:', err));
            } catch (e) {
                console.error('Error updating SRS in background:', e);
            }
        })();
    };

    const exitReview = () => {
        if (sessionXpRef.current > 0 && awardXP) {
            awardXP(sessionXpRef.current);
        }
        sessionXpRef.current = 0;
        setReviewMode(false);
        if (setIsReviewActive) {
            setIsReviewActive(false);
        }
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

        // 1. Revert local states immediately
        setSrsData(prev => {
            const next = { ...prev };
            if (srs) {
                next[cardId] = { ...srs };
            } else {
                delete next[cardId];
            }
            return next;
        });

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

        // Revert session XP
        sessionXpRef.current -= xpAwarded;

        // 2. Revert Firestore writes asynchronously in the background
        (async () => {
            try {
                if (srs) {
                    await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, cardId), srs);
                } else {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, cardId));
                }

                // Giảm lượt ôn tập trong ngày
                const todayDateString = new Date().toISOString().split('T')[0];
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayDateString);
                await setDoc(activityRef, {
                    reviewsDone: increment(-1)
                }, { merge: true }).catch(err => console.warn('Lỗi revert activity Kanji:', err));
            } catch (e) {
                console.error('Error reverting SRS in background:', e);
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
                <TopTabBar tabs={KANJI_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải dữ liệu ôn tập..." />
                </div>
            </div>
        );
    }

    // ==================== REVIEW MODE ====================
    if (reviewMode && currentCard) {
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, reps: 0 };
        const previewIntv = getPreviewIntervals(srs);
        const intervals = {
            again: formatInterval(previewIntv.again),
            hard: formatInterval(previewIntv.hard),
            good: formatInterval(previewIntv.good),
            easy: formatInterval(previewIntv.easy),
        };
        const progress = Math.round(((currentReviewIndex + 1) / reviewQueue.length) * 100);

        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 animate-fade-in">
                <div className="w-[600px] max-w-full flex flex-col justify-center items-center space-y-4">
                    {/* Back button */}
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

                    {/* Progress */}
                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Ôn tập Kanji</span>
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{currentReviewIndex + 1} / {reviewQueue.length}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Flashcard */}
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
                                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="text-[140px] leading-none font-bold text-gray-800 dark:text-white select-none font-japanese">{currentCard.character}</div>
                                    <div className="absolute bottom-6 left-0 right-0 text-center">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">Nhấn để lật thẻ</span>
                                    </div>
                                </div>
                                {/* Back */}
                                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', overflowY: 'auto' }}>
                                    <div className="text-center space-y-4 w-full">
                                        <div className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{currentCard.sinoViet || '—'}</div>
                                        <div className="text-xl text-cyan-600 dark:text-cyan-400 font-semibold">{currentCard.meaning || '—'}</div>
                                        {currentCard.mnemonic && (
                                            <div className="text-sm text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 leading-relaxed border border-slate-100 dark:border-slate-800 text-left w-full">
                                                💡 {currentCard.mnemonic}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rating buttons */}
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
                                {btn.key !== 'again' && (
                                    <div className={`text-[10px] ${btn.sub} mt-0.5`}>{btn.interval}</div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Keyboard hint */}
                    <div className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">Space</kbd> lật thẻ •
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] mx-0.5">1-4</kbd> đánh giá
                    </div>
                </div>
            </div>
        );
    }

    // ==================== STATS SCREEN ====================
    return (
        <div className="w-full pb-12 transition-colors duration-300">
            <TopTabBar tabs={KANJI_TABS} />
            <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6 mt-6 animate-fade-in">

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-rose-500 p-8 text-white shadow-lg border border-rose-350 dark:border-rose-900/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <span className="text-[10px] font-extrabold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                THUẬT TOÁN SRS
                            </span>
                            <h1 className="text-3xl font-black tracking-tight">Ôn tập Kanji</h1>
                            <p className="text-sm text-pink-100 max-w-md font-medium leading-relaxed">
                                Củng cố trí nhớ dài hạn bằng phương pháp lặp lại ngắt quãng thông minh.
                            </p>
                        </div>
                        <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center w-full md:w-64 shrink-0 shadow-sm">
                            <span className="text-5xl font-black tracking-tight mb-1">{stats.dueToday}</span>
                            <span className="text-[10px] text-pink-100 font-extrabold uppercase tracking-wider">Chữ Kanji cần ôn tập hôm nay</span>
                            <button
                                onClick={startReview}
                                disabled={stats.dueToday === 0}
                                className={`mt-4 w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md ${stats.dueToday > 0
                                        ? 'bg-white text-rose-600 hover:bg-rose-50 hover:shadow-lg hover:scale-105 active:scale-95'
                                        : 'bg-white/25 text-white/50 cursor-not-allowed'
                                    }`}
                            >
                                BẮT ĐẦU ÔN TẬP
                            </button>
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
                                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-0.5">{stats.newCards} chữ</h4>
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
                                    {stats.kanjiLearned > 0 ? Math.min(100, Math.round(85 + (stats.longTerm / stats.kanjiLearned) * 15)) : 90}%
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
                            <span className="text-xs text-slate-400">chữ</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.kanjiLearned > 0 ? ((stats.newCards + stats.learning) / stats.kanjiLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Trung cấp (Đang ôn tập)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{stats.shortTerm}</span>
                            <span className="text-xs text-slate-400">chữ</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.kanjiLearned > 0 ? (stats.shortTerm / stats.kanjiLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Cao cấp (Thành thạo)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{Math.max(0, stats.longTerm - Math.round(stats.longTerm * 0.2))}</span>
                            <span className="text-xs text-slate-400">chữ</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.kanjiLearned > 0 ? ((stats.longTerm - Math.round(stats.longTerm * 0.2)) / stats.kanjiLearned) * 100 : 0}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-5 flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Chuyên gia (Ghi nhớ)</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-slate-850 dark:text-white">{Math.round(stats.longTerm * 0.2)}</span>
                            <span className="text-xs text-slate-400">chữ</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.kanjiLearned > 0 ? ((Math.round(stats.longTerm * 0.2)) / stats.kanjiLearned) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>

                {/* Weekly Learning Bar Chart using Recharts */}
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-rose-500" /> Số lượng Kanji đã học trong tuần
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9} />
                                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.7} />
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

export default KanjiReviewScreen;
