import React, { useState, useMemo } from 'react';
import { 
    Languages, BookOpen, FileText, Headphones, Award, Lock, Unlock, 
    Printer, RotateCcw, Play, Search, Filter, CheckCircle2, Clock,
    ChevronRight, ArrowLeft, Layers, Check, Sparkles
} from 'lucide-react';
import { LEVEL_GRADIENTS, getTestQuestionCount } from './jlptConstants';

const SKILL_CATEGORIES = [
    { key: 'reading', label: 'Đọc hiểu Yomimono', sub: 'Reading Comprehension', icon: FileText, color: 'emerald' },
    { key: 'grammar', label: 'Ngữ pháp', sub: 'Grammar', icon: BookOpen, color: 'sky' },
    { key: 'vocabulary', label: 'Từ vựng & Chữ Hán', sub: 'Vocabulary & Kanji', icon: Languages, color: 'blue' },
    { key: 'listening', label: 'Nghe hiểu JLPT', sub: 'Listening Practice', icon: Headphones, color: 'amber' }
];

const resolveBookInfo = (t) => {
    const rawKey = t.bookSlug || t.id.replace(/-b\d+$/, '').replace(/-t\d+$/, '').replace(/-\d+$/, '');
    const lvl = t.level || 'N3';

    let title = t.bookTitle || '';
    let skillType = t.skillType || (t.isSkillTest ? 'vocabulary' : 'full');

    if (!title) {
        if (rawKey.includes('reading') || rawKey.includes('yomimono') || rawKey.includes('dokkai')) {
            skillType = 'reading';
            if (rawKey.includes('2nd_dokkai')) title = `Luyện Đọc Hiểu 2nd Dokkai ${lvl}`;
            else if (rawKey.includes('4nd_dokkai')) title = `Luyện Đọc Hiểu 4nd Dokkai ${lvl}`;
            else if (rawKey.includes('6nd_dokkai')) title = `Luyện Đọc Hiểu 6nd Dokkai ${lvl}`;
            else if (rawKey.includes('drilldrill')) title = `Drill & Drill Đọc Hiểu ${lvl}`;
            else if (rawKey.includes('speed_dokkai')) title = `Speed Master Đọc Hiểu ${lvl}`;
            else if (rawKey.includes('55new') || rawKey.includes('55old')) title = `55 Bài Đọc Hiểu ${lvl}`;
            else title = `Bài Đọc Giáo Trình ${lvl}`;
        } else if (rawKey.includes('vocab') || rawKey.includes('moji') || rawKey.includes('goi') || rawKey.includes('kanji')) {
            skillType = 'vocabulary';
            if (rawKey.includes('1740_moji')) title = `1740 Từ Vựng & Chữ Hán ${lvl}`;
            else if (rawKey.includes('1200_moji')) title = `1200 Từ Vựng & Chữ Hán ${lvl}`;
            else if (rawKey.includes('speed_goi')) title = `Speed Goi ${lvl}`;
            else if (rawKey.includes('speed_kanji')) title = `Speed Kanji ${lvl}`;
            else title = `Từ Vựng & Chữ Hán Giáo Trình ${lvl}`;
        } else if (rawKey.includes('grammar') || rawKey.includes('bunpou') || rawKey.includes('np') || rawKey.includes('vp')) {
            skillType = 'grammar';
            if (rawKey.includes('1000_bunpou')) title = `1000 Câu Ngữ Pháp ${lvl}`;
            else if (rawKey.includes('181_np')) title = `181 Điểm Ngữ Pháp ${lvl}`;
            else if (rawKey.includes('speed_bunpou')) title = `Speed Bunpou ${lvl}`;
            else title = `Ngữ Pháp Giáo Trình ${lvl}`;
        } else {
            skillType = 'full';
            if (rawKey.includes('15day')) title = `Lộ Trình 15 Ngày Chinh Phục ${lvl}`;
            else if (rawKey.includes('20day')) title = `20 Ngày Về Đích ${lvl}`;
            else if (rawKey.includes('chokuzen')) title = `Ôn Thi Cấp Tốc Sát Đề ${lvl}`;
            else title = `Đề Thi Thử Tổng Hợp ${lvl}`;
        }
    }

    return {
        key: `${lvl}-${rawKey}`,
        title,
        level: lvl,
        skillType
    };
};

