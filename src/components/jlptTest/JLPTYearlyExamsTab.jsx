import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar, CheckCircle2, Clock, Headphones, Lock, Unlock,
    Play, Printer, RotateCcw, Sparkles, Award, PlusCircle, AlertCircle, Edit3, Trash2
} from 'lucide-react';
import { ROUTES } from '../../router';
import { LEVEL_GRADIENTS, getTestQuestionCount } from './jlptConstants';
import {
    JLPT_LEVELS,
    JLPT_YEARS,
    JLPT_SESSIONS,
    parseYearlyExamMeta,
    testHasListening
} from './jlptYearlyConstants';

const JLPTYearlyExamsTab = ({
    tests = [],
    completedTests = {},
    savedProgresses = {},
    selectedLevel = 'N3',
    searchQuery = '',
    statusFilter = 'all',
    canEdit = false,
    onEditTest = null,
    onDeleteTest = null,
    hasPremiumAccess = false,
    startTest,
    reviewTest,
    handleStartPrint,
    handleToggleTestPremium,
    handleToggleTestFixed,
    setShowPremiumModal,
    setLockedPkgName
}) => {
    const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'available' | 'listening_only'
    const [yearFilter, setYearFilter] = useState('all'); // 'all' | '2020-2025' | '2015-2019' | '2010-2014'

    const activeMatrixLevel = selectedLevel === 'all' ? 'N3' : selectedLevel;

    const getTestStatus = useCallback((test) => {
        if (!test) return 'not_started';
        const id = test.id || test._id;
        if (completedTests[id] || completedTests[String(id)]) return 'completed';
        const saved = savedProgresses[id] || savedProgresses[String(id)];
        if (saved?.answers && Object.keys(saved.answers).length > 0) return 'in_progress';
        return 'not_started';
    }, [completedTests, savedProgresses]);

    const getTestScore = (test) => {
        const id = test?.id || test?._id;
        const completed = completedTests[id] || completedTests[String(id)];
        return typeof completed?.percentage === 'number' ? Math.round(completed.percentage) : null;
    };

    // Index all yearly tests found in tests array
    const yearlyTests = useMemo(() => {
        const list = [];
        tests.forEach((t) => {
            if (!t || !t.id) return;
            // Exclude single-Mondai listening splits so matrix stays cleanly 1 test per exam session
            if (t.category === 'mondai_listening' || (t.isSkillTest && t.mondaiNumber)) return;
            const meta = parseYearlyExamMeta(t);
            if (!meta.isYearly && t.category !== 'yearly') return;
            list.push({ test: t, meta });
        });
        return list;
    }, [tests]);

    // Map by `${level}_${year}_${session}`
    const examSlotMap = useMemo(() => {
        const map = new Map();
        yearlyTests.forEach(({ test, meta }) => {
            if (!meta.year || !meta.session) return;
            const key = `${test.level || 'N3'}_${meta.year}_${meta.session}`;
            // Prefer full tests over skill-only tests if multiple exist for same slot
            const prev = map.get(key);
            if (!prev || (!test.isSkillTest && prev.isSkillTest) || (testHasListening(test) && !testHasListening(prev))) {
                map.set(key, test);
            }
        });
        return map;
    }, [yearlyTests]);

    const visibleYears = useMemo(() => {
        return JLPT_YEARS.filter((yr) => {
            if (yearFilter === '2020-2025') return yr >= 2020;
            if (yearFilter === '2015-2019') return yr >= 2015 && yr <= 2019;
            if (yearFilter === '2010-2014') return yr <= 2014;
            return true;
        });
    }, [yearFilter]);

    // Compute stats for current level
    const levelStats = useMemo(() => {
        let filled = 0;
        let withAudio = 0;
        JLPT_YEARS.forEach((y) => {
            JLPT_SESSIONS.forEach((s) => {
                if (y === 2020 && s.id === '07') return; // Cancelled global JLPT 2020-07
                const found = examSlotMap.get(`${activeMatrixLevel}_${y}_${s.id}`);
                if (found) {
                    filled++;
                    if (testHasListening(found)) withAudio++;
                }
            });
        });
        return { filled, withAudio, totalSlots: 31 }; // 32 - cancelled 2020-07
    }, [examSlotMap, activeMatrixLevel]);

    // Flat filtered list when selectedLevel === 'all' or viewMode !== 'matrix'
    const flatFilteredTests = useMemo(() => {
        return yearlyTests
            .filter(({ test, meta }) => {
                if (selectedLevel !== 'all' && test.level !== selectedLevel) return false;
                if (viewMode === 'listening_only' && !testHasListening(test)) return false;
                if (yearFilter === '2020-2025' && meta.year < 2020) return false;
                if (yearFilter === '2015-2019' && (meta.year < 2015 || meta.year > 2019)) return false;
                if (yearFilter === '2010-2014' && meta.year > 2014) return false;

                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const hit = (test.title || '').toLowerCase().includes(q)
                        || (test.description || '').toLowerCase().includes(q)
                        || meta.periodKey.includes(q);
                    if (!hit) return false;
                }
                if (statusFilter !== 'all' && getTestStatus(test) !== statusFilter) return false;
                return true;
            })
            .sort((a, b) => {
                if ((b.meta.year || 0) !== (a.meta.year || 0)) return (b.meta.year || 0) - (a.meta.year || 0);
                return Number(b.meta.session || 0) - Number(a.meta.session || 0);
            });
    }, [yearlyTests, selectedLevel, viewMode, yearFilter, searchQuery, statusFilter, getTestStatus]);

    const renderFilledTestCard = (test, periodLabel) => {
        const status = getTestStatus(test);
        const score = getTestScore(test);
        const totalQ = getTestQuestionCount(test);
        const hasAudio = testHasListening(test);
        const periodMeta = parseYearlyExamMeta(test);
        const isLocked = (test.level !== 'N5' || test.isPremium) && !hasPremiumAccess;
        const lvlGradient = LEVEL_GRADIENTS[test.level] || 'from-emerald-500 to-sky-600';

        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 p-4 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-lg bg-gradient-to-r ${lvlGradient} text-white font-black text-[11px]`}>
                                {test.level}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-black text-[11px]">
                                {periodLabel}
                            </span>
                            {hasAudio ? (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[10px] flex items-center gap-1">
                                    <Headphones className="w-3 h-3" />
                                    Nghe
                                </span>
                            ) : canEdit && (
                                <Link
                                    to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=append&testId=${encodeURIComponent(test.id)}&level=${test.level}&year=${periodMeta.year || 2024}&session=${periodMeta.session || '12'}`}
                                    className="px-2 py-0.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs transition"
                                    title="Mở Studio ghép thêm phần Nghe vào đề này mà vẫn giữ nguyên Từ vựng/Đọc"
                                >
                                    <PlusCircle className="w-3 h-3" />
                                    Thêm Nghe
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            {canEdit && handleToggleTestFixed && (
                                <label
                                    onClick={(e) => e.stopPropagation()}
                                    className={`flex items-center gap-1 cursor-pointer select-none text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                        test.isFixed || test.isDataStandardized
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!(test.isFixed || test.isDataStandardized)}
                                        onChange={(e) => handleToggleTestFixed(e, test)}
                                        className="w-3 h-3 accent-emerald-500 cursor-pointer"
                                    />
                                    <span>{test.isFixed || test.isDataStandardized ? 'Chuẩn' : 'Mới'}</span>
                                </label>
                            )}
                            {canEdit && handleToggleTestPremium && (
                                <button
                                    type="button"
                                    onClick={(e) => handleToggleTestPremium(e, test)}
                                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 cursor-pointer"
                                >
                                    {test.isPremium ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                                </button>
                            )}
                            {status === 'completed' && (() => {
                                const testId = test?.id || test?._id;
                                const completedEntry = completedTests[testId] || completedTests[String(testId)];
                                const js = completedEntry?.jlptScore;
                                const hasJlpt = js && typeof js.totalScore === 'number';
                                const isPass = hasJlpt ? js.passed : (score !== null && score >= 60);
                                return (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                        isPass
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                    }`}>
                                        {hasJlpt
                                            ? `${js.passed ? 'Đỗ' : 'Trượt'} ${js.totalScore}/${js.maxScore}đ`
                                            : (score !== null ? `✓ ${score}%` : 'Xong')}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {test.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-emerald-500" />
                            {totalQ} câu
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            {test.timeLimit || 60} phút
                        </span>
                    </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleStartPrint && handleStartPrint(test)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            title="In đề thi"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        {canEdit && onEditTest && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTest(test);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                                title="Sửa trực tiếp đề thi này"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa đề</span>
                            </button>
                        )}
                        {canEdit && onDeleteTest && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTest(test);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Xóa đề thi này"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {status === 'completed' ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (isLocked) {
                                    setLockedPkgName('jlpt_prep');
                                    setShowPremiumModal(true);
                                } else {
                                    reviewTest(test);
                                }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Xem lại</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (isLocked) {
                                    setLockedPkgName('jlpt_prep');
                                    setShowPremiumModal(true);
                                } else {
                                    startTest(test);
                                }
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white border-b-4 active:translate-y-0.5 active:border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                isLocked
                                    ? 'bg-amber-500 hover:bg-amber-400 border-amber-700'
                                    : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700'
                            }`}
                        >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{status === 'in_progress' ? 'Làm tiếp' : 'Vào thi'}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Summary Banner & Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-sky-500 border-b-4 border-sky-700 text-white flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                Kho Đề Thi Chính Thức JLPT Các Năm (2010–2025)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {selectedLevel === 'all'
                                    ? `Đang hiển thị tất cả đề các năm từ N5 đến N1 (${yearlyTests.length} đề đã nạp).`
                                    : `Cấp độ ${activeMatrixLevel}: đã nạp ${levelStats.filled}/${levelStats.totalSlots} kỳ thi (${levelStats.withAudio} kỳ có file Nghe hiểu).`}
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <Link
                            to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=yearly&level=${activeMatrixLevel}`}
                            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black flex items-center gap-2 shrink-0 self-start md:self-center shadow-xs"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Soạn Đề Các Năm (PDF + MP3)</span>
                        </Link>
                    )}
                </div>

                {/* Progress Bar for current level */}
                {selectedLevel !== 'all' && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                            <span>Tiến độ hoàn thiện kho đề {activeMatrixLevel} (2010–2025)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                {levelStats.filled}/{levelStats.totalSlots} kỳ ({Math.round((levelStats.filled / levelStats.totalSlots) * 100)}%)
                            </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.round((levelStats.filled / levelStats.totalSlots) * 100))}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'matrix', label: 'Lưới 2010–2025' },
                            { id: 'available', label: 'Chỉ hiện kỳ đã có đề' },
                            { id: 'listening_only', label: 'Có phần Nghe hiểu' }
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setViewMode(m.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                    viewMode === m.id
                                        ? 'bg-sky-500 text-white border-b-2 border-sky-700'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[
                            { id: 'all', label: '2010–2025' },
                            { id: '2020-2025', label: '2020–2025' },
                            { id: '2015-2019', label: '2015–2019' },
                            { id: '2010-2014', label: '2010–2014' }
                        ].map((r) => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setYearFilter(r.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    yearFilter === r.id
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Matrix View (Per Year for selected Level) vs Flat View */}
            {viewMode === 'matrix' && selectedLevel !== 'all' ? (
                <div className="space-y-4">
                    {visibleYears.map((yr) => {
                        return (
                            <div
                                key={yr}
                                className="bg-slate-50/80 dark:bg-slate-900/50 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xs font-mono">
                                            Năm {yr}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            JLPT {activeMatrixLevel} · Kỳ Tháng 7 & Tháng 12
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {JLPT_SESSIONS.map((sess) => {
                                        const isCancelled2020July = yr === 2020 && sess.id === '07';
                                        const existingTest = examSlotMap.get(`${activeMatrixLevel}_${yr}_${sess.id}`);

                                        if (existingTest) {
                                            if (searchQuery.trim()) {
                                                const q = searchQuery.toLowerCase().trim();
                                                const match = (existingTest.title || '').toLowerCase().includes(q) || `${yr}`.includes(q);
                                                if (!match) return null;
                                            }
                                            if (statusFilter !== 'all' && getTestStatus(existingTest) !== statusFilter) return null;
                                            return (
                                                <React.Fragment key={sess.id}>
                                                    {renderFilledTestCard(existingTest, `Kỳ ${sess.label}/${yr}`)}
                                                </React.Fragment>
                                            );
                                        }

                                        if (isCancelled2020July) {
                                            return (
                                                <div
                                                    key={sess.id}
                                                    className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 p-4 flex items-center justify-between gap-3 opacity-75"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                                                                {activeMatrixLevel} · Tháng 07/2020
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">Kỳ thi bị hủy toàn cầu do dịch COVID-19</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={sess.id}
                                                className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 p-4 flex items-center justify-between gap-3"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px]">
                                                            {activeMatrixLevel}
                                                        </span>
                                                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                                                            Kỳ {sess.label}/{yr}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-1">Chưa nạp dữ liệu cho kỳ thi này</p>
                                                </div>

                                                {canEdit && (
                                                    <Link
                                                        to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=yearly&level=${activeMatrixLevel}&year=${yr}&session=${sess.id}`}
                                                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black flex items-center gap-1 shrink-0 transition"
                                                    >
                                                        <PlusCircle className="w-3.5 h-3.5" />
                                                        <span>Soạn kỳ này</span>
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : flatFilteredTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {flatFilteredTests.map(({ test, meta }) => (
                        <React.Fragment key={test.id}>
                            {renderFilledTestCard(test, meta.periodKey || `${meta.session}/${meta.year}`)}
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mx-auto">
                        <Calendar className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">
                        Chưa có đề thi năm nào khớp bộ lọc
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        {canEdit
                            ? 'Bạn có thể mở Studio Soạn Đề để nạp file PDF đề thi các năm 2010–2025 và file MP3 nghe hiểu vào hệ thống ngay.'
                            : 'Hệ thống đang tiếp tục cập nhật trọn bộ đề thi JLPT các năm từ 2010 đến 2025.'}
                    </p>
                    {canEdit && (
                        <div className="pt-2">
                            <Link
                                to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=yearly&level=${activeMatrixLevel}`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white text-xs font-black"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Mở Studio Soạn Đề Ngay</span>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default JLPTYearlyExamsTab;
