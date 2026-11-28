import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    BookOpen, Clock, Calendar,
    Headphones, Search, X, AlertCircle,
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
    targetLevel = 'N5',
    activeMainTab: externalActiveMainTab,
    setActiveMainTab: externalSetActiveMainTab,
    selectedLevel: externalSelectedLevel,
    setSelectedLevel: externalSetSelectedLevel,
    searchQuery: externalSearchQuery,
    setSearchQuery: externalSetSearchQuery,
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

    const activeMainTab = externalActiveMainTab !== undefined ? externalActiveMainTab : internalActiveMainTab;
    const setActiveMainTab = externalSetActiveMainTab || setInternalActiveMainTab;

    const selectedLevel = externalSelectedLevel !== undefined ? externalSelectedLevel : internalSelectedLevel;
    const setSelectedLevel = externalSetSelectedLevel || setInternalSelectedLevel;

    const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
    const setSearchQuery = externalSetSearchQuery || setInternalSearchQuery;

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

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-950 p-3.5 sm:p-5 md:p-8 font-sans animate-fade-in text-slate-900 dark:text-slate-100">
            {notification && (
                <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-slate-700/60 flex items-center gap-2 text-xs font-bold backdrop-blur-md animate-fade-in pointer-events-none">
                    <span>{notification}</span>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
                {/* 1. Compact Header + Countdown Badge + Admin Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Trung Tâm Luyện Thi JLPT
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-2 border-rose-200 dark:border-rose-800 border-b-4 border-b-rose-300 dark:border-b-rose-950 text-xs font-black">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Kỳ thi JLPT: Còn {jlptCountdown} ngày</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap">
                        {canEdit && (
                            <>
                                <button
                                    type="button"
                                    onClick={onOpenQuestionSearch}
                                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 border-2 border-emerald-600 border-b-4 border-b-emerald-700 active:border-b-2 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer select-none"
                                    title="Tìm kiếm và sửa nhanh câu hỏi trên toàn bộ đề thi (Ctrl + K)"
                                >
                                    <Search className="w-4 h-4 stroke-[2.5]" />
                                    <span>Tìm & Sửa câu hỏi</span>
                                    <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-emerald-700/80 rounded-lg font-mono">
                                        Ctrl+K
                                    </span>
                                </button>
                                <Link 
                                    to={`${ROUTES.JLPT_ADMIN}?mode=studio`}
                                    className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 border-2 border-sky-600 border-b-4 border-b-sky-700 active:border-b-2 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer select-none"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Studio Soạn Đề &amp; Nghe</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Duolingo Control Bar: N5–N1 Level Selector + Search */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-300 dark:border-b-slate-950 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => {
                            const isActive = selectedLevel === lvl;
                            return (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setSelectedLevel(lvl)}
                                    className={`px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl border-2 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer select-none ${
                                        isActive
                                            ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600 border-b-emerald-700 text-white shadow-xs'
                                            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-950 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {lvl}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative flex-1 min-w-[220px] sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm sách, đề thi..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-8 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Duolingo Tab Navigation Switcher (5 Core Tabs) */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {MAIN_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = activeMainTab === tab.id;
                        const wrongCount = tab.id === 'wrong' ? Object.keys(wrongQuestions || {}).length : 0;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveMainTab(tab.id)}
                                className={`flex-1 min-w-fit py-2.5 px-3.5 sm:px-4 rounded-2xl border-2 border-b-4 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shrink-0 active:translate-y-0.5 active:border-b-2 select-none text-xs sm:text-sm font-black ${
                                    isSelected
                                        ? 'bg-sky-500 hover:bg-sky-400 border-sky-600 border-b-sky-700 text-white shadow-xs'
                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 border-b-slate-300 dark:border-b-slate-950 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-700'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-sky-500'}`} />
                                <span className="whitespace-nowrap">{tab.label}</span>
                                {wrongCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                        isSelected
                                            ? 'bg-white text-rose-600'
                                            : 'bg-rose-500 text-white'
                                    }`}>
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
