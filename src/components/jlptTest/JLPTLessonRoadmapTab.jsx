import React, { useState, useMemo } from 'react';
import { 
    CheckCircle2, Clock, Play, RotateCcw, Lock, Unlock, 
    BookOpen, Languages, FileText, Award, ChevronDown, ChevronUp,
    Sparkles, Search, Filter, Printer, Star, Eye, EyeOff
} from 'lucide-react';
import { LEVEL_GRADIENTS } from './jlptConstants';

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
    completedTests,
    savedProgresses,
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
    const [displayLimit, setDisplayLimit] = useState(30);

    const toggleExpand = (lessonKey) => {
        setExpandedLessons(prev => ({
            ...prev,
            [lessonKey]: !(prev[lessonKey] ?? allExpanded)
        }));
    };

    const toggleAll = () => {
        const nextState = !allExpanded;
        setAllExpanded(nextState);
        setExpandedLessons({});
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

            if (searchQuery.trim()) {
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

    const visibleLessons = useMemo(() => {
        return filteredLessons.slice(0, displayLimit);
    }, [filteredLessons, displayLimit]);

    const renderSkillRow = (test, skillLabel, skillKey, iconColor) => {
        if (!test) return null;
        const Icon = SKILL_ICONS[skillKey] || FileText;
        const status = getTestStatus(test);
        const score = getTestScore(test);
        const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
        const isLocked = test.isPremium && !hasPremiumAccess;
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
                            {test.isPremium && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
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
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${
                                isLocked
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : status === 'in_progress'
                                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                        >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{status === 'in_progress' ? 'Tiếp tục' : 'Bắt đầu'}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
                <span>Hiển thị <strong>{filteredLessons.length}</strong> bài học ({selectedLevel !== 'all' ? selectedLevel : 'Tất cả các cấp độ'})</span>
                
                <button
                    onClick={toggleAll}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                    {allExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleLessons.map(lesson => {
                    const testsInLesson = [lesson.vocabTest, lesson.grammarTest, lesson.readingTest, lesson.fullTest].filter(Boolean);
                    const completedCount = testsInLesson.filter(t => getTestStatus(t) === 'completed').length;
                    const totalCount = testsInLesson.length;
                    const isAllDone = completedCount === totalCount && totalCount > 0;
                    const isExpanded = expandedLessons[lesson.key] ?? (allExpanded || true);
                    const lvlGradient = LEVEL_GRADIENTS[lesson.level] || 'from-indigo-500 to-sky-600';

                    return (
                        <div
                            key={lesson.key}
                            className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                                isAllDone 
                                    ? 'border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-50/20 to-transparent' 
                                    : 'border-slate-200/80 dark:border-slate-800'
                            }`}
                        >
                            {/* Card Header */}
                            <div 
                                onClick={() => toggleExpand(lesson.key)}
                                className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                            >
                                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${lvlGradient} text-white flex flex-col items-center justify-center font-black shadow-xs shrink-0 mt-0.5`}>
                                        <span className="text-[10px] font-bold opacity-90">{lesson.level}</span>
                                        <span className="text-xs leading-none">#{lesson.bai}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                                                {lesson.level} - Bài #{lesson.bai}
                                            </h3>
                                            {isAllDone && (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full text-[10px] font-extrabold uppercase">
                                                    ✓ Hoàn thành
                                                </span>
                                            )}
                                        </div>
                                        {lesson.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-1">
                                                {lesson.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${(completedCount / Math.max(1, totalCount)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                                {completedCount}/{totalCount} phần
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition shrink-0"
                                    aria-label="Toggle Expand"
                                >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Card Expanded Items (4 Skill Rows) */}
                            {isExpanded && (
                                <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                    {renderSkillRow(lesson.vocabTest, 'Từ vựng & Chữ Hán', 'vocab', 'blue')}
                                    {renderSkillRow(lesson.grammarTest, 'Ngữ pháp & Câu Sao ★', 'grammar', 'sky')}
                                    {renderSkillRow(lesson.readingTest, 'Đọc hiểu Yomimono', 'reading', 'emerald')}
                                    {renderSkillRow(lesson.fullTest, 'Đề Luyện Tổng Hợp', 'full', 'indigo')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Load More Button if filtered list > displayLimit */}
            {filteredLessons.length > displayLimit && (
                <div className="text-center pt-4">
                    <button
                        onClick={() => setDisplayLimit(prev => prev + 30)}
                        className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-black text-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
                    >
                        Hiển thị thêm bài học (+30 bài) • Còn {filteredLessons.length - displayLimit} bài
                    </button>
                </div>
            )}
        </div>
    );
};

export default JLPTLessonRoadmapTab;
