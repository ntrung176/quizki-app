import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FileText, Calendar, ChevronRight, ChevronLeft, Languages, 
    BookOpen, Award, Headphones, Crown, CheckCircle, XCircle, 
    Lock, Unlock, Play, Printer, FileCheck, Timer 
} from 'lucide-react';
import { ROUTES } from '../../router';
import { LEVEL_GRADIENTS, SECTION_ICONS } from './jlptConstants';

const JLPTTestDashboard = ({
    tests,
    completedTests,
    savedProgresses,
    targetLevel,
    handleUpdateTargetLevel,
    roadmapProgress,
    toggleRoadmapDay,
    allCards = [],
    canEdit,
    hasPremiumAccess,
    startTest,
    reviewTest,
    handleStartPrint,
    handleToggleTestPremium,
    handleToggleTestFixed,
    setShowPremiumModal,
    setLockedPkgName,
    notification
}) => {
    const navigate = useNavigate();
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedSkillPractice, setSelectedSkillPractice] = useState(null);
    const [selectedFullExamLevel, setSelectedFullExamLevel] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showRoadmapDetails, setShowRoadmapDetails] = useState(false);

    // JLPT Countdown calculation
    const jlptCountdown = (() => {
        const now = new Date();
        const julyExam = new Date(2026, 6, 5);
        const decExam = new Date(2026, 11, 6);
        let target = julyExam;
        if (now > julyExam) { target = decExam; }
        if (now > decExam) { target = new Date(2027, 6, 4); }
        const diffTime = target - now;
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    })();

    const countdownLevel = selectedLevel === 'all' ? 'N2' : selectedLevel;

    const completedCount = Object.keys(completedTests).length;
    let avgPercentage = 0;
    if (completedCount > 0) {
        const sum = Object.values(completedTests).reduce((s, item) => s + (item.percentage || 0), 0);
        avgPercentage = sum / completedCount;
    }
    const avgScore = completedCount > 0 ? Math.round((avgPercentage / 100) * 180) : 124;

    const kanjiKnownCount = allCards && allCards.length > 0
        ? allCards.filter(c => c.front && c.front.length === 1 && /[\u4e00-\u9faf]/.test(c.front)).length
        : 850;

    const targetProgress = Math.round(((roadmapProgress[targetLevel] || []).length / 60) * 100);
    const completedDays = (roadmapProgress[targetLevel] || []).length;

    const getTestStatus = (test) => {
        if (!test) return 'not_started';
        const testId = test.id || test._id;
        const completed = completedTests[testId] || completedTests[String(testId)];
        if (completed) {
            return 'completed';
        }
        const saved = savedProgresses[testId] || savedProgresses[String(testId)];
        if (saved) {
            return 'in_progress';
        }
        return 'not_started';
    };

    const getRelativeTimeString = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Hôm qua';
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    };

    const getSkillProgress = (skillType) => {
        const skillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && (selectedLevel === 'all' || t.level === selectedLevel));
        if (skillTests.length === 0) return 0;
        const completedCount = skillTests.filter(t => {
            const testId = t.id || t._id;
            return !!(completedTests[testId] || completedTests[String(testId)]);
        }).length;
        return Math.round((completedCount / skillTests.length) * 100);
    };

    const getLevelProgress = (lvl) => {
        const lvlTests = tests.filter(t => !t.isSkillTest && t.level === lvl);
        if (lvlTests.length === 0) return 0;
        const completedLvlTests = lvlTests.filter(t => {
            const testId = t.id || t._id;
            return !!(completedTests[testId] || completedTests[String(testId)]);
        });
        return Math.round((completedLvlTests.length / lvlTests.length) * 100);
    };

    const handleStartPractice = (skillType, skillLabel) => {
        const matchingTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && (selectedLevel === 'all' || t.level === selectedLevel));
        setSelectedSkillPractice({ type: skillType, label: skillLabel, tests: matchingTests });
    };

    // Sub-screen for Skill Practice Detail
    if (selectedSkillPractice) {
        const skillType = selectedSkillPractice.type;
        const skillLabel = selectedSkillPractice.label;
        const skillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && (selectedLevel === 'all' || t.level === selectedLevel));
        const filteredSkillTests = skillTests.filter(test => {
            if (statusFilter === 'all') return true;
            return getTestStatus(test) === statusFilter;
        });

        const sortedSkillTests = [...filteredSkillTests].sort((a, b) => {
            if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            if (sortBy === 'questions') {
                const countA = (a.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                const countB = (b.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                return countB - countA;
            }
            if (sortBy === 'time') return (b.timeLimit || 0) - (a.timeLimit || 0);
            return 0;
        });

        const completedSkillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && !!completedTests[t.id]);
        const avgAccuracy = completedSkillTests.length > 0
            ? Math.round(completedSkillTests.reduce((sum, t) => sum + (completedTests[t.id].percentage || 0), 0) / completedSkillTests.length)
            : 0;
        const skillCompletedCount = completedSkillTests.length;
        const totalTimeMinutes = completedSkillTests.reduce((sum, t) => sum + (t.timeLimit || 0), 0);
        const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
        const avgTimePerTest = completedSkillTests.length > 0 ? (totalTimeMinutes / completedSkillTests.length).toFixed(1) : 0;

        const SkillIcon = SECTION_ICONS[skillType] || FileText;

        return (
            <div className="min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedSkillPractice(null)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all shadow-sm cursor-pointer">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Luyện tập chuyên sâu</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mt-1">
                                {skillLabel} {selectedLevel !== 'all' ? selectedLevel : ''}
                            </h2>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                            <div className="flex flex-wrap gap-1.5">
                                {['all', 'N1', 'N2', 'N3', 'N4', 'N5'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setSelectedLevel(lvl)}
                                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                            selectedLevel === lvl
                                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                                                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {lvl === 'all' ? 'Tất cả' : lvl}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">Trạng thái: Tất cả</option>
                                    <option value="completed">Đã hoàn thành</option>
                                    <option value="in_progress">Đang làm</option>
                                    <option value="not_started">Chưa làm</option>
                                </select>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="questions">Số câu hỏi</option>
                                    <option value="time">Thời gian</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedSkillTests.map(test => {
                                const status = getTestStatus(test);
                                const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                                const isLocked = test.isPremium && !hasPremiumAccess;

                                return (
                                    <div key={test.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-lg transition flex flex-col justify-between min-h-[240px] relative overflow-hidden group">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                                                    <SkillIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex items-center gap-1.5">

                                                    {canEdit && (
                                                        <button
                                                            onClick={(e) => handleToggleTestPremium && handleToggleTestPremium(e, test)}
                                                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                                test.isPremium
                                                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:scale-105'
                                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:scale-105'
                                                            }`}
                                                            title={test.isPremium ? 'Đề thi khoá Premium (Click để mở)' : 'Đề thi Miễn phí (Click để khoá Premium)'}
                                                        >
                                                            {test.isPremium ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                    {(() => {
                                                        const testId = test.id || test._id;
                                                        const completed = completedTests[testId] || completedTests[String(testId)];
                                                        const scorePct = completed && typeof completed.percentage === 'number' ? Math.round(completed.percentage) : null;
                                                        
                                                        if (status === 'completed') {
                                                            return (
                                                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                                                                    ✓ Đã hoàn thành {scorePct !== null ? `(${scorePct}%)` : ''}
                                                                </span>
                                                            );
                                                        }
                                                        if (status === 'in_progress') {
                                                            return (
                                                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50">
                                                                    ⏳ Đang làm
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700">
                                                                Chưa làm
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <h4 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug flex items-center gap-1.5">
                                                {test.isPremium && <Lock className="w-4 h-4 text-amber-500 shrink-0 inline-block" />}
                                                <span>{test.title}</span>
                                            </h4>
                                            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-[11px] font-bold mt-3">
                                                <span>{totalQ} Câu hỏi</span>
                                                <span>•</span>
                                                <span>{test.timeLimit} Phút</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleStartPrint(test); }} className="p-1.5 text-slate-400 hover:text-[#2E5B70] transition cursor-pointer">
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
                                                    className={`px-4 py-1.5 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 ${
                                                        isLocked
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {isLocked && <Lock className="w-3.5 h-3.5" />}
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
                                                    className={`px-4 py-1.5 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 ${
                                                        isLocked
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                                            : 'bg-[#2E5B70] hover:bg-[#254A5C] text-white'
                                                    }`}
                                                >
                                                    {isLocked && <Lock className="w-3.5 h-3.5" />}
                                                    <span>{isLocked ? 'Premium' : 'Bắt đầu'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Sub-screen for Full Exam Level Detail
    if (selectedFullExamLevel) {
        const level = selectedFullExamLevel;
        const lvlTests = tests.filter(t => !t.isSkillTest && t.level === level);
        const filteredLvlTests = lvlTests.filter(test => {
            if (statusFilter === 'all') return true;
            return getTestStatus(test) === statusFilter;
        });

        const sortedLvlTests = [...filteredLvlTests].sort((a, b) => {
            if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            if (sortBy === 'questions') {
                const countA = (a.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                const countB = (b.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                return countB - countA;
            }
            if (sortBy === 'time') return (b.timeLimit || 0) - (a.timeLimit || 0);
            return 0;
        });

        const lvlGradient = LEVEL_GRADIENTS[level] || 'from-slate-500 to-slate-600';

        return (
            <div className="min-h-screen bg-transparent p-4 md:p-8 font-sans animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedFullExamLevel(null)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all shadow-sm cursor-pointer">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                <Award className="w-3.5 h-3.5" />
                                <span>Đề thi JLPT các năm</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mt-1">
                                Cấp độ {level}
                            </h2>
                        </div>
                    </div>
                    {canEdit && (
                        <Link to={ROUTES.JLPT_ADMIN}
                            className="px-4 py-2 bg-[#2E5B70] hover:bg-[#254A5C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0">
                            <FileText className="w-3.5 h-3.5" /> Quản lý đề thi
                        </Link>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedLvlTests.map(test => {
                        const status = getTestStatus(test);
                        const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                        const isLocked = test.isPremium && !hasPremiumAccess;

                        return (
                            <div key={test.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl transition flex flex-col justify-between min-h-[250px] relative overflow-hidden group">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvlGradient} text-white flex items-center justify-center font-black text-xs`}>
                                            {test.level}
                                        </div>
                                        <div className="flex items-center gap-1.5">

                                            {canEdit && (
                                                <button
                                                    onClick={(e) => handleToggleTestPremium && handleToggleTestPremium(e, test)}
                                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                        test.isPremium
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:scale-105'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:scale-105'
                                                    }`}
                                                    title={test.isPremium ? 'Đề thi khoá Premium (Click để mở)' : 'Đề thi Miễn phí (Click để khoá Premium)'}
                                                >
                                                    {test.isPremium ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                            {(() => {
                                                const testId = test.id || test._id;
                                                const completed = completedTests[testId] || completedTests[String(testId)];
                                                const scorePct = completed && typeof completed.percentage === 'number' ? Math.round(completed.percentage) : null;
                                                
                                                if (status === 'completed') {
                                                    return (
                                                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                                                            ✓ Đã hoàn thành {scorePct !== null ? `(${scorePct}%)` : ''}
                                                        </span>
                                                    );
                                                }
                                                if (status === 'in_progress') {
                                                    return (
                                                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50">
                                                            ⏳ Đang làm
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700">
                                                        Chưa làm
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <h4 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight flex items-center gap-1.5">
                                        {test.isPremium && <Lock className="w-4 h-4 text-amber-500 shrink-0 inline-block" />}
                                        <span>{test.title}</span>
                                    </h4>
                                    <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-[11px] font-bold mt-4">
                                        <span>{totalQ} Câu hỏi</span>
                                        <span>•</span>
                                        <span>{test.timeLimit} Phút</span>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleStartPrint(test); }} className="p-1.5 text-slate-400 hover:text-[#2E5B70] transition cursor-pointer">
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
                                            className={`px-4 py-1.5 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 ${
                                                isLocked
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {isLocked && <Lock className="w-3.5 h-3.5" />}
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
                                            className={`px-4 py-1.5 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 ${
                                                isLocked
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                                    : 'bg-[#2E5B70] hover:bg-[#254A5C] text-white'
                                            }`}
                                        >
                                            {isLocked && <Lock className="w-3.5 h-3.5" />}
                                            <span>{isLocked ? 'Premium' : 'Vào thi'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="jlpt-screen min-h-screen bg-transparent p-4 md:p-8 font-sans animate-fade-in">
            {notification && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-2 text-xs font-bold animate-bounce">
                    <span>{notification}</span>
                </div>
            )}
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[26px] font-extrabold text-slate-800 dark:text-white tracking-tight">
                            Trung tâm Luyện thi JLPT
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-medium max-w-xl leading-relaxed">
                            Môi trường yên tĩnh để tập trung tối đa. Chúc bạn có một kỳ ôn luyện thật hiệu quả và đạt kết quả cao nhất.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-center">
                        {canEdit && (
                            <Link to={ROUTES.JLPT_ADMIN}
                                className="px-4 py-2 bg-[#2E5B70] hover:bg-[#254A5C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                                <FileText className="w-3.5 h-3.5" /> Quản lý đề thi
                            </Link>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mục tiêu:</span>
                            <select
                                value={targetLevel}
                                onChange={(e) => handleUpdateTargetLevel(e.target.value)}
                                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-3 py-1.5 text-[10px] font-bold focus:outline-none cursor-pointer uppercase"
                            >
                                <option value="N1">Cấp độ N1</option>
                                <option value="N2">Cấp độ N2</option>
                                <option value="N3">Cấp độ N3</option>
                                <option value="N4">Cấp độ N4</option>
                                <option value="N5">Cấp độ N5</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 1: Full Exam Levels */}
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pl-2 border-l-4 border-[#2E5B70] dark:border-sky-500 mb-6">
                        Đề JLPT Các Năm
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => {
                            const progress = getLevelProgress(lvl);
                            const gradient = LEVEL_GRADIENTS[lvl] || 'from-slate-500 to-slate-600';
                            return (
                                <div key={lvl} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition flex flex-col justify-between min-h-[14rem] relative overflow-hidden">
                                    <div>
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black text-sm mb-4`}>
                                            {lvl}
                                        </div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white">Cấp độ {lvl}</h4>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                            Đề thi trọn gói đầy đủ các kỹ năng từ đề thi JLPT chính thức các năm của cấp độ {lvl}.
                                        </p>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className={`bg-gradient-to-r ${gradient} h-1.5 rounded-full`} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 w-8 text-right">{progress}%</span>
                                        </div>
                                        <button onClick={() => setSelectedFullExamLevel(lvl)} className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-750 dark:text-slate-300 font-extrabold text-[10px] tracking-wider rounded-xl transition cursor-pointer border border-slate-100 dark:border-slate-700/50 text-center">
                                            BẮT ĐẦU LUYỆN
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Skill Practice */}
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pl-2 border-l-4 border-[#2E5B70] dark:border-sky-500 mb-6">
                        Luyện từng Kỹ Năng
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {[
                            { key: 'vocabulary', label: 'Từ vựng (Vocabulary)', icon: Languages, color: 'blue', desc: `Ôn luyện từ vựng cần thiết cho cấp độ ${countdownLevel}` },
                            { key: 'grammar', label: 'Ngữ pháp (Grammar)', icon: BookOpen, color: 'sky', desc: 'Tổng hợp cấu trúc câu phức và chia động từ' },
                            { key: 'kanji', label: 'Hán tự (Kanji)', icon: Award, color: 'teal', desc: 'Trau dồi bộ thủ và âm On-Kun qua Flashcard' },
                            { key: 'reading', label: 'Đọc hiểu (Reading)', icon: FileText, color: 'rose', desc: 'Rèn luyện kỹ năng đọc lướt và tìm ý chính' },
                            { key: 'listening', label: 'Nghe hiểu (Listening)', icon: Headphones, color: 'cyan', desc: 'Luyện nghe với giọng người bản xứ' },
                        ].map(skill => {
                            const Icon = skill.icon;
                            const progress = getSkillProgress(skill.key);
                            return (
                                <div key={skill.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition flex flex-col justify-between min-h-[14rem]">
                                    <div>
                                        <div className={`w-10 h-10 rounded-xl bg-${skill.color}-50 text-${skill.color}-600 dark:bg-${skill.color}-950/30 dark:text-${skill.color}-400 flex items-center justify-center mb-4`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white">{skill.label}</h4>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{skill.desc}</p>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className={`bg-${skill.color}-500 h-1.5 rounded-full`} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{progress}%</span>
                                        </div>
                                        <button onClick={() => handleStartPractice(skill.key, skill.label)} className={`w-full py-2 bg-${skill.color}-50 text-${skill.color}-600 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer text-center`}>
                                            BẮT ĐẦU LUYỆN
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default JLPTTestDashboard;
