import React, { useState, useMemo } from 'react';
import { 
    CheckCircle2, Clock, Play, RotateCcw, Lock, Unlock, 
    BookOpen, Languages, FileText, Award, ChevronDown, ChevronUp,
    Search, Filter, Printer, Eye, EyeOff, Layers, Check
} from 'lucide-react';
import { LEVEL_GRADIENTS, getTestQuestionCount } from './jlptConstants';
import JLPTStrategyModal from './JLPTStrategyModal';

const SKILL_ICONS = {
    vocab: Languages,
    grammar: BookOpen,
    reading: FileText,
    full: Award
};

const ICON_COLOR_STYLES = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
};

const JLPTLessonRoadmapTab = ({
    tests,
    completedTests = {},
    savedProgresses = {},
    selectedLevel,
    searchQuery,
    statusFilter,
    canEdit,
    hasPremiumAccess,
    startTest,
    reviewTest,
    handleStartPrint,
    handleToggleTestPremium,
    setShowPremiumModal,
    setLockedPkgName
}) => {
    const [expandedLessons, setExpandedLessons] = useState({});
    const [allExpanded, setAllExpanded] = useState(false);
    const [selectedStageKey, setSelectedStageKey] = useState('all');
    const [collapsedStages, setCollapsedStages] = useState({});
    const [allStagesCollapsed, setAllStagesCollapsed] = useState(false);
    const [activeStrategyModal, setActiveStrategyModal] = useState(null);

    const toggleExpand = (lessonKey) => {
        setExpandedLessons(prev => ({
            ...prev,
            [lessonKey]: !(prev[lessonKey] ?? allExpanded)
        }));
    };

    const toggleAllLessons = () => {
        const nextState = !allExpanded;
        setAllExpanded(nextState);
        setExpandedLessons({});
    };

    const toggleStage = (stageKey) => {
        setCollapsedStages(prev => ({
            ...prev,
            [stageKey]: !(prev[stageKey] ?? allStagesCollapsed)
        }));
    };

    const toggleAllStages = () => {
        const nextState = !allStagesCollapsed;
        setAllStagesCollapsed(nextState);
        setCollapsedStages({});
    };

    const getTestStatus = (test) => {
        if (!test) return 'not_started';
        const testId = test.id || test._id;
        const completed = completedTests[testId] || completedTests[String(testId)];
        if (completed) return 'completed';
        const saved = savedProgresses[testId] || savedProgresses[String(testId)];
        if (saved && saved.answers && Object.keys(saved.answers).length > 0) return 'in_progress';
        return 'not_started';
    };

    const getTestScore = (test) => {
        if (!test) return null;
        const testId = test.id || test._id;
        const completed = completedTests[testId] || completedTests[String(testId)];
        if (completed && typeof completed.percentage === 'number') {
            return Math.round(completed.percentage);
        }
        return null;
    };

    // Group tests into structured lessons (1 to 148)
    const lessons = useMemo(() => {
        const lessonMap = new Map();

        tests.forEach(t => {
            const match = t.id.match(/-b(\d+)$/) || t.title.match(/(?:#|Bài\s*)(\d+)/i);
            const bai = match ? parseInt(match[1]) : 0;
            const lvl = t.level || 'N5';
            const key = `${lvl}-b${bai}`;

            if (!lessonMap.has(key)) {
                lessonMap.set(key, {
                    key,
                    level: lvl,
                    bai,
                    title: `Bài ${bai}`,
                    description: t.description || '',
                    strategy: t.strategy || null,
                    fullTest: null,
                    vocabTest: null,
                    grammarTest: null,
                    readingTest: null,
                    otherTests: []
                });
            }

            const item = lessonMap.get(key);
            if (t.description && !item.description) {
                item.description = t.description;
            }
            if (t.strategy && !item.strategy) {
                item.strategy = t.strategy;
            }

            if (!t.isSkillTest) {
                item.fullTest = t;
            } else if (t.skillType === 'vocabulary') {
                item.vocabTest = t;
            } else if (t.skillType === 'grammar') {
                item.grammarTest = t;
            } else if (t.skillType === 'reading') {
                item.readingTest = t;
            } else {
                item.otherTests.push(t);
            }
        });

        const list = Array.from(lessonMap.values());
        list.sort((a, b) => {
            if (a.level !== b.level) {
                const order = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
                return (order[a.level] || 99) - (order[b.level] || 99);
            }
            return a.bai - b.bai;
        });

        return list;
    }, [tests]);

    // Filter lessons based on level, search, and status
    const filteredLessons = useMemo(() => {
        return lessons.filter(lesson => {
            if (selectedLevel !== 'all' && lesson.level !== selectedLevel) return false;

            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchBai = `bài ${lesson.bai}`.includes(query) || `#${lesson.bai}`.includes(query) || `${lesson.bai}` === query;
                const matchLvl = lesson.level.toLowerCase().includes(query);
                const matchDesc = (lesson.description || '').toLowerCase().includes(query);
                const matchTitle = (lesson.fullTest?.title || '').toLowerCase().includes(query) || (lesson.readingTest?.title || '').toLowerCase().includes(query);
                if (!matchBai && !matchLvl && !matchDesc && !matchTitle) return false;
            }

            if (statusFilter !== 'all') {
                const testsInLesson = [lesson.fullTest, lesson.vocabTest, lesson.grammarTest, lesson.readingTest].filter(Boolean);
                const statuses = testsInLesson.map(getTestStatus);
                if (statusFilter === 'completed' && !statuses.includes('completed')) return false;
                if (statusFilter === 'in_progress' && !statuses.includes('in_progress')) return false;
                if (statusFilter === 'not_started' && statuses.every(s => s === 'completed')) return false;
            }

            return true;
        });
    }, [lessons, selectedLevel, searchQuery, statusFilter, completedTests, savedProgresses]);

    // Group lessons into stages (10 lessons each)
    const stageGroups = useMemo(() => {
        const groups = [];
        const groupMap = new Map();

        filteredLessons.forEach(lesson => {
            let start = 1;
            let end = 10;
            if (lesson.bai > 0) {
                start = Math.floor((lesson.bai - 1) / 10) * 10 + 1;
                end = start + 9;
            }

            const stageKey = `${lesson.level}-${start}-${end}`;
            if (!groupMap.has(stageKey)) {
                const grpObj = {
                    key: stageKey,
                    level: lesson.level,
                    start,
                    end,
                    title: `Chặng bài ${start} – ${end} (${lesson.level})`,
                    shortTitle: `Bài ${start} – ${end}`,
                    lessons: [],
                    completedLessonsCount: 0
                };
                groupMap.set(stageKey, grpObj);
                groups.push(grpObj);
            }

            const currentStage = groupMap.get(stageKey);
            currentStage.lessons.push(lesson);

            const testsInLesson = [lesson.fullTest, lesson.vocabTest, lesson.grammarTest, lesson.readingTest].filter(Boolean);
            if (testsInLesson.length > 0 && testsInLesson.every(t => getTestStatus(t) === 'completed')) {
                currentStage.completedLessonsCount++;
            }
        });

        return groups;
    }, [filteredLessons, completedTests]);

    const activeStages = useMemo(() => {
        if (selectedStageKey === 'all') return stageGroups;
        return stageGroups.filter(s => s.key === selectedStageKey);
    }, [stageGroups, selectedStageKey]);

    const renderSkillRow = (test, skillLabel, skillKey, iconColor) => {
        if (!test) return null;
        const Icon = SKILL_ICONS[skillKey] || FileText;
        const status = getTestStatus(test);
        const score = getTestScore(test);
        const totalQ = getTestQuestionCount(test);
        const isLocked = (test.level !== 'N5' || test.isPremium) && !hasPremiumAccess;
        const colorClass = ICON_COLOR_STYLES[iconColor] || ICON_COLOR_STYLES.blue;

        return (
            <div 
                key={test.id}
                className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all group"
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">
                                {skillLabel}
                            </span>
                            {(test.level !== 'N5' || test.isPremium) && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            <span>{totalQ} câu</span>
                            <span>•</span>
                            <span>{test.timeLimit}p</span>
                            {score !== null && (
                                <>
                                    <span>•</span>
                                    <span className={`font-bold ${score >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                        {score}%
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggleTestPremium && handleToggleTestPremium(e, test); }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                test.isPremium
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                        >
                            {test.isPremium ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); handleStartPrint(test); }} 
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                        title="In đề thi / PDF"
                    >
                        <Printer className="w-3.5 h-3.5" />
                    </button>

                    {status === 'completed' ? (
                        <button
                            onClick={() => {
                                if (isLocked) {
                                    setLockedPkgName('jlpt_prep');
                                    setShowPremiumModal(true);
                                } else {
                                    reviewTest(test);
                                }
                            }}
                            className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Xem lại</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (isLocked) {
                                    setLockedPkgName('jlpt_prep');
                                    setShowPremiumModal(true);
                                } else {
                                    startTest(test);
                                }
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-[0_3px_10px_rgba(244,148,188,0.35)] active:scale-95 ${
                                isLocked
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950'
                            }`}
                        >
                            <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                            <span>{status === 'in_progress' ? 'Làm tiếp' : 'Bắt đầu'}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Quick Stage Filter Bar */}
            {stageGroups.length > 1 && (
                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                Chọn nhanh chặng bài ({stageGroups.length} chặng)
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            <button
                                type="button"
                                onClick={toggleAllLessons}
                                className="hover:underline cursor-pointer"
                            >
                                {allExpanded ? 'Thu gọn bài' : 'Mở rộng bài'}
                            </button>
                            <span>•</span>
                            <button
                                type="button"
                                onClick={toggleAllStages}
                                className="hover:underline cursor-pointer"
                            >
                                {allStagesCollapsed ? 'Mở chặng' : 'Thu gọn chặng'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedStageKey('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                                selectedStageKey === 'all'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Tất cả ({filteredLessons.length} bài)
                        </button>

                        {stageGroups.map(grp => {
                            const isGrpSelected = selectedStageKey === grp.key;
                            return (
                                <button
                                    key={grp.key}
                                    type="button"
                                    onClick={() => setSelectedStageKey(grp.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                                        isGrpSelected
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span>{grp.shortTitle}</span>
                                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                        isGrpSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                                    }`}>
                                        {grp.lessons.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stages & Lessons List */}
            <div className="space-y-6">
                {activeStages.map(stage => {
                    const isStageCollapsed = collapsedStages[stage.key] ?? allStagesCollapsed;
                    const percent = stage.lessons.length > 0 ? Math.round((stage.completedLessonsCount / stage.lessons.length) * 100) : 0;
                    const lvlGradient = LEVEL_GRADIENTS[stage.level] || 'from-indigo-500 to-sky-600';

                    return (
                        <div 
                            key={stage.key}
                            className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4"
                        >
                            {/* Stage Header */}
                            <div 
                                onClick={() => toggleStage(stage.key)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none pb-2 border-b border-slate-200/60 dark:border-slate-800"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs shadow-2xs`}>
                                        {stage.level}
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                            {stage.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {stage.lessons.length} bài học toàn diện (Từ vựng, Ngữ pháp, Đọc hiểu, Đề thi)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                                        Đã hoàn thành: {stage.completedLessonsCount}/{stage.lessons.length} ({percent}%)
                                    </span>
                                    <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400">
                                        {isStageCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                    </div>
                                </div>
                            </div>

                            {/* Lessons List within Stage */}
                            {!isStageCollapsed && (
                                <div className="space-y-3.5 pt-1 animate-fade-in">
                                    {stage.lessons.map(lesson => {
                                        const isExpanded = expandedLessons[lesson.key] ?? allExpanded;
                                        const testsInLesson = [lesson.fullTest, lesson.vocabTest, lesson.grammarTest, lesson.readingTest].filter(Boolean);
                                        const completedCount = testsInLesson.filter(t => getTestStatus(t) === 'completed').length;
                                        const totalTestsInLesson = testsInLesson.length;
                                        const isLessonFullyCompleted = totalTestsInLesson > 0 && completedCount === totalTestsInLesson;

                                        return (
                                            <div 
                                                key={lesson.key}
                                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                                            >
                                                {/* Lesson Header */}
                                                <div 
                                                    onClick={() => toggleExpand(lesson.key)}
                                                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold text-sm flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                                                            {lesson.bai}
                                                        </span>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white truncate">
                                                                    Bài {lesson.bai}: {lesson.readingTest?.title?.replace(/.*Bài \d+:\s*/, '') || lesson.fullTest?.title || 'Ôn tập'}
                                                                </h4>
                                                                {isLessonFullyCompleted && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                                                                        ✓ Hoàn thành
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                                <span>{totalTestsInLesson} phần luyện tập</span>
                                                                <span>•</span>
                                                                <span>Đã xong: {completedCount}/{totalTestsInLesson}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {lesson.strategy && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveStrategyModal(lesson);
                                                                }}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 transition cursor-pointer"
                                                            >
                                                                Chiến lược
                                                            </button>
                                                        )}
                                                        <div className="p-1 text-slate-400">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Skills */}
                                                {isExpanded && (
                                                    <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-fade-in">
                                                        {renderSkillRow(lesson.vocabTest, 'Từ vựng & Chữ Hán', 'vocab', 'blue')}
                                                        {renderSkillRow(lesson.grammarTest, 'Ngữ pháp chuyên sâu', 'grammar', 'sky')}
                                                        {renderSkillRow(lesson.readingTest, 'Đọc hiểu & Phân tích câu', 'reading', 'emerald')}
                                                        {renderSkillRow(lesson.fullTest, 'Đề thi tổng hợp đầy đủ', 'full', 'indigo')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Strategy Modal */}
            {activeStrategyModal && (
                <JLPTStrategyModal
                    isOpen={!!activeStrategyModal}
                    onClose={() => setActiveStrategyModal(null)}
                    strategy={activeStrategyModal.strategy}
                    lessonTitle={`Bài ${activeStrategyModal.bai}: Chiến lược đọc & làm bài`}
                />
            )}
        </div>
    );
};

export default JLPTLessonRoadmapTab;
