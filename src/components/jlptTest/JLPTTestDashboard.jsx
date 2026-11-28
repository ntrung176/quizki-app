import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    BookOpen, Clock, Calendar, CheckCircle2, 
    Headphones, Search, TrendingUp, X, AlertCircle,
    Repeat, Sparkles
} from 'lucide-react';
import { ROUTES } from '../../router';
import JLPTBooksCollectionTab from './JLPTBooksCollectionTab';
import JLPTDrillsTab from './JLPTDrillsTab';
import JLPTWrongQuestionsTab from './JLPTWrongQuestionsTab';
import JLPTYearlyExamsTab from './JLPTYearlyExamsTab';
import JLPTMondaiListeningTab from './JLPTMondaiListeningTab';

const MAIN_TABS = [
    { id: 'books', label: 'Kho Sách Luyện Thi', icon: BookOpen, desc: 'Tuyển tập giáo trình & luyện theo kỹ năng' },
    { id: 'yearly', label: 'Đề Các Năm (2010–2025)', icon: Calendar, desc: 'Đề thi chính thức theo từng kỳ 2010–2025' },
    { id: 'listening_mondai', label: 'Nghe Theo Mondai', icon: Headphones, desc: 'Luyện nghe tổng hợp theo từng Mondai riêng của mỗi Level' },
    { id: 'drills', label: 'Ôn Tập Phản Xạ', icon: Repeat, desc: 'Drills phản xạ ngữ pháp' },
    { id: 'wrong', label: 'Sổ Tay Câu Sai', icon: AlertCircle, desc: 'Ôn luyện lại các câu làm sai' },
];

