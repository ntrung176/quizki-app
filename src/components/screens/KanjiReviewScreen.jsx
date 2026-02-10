import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Target, Flame, ChevronLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { formatCountdown } from '../../utils/srs';

// ==================== SRS LOGIC (Anki-like with learning steps) ====================
const getNextInterval = (currentInterval, ease, rating, reps) => {
    // Learning phase (new or first learning step)
    if (reps <= 1) {
        switch (rating) {
            case 'again': return 1;           // 1 phút (reset)
            case 'hard': return 6;            // 6 phút
            case 'good': return reps === 0 ? 10 : 1440;  // Bước 1: 10 phút, Bước 2: 1 ngày (tốt nghiệp)
            case 'easy': return 5760;         // 4 ngày (bỏ qua learning, tốt nghiệp luôn)
            default: return 10;
        }
    }

    // Review phase (graduated cards - SM-2 algorithm)
    switch (rating) {
        case 'again': return 10;              // 10 phút (quay lại learning)
        case 'hard': return Math.max(1440, Math.round(currentInterval * 1.2));
        case 'good': return Math.max(1440, Math.round(currentInterval * ease));
        case 'easy': return Math.max(5760, Math.round(currentInterval * ease * 1.3));
        default: return 1440;
    }
};

const getNewEase = (currentEase, rating) => {
    if (rating === 'again') return Math.max(1.3, currentEase - 0.2);
    if (rating === 'hard') return Math.max(1.3, currentEase - 0.15);
    if (rating === 'good') return currentEase;
    if (rating === 'easy') return currentEase + 0.15;
    return currentEase;
};

const formatInterval = (minutes) => {
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
    if (minutes < 43200) return `${Math.round(minutes / 1440)} ngày`;
    return `${Math.round(minutes / 43200)} tháng`;
};

