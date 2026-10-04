import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Award, BookOpen, Clock, Calendar, CheckCircle2, 
    FileText, Headphones, Languages, Search, 
    TrendingUp, Target, Compass, Layers, Trophy, X, AlertCircle,
    Repeat
} from 'lucide-react';
import { ROUTES } from '../../router';
import { loadJLPTLevelData } from '../../services/jlptDataService';
import JLPTBooksCollectionTab from './JLPTBooksCollectionTab';
import JLPTLessonRoadmapTab from './JLPTLessonRoadmapTab';
import JLPTSkillArenaTab from './JLPTSkillArenaTab';
import JLPTMockExamsTab from './JLPTMockExamsTab';
import JLPTDrillsTab from './JLPTDrillsTab';
import JLPTWrongQuestionsTab from './JLPTWrongQuestionsTab';

const MAIN_TABS = [
    { id: 'books', label: '104 Sách Luyện Thi', icon: BookOpen, desc: 'Tuyển tập 104 bộ sách & 5.818 đề thi Master Series' },
    { id: 'roadmap', label: 'Lộ Trình Theo Bài', icon: Compass, desc: 'Bài học 1 ➔ 148 trọn gói 4 kỹ năng' },
    { id: 'skills', label: 'Luyện Kỹ Năng', icon: Target, desc: 'Chữ Hán • Ngữ pháp • Đọc hiểu' },
    { id: 'drills', label: 'Ôn Tập Phản Xạ', icon: Repeat, desc: '61 bài drills phản xạ ngữ pháp' },
    { id: 'wrong', label: 'Sổ Tay Câu Sai', icon: AlertCircle, desc: 'Ôn luyện lại các câu làm sai' },
    { id: 'mock', label: 'Phòng Thi Tổng Hợp', icon: Trophy, desc: 'Đề thi mô phỏng JLPT tính giờ' },
];

const JLPTTestDashboard = ({
    tests = [],
    completedTests = {},
    savedProgresses = {},
    targetLevel = 'N2',
    handleUpdateTargetLevel,
    activeMainTab: externalActiveMainTab,
    setActiveMainTab: externalSetActiveMainTab,
    selectedLevel: externalSelectedLevel,
    setSelectedLevel: externalSetSelectedLevel,
    searchQuery: externalSearchQuery,
    setSearchQuery: externalSetSearchQuery,
    statusFilter: externalStatusFilter,
    setStatusFilter: externalSetStatusFilter,
    roadmapProgress = {},
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
    const setStatusFilter = externalStatusFilter || setInternalStatusFilter;

    React.useEffect(() => {
        // Load all level data so all 104 books populate immediately
        loadJLPTLevelData('all');
    }, []);

    React.useEffect(() => {
        if (selectedLevel) {
            loadJLPTLevelData(selectedLevel);
        }
    }, [selectedLevel]);



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
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const avgScore = completedList.length > 0
        ? Math.round(completedList.reduce((sum, t) => sum + (completedTests[t.id]?.percentage || 0), 0) / completedList.length)
        : 0;

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-950 p-3.5 sm:p-5 md:p-8 font-sans animate-fade-in text-slate-900 dark:text-slate-100">
            {notification && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center gap-2 text-xs font-bold animate-bounce">
                    <span>{notification}</span>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                {/* 1. Header & Quick Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Trung Tâm Luyện Thi JLPT
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-1 max-w-xl">
                            {tests.length} bộ đề luyện tập và bài đọc hiểu song ngữ từ N5 đến N1.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                        {canEdit && (
                            <Link 
                                to={ROUTES.JLPT_ADMIN}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Quản trị Đề thi</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* 2. Top Bar: Level Selector + Progress Stats */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
                    {/* Level Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
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
                                    className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
                                        selectedLevel === lvl.key
                                            ? 'bg-white dark:bg-slate-900 text-[#db2777] dark:text-[#f494bc] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {lvl.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[220px] sm:w-64">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm bài học, đề thi..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#f494bc]"
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
                    </div>

                    {/* Stats Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Đã hoàn thành</p>
                                <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                                    {completedCount} <span className="text-xs font-medium text-slate-400">/ {totalCount} đề</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Độ chính xác TB</p>
                                <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                                    {avgScore > 0 ? `${avgScore}%` : 'Chưa có'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Kỳ thi JLPT kế tiếp</p>
                                <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                                    Còn {jlptCountdown} ngày
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                            >
                                <option value="all">Trạng thái: Tất cả</option>
                                <option value="completed">Đã hoàn thành</option>
                                <option value="in_progress">Đang làm dở</option>
                                <option value="not_started">Chưa làm</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Main Navigation Switcher (6 Pillars) */}
                <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs overflow-x-auto no-scrollbar">
                    {MAIN_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeMainTab === tab.id;
                        const wrongCount = tab.id === 'wrong' ? Object.keys(wrongQuestions || {}).length : 0;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveMainTab(tab.id)}
                                className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 ${
                                    isSelected
                                        ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-black text-xs sm:text-sm border border-slate-200/80 dark:border-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-xs sm:text-sm'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#db2777] dark:text-[#f494bc]' : 'text-slate-400'}`} />
                                <span className="whitespace-nowrap">{tab.label}</span>
                                {wrongCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#f494bc] text-slate-950 shrink-0">
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
                        canEdit={canEdit}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
                        handleToggleTestPremium={handleToggleTestPremium}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}

                {activeMainTab === 'roadmap' && (
                    <JLPTLessonRoadmapTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
                        handleToggleTestPremium={handleToggleTestPremium}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}

                {activeMainTab === 'skills' && (
                    <JLPTSkillArenaTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
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

                {activeMainTab === 'mock' && (
                    <JLPTMockExamsTab
                        tests={tests}
                        completedTests={completedTests}
                        savedProgresses={savedProgresses}
                        selectedLevel={selectedLevel}
                        searchQuery={searchQuery}
                        statusFilter={statusFilter}
                        canEdit={canEdit}
                        hasPremiumAccess={hasPremiumAccess}
                        startTest={startTest}
                        reviewTest={reviewTest}
                        handleStartPrint={handleStartPrint}
                        handleToggleTestPremium={handleToggleTestPremium}
                        setShowPremiumModal={setShowPremiumModal}
                        setLockedPkgName={setLockedPkgName}
                    />
                )}
            </div>
        </div>
    );
};

export default JLPTTestDashboard;
