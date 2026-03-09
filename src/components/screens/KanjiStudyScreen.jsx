import React, { useState, useEffect, useMemo } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate } from 'react-router-dom';
import { Calendar, Target, Flame, TrendingUp, ChevronLeft, ChevronRight, BookOpen, CheckCircle, Sparkles, Zap } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';

// JLPT Levels configuration
const JLPT_CONFIG = {
    N5: { label: 'N5', sublabel: 'Cơ bản', color: 'emerald', totalDays: 12, kanjiPerDay: 10, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
    N4: { label: 'N4', sublabel: 'Sơ cấp', color: 'blue', totalDays: 21, kanjiPerDay: 10, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
    N3: { label: 'N3', sublabel: 'Trung cấp', color: 'purple', totalDays: 38, kanjiPerDay: 10, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700' },
    N2: { label: 'N2', sublabel: 'Cao cấp', color: 'orange', totalDays: 51, kanjiPerDay: 10, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700' },
    N1: { label: 'N1', sublabel: 'Thành thạo', color: 'red', totalDays: 131, kanjiPerDay: 10, gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700' },
};

const KanjiStudyScreen = () => {
    const navigate = useNavigate();
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [currentDay, setCurrentDay] = useState(1);
    const [kanjiList, setKanjiList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completedDays, setCompletedDays] = useState({});

    const userId = getAuth().currentUser?.uid;

    // Load kanji and progress from Firebase
    useEffect(() => {
        const loadData = async () => {
            try {
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setKanjiList(kanjiData);

                // Load user progress
                if (userId) {
                    try {
                        const progressSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiProgress`));
                        const progress = {};
                        progressSnap.docs.forEach(d => {
                            const data = d.data();
                            const key = `${data.level}_${data.day}`;
                            progress[key] = data;
                        });
                        setCompletedDays(progress);
                    } catch (e) { console.error('Error loading progress:', e); }
                }
            } catch (e) {
                console.error('Error loading kanji:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [userId]);

    // Get kanji for selected level, sorted from easy to hard (stroke count → frequency)
    const levelKanji = useMemo(() => {
        const filtered = kanjiList.filter(k => k.level === selectedLevel);
        return filtered.sort((a, b) => {
            // Primary: stroke count (fewer strokes = easier)
            const jA = getJotobaKanjiData(a.character);
            const jB = getJotobaKanjiData(b.character);
            const strokeA = jA?.stroke_count || parseInt(a.strokeCount) || 999;
            const strokeB = jB?.stroke_count || parseInt(b.strokeCount) || 999;
            if (strokeA !== strokeB) return strokeA - strokeB;
            // Secondary: frequency (lower = more common = learn first)
            const freqA = jA?.frequency || 9999;
            const freqB = jB?.frequency || 9999;
            return freqA - freqB;
        });
    }, [kanjiList, selectedLevel]);

    // Calculate total days for level
    const totalDays = useMemo(() => {
        return Math.ceil(levelKanji.length / 10) || JLPT_CONFIG[selectedLevel]?.totalDays || 12;
    }, [levelKanji, selectedLevel]);

    // Get kanji for current day (10 kanji per day)
    const todayKanji = useMemo(() => {
        const startIndex = (currentDay - 1) * 10;
        return levelKanji.slice(startIndex, startIndex + 10);
    }, [levelKanji, currentDay]);

    // Check if a specific day is completed
    const isDayCompleted = (lvl, d) => {
        return !!completedDays[`${lvl}_${d}`];
    };

    // Count completed days for selected level
    const completedDaysCount = useMemo(() => {
        let count = 0;
        for (let d = 1; d <= totalDays; d++) {
            if (isDayCompleted(selectedLevel, d)) count++;
        }
        return count;
    }, [completedDays, selectedLevel, totalDays]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalKanji = levelKanji.length;
        const kanjiLearned = completedDaysCount * 10;
        const progress = totalKanji > 0 ? Math.round((kanjiLearned / totalKanji) * 100) : 0;
        return {
            daysProgress: `${completedDaysCount}/${totalDays}`,
            kanjiLearned: Math.min(kanjiLearned, totalKanji),
            streak: completedDaysCount,
            progressPercent: progress,
            totalKanji,
        };
    }, [levelKanji, completedDaysCount, totalDays]);

    // Auto-set current day to next uncompleted day
    useEffect(() => {
        for (let d = 1; d <= totalDays; d++) {
            if (!isDayCompleted(selectedLevel, d)) {
                setCurrentDay(d);
                return;
            }
        }
        // All days completed, stay on last
        setCurrentDay(totalDays);
    }, [selectedLevel, completedDays, totalDays]);

    const handleStartStudy = () => {
        navigate(`${ROUTES.KANJI_STUDY}/lesson?level=${selectedLevel}&day=${currentDay}`);
    };

    const config = JLPT_CONFIG[selectedLevel];
    const progressRadius = 54;
    const progressCircumference = 2 * Math.PI * progressRadius;
    const progressOffset = progressCircumference - (stats.progressPercent / 100) * progressCircumference;

    if (loading) {
        return <LoadingIndicator text="Đang tải lộ trình học..." />;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            {/* ===== 1. Header + Progress Ring - TOP ===== */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 md:p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            <span className="text-white/80 text-sm font-medium">Lộ trình học Kanji</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Thêm Kanji mới
                        </h1>
                        <p className="text-white/70 text-sm">
                            10 chữ mỗi ngày • Tổng {levelKanji.length} chữ • {totalDays} ngày
                        </p>
                    </div>
                    {/* Progress Ring */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r={progressRadius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                            <circle cx="60" cy="60" r={progressRadius} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={progressCircumference} strokeDashoffset={progressOffset}
                                className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{stats.progressPercent}%</span>
                            <span className="text-[10px] text-white/60 uppercase tracking-wide font-medium">Hoàn thành</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== 2. Level Selector ===== */}
            <div className="grid grid-cols-5 gap-2">
                {Object.entries(JLPT_CONFIG).map(([level, cfg]) => {
                    const levelData = kanjiList.filter(k => k.level === level);
                    const isSelected = selectedLevel === level;
                    return (
                        <button
                            key={level}
                            onClick={() => { setSelectedLevel(level); setCurrentDay(1); }}
                            className={`relative p-3 md:p-4 rounded-2xl transition-all duration-300 overflow-hidden group ${isSelected
                                ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-lg shadow-${cfg.color}-500/30 scale-[1.03]`
                                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'
                                }`}
                        >
                            {isSelected && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                            <div className={`text-xl md:text-2xl font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                                {cfg.label}
                            </div>
                            <div className={`text-[10px] md:text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                {levelData.length} chữ
                            </div>
                            <div className={`text-[9px] ${isSelected ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                                {cfg.sublabel}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ===== 3. Stats Cards ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: Calendar, label: 'Đã học', value: stats.daysProgress, sub: 'ngày', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
                    { icon: Target, label: 'Kanji', value: stats.kanjiLearned, sub: `/ ${stats.totalKanji} chữ`, iconBg: 'bg-cyan-100 dark:bg-cyan-900/40', iconColor: 'text-cyan-600 dark:text-cyan-400' },
                    { icon: Flame, label: 'Chuỗi ngày', value: stats.streak, sub: 'ngày liên tiếp', iconBg: 'bg-orange-100 dark:bg-orange-900/40', iconColor: 'text-orange-600 dark:text-orange-400' },
                    { icon: TrendingUp, label: 'Tiến độ', value: `${stats.progressPercent}%`, sub: selectedLevel, iconBg: 'bg-pink-100 dark:bg-pink-900/40', iconColor: 'text-pink-600 dark:text-pink-400' },
                ].map((stat, i) => (
                    <div key={i} className="group bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{stat.value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* ===== 4. Day Navigation ===== */}
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setCurrentDay(d => Math.max(1, d - 1))}
                        disabled={currentDay <= 1}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                            <span className="text-white font-bold text-sm">{currentDay}</span>
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">Ngày {currentDay}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{selectedLevel} • {config.sublabel}</div>
                        </div>
                        {isDayCompleted(selectedLevel, currentDay) && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
                                <CheckCircle className="w-3 h-3" /> Xong
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setCurrentDay(d => Math.min(totalDays, d + 1))}
                        disabled={currentDay >= totalDays}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="relative">
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${(currentDay / totalDays) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 px-0.5">
                        <span>Ngày 1</span>
                        <span>{currentDay} / {totalDays}</span>
                    </div>
                </div>
            </div>

            {/* ===== 5. Today's Kanji ===== */}
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">Kanji ngày {currentDay}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{todayKanji.length} chữ Kanji</div>
                        </div>
                    </div>
                    <button
                        onClick={handleStartStudy}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${config.gradient} hover:shadow-lg hover:shadow-${config.color}-500/30 text-white text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105`}
                    >
                        <Zap className="w-4 h-4" />
                        Học ngay
                    </button>
                </div>

                {/* Kanji Grid - 10 per row, simple style */}
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5">
                    {todayKanji.length > 0 ? (
                        todayKanji.map((kanji, index) => (
                            <button
                                key={kanji.id || index}
                                onClick={handleStartStudy}
                                className="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/80 dark:to-slate-700/40 hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 border border-gray-200 dark:border-slate-600/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 rounded-xl transition-all duration-300 group relative hover:shadow-md hover:scale-105"
                            >
                                <span className="text-2xl md:text-3xl font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-japanese transition-colors">
                                    {kanji.character}
                                </span>
                                {isDayCompleted(selectedLevel, currentDay) && (
                                    <CheckCircle className="absolute top-1 right-1 w-3.5 h-3.5 text-emerald-500" />
                                )}
                            </button>
                        ))
                    ) : (
                        Array.from({ length: 10 }).map((_, index) => (
                            <div
                                key={index}
                                className="aspect-square flex items-center justify-center bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl"
                            >
                                <span className="text-2xl text-gray-200 dark:text-gray-700 font-japanese">？</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Day completion status */}
                {isDayCompleted(selectedLevel, currentDay) && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Đã hoàn thành ngày này! Bạn có thể ôn lại hoặc tiếp tục.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanjiStudyScreen;