const JLPTTestDashboard = ({
    tests = [],
    completedTests = {},
    savedProgresses = {},
    targetLevel = 'N2',
    activeMainTab: externalActiveMainTab,
    setActiveMainTab: externalSetActiveMainTab,
    selectedLevel: externalSelectedLevel,
    setSelectedLevel: externalSetSelectedLevel,
    searchQuery: externalSearchQuery,
    setSearchQuery: externalSetSearchQuery,
    statusFilter: externalStatusFilter,
    setStatusFilter: externalSetStatusFilter,
    canEdit,
    onEditTest,
    onDeleteTest,
    onOpenQuestionSearch,
    hasPremiumAccess,
    startTest,
    reviewTest,
    handleStartPrint,
    handleToggleTestPremium,
    handleToggleTestFixed,
    setShowPremiumModal,
    setLockedPkgName,
    notification,
    wrongQuestions = {},
    onRemoveWrongQuestion,
    onClearAllWrongQuestions,
    onStartPracticeWrong,
    onAddFlashcard
}) => {
    const [internalActiveMainTab, setInternalActiveMainTab] = useState('books');
    const [internalSelectedLevel, setInternalSelectedLevel] = useState(targetLevel || 'N5');
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [internalStatusFilter, setInternalStatusFilter] = useState('all');

    const activeMainTab = externalActiveMainTab !== undefined ? externalActiveMainTab : internalActiveMainTab;
    const setActiveMainTab = externalSetActiveMainTab || setInternalActiveMainTab;

    const selectedLevel = externalSelectedLevel !== undefined ? externalSelectedLevel : internalSelectedLevel;
    const setSelectedLevel = externalSetSelectedLevel || setInternalSelectedLevel;

    const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
    const setSearchQuery = externalSetSearchQuery || setInternalSearchQuery;

    const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
    const setStatusFilter = externalSetStatusFilter || setInternalStatusFilter;

    // Full level test banks are loaded on-demand when the user starts/reviews a test (ensureFullTestLoaded).
    // The dashboard stays extremely lean using the lightweight summary catalog (< 150MB RAM).



    // JLPT Countdown calculation
    const jlptCountdown = (() => {
        const now = new Date();
        const julyExam = new Date(2026, 6, 5);
        const decExam = new Date(2026, 11, 6);
        let target = julyExam;
        if (now > julyExam) target = decExam;
        if (now > decExam) target = new Date(2027, 6, 4);
        const diffTime = target - now;
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    })();

    // Stats calculation for selected level
    const levelTests = tests.filter(t => selectedLevel === 'all' || t.level === selectedLevel);
    const completedList = levelTests.filter(t => {
        const testId = t.id || t._id;
        return !!completedTests[testId];
    });
    const completedCount = completedList.length;
    const totalCount = levelTests.length;

    const avgScore = completedList.length > 0
        ? Math.round(completedList.reduce((sum, t) => sum + (completedTests[t.id]?.percentage || 0), 0) / completedList.length)
        : 0;

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-950 p-3.5 sm:p-5 md:p-8 font-sans animate-fade-in text-slate-900 dark:text-slate-100">
            {notification && (
                <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-2 text-xs font-bold backdrop-blur-md animate-fade-in pointer-events-none">
                    <span>{notification}</span>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
                {/* 1. Compact Header + Inline Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Trung Tâm Luyện Thi JLPT
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã xong: {completedCount}/{totalCount} đề</span>
                            </span>
                            {avgScore > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>Độ chính xác TB: {avgScore}%</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Kỳ thi JLPT: Còn {jlptCountdown} ngày</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap">
                        {canEdit && (
                            <>
                                <button
                                    onClick={onOpenQuestionSearch}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 border-b-4 border-emerald-700 active:border-b-2 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer select-none"
                                    title="Tìm kiếm và sửa nhanh câu hỏi trên toàn bộ đề thi (Ctrl + K)"
                                >
                                    <Search className="w-4 h-4 stroke-[2.5]" />
                                    <span>Tìm & Sửa câu hỏi</span>
                                    <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-emerald-700/80 rounded-md font-mono">
                                        Ctrl+K
                                    </span>
                                </button>
                                <Link 
                                    to={`${ROUTES.JLPT_ADMIN}?mode=studio`}
                                    className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 border-b-4 border-sky-700 active:border-b-2 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Studio Soạn Đề &amp; Nghe</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Single-row Filter Bar: Level + Search + Status */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                        {[
                            { key: 'all', label: 'Tất cả' },
                            { key: 'N5', label: 'N5' },
                            { key: 'N4', label: 'N4' },
                            { key: 'N3', label: 'N3' },
                            { key: 'N2', label: 'N2' },
                            { key: 'N1', label: 'N1' }
                        ].map(lvl => (
                            <button
                                key={lvl.key}
                                onClick={() => setSelectedLevel(lvl.key)}
                                className={`px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-extrabold rounded-lg transition-all cursor-pointer select-none ${
                                    selectedLevel === lvl.key
                                        ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 font-black shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                }`}
                            >
                                {lvl.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto flex-1 md:flex-initial justify-end">
                        <div className="relative flex-1 sm:w-60 md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm sách, đề thi..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer shrink-0"
                        >
                            <option value="all">Trạng thái: Tất cả</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="in_progress">Đang làm dở</option>
                            <option value="not_started">Chưa làm</option>
                        </select>
                    </div>
                </div>

                {/* 3. Main Navigation Switcher (5 Core Tabs) */}
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs overflow-x-auto no-scrollbar">
                    {MAIN_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeMainTab === tab.id;
                        const wrongCount = tab.id === 'wrong' ? Object.keys(wrongQuestions || {}).length : 0;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveMainTab(tab.id)}
                                className={`flex-1 min-w-fit py-2.5 px-3 sm:px-4 rounded-xl text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-black text-xs sm:text-sm border border-slate-200/80 dark:border-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-xs sm:text-sm'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{tab.label}</span>
                                {wrongCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0">
                                        {wrongCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 4. Active Tab Content Rendering */}
                {activeMainTab === 'books' && (
                    <JLPTBooksCollectionTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        onEditTest={onEditTest}
                        onDeleteTest={onDeleteTest}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
                        handleToggleTestPremium={handleToggleTestPremium}
                        handleToggleTestFixed={handleToggleTestFixed}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}

                {activeMainTab === 'yearly' && (
                    <JLPTYearlyExamsTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        onEditTest={onEditTest}
                        onDeleteTest={onDeleteTest}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
                        handleToggleTestPremium={handleToggleTestPremium}
                        handleToggleTestFixed={handleToggleTestFixed}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}

                {activeMainTab === 'listening_mondai' && (
                    <JLPTMondaiListeningTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        onEditTest={onEditTest}
                        onDeleteTest={onDeleteTest}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleToggleTestPremium={handleToggleTestPremium}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}

                {activeMainTab === 'drills' && (
                    <JLPTDrillsTab
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                    />
                )}

                {activeMainTab === 'wrong' && (
                    <JLPTWrongQuestionsTab
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        wrongQuestions={wrongQuestions}
                        onRemoveWrongQuestion={onRemoveWrongQuestion}
                        onClearAllWrongQuestions={onClearAllWrongQuestions}
                        onStartPracticeWrong={onStartPracticeWrong}
                        onAddFlashcard={onAddFlashcard}
                    />
                )}
            </div>
        </div>
    );
};

export default JLPTTestDashboard;
