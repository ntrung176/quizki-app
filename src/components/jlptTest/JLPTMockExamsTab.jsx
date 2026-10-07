import React, { useMemo, useState } from 'react';
import { 
    Award, Lock, Unlock, Clock, FileCheck, Play, RotateCcw, 
    Printer, ShieldCheck, Zap 
} from 'lucide-react';
import { LEVEL_GRADIENTS, getTestQuestionCount } from './jlptConstants';

const JLPTMockExamsTab = ({
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

    // Filter full mock tests
    const mockTests = useMemo(() => {
        return tests.filter(t => {
            if (t.isSkillTest) return false;

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
    }, [tests, selectedLevel, searchQuery, statusFilter, completedTests, savedProgresses]);

    const sortedTests = useMemo(() => {
        return [...mockTests].sort((a, b) => {
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
                const countA = getTestQuestionCount(a);
                const countB = getTestQuestionCount(b);
                return countB - countA;
            }
            if (sortBy === 'time') {
                return (b.timeLimit || 0) - (a.timeLimit || 0);
            }
            return 0;
        });
    }, [mockTests, sortBy]);

    const visibleTests = useMemo(() => {
        return sortedTests.slice(0, displayLimit);
    }, [sortedTests, displayLimit]);

    return (
        <div className="space-y-6">
            {/* Minimal Header & Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                        Đề thi mô phỏng JLPT
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {mockTests.length} đề thi
                    </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">Sắp xếp:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                        <option value="lesson">Thứ tự Đề thi (Đề 1 ➔ 148)</option>
                        <option value="questions">Số câu hỏi nhiều nhất</option>
                        <option value="time">Thời gian thi lâu nhất</option>
                    </select>
                </div>
            </div>

            {/* Grid of Full Exam Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                {visibleTests.map(test => {
                    const status = getTestStatus(test);
                    const score = getTestScore(test);
                    const totalQ = getTestQuestionCount(test);
                    const isLocked = (test.level !== 'N5' || test.isPremium) && !hasPremiumAccess;
                    const lvlGradient = LEVEL_GRADIENTS[test.level] || 'from-indigo-500 to-sky-600';

                    return (
                        <div
                            key={test.id}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-3 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs shadow-2xs flex items-center gap-1`}>
                                            <span>{test.level}</span>
                                            {isLocked && <Lock className="w-3 h-3 text-amber-300" />}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                            {test.sections?.length || 2} phần thi
                                        </span>
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
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50">
                                                Chưa làm
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                                    {test.title}
                                </h4>

                                {test.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 line-clamp-2">
                                        {test.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 mt-3.5">
                                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                                        {totalQ} câu hỏi
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                                        {test.timeLimit} phút
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleStartPrint(test); }} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                    title="In đề thi / Xuất PDF"
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
                                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Xem lại kết quả</span>
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
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-[0_3px_10px_rgba(244,148,188,0.35)] active:scale-95 ${
                                            isLocked
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                : 'bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950'
                                        }`}
                                    >
                                        <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                                        <span>{status === 'in_progress' ? 'Làm tiếp' : 'Vào phòng thi'}</span>
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

export default JLPTMockExamsTab;
