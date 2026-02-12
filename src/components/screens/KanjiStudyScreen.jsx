import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Target, Flame, TrendingUp, ChevronLeft, ChevronRight, BookOpen, CheckCircle } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';

// JLPT Levels configuration
const JLPT_CONFIG = {
    N5: { label: 'N5', sublabel: 'Cơ bản', color: 'emerald', totalDays: 12, kanjiPerDay: 10 },
    N4: { label: 'N4', sublabel: '', color: 'blue', totalDays: 21, kanjiPerDay: 10 },
    N3: { label: 'N3', sublabel: '', color: 'purple', totalDays: 38, kanjiPerDay: 10 },
    N2: { label: 'N2', sublabel: '', color: 'orange', totalDays: 51, kanjiPerDay: 10 },
    N1: { label: 'N1', sublabel: '', color: 'red', totalDays: 131, kanjiPerDay: 10 },
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

    // Get kanji for selected level
    const levelKanji = useMemo(() => {
        return kanjiList.filter(k => k.level === selectedLevel);
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
            progressPercent: `${progress}%`,
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

    // Level selector colors
    const getLevelStyle = (level, isSelected) => {
        if (isSelected) {
            return 'border-2 border-emerald-500 bg-emerald-500/10';
        }
        return 'border border-gray-700 hover:border-gray-600';
    };

    const handleStartStudy = () => {
        navigate(`${ROUTES.KANJI_STUDY}/lesson?level=${selectedLevel}&day=${currentDay}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="text-center space-y-3">
                    <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải lộ trình...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                    Lộ trình học Kanji
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    10 chữ mỗi ngày - Tổng cộng {totalDays} ngày
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-emerald-500 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium">Đã học</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.daysProgress}</div>
                    <div className="text-xs text-gray-500">ngày</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-cyan-500 mb-1">
                        <Target className="w-4 h-4" />
                        <span className="text-xs font-medium">Kanji</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.kanjiLearned}</div>
                    <div className="text-xs text-gray-500">chữ đã học</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-orange-500 mb-1">
                        <Flame className="w-4 h-4" />
                        <span className="text-xs font-medium">Streak</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.streak}</div>
                    <div className="text-xs text-gray-500">ngày liên tiếp</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-pink-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Tiến độ</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.progressPercent}</div>
                    <div className="text-xs text-gray-500">hoàn thành</div>
                </div>
            </div>

            {/* Level Selector */}
            <div className="grid grid-cols-5 gap-2">
                {Object.entries(JLPT_CONFIG).map(([level, config]) => {
                    const levelData = kanjiList.filter(k => k.level === level);
                    const isSelected = selectedLevel === level;

                    return (
                        <button
                            key={level}
                            onClick={() => { setSelectedLevel(level); setCurrentDay(1); }}
                            className={`p-3 rounded-xl transition-all ${getLevelStyle(level, isSelected)}`}
                        >
                            <div className={`text-lg font-bold ${isSelected ? 'text-emerald-500' : 'text-gray-800 dark:text-white'}`}>
                                {config.label}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {levelData.length} chữ
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Day Navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setCurrentDay(d => Math.max(1, d - 1))}
                    disabled={currentDay <= 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-lg font-bold text-gray-800 dark:text-white">Ngày {currentDay}</span>
                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                        {selectedLevel} - {JLPT_CONFIG[selectedLevel]?.sublabel || 'Cơ bản'}
                    </span>
                </div>

                <button
                    onClick={() => setCurrentDay(d => Math.min(totalDays, d + 1))}
                    disabled={currentDay >= totalDays}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Day Progress Slider */}
            <div className="px-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Ngày 1</span>
                    <span>Ngày {totalDays}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max={totalDays}
                    value={currentDay}
                    onChange={(e) => setCurrentDay(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
            </div>

            {/* Today's Kanji */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-cyan-500" />
                        <span className="font-bold text-gray-800 dark:text-white">Kanji ngày {currentDay}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{todayKanji.length} chữ</span>
                        <button
                            onClick={handleStartStudy}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            <BookOpen className="w-4 h-4" />
                            Học ngay
                        </button>
                    </div>
                </div>

                {/* Kanji Grid */}
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {todayKanji.length > 0 ? (
                        todayKanji.map((kanji, index) => (
                            <button
                                key={kanji.id || index}
                                onClick={handleStartStudy}
                                className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20 border border-gray-200 dark:border-gray-600 hover:border-emerald-500 rounded-lg transition-all group relative"
                            >
                                <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white group-hover:text-emerald-500 font-japanese">
                                    {kanji.character}
                                </span>
                                {isDayCompleted(selectedLevel, currentDay) && (
                                    <CheckCircle className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-emerald-500" />
                                )}
                            </button>
                        ))
                    ) : (
                        Array.from({ length: 10 }).map((_, index) => (
                            <div
                                key={index}
                                className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                            >
                                <span className="text-2xl text-gray-300 dark:text-gray-600">?</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Day completion status */}
                {isDayCompleted(selectedLevel, currentDay) && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-500 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Đã hoàn thành ngày này</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanjiStudyScreen;
