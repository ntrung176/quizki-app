import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Target, Flame, ChevronLeft, ExternalLink, RotateCcw, Zap, BarChart3, Sparkles } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { formatCountdown } from '../../utils/srs';
import { flashCorrect, launchConfetti, launchFanfare } from '../../utils/celebrations';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare, launchFireworks } from '../../utils/soundEffects';

// ==================== SRS LOGIC (Anki-like with learning steps) ====================
const getNextInterval = (currentInterval, ease, rating, reps) => {
    if (reps <= 1) {
        switch (rating) {
            case 'again': return 1;
            case 'hard': return 6;
            case 'good': return reps === 0 ? 10 : 1440;
            case 'easy': return 5760;
            default: return 10;
        }
    }
    switch (rating) {
        case 'again': return 10;
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

    useEffect(() => {
        const load = async () => {
            try {
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
            totalReps += reps;
            if (reps === 0 && interval === 0) hasNoSRS++;
            else if (interval < 60) learning++;
            else if (interval < 1440 * 7) shortTerm++;
            else longTerm++;
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
        setReviewQueue([...dueKanji]);
        setCurrentReviewIndex(0);
        setIsFlipped(false);
        setReviewMode(true);
    };

    const currentCard = reviewQueue[currentReviewIndex] || null;

    const handleRating = async (rating) => {
        if (!currentCard || !userId) return;
        const srs = srsData[currentCard.id] || { interval: 0, ease: 2.5, nextReview: 0, reps: 0 };
        const currentReps = srs.reps || 0;
        const newInterval = getNextInterval(srs.interval || 0, srs.ease || 2.5, rating, currentReps);
        const newEase = getNewEase(srs.ease || 2.5, rating);
        const now = Date.now();
        const newSrs = { interval: newInterval, ease: newEase, nextReview: now + newInterval * 60000, lastReview: now, reps: currentReps + 1 };
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, currentCard.id), newSrs);
            setSrsData(prev => ({ ...prev, [currentCard.id]: newSrs }));
        } catch (e) { console.error('Error updating SRS:', e); }
        if (currentReviewIndex + 1 < reviewQueue.length) {
            if (rating === 'good' || rating === 'easy') { flashCorrect(); playCorrectSound(); }
            else if (rating === 'again') { playIncorrectSound(); }
            setCurrentReviewIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            launchFanfare(); launchFireworks(); playCompletionFanfare();
            setReviewMode(false);
        }
    };

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
        return <LoadingIndicator text="Đang tải dữ liệu ôn tập..." />;
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
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
                <div className="w-[600px] max-w-full flex flex-col justify-center items-center space-y-4">
                    {/* Progress */}
                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Ôn tập Kanji</span>
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{currentReviewIndex + 1} / {reviewQueue.length}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Flashcard */}
                    <div className="w-full cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(f => !f)}>
                        <div style={{ position: 'relative', width: '100%', height: '360px', transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                            {/* Front */}
                            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-2xl shadow-gray-200/50 dark:shadow-black/30"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="text-[140px] leading-none font-bold text-gray-800 dark:text-white select-none font-japanese">{currentCard.character}</div>
                                <div className="absolute bottom-5 left-0 right-0 text-center">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700/50 px-3 py-1 rounded-full">Nhấn để lật thẻ</span>
                                </div>
                            </div>
                            {/* Back */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/30 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 shadow-2xl shadow-indigo-200/30 dark:shadow-black/30"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', overflowY: 'auto' }}>
                                <div className="text-center space-y-4 w-full">
                                    <div className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{currentCard.sinoViet || '—'}</div>
                                    <div className="text-xl text-cyan-600 dark:text-cyan-400 font-medium">{currentCard.meaning || '—'}</div>
                                    {currentCard.mnemonic && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl p-4 leading-relaxed border border-gray-200/50 dark:border-slate-600/30">
                                            💡 {currentCard.mnemonic}
                                        </div>
                                    )}
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
                                className={`py-3.5 rounded-2xl ${btn.bg} ${btn.border} border text-center transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95`}>
                                <div className={`font-bold ${btn.text} text-sm`}>{btn.label}</div>
                                <div className={`text-[10px] ${btn.sub} mt-0.5`}>{btn.interval}</div>
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
        <div className="space-y-5 max-w-4xl mx-auto pb-8">
            {/* Banner Ôn tập Kanji */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 p-6 md:p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-pink-300" />
                            <span className="text-white/80 text-sm font-medium">Lộ trình học Kanji</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Ôn tập Kanji
                        </h1>
                        <p className="text-white/70 text-sm">
                            Củng cố trí nhớ dài hạn • Hệ thống {kanjiList.length} chữ
                        </p>
                    </div>
                    {/* Progress Ring */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 - (Math.min(1, stats.kanjiLearned / (kanjiList.length || 1))) * 2 * Math.PI * 54}
                                className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{Math.round((stats.kanjiLearned / (kanjiList.length || 1)) * 100)}%</span>
                            <span className="text-[10px] text-white/60 uppercase tracking-wide font-medium">Đã học</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today Status & Next Review */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-5 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-orange-100" />
                            <span className="font-bold text-sm">Hôm nay</span>
                        </div>
                        <div className="text-5xl font-bold mb-1">{stats.dueToday}</div>
                        <p className="text-orange-100 text-sm mb-4">thẻ cần ôn</p>
                        <button onClick={startReview} disabled={stats.dueToday === 0}
                            className="w-full py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all border border-white/20 backdrop-blur-sm">
                            {stats.dueToday > 0 ? 'Ôn tập ngay' : 'Nghỉ ngơi 😴'}
                        </button>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-100" />
                            <span className="font-bold text-sm">Lượt tiếp theo</span>
                        </div>
                        <div className={`font-bold mb-1 ${isNextReviewCountdown ? 'text-3xl font-mono tracking-wider' : 'text-4xl'}`}>
                            {nextReviewText || '∞'}
                        </div>
                        <p className="text-blue-100 text-sm">{isNextReviewCountdown ? 'Đếm ngược...' : 'Nghỉ ngơi...'}</p>
                        {nextRoundCount > 0 && (
                            <div className="mt-3 bg-white/15 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-xs font-bold">{nextRoundCount} thẻ sẽ đến hạn</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Calendar, label: 'Ngày đã học', value: stats.daysStudied, color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
                    { icon: Target, label: 'Kanji đã học', value: stats.kanjiLearned, color: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
                    { icon: Flame, label: 'Ngày liên tiếp', value: stats.streak, color: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 text-center group hover:scale-[1.02]">
                        <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mx-auto mb-2.5`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Overview */}
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> Tổng quan SRS
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                        { label: 'Cần ôn', value: stats.dueToday, color: 'text-cyan-500' },
                        { label: 'Chưa ôn', value: stats.newCards, color: 'text-gray-500' },
                        { label: 'Đang học', value: stats.learning, color: 'text-amber-500' },
                        { label: 'Ngắn hạn', value: stats.shortTerm, color: 'text-orange-500' },
                        { label: 'Dài hạn', value: stats.longTerm, color: 'text-emerald-500' },
                        { label: 'Tổng lượt', value: stats.totalReps, color: 'text-indigo-500' },
                    ].map((item, i) => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            <div className={`text-xl md:text-2xl font-bold ${item.color}`}>{item.value}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KanjiReviewScreen;
