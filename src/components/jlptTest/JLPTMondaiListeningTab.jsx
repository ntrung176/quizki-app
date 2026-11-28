import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Headphones, Play, RotateCcw, CheckCircle2, Lock, Unlock,
    Layers, Sparkles, ArrowLeft, Award, Clock, PlusCircle, Loader2, Edit3, Trash2
} from 'lucide-react';
import { ROUTES } from '../../router';
import { LEVEL_GRADIENTS, getTestQuestionCount } from './jlptConstants';
import { loadJLPTLevelData, ensureFullTestLoaded } from '../../services/jlptDataService';
import {
    JLPT_LEVELS,
    getMondaiListForLevel,
    resolveQuestionMondai,
    parseYearlyExamMeta,
    testHasListening
} from './jlptYearlyConstants';

const JLPTMondaiListeningTab = ({
    tests = [],
    completedTests = {},
    savedProgresses = {},
    selectedLevel = 'N3',
    searchQuery = '',
    canEdit = false,
    onEditTest = null,
    onDeleteTest = null,
    hasPremiumAccess = false,
    startTest,
    reviewTest,
    handleToggleTestPremium,
    setShowPremiumModal,
    setLockedPkgName
}) => {
    const [activeLevel, setActiveLevel] = useState(selectedLevel !== 'all' ? selectedLevel : 'N3');
    const [selectedMondai, setSelectedMondai] = useState(null);
    const [loadingLevelBank, setLoadingLevelBank] = useState(false);

    useEffect(() => {
        if (selectedLevel && selectedLevel !== 'all') {
            setActiveLevel(selectedLevel);
            setSelectedMondai(null);
        }
    }, [selectedLevel]);

    // Ensure full sections for listening tests of activeLevel are loaded so Mondai aggregation has full questions
    useEffect(() => {
        let mounted = true;
        const listeningCandidates = tests.filter(
            (t) => t?.level === activeLevel && testHasListening(t)
        );
        const needsHydrate = listeningCandidates.some((t) => !Array.isArray(t.sections) || t.sections.length === 0);

        if (needsHydrate) {
            setLoadingLevelBank(true);
            Promise.all(
                listeningCandidates.map((t) =>
                    t.chunkFile ? ensureFullTestLoaded(t.id, t.level) : Promise.resolve(t)
                )
            )
                .catch(() => loadJLPTLevelData(activeLevel))
                .finally(() => {
                    if (mounted) setLoadingLevelBank(false);
                });
        }
        return () => { mounted = false; };
    }, [activeLevel, tests]);

    const mondaiList = useMemo(() => getMondaiListForLevel(activeLevel), [activeLevel]);

    const getTestStatus = (test) => {
        const id = test?.id || test?._id;
        if (!id) return 'not_started';
        if (completedTests[id] || completedTests[String(id)]) return 'completed';
        const saved = savedProgresses[id] || savedProgresses[String(id)];
        if (saved?.answers && Object.keys(saved.answers).length > 0) return 'in_progress';
        return 'not_started';
    };

    const getTestScore = (test) => {
        const id = test?.id || test?._id;
        const comp = completedTests[id] || completedTests[String(id)];
        return typeof comp?.percentage === 'number' ? Math.round(comp.percentage) : null;
    };

    // Aggregate per-Mondai standalone tests AND questions extracted from full yearly exams of activeLevel
    const mondaiSummaryMap = useMemo(() => {
        const map = new Map();
        mondaiList.forEach((m) => {
            map.set(m.mondai, {
                meta: m,
                standaloneTests: [],
                aggregatedQuestions: [],
                sourceExamCount: 0
            });
        });

        const seenSourceByMondai = new Map();
        mondaiList.forEach((m) => seenSourceByMondai.set(m.mondai, new Set()));

        const levelTests = tests.filter((t) => t?.level === activeLevel && testHasListening(t));

        levelTests.forEach((t) => {
            const yearMeta = parseYearlyExamMeta(t);
            const periodLabel = yearMeta.periodKey || t.title;
            const isMondaiOnlyTest = t.category === 'mondai_listening' || (t.isSkillTest && t.mondaiNumber);

            if (isMondaiOnlyTest && t.mondaiNumber && map.has(Number(t.mondaiNumber))) {
                map.get(Number(t.mondaiNumber)).standaloneTests.push(t);
            }

            // Collect questions inside listening sections
            let qCounter = 0;
            (t.sections || []).forEach((sec) => {
                const isListenSec = sec?.type === 'listening' || /聴解|nghe|listening/i.test(sec?.title || '');
                if (!isListenSec || !Array.isArray(sec.questions)) return;

                sec.questions.forEach((q, qIdx) => {
                    qCounter++;
                    const mNum = t.mondaiNumber ? Number(t.mondaiNumber) : resolveQuestionMondai(q, sec.title);
                    if (!map.has(mNum)) return;

                    // Deduplicate if same period & questionNumber already pulled from a yearly test vs standalone split
                    const dedupKey = `${periodLabel}__${mNum}__${q.questionNumber || qIdx + 1}__${q.audioStartSec ?? ''}`;
                    const bucket = map.get(mNum);
                    if (!bucket.aggregatedQuestions.some((existing) => existing._dedupKey === dedupKey)) {
                        bucket.aggregatedQuestions.push({
                            ...q,
                            _dedupKey: dedupKey,
                            mondai: mNum,
                            sourcePeriod: yearMeta.periodKey || '',
                            sourceTitle: t.title,
                            question: `<div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-black">🎧 Nguồn: ${yearMeta.periodKey ? `Kỳ ${yearMeta.periodKey}` : t.title} · Câu ${q.questionNumber || qCounter}</div><div>${q.question || ''}</div>`
                        });
                    }
                    seenSourceByMondai.get(mNum).add(t.id);
                });
            });

            // Fallback count from summary metadata before full sections finish hydrating
            if ((!t.sections || t.sections.length === 0) && t.mondaiCounts) {
                Object.entries(t.mondaiCounts).forEach(([mKey, cnt]) => {
                    const mNum = Number(mKey);
                    if (map.has(mNum) && Number(cnt) > 0) {
                        seenSourceByMondai.get(mNum).add(t.id);
                    }
                });
            }
        });

        map.forEach((val, key) => {
            val.sourceExamCount = seenSourceByMondai.get(key)?.size || 0;
        });

        return map;
    }, [tests, activeLevel, mondaiList]);

    const handleLaunchCompiledMondai = (mNum) => {
        const isLocked = activeLevel !== 'N5' && !hasPremiumAccess;
        if (isLocked) {
            setLockedPkgName('Luyện Nghe Theo Mondai JLPT');
            setShowPremiumModal(true);
            return;
        }
        const entry = mondaiSummaryMap.get(mNum);
        if (!entry || entry.aggregatedQuestions.length === 0) return;

        const mMeta = entry.meta;
        const compiledTest = {
            id: `compiled-mondai-${activeLevel.toLowerCase()}-m${mNum}`,
            title: `Nghe Tổng Hợp ${activeLevel} · Mondai ${mNum}: ${mMeta.ja} (${mMeta.vi})`,
            level: activeLevel,
            timeLimit: Math.max(15, entry.aggregatedQuestions.length * 2),
            isSkillTest: true,
            skillType: 'listening',
            hasListening: true,
            sections: [
                {
                    type: 'listening',
                    title: `Mondai ${mNum}: ${mMeta.ja} · ${mMeta.vi}`,
                    questions: entry.aggregatedQuestions
                }
            ]
        };
        startTest(compiledTest);
    };

    const lvlGradient = LEVEL_GRADIENTS[activeLevel] || 'from-emerald-500 to-sky-600';
    const isLevelLocked = activeLevel !== 'N5' && !hasPremiumAccess;

    // Detail View inside a chosen Mondai
    if (selectedMondai !== null) {
        const entry = mondaiSummaryMap.get(selectedMondai);
        const mMeta = entry?.meta || getMondaiListForLevel(activeLevel)[0];
        const standaloneFiltered = (entry?.standaloneTests || []).filter((t) => {
            if (!searchQuery.trim()) return true;
            return (t.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
        });

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                    <button
                        type="button"
                        onClick={() => setSelectedMondai(null)}
                        className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại Danh sách Mondai {activeLevel}</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs`}>
                                    {activeLevel}
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-black text-xs">
                                    Mondai {mMeta.mondai}
                                </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                {mMeta.ja} · {mMeta.vi}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{mMeta.desc}</p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            {entry?.aggregatedQuestions?.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleLaunchCompiledMondai(mMeta.mondai)}
                                    className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    <span>Luyện tất cả ({entry.aggregatedQuestions.length} câu)</span>
                                </button>
                            )}
                            {canEdit && (
                                <Link
                                    to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=mondai&level=${activeLevel}&mondai=${mMeta.mondai}`}
                                    className="px-3.5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 text-white text-xs font-black flex items-center gap-1.5"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>Thêm bài Mondai {mMeta.mondai}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Standalone Mondai Sets Grid */}
                {standaloneFiltered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {standaloneFiltered.map((test) => {
                            const status = getTestStatus(test);
                            const score = getTestScore(test);
                            const qCount = getTestQuestionCount(test);
                            const locked = (test.level !== 'N5' || test.isPremium) && !hasPremiumAccess;

                            return (
                                <div
                                    key={test.id}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between gap-3 hover:border-emerald-400 transition"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-black">
                                                Mondai {mMeta.mondai}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {canEdit && handleToggleTestPremium && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleToggleTestPremium(e, test)}
                                                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 cursor-pointer"
                                                    >
                                                        {test.isPremium ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                                                    </button>
                                                )}
                                                {status === 'completed' && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200">
                                                        ✓ {score !== null ? `${score}%` : 'Xong'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                                            {test.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Award className="w-3.5 h-3.5 text-emerald-500" />
                                                {qCount} câu nghe
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-sky-500" />
                                                {test.timeLimit || 15} phút
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {canEdit && onEditTest && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditTest(test);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                                    title="Sửa trực tiếp bộ nghe này"
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
                                                    title="Xóa bài nghe này"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        {status === 'completed' ? (
                                            <button
                                                type="button"
                                                onClick={() => (locked ? (setLockedPkgName('jlpt_prep'), setShowPremiumModal(true)) : reviewTest(test))}
                                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Xem lại</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => (locked ? (setLockedPkgName('jlpt_prep'), setShowPremiumModal(true)) : startTest(test))}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase text-white border-b-4 flex items-center gap-1.5 cursor-pointer ${
                                                    locked ? 'bg-amber-500 border-amber-700' : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700'
                                                }`}
                                            >
                                                <Play className="w-3.5 h-3.5 fill-white" />
                                                <span>Luyện tập</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {entry?.aggregatedQuestions?.length > 0
                                ? `Đã tổng hợp ${entry.aggregatedQuestions.length} câu Mondai ${mMeta.mondai} từ các Đề Năm — bấm nút "Luyện tất cả" phía trên để làm bài ngay!`
                                : `Chưa có bài nghe riêng cho ${activeLevel} · Mondai ${mMeta.mondai}.`}
                        </p>
                        <p className="text-xs text-slate-400">
                            Khi bạn soạn đề các năm hoặc tách bài Mondai trong Studio, câu hỏi sẽ tự động xuất hiện tại đây.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Level-specific Mondai Header */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center shrink-0">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <span>Nghe Tổng Hợp Theo Mondai · Riêng Từng Level</span>
                                {loadingLevelBank && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 text-[10px] font-bold">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Đang nạp dữ liệu nghe {activeLevel}...
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Hệ thống tách chuẩn {mondaiList.length} dạng Mondai của riêng trình độ <strong>{activeLevel}</strong>, tự động gom cả bài nghe Mondai riêng lẫn câu nghe từ Đề các năm.
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <Link
                            to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=mondai&level=${activeLevel}`}
                            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black flex items-center gap-2 shrink-0 self-start md:self-center shadow-xs"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Soạn Bộ Nghe Mondai</span>
                        </Link>
                    )}
                </div>

                {/* Per-Level Dedicated Selector */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mr-1">
                        Chọn Level nghe:
                    </span>
                    {JLPT_LEVELS.map((lvl) => {
                        const isSel = activeLevel === lvl;
                        const countSets = tests.filter((t) => t?.level === lvl && testHasListening(t)).length;
                        return (
                            <button
                                key={lvl}
                                type="button"
                                onClick={() => {
                                    setActiveLevel(lvl);
                                    setSelectedMondai(null);
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                    isSel
                                        ? 'bg-amber-500 text-white border-b-4 border-amber-700 shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <span>{lvl}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    isSel ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                }`}>
                                    {countSets}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mondai Cards Grid for activeLevel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {mondaiList.map((m) => {
                    const bucket = mondaiSummaryMap.get(m.mondai);
                    const totalQs = bucket?.aggregatedQuestions?.length || 0;
                    const standaloneCount = bucket?.standaloneTests?.length || 0;
                    const sourceCount = bucket?.sourceExamCount || 0;

                    return (
                        <div
                            key={`${activeLevel}-m${m.mondai}`}
                            className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 p-5 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg transition-all flex flex-col justify-between gap-4"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs`}>
                                            {activeLevel}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-black text-xs">
                                            Mondai {m.mondai}
                                        </span>
                                    </div>
                                    {isLevelLocked && <Lock className="w-4 h-4 text-amber-500" />}
                                </div>

                                <div>
                                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                                        <span className="font-japanese">{m.ja}</span>
                                        <span className="block text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {m.vi}
                                        </span>
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                                        {m.desc}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                                        {totalQs} câu tổng hợp
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5 text-sky-500" />
                                        {standaloneCount > 0 ? `${standaloneCount} bộ riêng` : `${sourceCount} đề nguồn`}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMondai(m.mondai)}
                                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold cursor-pointer transition"
                                >
                                    Xem danh sách
                                </button>

                                {totalQs > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => handleLaunchCompiledMondai(m.mondai)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white border-b-4 active:translate-y-0.5 active:border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                            isLevelLocked
                                                ? 'bg-amber-500 hover:bg-amber-400 border-amber-700'
                                                : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700'
                                        }`}
                                    >
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        <span>Nghe tổng hợp</span>
                                    </button>
                                ) : canEdit ? (
                                    <Link
                                        to={`${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=mondai&level=${activeLevel}&mondai=${m.mondai}`}
                                        className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 text-white text-xs font-black flex items-center gap-1"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>Soạn Mondai {m.mondai}</span>
                                    </Link>
                                ) : (
                                    <span className="text-[11px] font-bold text-slate-400">Chưa có câu hỏi</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JLPTMondaiListeningTab;
