import React, { useState, useEffect, useMemo } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useNavigate } from 'react-router-dom';
import { Calendar, Target, Flame, TrendingUp, ChevronLeft, ChevronRight, BookOpen, CheckCircle, Sparkles, Zap } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { TopTabBar } from '../ui';
import { KANJI_TABS } from '../../config/tabs';

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

    const isLevelCompleted = (levelKey) => {
        const levelDays = Math.ceil(kanjiList.filter(k => k.level === levelKey).length / 10) || JLPT_CONFIG[levelKey]?.totalDays || 12;
        for (let d = 1; d <= levelDays; d++) {
            if (!completedDays[`${levelKey}_${d}`]) return false;
        }
        return true;
    };

    const getChapterInfo = (day) => {
        const chapterNum = Math.ceil(day / 3);
        const chapterTitles = {
            1: 'Khởi đầu & Số đếm',
            2: 'Thời gian & Phương hướng',
            3: 'Thiên nhiên & Đời sống',
            4: 'Đời sống & Xã hội',
            5: 'Giao thông & Di chuyển',
            6: 'Nhà cửa & Sinh hoạt',
            7: 'Học tập & Công việc',
            8: 'Thể thao & Giải trí',
            9: 'Cơ thể & Sức khỏe',
            10: 'Môi trường & Khoa học',
        };
        return {
            num: chapterNum,
            title: chapterTitles[chapterNum] || 'Nâng cao & Tổng hợp'
        };
    };

    const config = JLPT_CONFIG[selectedLevel];
    const progressRadius = 54;
    const progressCircumference = 2 * Math.PI * progressRadius;
    const progressOffset = progressCircumference - (stats.progressPercent / 100) * progressCircumference;

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={KANJI_TABS} />
                <LoadingIndicator text="Đang tải lộ trình học..." />
            </div>
        );
    }

    return (
        <div className="w-full pb-12 transition-colors duration-300">
            <TopTabBar tabs={KANJI_TABS} />
            <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6 mt-6">
                
                {/* 1. Header Banner with Circular Progress Gauge */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 p-8 text-white shadow-lg border border-indigo-500/20 dark:border-indigo-900/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-4 text-center md:text-left flex-1">
                            <div>
                                <span className="text-[10px] font-extrabold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                    LỘ TRÌNH JLPT {selectedLevel}
                                </span>
                                <h1 className="text-3xl font-black tracking-tight mt-2.5">
                                    Thêm Kanji mới
                                </h1>
                            </div>
                            <p className="text-sm text-indigo-100 max-w-md font-medium leading-relaxed">
                                {config.sublabel} • 10 chữ mỗi ngày • Tổng {levelKanji.length} chữ chia đều trong {totalDays} ngày.
                            </p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                <button
                                    onClick={handleStartStudy}
                                    className="px-6 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-xs tracking-wider rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
                                >
                                    TIẾP TỤC HỌC
                                </button>
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('lesson-panel');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-6 py-2.5 border border-white/30 hover:bg-white/10 font-bold text-xs tracking-wider rounded-xl transition-all"
                                >
                                    XEM CHI TIẾT
                                </button>
                            </div>
                        </div>

                        {/* Circular Progress Gauge */}
                        <div className="relative w-36 h-36 flex-shrink-0 bg-white/5 backdrop-blur-md rounded-full p-2 border border-white/10 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r={progressRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
                                <circle cx="60" cy="60" r={progressRadius} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"
                                    strokeDasharray={progressCircumference} strokeDashoffset={progressOffset}
                                    className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white">{stats.progressPercent}%</span>
                                <span className="text-[9px] text-indigo-200 font-extrabold uppercase tracking-widest mt-0.5">Hoàn thành</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Horizontal Level Progression Tabs */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto select-none border border-slate-100 dark:border-slate-800/40">
                    {Object.entries(JLPT_CONFIG).map(([level, cfg]) => {
                        const levelData = kanjiList.filter(k => k.level === level);
                        const isSelected = selectedLevel === level;
                        const isCompleted = isLevelCompleted(level);
                        
                        return (
                            <button
                                key={level}
                                onClick={() => { setSelectedLevel(level); setCurrentDay(1); }}
                                className={`flex-1 min-w-[90px] py-3.5 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                    isSelected
                                    ? `bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/60 scale-[1.01]`
                                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-1">
                                    <span className={`text-sm font-extrabold ${isSelected ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {cfg.label}
                                    </span>
                                    {isCompleted && (
                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">✓</span>
                                    )}
                                </div>
                                <span className={`text-[9px] font-extrabold tracking-wider uppercase ${
                                    isSelected 
                                    ? `${cfg.text} bg-${cfg.color}-50 dark:bg-${cfg.color}-950/30 px-2 py-0.5 rounded-full` 
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                    {cfg.sublabel}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. Day Navigation & Active Chapter detailed card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Left 2 Cols: Active Chapter details card */}
                    {(() => {
                        const chapter = getChapterInfo(currentDay);
                        return (
                            <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-indigo-655 dark:text-sky-400 uppercase tracking-widest">
                                            Chương đang học
                                        </span>
                                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            {stats.daysProgress} Ngày học
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                        Chương {chapter.num}: {chapter.title}
                                    </h3>
                                    <p className="text-xs text-slate-450 dark:text-slate-500 leading-relaxed font-medium">
                                        Nắm vững các chữ Kanji thuộc chủ đề này để mở khóa bài học tiếp theo trong chương trình {selectedLevel}.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                                        <span>Tiến độ ngày {currentDay}</span>
                                        <span>{isDayCompleted(selectedLevel, currentDay) ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-500`}
                                            style={{ width: isDayCompleted(selectedLevel, currentDay) ? '100%' : '20%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Right 1 Col: Day Selector Card */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                CHỌN NGÀY HỌC
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentDay(d => Math.max(1, d - 1))}
                                    disabled={currentDay <= 1}
                                    className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                                <button
                                    onClick={() => setCurrentDay(d => Math.min(totalDays, d + 1))}
                                    disabled={currentDay >= totalDays}
                                    className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center my-2">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg shadow-${config.color}-500/20 text-white text-xl font-bold`}>
                                {currentDay}
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-white mt-3">Ngày {currentDay}</span>
                            <span className="text-xs text-slate-450 dark:text-slate-500 mt-0.5">JLPT {selectedLevel}</span>
                        </div>

                        {/* Progress display */}
                        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pt-2 border-t border-slate-50 dark:border-slate-700/40">
                            Ngày {currentDay} / {totalDays}
                        </div>
                    </div>
                </div>

                {/* 4. "Kanji Hôm Nay" Daily Lesson Panel */}
                <div id="lesson-panel" className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/40 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md shadow-${config.color}-500/25`}>
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Kanji ngày {currentDay}</h3>
                                <p className="text-xs text-slate-455 dark:text-slate-500 font-medium">Danh sách {todayKanji.length} chữ của bài học</p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartStudy}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${config.gradient} hover:shadow-lg hover:shadow-${config.color}-500/30 text-white text-xs font-bold tracking-wider uppercase rounded-xl transition-all duration-300 hover:scale-105 active:scale-95`}
                        >
                            <Zap className="w-4 h-4" />
                            Học ngay
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {todayKanji.length > 0 ? (
                            todayKanji.map((kanji, index) => {
                                const jData = getJotobaKanjiData(kanji.character);
                                const meaningTip = kanji.sinoViet || jData?.sinoViet || '';
                                const translation = kanji.meaning || jData?.meaningVi || jData?.meanings?.slice(0, 2).join(', ') || '';
                                const isCompleted = isDayCompleted(selectedLevel, currentDay);
                                
                                return (
                                    <div 
                                        key={kanji.id || index} 
                                        onClick={handleStartStudy}
                                        className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm transition-all duration-350 cursor-pointer hover:scale-[1.01]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-japanese text-3xl font-bold text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700/60 shadow-sm">
                                                {kanji.character}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-extrabold text-indigo-650 dark:text-sky-400 uppercase tracking-widest">{meaningTip || '—'}</h4>
                                                <p className="text-xs text-slate-450 dark:text-slate-500 font-bold truncate max-w-[180px] mt-0.5">{translation || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold font-mono">
                                                {jData?.stroke_count || kanji.strokeCount || 8} nét
                                            </span>
                                            {isCompleted && (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            Array.from({ length: 10 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 h-22"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-300 text-2xl font-bold font-japanese">
                                            ?
                                        </div>
                                        <div>
                                            <div className="w-16 h-3.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                            <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded mt-1.5 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default KanjiStudyScreen;