const JLPTSkillArenaTab = ({
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
    const [selectedSkill, setSelectedSkill] = useState('reading');
    const [selectedBook, setSelectedBook] = useState(null);
    const [bookInnerSearch, setBookInnerSearch] = useState('');

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

    // Filter tests matching selected skill and level
    const skillTests = useMemo(() => {
        return tests.filter(t => {
            if (!t.isSkillTest && !t.skillType) return false;
            const info = resolveBookInfo(t);
            if (info.skillType !== selectedSkill) return false;
            if (selectedLevel !== 'all' && t.level !== selectedLevel) return false;

            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchTitle = (t.title || '').toLowerCase().includes(query);
                const matchDesc = (t.description || '').toLowerCase().includes(query);
                const matchLvl = (t.level || '').toLowerCase().includes(query);
                const matchBook = info.title.toLowerCase().includes(query);
                if (!matchTitle && !matchDesc && !matchLvl && !matchBook) return false;
            }

            if (statusFilter !== 'all') {
                const st = getTestStatus(t);
                if (st !== statusFilter) return false;
            }

            return true;
        });
    }, [tests, selectedSkill, selectedLevel, searchQuery, statusFilter, completedTests, savedProgresses]);

    // Group skill tests into distinct Book / Curriculum containers
    const skillBooks = useMemo(() => {
        const map = new Map();

        skillTests.forEach(t => {
            if (!t || !t.id) return;
            const info = resolveBookInfo(t);

            if (!map.has(info.key)) {
                map.set(info.key, {
                    key: info.key,
                    title: info.title,
                    level: info.level,
                    skillType: info.skillType,
                    tests: [],
                    totalQuestions: 0
                });
            }

            const bookObj = map.get(info.key);
            bookObj.tests.push(t);
            const qCount = getTestQuestionCount(t);
            bookObj.totalQuestions += qCount;
        });

        // Sort tests within each book by lesson number
        map.forEach(book => {
            book.tests.sort((a, b) => {
                const numA = parseInt((a.id.match(/(?:-b|-t|#|Bài\s*)(\d+)/i) || (a.title.match(/(?:#|Bài\s*)(\d+)/i)) || [0, 0])[1], 10) || 0;
                const numB = parseInt((b.id.match(/(?:-b|-t|#|Bài\s*)(\d+)/i) || (b.title.match(/(?:#|Bài\s*)(\d+)/i)) || [0, 0])[1], 10) || 0;
                return numA - numB;
            });
        });

        return Array.from(map.values()).sort((a, b) => {
            const lvlOrder = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
            if (a.level !== b.level) {
                return (lvlOrder[b.level] || 0) - (lvlOrder[a.level] || 0);
            }
            return b.tests.length - a.tests.length;
        });
    }, [skillTests]);

    const currentSkillMeta = SKILL_CATEGORIES.find(s => s.key === selectedSkill) || SKILL_CATEGORIES[0];
    const SkillIcon = currentSkillMeta.icon;

    // View inside a selected book
    if (selectedBook) {
        const bookTests = selectedBook.tests.filter(t => {
            if (!bookInnerSearch.trim()) return true;
            const q = bookInnerSearch.toLowerCase().trim();
            return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
        });

        const completedCount = selectedBook.tests.filter(t => getTestStatus(t) === 'completed').length;
        const progressPct = selectedBook.tests.length > 0 ? Math.round((completedCount / selectedBook.tests.length) * 100) : 0;
        const lvlGradient = LEVEL_GRADIENTS[selectedBook.level] || 'from-indigo-600 to-sky-600';

        return (
            <div className="space-y-6 animate-fade-in">
                {/* Back Button & Book Banner */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                    <button
                        type="button"
                        onClick={() => setSelectedBook(null)}
                        className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>← Quay lại danh sách Sách {currentSkillMeta.label}</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs shadow-2xs`}>
                                    {selectedBook.level}
                                </span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                                    <SkillIcon className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{currentSkillMeta.label}</span>
                                </span>
                            </div>

                            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                                {selectedBook.title}
                            </h2>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Bao gồm <strong>{selectedBook.tests.length} bài học/đề thi</strong> · Tổng cộng <strong>{selectedBook.totalQuestions.toLocaleString('vi-VN')} câu hỏi</strong> có giải thích chi tiết & phân tích câu.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                                    Tiến độ: {completedCount}/{selectedBook.tests.length} bài ({progressPct}%)
                                </span>
                            </div>
                            <div className="w-48 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-[#f494bc] h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Search inside book */}
                    <div className="pt-2">
                        <div className="relative max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={bookInnerSearch}
                                onChange={(e) => setBookInnerSearch(e.target.value)}
                                placeholder={`Tìm bài học trong ${selectedBook.title}...`}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid of Lessons inside this book */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                    {bookTests.map((test, tIdx) => {
                        const status = getTestStatus(test);
                        const score = getTestScore(test);
                        const qCount = getTestQuestionCount(test);
                        const isLocked = test.isPremium && !hasPremiumAccess;
                        const matchNum = test.id.match(/(?:-b|-t|#|Bài\s*)(\d+)/i) || test.title.match(/(?:#|Bài\s*)(\d+)/i);
                        const lessonNumber = matchNum ? matchNum[1] : (tIdx + 1);

                        return (
                            <div
                                key={test.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group relative overflow-hidden"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900">
                                            Bài {lessonNumber}
                                        </span>

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
                                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                    ✓ {score !== null ? `${score}%` : 'Đã xong'}
                                                </span>
                                            ) : status === 'in_progress' ? (
                                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                                    ⏳ Đang làm
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50">
                                                    Chưa làm
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                        {test.title.replace(/^[^·]+·\s*/, '')}
                                    </h4>

                                    {test.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2">
                                            {test.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2.5">
                                        <span>{qCount} câu hỏi</span>
                                        <span>•</span>
                                        <span>{test.timeLimit} phút</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
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
                                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
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
                                            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-[0_3px_10px_rgba(244,148,188,0.35)] active:scale-95 ${
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
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. Skill Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {SKILL_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = selectedSkill === cat.key;
                    const catTests = tests.filter(t => {
                        const info = resolveBookInfo(t);
                        return info.skillType === cat.key && (selectedLevel === 'all' || t.level === selectedLevel);
                    });
                    const catCompleted = catTests.filter(t => getTestStatus(t) === 'completed').length;

                    return (
                        <button
                            key={cat.key}
                            onClick={() => {
                                setSelectedSkill(cat.key);
                                setSelectedBook(null);
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

            {/* 2. Header Info Bar */}
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <SkillIcon className="w-4 h-4 text-indigo-600" />
                    <span>Bộ giáo trình {currentSkillMeta.label}: <strong>{skillBooks.length}</strong> cuốn sách & bộ đề</span>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                    Tổng cộng {skillTests.length} bài luyện tập
                </span>
            </div>

            {/* 3. Skill Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {skillBooks.map(book => {
                    const lvlGradient = LEVEL_GRADIENTS[book.level] || 'from-indigo-600 to-sky-600';
                    const completedCount = book.tests.filter(t => getTestStatus(t) === 'completed').length;
                    const progressPct = book.tests.length > 0 ? Math.round((completedCount / book.tests.length) * 100) : 0;

                    return (
                        <div
                            key={book.key}
                            onClick={() => {
                                setSelectedBook(book);
                                setBookInnerSearch('');
                            }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 hover:border-[#f494bc] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                        >
                            <div>
                                {/* Top Badges */}
                                <div className="flex items-center justify-between gap-2 mb-3.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs shadow-2xs`}>
                                            {book.level}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <SkillIcon className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>{currentSkillMeta.label}</span>
                                        </span>
                                    </div>

                                    {progressPct === 100 ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            ✓ Hoàn thành
                                        </span>
                                    ) : completedCount > 0 ? (
                                        <span className="text-[10px] font-bold font-mono text-[#db2777] dark:text-[#f494bc]">
                                            {completedCount}/{book.tests.length} bài ({progressPct}%)
                                        </span>
                                    ) : null}
                                </div>

                                {/* Book Title */}
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-[#db2777] dark:group-hover:text-[#f494bc] transition-colors line-clamp-2">
                                    {book.title}
                                </h3>

                                {/* Quick Stats */}
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 mt-3.5">
                                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                        {book.tests.length} bài học
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <Award className="w-3.5 h-3.5 text-sky-500" />
                                        {book.totalQuestions.toLocaleString('vi-VN')} câu hỏi
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Progress Bar & CTA */}
                            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-[#f494bc] h-full rounded-full transition-all duration-500"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>

                                <span className="px-3.5 py-1.5 rounded-xl bg-[#f494bc] group-hover:bg-[#f6a0c5] text-slate-950 font-black text-xs flex items-center gap-1 shadow-[0_3px_10px_rgba(244,148,188,0.35)] group-hover:shadow-[0_6px_18px_rgba(244,148,188,0.6)] transition-all">
                                    <span>Vào học</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JLPTSkillArenaTab;
