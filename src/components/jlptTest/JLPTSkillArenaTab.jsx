import React, { useState, useMemo } from 'react';
import { 
    Languages, BookOpen, FileText, Headphones, Award, Lock, Unlock, 
    Printer, RotateCcw, Play, Search, Filter, CheckCircle2, Clock
} from 'lucide-react';
import { LEVEL_GRADIENTS } from './jlptConstants';

const SKILL_CATEGORIES = [
    { key: 'vocabulary', label: 'Từ vựng & Chữ Hán', sub: 'Vocabulary & Kanji', icon: Languages, color: 'blue' },
    { key: 'grammar', label: 'Ngữ pháp & Câu Sao ★', sub: 'Grammar & Star ★', icon: BookOpen, color: 'sky' },
    { key: 'reading', label: 'Đọc hiểu Yomimono', sub: 'Reading Comprehension', icon: FileText, color: 'emerald' },
    { key: 'listening', label: 'Nghe hiểu JLPT', sub: 'Listening Practice', icon: Headphones, color: 'amber' }
];

const JLPTSkillArenaTab = ({
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
    const [selectedSkill, setSelectedSkill] = useState('vocabulary');
    const [sortBy, setSortBy] = useState('lesson'); // 'lesson' | 'questions' | 'time'
    const [displayLimit, setDisplayLimit] = useState(30);

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

    // Filter tests matching selected skill
    const skillTests = useMemo(() => {
        return tests.filter(t => {
            if (!t.isSkillTest) return false;
            if (t.skillType !== selectedSkill) return false;

            if (selectedLevel !== 'all' && t.level !== selectedLevel) return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchTitle = (t.title || '').toLowerCase().includes(query);
                const matchDesc = (t.description || '').toLowerCase().includes(query);
                const matchLvl = (t.level || '').toLowerCase().includes(query);
                if (!matchTitle && !matchDesc && !matchLvl) return false;
            }

            if (statusFilter !== 'all') {
                const st = getTestStatus(t);
                if (st !== statusFilter) return false;
            }

            return true;
        });
    }, [tests, selectedSkill, selectedLevel, searchQuery, statusFilter, completedTests, savedProgresses]);

    const sortedTests = useMemo(() => {
        return [...skillTests].sort((a, b) => {
            if (sortBy === 'lesson') {
                const matchA = a.id.match(/-b(\d+)$/) || a.title.match(/(?:#|Bài\s*)(\d+)/i);
                const matchB = b.id.match(/-b(\d+)$/) || b.title.match(/(?:#|Bài\s*)(\d+)/i);
                const numA = matchA ? parseInt(matchA[1]) : 0;
                const numB = matchB ? parseInt(matchB[1]) : 0;
                if (a.level !== b.level) {
                    const order = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
                    return (order[a.level] || 99) - (order[b.level] || 99);
                }
                return numA - numB;
            }
            if (sortBy === 'questions') {
                const countA = (a.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                const countB = (b.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                return countB - countA;
            }
            if (sortBy === 'time') {
                return (b.timeLimit || 0) - (a.timeLimit || 0);
            }
            return 0;
        });
    }, [skillTests, sortBy]);

    const visibleTests = useMemo(() => {
        return sortedTests.slice(0, displayLimit);
    }, [sortedTests, displayLimit]);

    const currentSkillMeta = SKILL_CATEGORIES.find(s => s.key === selectedSkill) || SKILL_CATEGORIES[0];
    const SkillIcon = currentSkillMeta.icon;

    return (
        <div className="space-y-6">
            {/* Skill Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {SKILL_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = selectedSkill === cat.key;
                    const catTests = tests.filter(t => t.isSkillTest && t.skillType === cat.key && (selectedLevel === 'all' || t.level === selectedLevel));
                    const catCompleted = catTests.filter(t => getTestStatus(t) === 'completed').length;

                    return (
                        <button
                            key={cat.key}
                            onClick={() => {
                                setSelectedSkill(cat.key);
                                setDisplayLimit(30);
                            }}
                            className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                isSelected
                                    ? 'bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                    isSelected 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {catCompleted}/{catTests.length}
                                </span>
                            </div>
                            <div className="mt-2.5">
                                <h4 className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
                                    {cat.label}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                    {cat.sub}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <SkillIcon className="w-4 h-4 text-indigo-600" />
                    <span>{currentSkillMeta.label}: <strong>{sortedTests.length}</strong> bộ đề</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Sắp xếp:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                        <option value="lesson">Thứ tự Bài học (Bài 1 ➔ 148)</option>
                        <option value="questions">Số câu hỏi nhiều nhất</option>
                        <option value="time">Thời gian làm bài</option>
                    </select>
                </div>
            </div>

            {/* Test Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                {visibleTests.map(test => {
                    const status = getTestStatus(test);
                    const score = getTestScore(test);
                    const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                    const isLocked = test.isPremium && !hasPremiumAccess;
                    const lvlGradient = LEVEL_GRADIENTS[test.level] || 'from-indigo-500 to-sky-600';

                    return (
                        <div
                            key={test.id}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-[11px] shadow-2xs`}>
                                        {test.level}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {canEdit && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleTestPremium && handleToggleTestPremium(e, test); }}
                                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                    test.isPremium
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-600'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-400'
                                                }`}
                                            >
                                                {test.isPremium ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                            </button>
                                        )}

                                        {status === 'completed' ? (
                                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                ✓ Đã xong {score !== null ? `(${score}%)` : ''}
                                            </span>
                                        ) : status === 'in_progress' ? (
                                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                                ⏳ Đang làm
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50">
                                                Chưa làm
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white leading-snug">
                                    {test.title}
                                </h4>

                                {test.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2">
                                        {test.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-3">
                                    <span>{totalQ} câu hỏi</span>
                                    <span>•</span>
                                    <span>{test.timeLimit} phút</span>
                                </div>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleStartPrint(test); }} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                    title="In đề thi"
                                >
                                    <Printer className="w-4 h-4" />
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
                                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Xem lại bài</span>
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
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                            isLocked
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                : status === 'in_progress'
                                                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>{status === 'in_progress' ? 'Làm tiếp' : 'Bắt đầu'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load More Button */}
            {sortedTests.length > displayLimit && (
                <div className="text-center pt-2">
                    <button
                        onClick={() => setDisplayLimit(prev => prev + 30)}
                        className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-black text-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
                    >
                        Hiển thị thêm (+30 đề) • Còn {sortedTests.length - displayLimit} đề
                    </button>
                </div>
            )}
        </div>
    );
};

export default JLPTSkillArenaTab;