// ==================== MAIN COMPONENT ====================
const KanjiReviewScreen = () => {
    const navigate = useNavigate();
    const [kanjiList, setKanjiList] = useState([]);
    const [srsData, setSrsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [reviewMode, setReviewMode] = useState(false);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const userId = getAuth().currentUser?.uid;

    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setKanjiList(kanjiData);

                // Load SRS data
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

    // Due kanji
    const dueKanji = useMemo(() => {
        const now = Date.now();
        return kanjiList.filter(k => {
            const srs = srsData[k.id];
            if (!srs) return false;
            const nextReview = srs.nextReview || 0;
            return nextReview <= now;
        });
    }, [kanjiList, srsData]);

    // Stats - accurate calculations from SRS data
    const stats = useMemo(() => {
        const now = Date.now();
        let newCount = 0, learning = 0, shortTerm = 0, longTerm = 0;
        const reviewDays = new Set();

        kanjiList.forEach(k => {
            const srs = srsData[k.id];
            if (!srs) { newCount++; return; }
            const interval = srs.interval || 0;
            if (interval < 60) learning++;
            else if (interval < 1440 * 7) shortTerm++;
            else longTerm++;
        });

        // Calculate unique days studied and streak from lastReview data
        Object.values(srsData).forEach(srs => {
            if (srs.lastReview) {
                const d = new Date(srs.lastReview);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                reviewDays.add(key);
            }
        });

        // Calculate streak (consecutive days ending today or yesterday)
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);

        // First check today
        const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (!reviewDays.has(todayKey)) {
            // Check yesterday as starting point
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
            if (!reviewDays.has(yesterdayKey)) {
                streak = 0;
            } else {
                streak = 1;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        } else {
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Count consecutive previous days
        if (streak > 0) {
            while (true) {
                const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
                if (reviewDays.has(key)) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        const kanjiLearned = Object.keys(srsData).length;

        return {
            dueToday: dueKanji.length,
            newCards: newCount,
            learning,
            shortTerm,
            longTerm,
            totalReviewed: kanjiList.length - newCount,
            daysStudied: reviewDays.size,
            kanjiLearned,
            streak,
        };
    }, [kanjiList, srsData, dueKanji]);

    // Next review time - live countdown
    const [nextReviewText, setNextReviewText] = useState(null);
    const [isNextReviewCountdown, setIsNextReviewCountdown] = useState(false);

    useEffect(() => {
        const getEarliestReview = () => {
            const now = Date.now();
            let earliest = Infinity;
            Object.values(srsData).forEach(srs => {
                const next = srs.nextReview || 0;
                if (next > now && next < earliest) earliest = next;
            });
            return earliest === Infinity ? null : earliest;
        };

        const updateCountdown = () => {
            const earliest = getEarliestReview();
            if (!earliest) {
                setNextReviewText(null);
                setIsNextReviewCountdown(false);
                return;
            }

            const result = formatCountdown(earliest);
            if (!result) {
                setNextReviewText(null);
                setIsNextReviewCountdown(false);
                return;
            }

            setNextReviewText(result.text);
            setIsNextReviewCountdown(result.isCountdown);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [srsData]);

    // Card distribution
    const cardDistribution = useMemo(() => {
        const total = kanjiList.length || 1;
        return [
            { label: 'Thẻ mới', count: stats.newCards, percent: (stats.newCards / total) * 100, color: 'bg-gray-500' },
            { label: 'Đang học', count: stats.learning, percent: (stats.learning / total) * 100, color: 'bg-yellow-500' },
            { label: 'Mới thuộc (ngắn hạn)', count: stats.shortTerm, percent: (stats.shortTerm / total) * 100, color: 'bg-orange-500' },
            { label: 'Đã thuộc (dài hạn)', count: stats.longTerm, percent: (stats.longTerm / total) * 100, color: 'bg-green-500' },
        ];
    }, [stats, kanjiList]);

    // Activity heatmap
    const activityData = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
            let count = 0;
            Object.values(srsData).forEach(srs => {
                if (srs.lastReview && srs.lastReview >= dayStart.getTime() && srs.lastReview <= dayEnd.getTime()) count++;
            });
            const level = count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 20 ? 3 : 4;
            days.push({ date, level });
        }
        return days;
    }, [srsData]);

    // Start review
    const startReview = () => {
        if (dueKanji.length === 0) return;
        setReviewQueue([...dueKanji]);
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewMode(true);
    };

    // Current review card
    const currentCard = reviewQueue[currentReviewIndex] || null;

    // Handle SRS rating
    const handleRating = async (rating) => {
        if (!currentCard || !userId) return;
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, nextReview: 0, reps: 0 };
        const currentReps = srs.reps || 0;
        const newInterval = getNextInterval(srs.interval || 0, srs.ease || 2.5, rating, currentReps);
        const newEase = getNewEase(srs.ease || 2.5, rating);
        const now = Date.now();
        const newSrs = {
            interval: newInterval,
            ease: newEase,
            nextReview: now + newInterval * 60000,
            lastReview: now,
            reps: currentReps + 1,
        };

        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, currentCard.id), newSrs);
            setSrsData(prev => ({ ...prev, [currentCard.id]: newSrs }));
        } catch (e) {
            console.error('Error updating SRS:', e);
        }

        // Next card
        if (currentReviewIndex + 1 < reviewQueue.length) {
            setCurrentReviewIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            setReviewMode(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!reviewMode) return;
        const handler = (e) => {
            if (e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f); }
            if (e.key === '1') handleRating('again');
            if (e.key === '2') handleRating('hard');
            if (e.key === '3') handleRating('good');
            if (e.key === '4') handleRating('easy');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [reviewMode, currentCard, currentReviewIndex]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // ==================== REVIEW MODE ====================
    if (reviewMode && currentCard) {
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, reps: 0 };
        const currentReps = srs.reps || 0;
        const intervals = {
            again: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'again', currentReps)),
            hard: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'hard', currentReps)),
            good: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'good', currentReps)),
            easy: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'easy', currentReps)),
        };

        const progress = Math.round(((currentReviewIndex + 1) / reviewQueue.length) * 100);

        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="w-[600px] max-w-[95vw] flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
                    {/* Progress bar */}
                    <div className="w-full space-y-1 flex-shrink-0">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span>{currentReviewIndex + 1} / {reviewQueue.length}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Flashcard with flip animation */}
                    <div
                        className="w-full cursor-pointer"
                        style={{ perspective: '1000px' }}
                        onClick={() => setIsFlipped(f => !f)}
                    >
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '340px',
                                transformStyle: 'preserve-3d',
                                transition: 'transform 0.5s ease',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}
                        >
                            {/* Front: Only Kanji character */}
                            <div
                                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/50 shadow-xl"
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    backfaceVisibility: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <div className="text-[140px] leading-none font-bold text-gray-900 dark:text-white select-none font-japanese">
                                    {currentCard.character}
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500">
                                    Nhấn để lật thẻ
                                </div>
                            </div>

                            {/* Back: Âm hán, Ý nghĩa, Câu chuyện - NO kanji, NO labels */}
                            <div
                                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/50 shadow-xl"
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '24px',
                                    overflowY: 'auto',
                                }}
                            >
                                <div className="text-center space-y-3 w-full">
                                    <div className="text-3xl font-bold text-emerald-400">{currentCard.sinoViet || '—'}</div>
                                    <div className="text-xl text-cyan-300 font-medium">{currentCard.meaning || '—'}</div>
                                    {currentCard.mnemonic && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-3 leading-relaxed mt-2">
                                            {currentCard.mnemonic}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500">
                                    Nhấn để lật thẻ
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rating buttons - ALWAYS visible */}
                    <div className="grid grid-cols-4 gap-2 w-full">
                        <button onClick={(e) => { e.stopPropagation(); handleRating('again'); }}
                            className="py-3 rounded-xl bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-800/80 border border-red-300 dark:border-red-700 text-center transition-all">
                            <div className="font-bold text-red-400 text-sm">Quên rồi</div>
                            <div className="text-xs text-red-400/70">{intervals.again}</div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRating('hard'); }}
                            className="py-3 rounded-xl bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/70 border border-orange-300 dark:border-orange-700 text-center transition-all">
                            <div className="font-bold text-orange-400 text-sm">Khó</div>
                            <div className="text-xs text-orange-400/70">{intervals.hard}</div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRating('good'); }}
                            className="py-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/70 border border-emerald-300 dark:border-emerald-700 text-center transition-all">
                            <div className="font-bold text-emerald-400 text-sm">Tốt</div>
                            <div className="text-xs text-emerald-400/70">{intervals.good}</div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRating('easy'); }}
                            className="py-3 rounded-xl bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/70 border border-blue-300 dark:border-blue-700 text-center transition-all">
                            <div className="font-bold text-blue-400 text-sm">Dễ</div>
                            <div className="text-xs text-blue-400/70">{intervals.easy}</div>
                        </button>
                    </div>

                    {/* Keyboard hint */}
                    <div className="text-center text-xs text-gray-500">
                        <span>⌨ Nhấn</span> <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-gray-500 dark:text-gray-400 mx-1">Space</kbd>
                        <span>để lật, bấm</span> <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-gray-500 dark:text-gray-400 mx-1">1-4</kbd>
                        <span>để đánh giá</span>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== STATS SCREEN ====================
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ôn tập Kanji</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Theo dõi tiến độ ôn tập và phân bố thẻ</p>
            </div>

            {/* Key Stats: Days Studied, Kanji Learned, Streak */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-500 mb-2">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.daysStudied}</div>
                    <div className="text-xs text-gray-500 mt-1">Ngày đã học</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex items-center justify-center gap-2 text-cyan-500 mb-2">
                        <Target className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.kanjiLearned}</div>
                    <div className="text-xs text-gray-500 mt-1">Kanji đã học</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex items-center justify-center gap-2 text-orange-500 mb-2">
                        <Flame className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.streak}</div>
                    <div className="text-xs text-gray-500 mt-1">Ngày liên tiếp</div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Tổng quan (thẻ)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-cyan-400">{stats.dueToday}</div>
                        <div className="text-xs text-gray-500 mt-1">Cần ôn</div>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{stats.newCards}</div>
                        <div className="text-xs text-gray-500 mt-1">Mới thêm</div>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.learning}</div>
                        <div className="text-xs text-gray-500 mt-1">Đang học</div>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.shortTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Ngắn hạn</div>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{stats.longTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Dài hạn</div>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.totalReviewed}</div>
                        <div className="text-xs text-gray-500 mt-1">Tổng đã học</div>
                    </div>
                </div>
            </div>

            {/* Today & Next Review */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-bold">Hôm nay</span>
                    </div>
                    <div className="text-5xl font-bold mb-2">{stats.dueToday}</div>
                    <p className="text-orange-100 mb-4">thẻ cần ôn tập</p>
                    <button
                        onClick={startReview}
                        disabled={stats.dueToday === 0}
                        className="w-full py-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-base font-bold transition-colors border border-white/30"
                    >
                        {stats.dueToday > 0 ? 'Ôn tập ngay' : 'Không có thẻ cần ôn'}
                    </button>
                </div>
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold">Lượt tiếp theo</span>
                    </div>
                    <p className="text-blue-100 text-sm mb-1">Sau khi hoàn thành, bạn có</p>
                    <div className={`font-bold mb-2 ${isNextReviewCountdown ? 'text-3xl md:text-4xl font-mono tracking-wider' : 'text-5xl'}`}>{nextReviewText || '∞'}</div>
                    <p className="text-blue-100">{isNextReviewCountdown ? 'đếm ngược đến lượt ôn tập tiếp theo' : 'nghỉ ngơi cho đến lượt ôn tập tiếp theo'}</p>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {stats.totalReviewed} lượt ôn tập trong 365 ngày qua
                </h3>
                <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {Array.from({ length: 52 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const dataIndex = weekIndex * 7 + dayIndex;
                                    const activity = activityData[dataIndex];
                                    const level = activity?.level || 0;
                                    const colors = ['bg-gray-200 dark:bg-gray-700', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-400 dark:bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];
                                    return (
                                        <div key={dayIndex} className={`w-3 h-3 rounded-sm ${colors[level]}`}
                                            title={activity?.date?.toLocaleDateString()} />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
                    <span>Ít</span>
                    <div className="flex gap-1">
                        {['bg-gray-200 dark:bg-gray-700', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-400 dark:bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'].map((c, i) => (
                            <div key={i} className={`w-3 h-3 rounded-sm ${c}`}></div>
                        ))}
                    </div>
                    <span>Nhiều</span>
                </div>
            </div>

            {/* Card Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5">Phân bố thẻ</h3>
                <div className="space-y-5">
                    {cardDistribution.map((item, index) => (
                        <div key={index}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">{item.label} ({item.count})</span>
                                <span className="text-gray-500 font-medium">{item.percent.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${item.percent}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KanjiReviewScreen;
