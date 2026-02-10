import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HanziWriter from 'hanzi-writer';
import { Calendar, Clock, Target, Flame, ChevronLeft, ExternalLink, RotateCcw } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';

// ==================== SRS LOGIC (Anki-like) ====================
const SRS_INTERVALS = {
    again: 1,        // 1 phút
    hard: 6,         // 6 phút
    good: 1440,      // 1 ngày (phút)
    easy: 5760,      // 4 ngày (phút)
};

const SRS_MULTIPLIERS = {
    again: 0,
    hard: 1.2,
    good: 2.5,
    easy: 3.5,
};

const getNextInterval = (currentInterval, ease, rating) => {
    if (rating === 'again') return SRS_INTERVALS.again;
    if (rating === 'hard') return Math.max(SRS_INTERVALS.hard, Math.round(currentInterval * 1.2));
    if (rating === 'good') return Math.max(SRS_INTERVALS.good, Math.round(currentInterval * ease));
    if (rating === 'easy') return Math.max(SRS_INTERVALS.easy, Math.round(currentInterval * ease * 1.3));
    return SRS_INTERVALS.good;
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

    // Writer
    const writerRef = useRef(null);
    const writerContainerRef = useRef(null);

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
                    const srsSnap = await getDocs(collection(db, `users/${userId}/kanjiSRS`));
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
            if (!srs) return false; // Only review kanji that have been studied
            const nextReview = srs.nextReview || 0;
            return nextReview <= now;
        });
    }, [kanjiList, srsData]);

    // Stats
    const stats = useMemo(() => {
        const now = Date.now();
        let newCount = 0, learning = 0, shortTerm = 0, longTerm = 0;
        kanjiList.forEach(k => {
            const srs = srsData[k.id];
            if (!srs) { newCount++; return; }
            const interval = srs.interval || 0;
            if (interval < 60) learning++;
            else if (interval < 1440 * 7) shortTerm++;
            else longTerm++;
        });
        return {
            dueToday: dueKanji.length,
            newCards: newCount,
            learning,
            shortTerm,
            longTerm,
            totalReviewed: kanjiList.length - newCount,
        };
    }, [kanjiList, srsData, dueKanji]);

    // Next review time
    const nextReviewTime = useMemo(() => {
        const now = Date.now();
        let earliest = Infinity;
        Object.values(srsData).forEach(srs => {
            const next = srs.nextReview || 0;
            if (next > now && next < earliest) earliest = next;
        });
        if (earliest === Infinity) return null;
        const diffMin = Math.round((earliest - now) / 60000);
        return formatInterval(diffMin);
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
            // Count reviews on that day from SRS data
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

    // HanziWriter for review
    useEffect(() => {
        if (!currentCard || !writerContainerRef.current || !reviewMode) return;
        writerContainerRef.current.innerHTML = '';
        try {
            writerRef.current = HanziWriter.create(writerContainerRef.current, currentCard.character, {
                width: 200, height: 200, padding: 5,
                showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 300,
                strokeColor: '#e2e8f0', outlineColor: '#334155',
                showCharacter: true,
            });
        } catch (err) {
            if (writerContainerRef.current) {
                writerContainerRef.current.innerHTML = `<span style="font-size:120px;color:#e2e8f0">${currentCard.character}</span>`;
            }
        }
        return () => { writerRef.current = null; };
    }, [currentCard, reviewMode]);

    // Handle SRS rating
    const handleRating = async (rating) => {
        if (!currentCard || !userId) return;
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, nextReview: 0, reps: 0 };
        const newInterval = getNextInterval(srs.interval || 0, srs.ease || 2.5, rating);
        const newEase = getNewEase(srs.ease || 2.5, rating);
        const now = Date.now();
        const newSrs = {
            interval: newInterval,
            ease: newEase,
            nextReview: now + newInterval * 60000,
            lastReview: now,
            reps: (srs.reps || 0) + 1,
        };

        try {
            await setDoc(doc(db, `users/${userId}/kanjiSRS`, currentCard.id), newSrs);
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
            if (isFlipped) {
                if (e.key === '1') handleRating('again');
                if (e.key === '2') handleRating('hard');
                if (e.key === '3') handleRating('good');
                if (e.key === '4') handleRating('easy');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [reviewMode, isFlipped, currentCard, currentReviewIndex]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // ==================== REVIEW MODE ====================
    if (reviewMode && currentCard) {
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5 };
        const intervals = {
            again: formatInterval(SRS_INTERVALS.again),
            hard: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'hard')),
            good: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'good')),
            easy: formatInterval(getNextInterval(srs.interval || 0, srs.ease || 2.5, 'easy')),
        };

        return (
            <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 p-4">
                {/* Card */}
                <div
                    className="w-full bg-slate-800 rounded-2xl border-2 border-indigo-500/30 shadow-xl relative overflow-hidden cursor-pointer"
                    style={{ minHeight: '360px' }}
                    onClick={() => setIsFlipped(f => !f)}
                >
                    {/* Xem chi tiết */}
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(ROUTES.KANJI_LIST); }}
                        className="absolute top-4 left-4 flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors z-10"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Xem chi tiết
                    </button>

                    <div className="flex items-center justify-center w-full h-full" style={{ minHeight: '360px' }}>
                        {!isFlipped ? (
                            /* Front: Kanji character */
                            <div className="flex items-center justify-center">
                                <div ref={writerContainerRef} className="flex items-center justify-center" />
                            </div>
                        ) : (
                            /* Back: Info */
                            <div className="text-center space-y-3 p-6">
                                <div className="text-6xl font-bold text-white font-japanese">{currentCard.character}</div>
                                <div className="text-2xl font-bold text-emerald-400">{currentCard.sinoViet || ''}</div>
                                <div className="text-lg text-gray-300">{currentCard.meaning || ''}</div>
                                <div className="flex gap-4 justify-center text-sm">
                                    <div><span className="text-gray-500">On:</span> <span className="text-cyan-400 font-japanese">{currentCard.onyomi || '-'}</span></div>
                                    <div><span className="text-gray-500">Kun:</span> <span className="text-white font-japanese">{currentCard.kunyomi || '-'}</span></div>
                                </div>
                                {currentCard.mnemonic && (
                                    <div className="text-xs text-gray-400 bg-slate-700/50 rounded-lg p-2 mt-2">{currentCard.mnemonic}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hint */}
                    <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-500">
                        <span>⌨ Nhấn</span> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-gray-400 mx-1">Space</kbd>
                        <span>để lật, bấm</span> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-gray-400 mx-1">1-4</kbd>
                        <span>để đánh giá</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="text-sm text-gray-400">{currentReviewIndex + 1} / {reviewQueue.length}</div>

                {/* Rating buttons - show only when flipped */}
                {isFlipped && (
                    <div className="grid grid-cols-4 gap-2 w-full">
                        <button onClick={() => handleRating('again')}
                            className="py-3 rounded-xl bg-red-900/60 hover:bg-red-800/80 border border-red-700 text-center transition-all">
                            <div className="font-bold text-red-400 text-sm">Quên rồi</div>
                            <div className="text-xs text-red-400/70">{intervals.again}</div>
                        </button>
                        <button onClick={() => handleRating('hard')}
                            className="py-3 rounded-xl bg-orange-900/50 hover:bg-orange-800/70 border border-orange-700 text-center transition-all">
                            <div className="font-bold text-orange-400 text-sm">Khó</div>
                            <div className="text-xs text-orange-400/70">{intervals.hard}</div>
                        </button>
                        <button onClick={() => handleRating('good')}
                            className="py-3 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-700 text-center transition-all">
                            <div className="font-bold text-emerald-400 text-sm">Tốt</div>
                            <div className="text-xs text-emerald-400/70">{intervals.good}</div>
                        </button>
                        <button onClick={() => handleRating('easy')}
                            className="py-3 rounded-xl bg-blue-900/50 hover:bg-blue-800/70 border border-blue-700 text-center transition-all">
                            <div className="font-bold text-blue-400 text-sm">Dễ</div>
                            <div className="text-xs text-blue-400/70">{intervals.easy}</div>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ==================== STATS SCREEN ====================
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Thống kê học tập Kanji</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Theo dõi tiến độ ôn tập và phân bố thẻ</p>
            </div>

            {/* Overview Stats */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Tổng quan (thẻ)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-cyan-400">{stats.dueToday}</div>
                        <div className="text-xs text-gray-500 mt-1">Cần ôn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{stats.newCards}</div>
                        <div className="text-xs text-gray-500 mt-1">Mới thêm</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{stats.learning}</div>
                        <div className="text-xs text-gray-500 mt-1">Đang học</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{stats.shortTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Ngắn hạn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{stats.longTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Dài hạn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{stats.totalReviewed}</div>
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
                    <div className="text-5xl font-bold mb-2">{nextReviewTime || '∞'}</div>
                    <p className="text-blue-100">nghỉ ngơi cho đến lượt ôn tập tiếp theo</p>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
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
                                    const colors = ['bg-gray-700', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];
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
                        {['bg-gray-700', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'].map((c, i) => (
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
