import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingIndicator from '../ui/LoadingIndicator';
import { PremiumLockedModal } from '../ui';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { playCompletionFanfare } from '../../utils/soundEffects';

import { useJLPTTestData } from '../../hooks/useJLPTTestData';
import { updateSingleJLPTTestInCache, removeSingleJLPTTestFromCache, ensureFullTestLoaded } from '../../services/jlptDataService';
import PrintErrorBoundary from '../jlptTest/PrintErrorBoundary';
import JLPTPrintView from '../jlptTest/JLPTPrintView';
import PrintPortal from '../jlptTest/PrintPortal';
import QuestionEditModal from '../jlptTest/QuestionEditModal';
import JLPTTestTakeView from '../jlptTest/JLPTTestTakeView';
import JLPTTestResultView from '../jlptTest/JLPTTestResultView';
import JLPTTestDashboard from '../jlptTest/JLPTTestDashboard';
import JLPTQuestionSearchModal from '../jlptTest/JLPTQuestionSearchModal';
import JLPTExportImportModal, { sanitizeDataForFirestore } from '../jlptTest/JLPTExportImportModal';
import JLPTQuickTestEditorModal from '../jlptTest/JLPTQuickTestEditorModal';
import { testHasListening } from '../jlptTest/jlptYearlyConstants';
import { computeJlptScoreBreakdown, buildJlptExamPhases } from '../../utils/jlptScoringRules';
import { preloadTestImages } from '../../utils/jlptMediaPreloader';
import { showToast } from '../../utils/toast';
import { X, Play, BookOpen, Lock, ChevronRight, FileText, Printer, Check, Loader2, Edit3, Trash2, AlertTriangle } from 'lucide-react';

export const answerKey = (si, qi) => `s${si}_q${qi}`;
export const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

const VALID_MAIN_TABS = ['books', 'yearly', 'listening_mondai', 'drills', 'wrong'];
const LEGACY_TAB_MAP = { skills: 'books', roadmap: 'books', mock: 'yearly' };
const normalizeMainTab = (rawTab) => {
    const mapped = LEGACY_TAB_MAP[rawTab] || rawTab;
    return VALID_MAIN_TABS.includes(mapped) ? mapped : 'books';
};

const JLPTTestScreen = ({ isAdmin, allCards = [], profile = {}, userId, awardXP }) => {
    // Custom Hook for JLPT Data and States
    const {
        tests,
        setTests,
        loading,
        targetLevel,
        handleUpdateTargetLevel,
        completedTests,
        setCompletedTests,
        roadmapProgress,
        toggleRoadmapDay,
        savedProgresses,
        setSavedProgresses,
        notes,
        wrongQuestions,
        recordWrongQuestions,
        removeWrongQuestion,
        clearAllWrongQuestions,
        saveCompletedTestsToFirestore,
        saveProgressesToFirestore,
        saveNotesMultiple,
        deleteNotesMultiple
    } = useJLPTTestData({ userId, profile });

    // Active Test & Taking State
    const [activeTest, setActiveTest] = useState(null);
    const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [showDetailedReview, setShowDetailedReview] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [notification, setNotification] = useState(null);

    // Auto-dismiss notification toast after 3.5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Admin Edit HTML states
    const [editingQuestionData, setEditingQuestionData] = useState(null);
    const [editingFullTest, setEditingFullTest] = useState(null);
    const [confirmDeleteTest, setConfirmDeleteTest] = useState(null);
    const [deletingTest, setDeletingTest] = useState(false);
    const [savingHtml, setSavingHtml] = useState(false);
    const [showExportImportModal, setShowExportImportModal] = useState(false);

    // Notes draft states
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const [noteTab, setNoteTab] = useState('text');
    const [drawDraftStrokes, setDrawDraftStrokes] = useState([]);
    const [drawDraftDataUrl, setDrawDraftDataUrl] = useState('');
    const [showScratchpad, setShowScratchpad] = useState(false);

    // Review notes draft states
    const [editingReviewNoteKey, setEditingReviewNoteKey] = useState(null);
    const [reviewNoteDraft, setReviewNoteDraft] = useState('');
    const [reviewNoteTab, setReviewNoteTab] = useState('text');
    const [reviewDrawDraftStrokes, setReviewDrawDraftStrokes] = useState([]);
    const [reviewDrawDraftDataUrl, setReviewDrawDraftDataUrl] = useState('');

    // Real Exam & AI Translation states
    const [pendingStartTest, setPendingStartTest] = useState(null);
    const [loadingTestDetails, setLoadingTestDetails] = useState(false);
    const [isRealExam, setIsRealExam] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [showFullscreenRequired, setShowFullscreenRequired] = useState(false);
    const [violationType, setViolationType] = useState('');

    // PDF Export & Printing states
    const [printingTest, setPrintingTest] = useState(null);
    const [isPrintTriggered, setIsPrintTriggered] = useState(false);
    const [includeAnswers, setIncludeAnswers] = useState(true);
    const [includeAnswerSheet, setIncludeAnswerSheet] = useState(true);

    // Dashboard state persistence across taking tests & returning
    const location = useLocation();
    const [activeMainTab, setActiveMainTabState] = useState(() => {
        const params = new URLSearchParams(location?.search || '');
        const rawTab = params.get('tab') || sessionStorage.getItem('quizki_jlpt_main_tab');
        return normalizeMainTab(rawTab);
    });
    const [selectedLevel, setSelectedLevelState] = useState(() => {
        const params = new URLSearchParams(location?.search || '');
        return params.get('level') || sessionStorage.getItem('quizki_jlpt_selected_level') || targetLevel || 'N5';
    });

    useEffect(() => {
        const params = new URLSearchParams(location?.search || '');
        const tabParam = params.get('tab');
        const levelParam = params.get('level');
        if (tabParam) {
            const nextTab = normalizeMainTab(tabParam);
            setActiveMainTabState(nextTab);
            try { sessionStorage.setItem('quizki_jlpt_main_tab', nextTab); } catch (e) {}
        }
        if (levelParam && ['all', 'N5', 'N4', 'N3', 'N2', 'N1'].includes(levelParam)) {
            setSelectedLevelState(levelParam);
            try { sessionStorage.setItem('quizki_jlpt_selected_level', levelParam); } catch (e) {}
        }
    }, [location?.search]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const setActiveMainTab = (tab) => {
        const nextTab = normalizeMainTab(tab);
        setActiveMainTabState(nextTab);
        try { sessionStorage.setItem('quizki_jlpt_main_tab', nextTab); } catch (e) {}
    };

    const setSelectedLevel = (lvl) => {
        setSelectedLevelState(lvl);
        try { sessionStorage.setItem('quizki_jlpt_selected_level', lvl); } catch (e) {}
    };

    // Settings for furigana and timer
    const [showFurigana, setShowFurigana] = useState(() => localStorage.getItem('quizki_jlpt_show_furigana') !== 'false');
    const [showTimer, setShowTimer] = useState(() => localStorage.getItem('quizki_jlpt_show_timer') !== 'false');
    const [furiganaColor, setFuriganaColor] = useState(() => localStorage.getItem('quizki_jlpt_furigana_color') || 'default');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const settingsMenuRef = useRef(null);

    // Timer & Phased JLPT Real-Exam Timing
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [testStartTime, setTestStartTime] = useState(null);
    const [timeTaken, setTimeTaken] = useState(0);
    const [wasRealExam, setWasRealExam] = useState(false);
    const [examPhases, setExamPhases] = useState([]);
    const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
    const [phaseElapsedOffsetSec, setPhaseElapsedOffsetSec] = useState(0);
    const examPhasesRef = useRef([]);
    const currentPhaseIdxRef = useRef(0);
    const submitTestRef = useRef(null);
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const containerRef = useRef(null);
    examPhasesRef.current = examPhases;
    currentPhaseIdxRef.current = currentPhaseIdx;

    // Premium Lock State
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('');
    const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
    const hasPremiumAccess = isAdmin || userIsAdmin || profile?.isPremiumUnlocked || (profile?.unlockedSpecializedPackages || []).includes('jlpt_prep');
    const canEdit = isAdmin || userIsAdmin;
    const [showQuestionSearchModal, setShowQuestionSearchModal] = useState(false);

    // Global keyboard shortcut Ctrl+K to open question search for admin
    useEffect(() => {
        if (!canEdit) return;
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setShowQuestionSearchModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canEdit]);

    const handleSaveSearchedQuestion = async (testId, sectionIdx, questionIdx, updatedQuestion) => {
        try {
            const targetTest = tests.find(t => t.id === testId);
            if (!targetTest) return false;
            const updatedSections = JSON.parse(JSON.stringify(targetTest.sections));
            updatedSections[sectionIdx].questions[questionIdx] = updatedQuestion;
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, testId);
            await setDoc(testRef, { 
                ...targetTest,
                sections: updatedSections,
                updatedAt: Date.now()
            }, { merge: true });

            updateSingleJLPTTestInCache(testId, { sections: updatedSections });
            setTests(prevTests => prevTests.map(t => t.id === testId ? { ...t, sections: updatedSections } : t));
            if (activeTest?.id === testId) {
                setActiveTest(prev => ({ ...prev, sections: updatedSections }));
            }
            showToast('Đã lưu thay đổi câu hỏi thành công!', 'success');
            return true;
        } catch (err) {
            console.error('Error saving question:', err);
            showToast('Lỗi khi lưu câu hỏi: ' + err.message, 'error');
            return false;
        }
    };

    useEffect(() => { localStorage.setItem('quizki_jlpt_show_furigana', String(showFurigana)); }, [showFurigana]);
    useEffect(() => { localStorage.setItem('quizki_jlpt_show_timer', String(showTimer)); }, [showTimer]);
    useEffect(() => { localStorage.setItem('quizki_jlpt_furigana_color', furiganaColor); }, [furiganaColor]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) {
                setShowSettingsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClosePrint = useCallback(() => {
        setIsPrintTriggered(false);
        setPrintingTest(null);
        if (typeof document !== 'undefined') {
            document.body.classList.remove('is-printing');
        }
    }, []);

    useEffect(() => {
        if (isPrintTriggered && printingTest) {
            const printTimer = setTimeout(() => {
                window.print();
            }, 600);
            return () => clearTimeout(printTimer);
        }
    }, [isPrintTriggered, printingTest]);

    // Phased Real-Exam Timer Countdown (auto-advances Lang/Reading -> Listening separate clock -> auto submit)
    useEffect(() => {
        if (!timerActive) return undefined;
        if (timeRemaining <= 0) {
            const phases = examPhasesRef.current;
            const curIdx = currentPhaseIdxRef.current;
            if (isRealExam && phases.length > 0 && curIdx < phases.length - 1) {
                const nextIdx = curIdx + 1;
                const prevSec = phases[curIdx]?.seconds || 0;
                const nextPhase = phases[nextIdx];
                setPhaseElapsedOffsetSec((p) => p + prevSec);
                setCurrentPhaseIdx(nextIdx);
                setCurrentSectionIdx(nextPhase.sectionIndices?.[0] ?? 0);
                setCurrentQuestionIdx(0);
                setTimeRemaining(nextPhase.seconds);
                showToast(`⏰ Hết giờ phần trước! Bắt đầu tính giờ riêng: ${nextPhase.label} (${nextPhase.minutes} phút).`, 'info');
            } else {
                setTimerActive(false);
                submitTestRef.current?.();
            }
            return undefined;
        }
        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [timerActive, timeRemaining, isRealExam]);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement?.requestFullscreen?.();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen?.();
                setIsFullscreen(false);
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        const handler = () => {
            const isFS = !!document.fullscreenElement;
            setIsFullscreen(isFS);
            if (!isFS && activeTest && !showResult && isRealExam) {
                setViolationCount(prev => {
                    const next = prev + 1;
                    if (next >= 3) {
                        submitTest();
                        alert("Bài thi đã tự động nộp do vi phạm quy chế rời màn hình quá 3 lần!");
                    } else {
                        setViolationType('fullscreen');
                        setShowFullscreenRequired(true);
                    }
                    return next;
                });
            }
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, [activeTest, showResult, isRealExam]);

    useEffect(() => {
        if (!activeTest || showResult || !isRealExam) return;
        const handleVisibilityChange = () => {
            if (document.hidden || document.visibilityState === 'hidden') {
                setViolationCount(prev => {
                    const next = prev + 1;
                    if (next >= 3) {
                        submitTest();
                        alert("Bài thi đã tự động nộp do vi phạm quy chế rời màn hình quá 3 lần!");
                    } else {
                        setViolationType('tab');
                        setShowViolationWarning(true);
                    }
                    return next;
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [activeTest, showResult, isRealExam]);

    useEffect(() => {
        const container = containerRef.current;
        if (!isRealExam || !activeTest || showResult || !container) return;
        const preventSelection = (e) => e.preventDefault();
        const preventCopy = (e) => {
            e.preventDefault();
            alert("Không thể sao chép nội dung trong chế độ thi thực tế!");
        };
        container.addEventListener('selectstart', preventSelection);
        container.addEventListener('copy', preventCopy);
        container.addEventListener('contextmenu', preventSelection);
        return () => {
            container.removeEventListener('selectstart', preventSelection);
            container.removeEventListener('copy', preventCopy);
            container.removeEventListener('contextmenu', preventSelection);
        };
    }, [isRealExam, activeTest, showResult]);

    // Answers navigation
    const selectAnswer = useCallback((si, qi, optIdx) => {
        if (showResult) return;
        const key = answerKey(si, qi);

        // Lock answers in practice mode (!isRealExam) once picked
        if (!isRealExam && answers[key] !== undefined) return;

        setAnswers(prev => ({ ...prev, [key]: optIdx }));

        // In Practice mode: if wrong answer, immediately log to Sổ tay câu sai
        if (!isRealExam && activeTest?.sections?.[si]?.questions?.[qi]) {
            const sec = activeTest.sections[si];
            const q = sec.questions[qi];
            const correctIndex = typeof q.correctAnswer === 'number' 
                ? q.correctAnswer 
                : (typeof q.answer === 'number' 
                    ? q.answer 
                    : (typeof q.correct === 'number' 
                        ? q.correct 
                        : (typeof q.correct === 'string' && q.options 
                            ? q.options.findIndex(o => o.trim() === q.correct.trim()) 
                            : -1)));

            if (correctIndex !== -1 && optIdx !== correctIndex) {
                const wrongKey = `${activeTest.id}_s${si}_q${qi}`;
                recordWrongQuestions({
                    [wrongKey]: {
                        testId: activeTest.id,
                        testTitle: activeTest.title || 'Đề thi JLPT',
                        level: activeTest.level || 'N2',
                        sectionTitle: sec.title || '',
                        sectionType: sec.type || '',
                        skillType: sec.type || activeTest.skill || 'grammar',
                        question: q.question || '',
                        options: q.options || [],
                        correctAnswer: correctIndex,
                        userAnswer: optIdx,
                        explanation: q.explanation || '',
                        passage: q.passage || '',
                        date: new Date().toISOString()
                    }
                });
            }
        }
    }, [showResult, isRealExam, answers, activeTest, recordWrongQuestions]);

    const selectAnswerSub = useCallback((si, qi, sqi, optIdx) => {
        if (showResult) return;
        const key = subAnswerKey(si, qi, sqi);

        // Lock answers in practice mode (!isRealExam) once picked
        if (!isRealExam && answers[key] !== undefined) return;

        setAnswers(prev => ({ ...prev, [key]: optIdx }));

        // In Practice mode: if wrong answer, immediately log to Sổ tay câu sai
        if (!isRealExam && activeTest?.sections?.[si]?.questions?.[qi]?.subQuestions?.[sqi]) {
            const sec = activeTest.sections[si];
            const q = sec.questions[qi];
            const sq = q.subQuestions[sqi];
            const correctIndex = typeof sq.correctAnswer === 'number' 
                ? sq.correctAnswer 
                : (typeof sq.answer === 'number' 
                    ? sq.answer 
                    : (typeof sq.correct === 'number' 
                        ? sq.correct 
                        : (typeof sq.correct === 'string' && sq.options 
                            ? sq.options.findIndex(o => o.trim() === sq.correct.trim()) 
                            : -1)));

            if (correctIndex !== -1 && optIdx !== correctIndex) {
                const wrongKey = `${activeTest.id}_s${si}_q${qi}_sq${sqi}`;
                recordWrongQuestions({
                    [wrongKey]: {
                        testId: activeTest.id,
                        testTitle: activeTest.title || 'Đề thi JLPT',
                        level: activeTest.level || 'N2',
                        sectionTitle: sec.title || '',
                        sectionType: sec.type || '',
                        skillType: sec.type || activeTest.skill || 'grammar',
                        question: sq.question || q.question || '',
                        options: sq.options || q.options || [],
                        correctAnswer: correctIndex,
                        userAnswer: optIdx,
                        explanation: sq.explanation || q.explanation || '',
                        passage: q.passage || '',
                        date: new Date().toISOString()
                    }
                });
            }
        }
    }, [showResult, isRealExam, answers, activeTest, recordWrongQuestions]);

    const goToQuestion = (si, qi) => {
        setCurrentSectionIdx(si);
        setCurrentQuestionIdx(qi);
    };

    const nextQuestion = () => {
        const section = activeTest.sections[currentSectionIdx];
        if (currentQuestionIdx < section.questions.length - 1) {
            setCurrentQuestionIdx(currentQuestionIdx + 1);
        } else if (currentSectionIdx < activeTest.sections.length - 1) {
            setCurrentSectionIdx(currentSectionIdx + 1);
            setCurrentQuestionIdx(0);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(currentQuestionIdx - 1);
        } else if (currentSectionIdx > 0) {
            const prevSec = activeTest.sections[currentSectionIdx - 1];
            setCurrentSectionIdx(currentSectionIdx - 1);
            setCurrentQuestionIdx(prevSec.questions.length - 1);
        }
    };

    // Calculate results
    const getResults = () => {
        if (!activeTest) return null;
        let correct = 0, total = 0;
        const sectionResults = activeTest.sections.map((sec, si) => {
            let secCorrect = 0;
            let secTotal = 0;
            sec.questions.forEach((q, qi) => {
                if (q.subQuestions && q.subQuestions.length > 0) {
                    q.subQuestions.forEach((sq, sqi) => {
                        total++;
                        secTotal++;
                        const userAns = answers[subAnswerKey(si, qi, sqi)];
                        if (userAns === sq.correctAnswer) { correct++; secCorrect++; }
                    });
                } else {
                    total++;
                    secTotal++;
                    const userAns = answers[answerKey(si, qi)];
                    if (userAns === q.correctAnswer) { correct++; secCorrect++; }
                }
            });
            return { ...sec, correct: secCorrect, total: secTotal };
        });
        const jlptScore = computeJlptScoreBreakdown({
            test: activeTest,
            answers,
            answerKeyFn: answerKey,
            subAnswerKeyFn: subAnswerKey
        });
        return {
            correct,
            total,
            percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
            sectionResults,
            jlptScore
        };
    };

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const startTest = async (test) => {
        let isPremium = test?.level !== 'N5' || test?.isPremium;
        if (isPremium && !hasPremiumAccess) {
            setLockedPkgName('Luyện đề thi thử JLPT');
            setShowPremiumModal(true);
            return;
        }
        setPendingStartTest(test);
        if (Array.isArray(test?.sections) && test.sections.length > 0) {
            preloadTestImages(test);
        }
        if (!test?.sections || test.sections.length === 0) {
            setLoadingTestDetails(true);
            ensureFullTestLoaded(test?.id, test?.level)
                .then(fullTest => {
                    if (fullTest) {
                        setPendingStartTest(fullTest);
                        preloadTestImages(fullTest);
                    }
                })
                .finally(() => {
                    setLoadingTestDetails(false);
                });
        } else {
            setLoadingTestDetails(false);
        }
    };

    const retakeTest = async (test) => {
        const targetTest = test || activeTest;
        if (!targetTest) return;
        let isPremium = targetTest?.level !== 'N5' || targetTest?.isPremium;
        if (isPremium && !hasPremiumAccess) {
            setLockedPkgName('Luyện đề thi thử JLPT');
            setShowPremiumModal(true);
            return;
        }
        setShowResult(false);
        setShowDetailedReview(false);
        let fullTest = targetTest;
        if (!fullTest?.sections || fullTest.sections.length === 0) {
            setLoadingTestDetails(true);
            try {
                fullTest = (await ensureFullTestLoaded(targetTest?.id, targetTest?.level)) || targetTest;
            } finally {
                setLoadingTestDetails(false);
            }
        }
        initTest(fullTest, wasRealExam ? 'real' : 'practice');
    };

    const initTest = async (test, mode = 'practice', isResume = false) => {
        setPendingStartTest(null);
        let fullTest = test;
        if (!fullTest?.sections || fullTest.sections.length === 0) {
            setLoadingTestDetails(true);
            try {
                fullTest = (await ensureFullTestLoaded(test?.id, test?.level)) || test;
            } finally {
                setLoadingTestDetails(false);
            }
        }
        setActiveTest(fullTest);
        preloadTestImages(fullTest);
        setIsRealExam(mode === 'real');
        setViolationCount(0);
        setShowViolationWarning(false);
        setShowFullscreenRequired(false);

        const testId = fullTest?.id || fullTest?._id;
        const savedProgress = isResume ? (savedProgresses[testId] || savedProgresses[String(testId)]) : null;
        if (savedProgress && savedProgress.answers && Object.keys(savedProgress.answers).length > 0) {
            setAnswers(savedProgress.answers || {});
            setCurrentSectionIdx(savedProgress.currentSectionIdx || 0);
            setCurrentQuestionIdx(savedProgress.currentQuestionIdx || 0);
            setTestStartTime(Date.now() - ((savedProgress.timeSpentSoFar || 0) * 1000));
        } else {
            setCurrentSectionIdx(0);
            setCurrentQuestionIdx(0);
            setAnswers({});
            setTestStartTime(Date.now());
        }

        setShowResult(false);
        setShowDetailedReview(false);
        setWasRealExam(mode === 'real');

        if (mode === 'real') {
            const phases = buildJlptExamPhases(fullTest);
            setExamPhases(phases);
            setCurrentPhaseIdx(0);
            setPhaseElapsedOffsetSec(0);
            if (phases.length > 0) {
                setCurrentSectionIdx(phases[0].sectionIndices?.[0] ?? 0);
                setTimeRemaining(phases[0].seconds);
            } else {
                setTimeRemaining((fullTest.timeLimit || 60) * 60);
            }
            setTimerActive(true);
            sessionStorage.setItem('realExamModeActive', 'true');
            window.dispatchEvent(new Event('realExamModeChange'));
        } else {
            setExamPhases([]);
            setCurrentPhaseIdx(0);
            setPhaseElapsedOffsetSec(0);
            setTimeRemaining(0);
            setTimerActive(false);
            sessionStorage.removeItem('realExamModeActive');
            window.dispatchEvent(new Event('realExamModeChange'));
        }
    };

    const handleSelectTestFromSearch = async (test, sectionIdx = 0, questionIdx = 0) => {
        setShowQuestionSearchModal(false);
        try {
            let fullTest = test;
            if (!fullTest?.sections || fullTest.sections.length === 0) {
                setLoadingTestDetails(true);
                try {
                    fullTest = (await ensureFullTestLoaded(test?.id, test?.level)) || test;
                } finally {
                    setLoadingTestDetails(false);
                }
            }
            if (!fullTest) return;

            // Nếu đang trong cùng bài thi này thì chỉ cần nhảy trực tiếp đến câu hỏi
            if (activeTest && (activeTest.id === fullTest.id || activeTest._id === fullTest.id)) {
                setShowResult(false);
                setShowDetailedReview(false);
                if (typeof sectionIdx === 'number') setCurrentSectionIdx(sectionIdx);
                if (typeof questionIdx === 'number') setCurrentQuestionIdx(questionIdx);
                return;
            }

            // Nếu đang ở bài thi khác hoặc ở ngoài dashboard, bắt đầu bài thi ở chế độ luyện tập
            await initTest(fullTest, 'practice', false);
            if (typeof sectionIdx === 'number' && !isNaN(sectionIdx)) {
                setCurrentSectionIdx(sectionIdx);
            }
            if (typeof questionIdx === 'number' && !isNaN(questionIdx)) {
                setCurrentQuestionIdx(questionIdx);
            }
        } catch (err) {
            console.error('Error opening test from search:', err);
            showToast('Không thể mở đề thi: ' + err.message, 'error');
        }
    };

    const reviewTest = async (test) => {
        if ((test.level !== 'N5' || test.isPremium) && !hasPremiumAccess) {
            setLockedPkgName('Luyện đề thi thử JLPT');
            setShowPremiumModal(true);
            return;
        }
        const saved = completedTests[test.id];
        if (saved) {
            setIsRealExam(false);
            setWasRealExam(saved.wasRealExam !== undefined ? saved.wasRealExam : true);
            setTimeTaken(saved.timeTaken || 0);
            let fullTest = test;
            if (!fullTest?.sections || fullTest.sections.length === 0) {
                setLoadingTestDetails(true);
                try {
                    fullTest = (await ensureFullTestLoaded(test?.id, test?.level)) || test;
                } finally {
                    setLoadingTestDetails(false);
                }
            }
            setActiveTest(fullTest);
            preloadTestImages(fullTest);
            setAnswers(saved.answers || {});
            setCurrentSectionIdx(0);
            setCurrentQuestionIdx(0);
            setShowResult(true);
            setShowDetailedReview(true);
        }
    };

    const submitTest = () => {
        setTimerActive(false);
        clearInterval(timerRef.current);
        const taken = isRealExam
            ? (examPhases.length > 0
                ? phaseElapsedOffsetSec + Math.max(0, (examPhases[currentPhaseIdx]?.seconds || 0) - timeRemaining)
                : Math.max(0, (activeTest.timeLimit * 60) - timeRemaining))
            : Math.round((Date.now() - (testStartTime || Date.now())) / 1000);
        setTimeTaken(taken);

        setIsRealExam(false);
        sessionStorage.removeItem('realExamModeActive');
        window.dispatchEvent(new Event('realExamModeChange'));

        const results = getResults();
        const newCompleted = {
            ...completedTests,
            [activeTest.id]: {
                percentage: results.percentage,
                correct: results.correct,
                total: results.total,
                jlptScore: results.jlptScore ? {
                    totalScore: results.jlptScore.totalScore,
                    maxScore: results.jlptScore.maxScore,
                    passed: results.jlptScore.passed,
                    isFullJlptExam: results.jlptScore.isFullJlptExam
                } : null,
                answers: answers,
                wasRealExam: wasRealExam,
                timeTaken: taken,
                date: new Date().toISOString()
            }
        };
        setCompletedTests(newCompleted);
        localStorage.setItem('quizki_completed_tests', JSON.stringify(newCompleted));
        saveCompletedTestsToFirestore(newCompleted);

        const newProgresses = { ...savedProgresses };
        delete newProgresses[activeTest.id];
        setSavedProgresses(newProgresses);
        localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(newProgresses));
        saveProgressesToFirestore(newProgresses);

        // Record wrong questions automatically to Wrong Notebook
        const wrongItems = {};
        if (activeTest?.sections) {
            activeTest.sections.forEach((sec, si) => {
                (sec.questions || []).forEach((q, qi) => {
                    if (q.subQuestions && q.subQuestions.length > 0) {
                        q.subQuestions.forEach((sq, sqi) => {
                            const userAns = answers[subAnswerKey(si, qi, sqi)];
                            if (userAns !== undefined && userAns !== sq.correctAnswer) {
                                const qKey = `${activeTest.id}_s${si}_q${qi}_sq${sqi}`;
                                wrongItems[qKey] = {
                                    testId: activeTest.id,
                                    testTitle: activeTest.title || 'Đề thi JLPT',
                                    level: activeTest.level || 'N2',
                                    sectionTitle: sec.title || '',
                                    sectionType: sec.type || '',
                                    skillType: sec.type || activeTest.skill || 'grammar',
                                    question: sq.question || q.question || '',
                                    options: sq.options || q.options || [],
                                    correctAnswer: sq.correctAnswer,
                                    userAnswer: userAns,
                                    explanation: sq.explanation || q.explanation || '',
                                    passage: q.passage || '',
                                    date: new Date().toISOString()
                                };
                            }
                        });
                    } else {
                        const userAns = answers[answerKey(si, qi)];
                        if (userAns !== undefined && userAns !== q.correctAnswer) {
                            const qKey = `${activeTest.id}_s${si}_q${qi}`;
                            wrongItems[qKey] = {
                                testId: activeTest.id,
                                testTitle: activeTest.title || 'Đề thi JLPT',
                                level: activeTest.level || 'N2',
                                sectionTitle: sec.title || '',
                                sectionType: sec.type || '',
                                skillType: sec.type || activeTest.skill || 'grammar',
                                question: q.question || '',
                                options: q.options || [],
                                correctAnswer: q.correctAnswer,
                                userAnswer: userAns,
                                explanation: q.explanation || '',
                                passage: q.passage || '',
                                audioUrl: q.audioUrl || '',
                                audioStartSec: q.audioStartSec ?? null,
                                audioEndSec: q.audioEndSec ?? null,
                                imageUrl: q.imageUrl || '',
                                script: q.script || null,
                                mondaiTitle: q.mondaiTitle || '',
                                date: new Date().toISOString()
                            };
                        }
                    }
                });
            });
        }
        if (Object.keys(wrongItems).length > 0) {
            recordWrongQuestions(wrongItems);
        }

        setShowResult(true);
        setShowDetailedReview(false);
        playCompletionFanfare();

        if (awardXP && results) {
            const testXp = ((results.correct || 0) * 10) + 100;
            if (testXp > 0) awardXP(testXp);
        }
    };
    submitTestRef.current = submitTest;

    const handleAdvanceExamPhase = () => {
        if (!isRealExam || currentPhaseIdx >= examPhases.length - 1) {
            submitTest();
            return;
        }
        const curPhase = examPhases[currentPhaseIdx];
        const nextIdx = currentPhaseIdx + 1;
        const nextPhase = examPhases[nextIdx];
        const spentThisPhase = Math.max(0, (curPhase?.seconds || 0) - timeRemaining);
        setPhaseElapsedOffsetSec((p) => p + spentThisPhase);
        setCurrentPhaseIdx(nextIdx);
        setCurrentSectionIdx(nextPhase.sectionIndices?.[0] ?? 0);
        setCurrentQuestionIdx(0);
        setTimeRemaining(nextPhase.seconds);
        showToast(`⏱️ Đã chốt "${curPhase.label}". Bắt đầu tính giờ riêng: ${nextPhase.label} (${nextPhase.minutes} phút)!`, 'success');
    };

    const handleSaveQuestionImage = async (sectionIdx, questionIdx, imgUrl) => {
        if (!activeTest) return false;
        const updatedSections = JSON.parse(JSON.stringify(activeTest.sections || []));
        if (!updatedSections[sectionIdx]?.questions?.[questionIdx]) return false;
        updatedSections[sectionIdx].questions[questionIdx] = {
            ...updatedSections[sectionIdx].questions[questionIdx],
            imageUrl: imgUrl
        };
        const updatedTest = { ...activeTest, sections: updatedSections, updatedAt: Date.now() };
        try {
            const cleanPayload = sanitizeDataForFirestore(updatedTest);
            await setDoc(doc(db, `artifacts/${appId}/jlptTests`, activeTest.id), cleanPayload, { merge: true });
            updateSingleJLPTTestInCache(activeTest.id, cleanPayload);
            setActiveTest((prev) => ({ ...prev, sections: updatedSections }));
            setTests((prev) => prev.map((t) => (t.id === activeTest.id ? { ...t, sections: updatedSections } : t)));
            return true;
        } catch (err) {
            showToast('Lưu ảnh thất bại: ' + err.message, 'error');
            return false;
        }
    };

    const handleStartPracticeWrong = (wrongList) => {
        if (!wrongList || wrongList.length === 0) return;
        
        const questions = wrongList.map((item, idx) => ({
            id: `wrong_q_${idx}`,
            question: item.question,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            passage: item.passage,
            audioUrl: item.audioUrl || '',
            audioStartSec: item.audioStartSec ?? undefined,
            audioEndSec: item.audioEndSec ?? undefined,
            imageUrl: item.imageUrl || '',
            script: item.script || undefined,
            mondaiTitle: item.mondaiTitle || ''
        }));

        const practiceTest = {
            id: `practice_wrong_${Date.now()}`,
            title: `Luyện tập câu sai (${wrongList.length} câu)`,
            level: wrongList[0]?.level || 'JLPT',
            timeLimit: Math.max(10, Math.ceil(wrongList.length * 1.5)),
            sections: [
                {
                    id: 'sec_wrong',
                    title: 'Các câu hỏi cần ôn luyện lại',
                    type: 'mixed',
                    questions: questions
                }
            ]
        };

        initTest(practiceTest, 'practice');
    };

    const exitTest = () => {
        setTimerActive(false);
        clearInterval(timerRef.current);
        setIsRealExam(false);
        sessionStorage.removeItem('realExamModeActive');
        window.dispatchEvent(new Event('realExamModeChange'));
        setActiveTest(null);
        setShowResult(false);
        setAnswers({});
    };

    const saveProgressAndExit = () => {
        if (!activeTest) return;
        const testId = activeTest.id || activeTest._id;
        const hasAnswers = answers && Object.keys(answers).length > 0;

        if (!hasAnswers) {
            showToast("Chưa chọn câu trả lời nào, không lưu tiến trình.", "info");
            exitTest();
            return;
        }

        const elapsed = Math.round((Date.now() - (testStartTime || Date.now())) / 1000);
        const progressData = {
            answers: answers,
            currentSectionIdx: currentSectionIdx,
            currentQuestionIdx: currentQuestionIdx,
            timeSpentSoFar: elapsed,
            date: new Date().toISOString()
        };
        const newProgresses = { ...savedProgresses, [testId]: progressData };
        setSavedProgresses(newProgresses);
        try {
            localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(newProgresses));
        } catch (e) {}
        saveProgressesToFirestore(newProgresses);
        showToast("Đã lưu tiến trình làm bài!", "success");
        exitTest();
    };

    const handleSaveQuestionHtml = async (updatedQuestion) => {
        if (!activeTest || !editingQuestionData) return;
        const { sectionIdx, questionIdx } = editingQuestionData;
        setSavingHtml(true);
        try {
            const updatedSections = JSON.parse(JSON.stringify(activeTest.sections));
            updatedSections[sectionIdx].questions[questionIdx] = updatedQuestion;
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, activeTest.id);
            const cleanUpdatedTest = sanitizeDataForFirestore({ 
                ...activeTest,
                sections: updatedSections,
                updatedAt: Date.now()
            });
            await setDoc(testRef, cleanUpdatedTest, { merge: true });

            updateSingleJLPTTestInCache(activeTest.id, { sections: updatedSections });
            setActiveTest(prev => ({ ...prev, sections: updatedSections }));
            setTests(prevTests => prevTests.map(t => t.id === activeTest.id ? { ...t, sections: updatedSections } : t));
            setEditingQuestionData(null);
            showToast('Đã lưu thay đổi HTML câu hỏi thành công!', 'success');
        } catch (err) {
            console.error('Error updating question HTML:', err);
            showToast('Lỗi khi lưu HTML câu hỏi: ' + err.message, 'error');
        } finally {
            setSavingHtml(false);
        }
    };

    const handleSaveTestSections = async (updatedSections, toastMsg = 'Đã lưu phân tích bài đọc vào đề thi!') => {
        if (!activeTest || !canEdit) return false;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, activeTest.id);
            const cleanPayload = sanitizeDataForFirestore({
                ...activeTest,
                sections: updatedSections,
                updatedAt: Date.now()
            });
            await setDoc(testRef, cleanPayload, { merge: true });
            updateSingleJLPTTestInCache(activeTest.id, { sections: cleanPayload.sections });
            setActiveTest((prev) => (prev ? { ...prev, sections: cleanPayload.sections } : prev));
            setTests((prevTests) => prevTests.map((t) => (t.id === activeTest.id ? { ...t, sections: cleanPayload.sections } : t)));
            if (toastMsg) showToast(toastMsg, 'success');
            return true;
        } catch (err) {
            console.error('Error saving sections:', err);
            showToast('Lỗi khi lưu dữ liệu vào đề thi: ' + err.message, 'error');
            return false;
        }
    };

    const handleToggleTestPremium = async (e, test) => {
        if (e) e.stopPropagation();
        if (!canEdit) return;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, test.id);
            const nextVal = !test.isPremium;
            await setDoc(testRef, { ...test, isPremium: nextVal, updatedAt: Date.now() }, { merge: true });
            updateSingleJLPTTestInCache(test.id, { isPremium: nextVal });
            showToast(`Đã chuyển đề thi sang: ${nextVal ? 'Premium' : 'Miễn phí'}`, 'success');
            setTests(prevTests => prevTests.map(t => t.id === test.id ? { ...t, isPremium: nextVal } : t));
        } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    };

    const handleToggleTestFixed = async (e, test) => {
        if (e) e.stopPropagation();
        if (!canEdit) return;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, test.id);
            const nextVal = !test.isFixed;
            await setDoc(testRef, { 
                ...test, 
                isFixed: nextVal, 
                isDataStandardized: nextVal, 
                updatedAt: Date.now() 
            }, { merge: true });
            updateSingleJLPTTestInCache(test.id, { isFixed: nextVal, isDataStandardized: nextVal });
            showToast(`Đã đánh dấu đề: ${nextVal ? 'Đã chuẩn data' : 'Chưa chuẩn'}`, 'success');
            setTests(prevTests => prevTests.map(t => t.id === test.id ? { ...t, isFixed: nextVal, isDataStandardized: nextVal } : t));
            if (activeTest && activeTest.id === test.id) {
                setActiveTest(prev => ({ ...prev, isFixed: nextVal, isDataStandardized: nextVal }));
            }
        } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
    };

    const handleImportTestSections = async (updatedSections, markAsFixed = true) => {
        if (!activeTest) return false;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, activeTest.id);
            const rawPayload = {
                ...activeTest,
                sections: updatedSections,
                isFixed: markAsFixed ? true : (activeTest.isFixed || false),
                isDataStandardized: markAsFixed ? true : (activeTest.isDataStandardized || false),
                updatedAt: Date.now()
            };
            const cleanPayload = sanitizeDataForFirestore(rawPayload);
            await setDoc(testRef, cleanPayload, { merge: true });
            updateSingleJLPTTestInCache(activeTest.id, cleanPayload);
            setActiveTest(prev => ({ ...prev, ...cleanPayload }));
            setTests(prevTests => prevTests.map(t => t.id === activeTest.id ? { ...t, ...cleanPayload } : t));
            showToast('Đã cập nhật dữ liệu đề thi thành công!', 'success');
            return true;
        } catch (err) {
            console.error('Error importing test sections:', err);
            showToast('Lỗi khi cập nhật dữ liệu đề thi: ' + err.message, 'error');
            throw err;
        }
    };

    const handleStartPrint = async (test) => {
        if (!test) return;
        if (test.isPremium && !hasPremiumAccess) {
            setShowPremiumModal(true);
            return;
        }
        let fullTest = test;
        if (!fullTest?.sections || fullTest.sections.length === 0) {
            fullTest = (await ensureFullTestLoaded(test?.id, test?.level)) || test;
        }
        setPrintingTest(fullTest);
    };

    const handleSaveFullTest = async (updatedTest) => {
        if (!canEdit || !updatedTest?.id) return false;
        try {
            const totalQ = (updatedTest.sections || []).reduce((sum, sec) => (
                sum + (sec.questions || []).reduce((qs, q) => qs + (q.subQuestions?.length || 1), 0)
            ), 0);
            const cleanPayload = sanitizeDataForFirestore({
                ...updatedTest,
                questionCount: totalQ,
                hasListening: testHasListening(updatedTest),
                updatedAt: Date.now()
            });
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, updatedTest.id);
            await setDoc(testRef, cleanPayload, { merge: true });
            updateSingleJLPTTestInCache(updatedTest.id, cleanPayload);
            setTests((prev) => prev.map((t) => (t.id === updatedTest.id ? { ...t, ...cleanPayload } : t)));
            setActiveTest((prev) => (prev?.id === updatedTest.id ? { ...prev, ...cleanPayload } : prev));
            setPendingStartTest((prev) => (prev?.id === updatedTest.id ? { ...prev, ...cleanPayload } : prev));
            showToast('Đã lưu thay đổi đề thi thành công!', 'success');
            return true;
        } catch (err) {
            console.error('Error saving full test:', err);
            showToast('Lỗi khi lưu đề thi: ' + err.message, 'error');
            return false;
        }
    };

    const handleConfirmDeleteTest = async () => {
        if (!canEdit || !confirmDeleteTest?.id || deletingTest) return;
        setDeletingTest(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/jlptTests`, confirmDeleteTest.id));
            removeSingleJLPTTestFromCache(confirmDeleteTest.id);
            setTests((prev) => prev.filter((t) => t.id !== confirmDeleteTest.id));
            if (activeTest?.id === confirmDeleteTest.id) exitTest();
            if (pendingStartTest?.id === confirmDeleteTest.id) setPendingStartTest(null);
            if (editingFullTest?.id === confirmDeleteTest.id) setEditingFullTest(null);
            showToast(`Đã xóa đề thi "${confirmDeleteTest.title}"!`, 'success');
            setConfirmDeleteTest(null);
        } catch (err) {
            console.error('Error deleting JLPT test:', err);
            showToast('Lỗi khi xóa đề thi: ' + err.message, 'error');
        } finally {
            setDeletingTest(false);
        }
    };

    const renderQuickEditModal = () => (
        <>
            {canEdit && editingFullTest && (
                <JLPTQuickTestEditorModal
                    isOpen={!!editingFullTest}
                    onClose={() => setEditingFullTest(null)}
                    initialTest={editingFullTest}
                    onSaveTest={handleSaveFullTest}
                    onDeleteTest={setConfirmDeleteTest}
                />
            )}
            {canEdit && confirmDeleteTest && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Xác nhận xóa đề thi</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Đề thi <strong className="text-slate-800 dark:text-slate-200">{confirmDeleteTest.title}</strong> sẽ bị xóa khỏi Firestore và danh sách hiển thị.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                disabled={deletingTest}
                                onClick={() => setConfirmDeleteTest(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={deletingTest}
                                onClick={handleConfirmDeleteTest}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                {deletingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span>{deletingTest ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    const furiganaStyles = useMemo(() => {
        let styles = '';
        if (!showFurigana) {
            styles += `.font-japanese rt { display: none !important; }`;
        } else {
            const colors = { red: '#EF4444', blue: '#3B82F6', green: '#10B981', sky: '#0EA5E9', orange: '#F59E0B' };
            const activeColor = colors[furiganaColor];
            if (activeColor) {
                styles += `.font-japanese rt { color: ${activeColor} !important; }`;
            }
        }
        return styles;
    }, [showFurigana, furiganaColor]);

    const furiganaStyleElement = useMemo(() => <style>{furiganaStyles}</style>, [furiganaStyles]);

    if (loading) {
        return <LoadingIndicator text="Đang tải đề thi..." />;
    }

    // Render Mode Selection Modal (Practice vs Real Exam)
    const renderModeSelectionModal = () => {
        if (!pendingStartTest) return null;
        const testId = pendingStartTest.id || pendingStartTest._id;
        const savedProgress = savedProgresses[testId] || savedProgresses[String(testId)];
        const hasSavedAnswers = !!(savedProgress && savedProgress.answers && Object.keys(savedProgress.answers).length > 0);
        const hasFullSections = Array.isArray(pendingStartTest.sections) && pendingStartTest.sections.length > 0;
        let totalQ = 0;
        if (hasFullSections) {
            pendingStartTest.sections.forEach(sec => {
                if (sec.questions) {
                    sec.questions.forEach(q => {
                        if (q.subQuestions && q.subQuestions.length > 0) totalQ += q.subQuestions.length;
                        else totalQ++;
                    });
                }
            });
        }
        const displayTotalQ = totalQ || pendingStartTest.questionCount || 0;
        const answeredSaved = hasSavedAnswers ? Object.keys(savedProgress.answers).length : 0;

        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-sky-50/50 dark:from-slate-800 dark:to-slate-800">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">Cấu hình bài thi</span>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1 leading-snug">{pendingStartTest.title}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = pendingStartTest;
                                        setPendingStartTest(null);
                                        setEditingFullTest(t);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1 cursor-pointer transition"
                                    title="Sửa trực tiếp đề thi này"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa đề</span>
                                </button>
                            )}
                            <button onClick={() => setPendingStartTest(null)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {(loadingTestDetails || !hasFullSections) && (
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-bold">
                                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-sky-500" />
                                <span>Đang nạp nội dung câu hỏi đề thi...</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vui lòng chọn chế độ làm bài thi phù hợp với nhu cầu của bạn:</p>
                        <div className="grid grid-cols-1 gap-4">
                            {hasSavedAnswers && (
                                <div 
                                    onClick={() => initTest(pendingStartTest, 'practice', true)}
                                    className="group border-2 border-emerald-500 dark:border-emerald-500 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md bg-emerald-50/10 dark:bg-emerald-950/10 flex items-start gap-3.5"
                                >
                                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <Play className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                                            Tiếp tục làm bài <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-600 text-white rounded">Tiến trình</span>
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            Đã làm: <strong className="text-emerald-600 dark:text-emerald-400">{answeredSaved}/{displayTotalQ}</strong> câu.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div 
                                onClick={() => {
                                    if (hasSavedAnswers) {
                                        const newProgresses = { ...savedProgresses };
                                        delete newProgresses[testId];
                                        delete newProgresses[String(testId)];
                                        setSavedProgresses(newProgresses);
                                        try {
                                            localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(newProgresses));
                                        } catch (e) {}
                                        saveProgressesToFirestore(newProgresses);
                                    }
                                    initTest(pendingStartTest, 'practice', false);
                                }}
                                className="group border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                                        {hasSavedAnswers ? 'Bắt đầu Luyện tập mới' : 'Chế độ Luyện tập'}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Làm bài thoải mái. Hỗ trợ dịch thuật AI và tra từ vựng trực tiếp.
                                    </p>
                                </div>
                            </div>

                            <div 
                                onClick={() => {
                                    initTest(pendingStartTest, 'real', false);
                                }}
                                className="group border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Chế độ Thi thực tế (Chuẩn giờ JLPT)</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Chia đồng hồ riêng từng phần đúng quy chế JLPT (phần Nghe tính giờ độc lập). Bắt buộc Full màn hình.
                                    </p>
                                    {hasFullSections && (() => {
                                        const previewPhases = buildJlptExamPhases(pendingStartTest);
                                        if (!previewPhases.length) return null;
                                        return (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {previewPhases.map((ph, idx) => (
                                                    <span key={ph.id} className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                                                        {idx + 1}. {ph.isListening ? 'Nghe hiểu' : ph.label}: {ph.minutes}p
                                                    </span>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Print Modal Helper
    const renderPrintElements = () => {
        return (
            <>
                {/* Print Options Modal */}
                {printingTest && (
                    <div className="no-print fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <Printer className="w-6 h-6" />
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                        {isPrintTriggered ? 'Đã kích hoạt lệnh In' : 'In Đề Thi & Tải PDF'}
                                    </h3>
                                </div>
                                <button
                                    onClick={handleClosePrint}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Đề thi đã chọn</p>
                                    <p className="text-base font-black text-slate-800 dark:text-white">{printingTest.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-semibold">
                                        <span>Cấp độ {printingTest.level || 'JLPT'}</span>
                                        <span>•</span>
                                        <span>{printingTest.sections?.length || 0} phần thi</span>
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={includeAnswers}
                                            onChange={(e) => setIncludeAnswers(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            Kèm theo Bảng Đáp Án Chi Tiết ở trang cuối
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={includeAnswerSheet}
                                            onChange={(e) => setIncludeAnswerSheet(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            Kèm theo Phiếu Tô Đáp Án (OMR Answer Sheet)
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <button
                                    onClick={handleClosePrint}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    {isPrintTriggered ? 'Đóng cửa sổ' : 'Hủy'}
                                </button>
                                <button
                                    onClick={() => {
                                        if (isPrintTriggered) {
                                            window.print();
                                        } else {
                                            setIsPrintTriggered(true);
                                        }
                                    }}
                                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{isPrintTriggered ? 'Gửi lại lệnh In' : 'In / Xuất File PDF Ngay'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print View Layout */}
                {printingTest && isPrintTriggered && (
                    <PrintPortal>
                        <div className="print-container-wrapper">
                            <PrintErrorBoundary>
                                <JLPTPrintView 
                                    test={printingTest} 
                                    includeAnswers={includeAnswers} 
                                    includeAnswerSheet={includeAnswerSheet} 
                                />
                            </PrintErrorBoundary>
                        </div>
                    </PrintPortal>
                )}
            </>
        );
    };

    // Show Result View
    if (showResult && activeTest) {
        const results = getResults();
        const passed = results?.jlptScore ? results.jlptScore.passed : results.percentage >= 60;
        return (
            <>
                <JLPTTestResultView
                    activeTest={activeTest}
                    showDetailedReview={showDetailedReview}
                    setShowDetailedReview={setShowDetailedReview}
                    currentSectionIdx={currentSectionIdx}
                    currentQuestionIdx={currentQuestionIdx}
                    answers={answers}
                    results={results}
                    passed={passed}
                    wasRealExam={wasRealExam}
                    timeTaken={timeTaken}
                    formatTime={formatTime}
                    exitTest={exitTest}
                    startTest={retakeTest}
                    retakeTest={retakeTest}
                    goToQuestion={goToQuestion}
                    nextQuestion={nextQuestion}
                    prevQuestion={prevQuestion}
                    canEdit={canEdit}
                    handleToggleTestFixed={handleToggleTestFixed}
                    showSettingsMenu={showSettingsMenu}
                    setShowSettingsMenu={setShowSettingsMenu}
                    settingsMenuRef={settingsMenuRef}
                    showFurigana={showFurigana}
                    setShowFurigana={setShowFurigana}
                    furiganaColor={furiganaColor}
                    setFuriganaColor={setFuriganaColor}
                    furiganaStyleElement={furiganaStyleElement}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    containerRef={containerRef}
                    notes={notes}
                    editingReviewNoteKey={editingReviewNoteKey}
                    setEditingReviewNoteKey={setEditingReviewNoteKey}
                    reviewNoteDraft={reviewNoteDraft}
                    setReviewNoteDraft={setReviewNoteDraft}
                    reviewNoteTab={reviewNoteTab}
                    setReviewNoteTab={setReviewNoteTab}
                    reviewDrawDraftStrokes={reviewDrawDraftStrokes}
                    setReviewDrawDraftStrokes={setReviewDrawDraftStrokes}
                    reviewDrawDraftDataUrl={reviewDrawDraftDataUrl}
                    setReviewDrawDraftDataUrl={setReviewDrawDraftDataUrl}
                    saveNotesMultiple={saveNotesMultiple}
                    deleteNotesMultiple={deleteNotesMultiple}
                    editingQuestionData={editingQuestionData}
                    setEditingQuestionData={setEditingQuestionData}
                    handleSaveQuestionHtml={handleSaveQuestionHtml}
                    onOpenExportImport={() => setShowExportImportModal(true)}
                    onEditTest={canEdit ? setEditingFullTest : null}
                    onSaveQuestionImage={canEdit ? handleSaveQuestionImage : null}
                />
                {renderModeSelectionModal()}
                {renderQuickEditModal()}
                <PremiumLockedModal 
                    isOpen={showPremiumModal} 
                    onClose={() => setShowPremiumModal(false)} 
                    pkgName={lockedPkgName} 
                />
                {renderPrintElements()}
                {canEdit && (
                    <JLPTQuestionSearchModal
                        isOpen={showQuestionSearchModal}
                        onClose={() => setShowQuestionSearchModal(false)}
                        tests={tests}
                        onSaveQuestion={handleSaveSearchedQuestion}
                        onSelectTest={handleSelectTestFromSearch}
                    />
                )}
                {canEdit && showExportImportModal && activeTest && (
                    <JLPTExportImportModal
                        isOpen={showExportImportModal}
                        onClose={() => setShowExportImportModal(false)}
                        test={activeTest}
                        activeSectionIdx={0}
                        onSaveSections={handleImportTestSections}
                        showToast={showToast}
                    />
                )}
            </>
        );
    }

    // Show Active Taking View
    if (activeTest) {
        const section = activeTest.sections[currentSectionIdx];
        let totalQ = 0;
        let answeredCount = 0;
        activeTest.sections.forEach((sec, si) => {
            sec.questions.forEach((q, qi) => {
                if (q.subQuestions && q.subQuestions.length > 0) {
                    q.subQuestions.forEach((_, sqi) => {
                        totalQ++;
                        if (answers[subAnswerKey(si, qi, sqi)] !== undefined) answeredCount++;
                    });
                } else {
                    totalQ++;
                    if (answers[answerKey(si, qi)] !== undefined) answeredCount++;
                }
            });
        });

        const globalIdx = activeTest.sections.slice(0, currentSectionIdx).reduce((s, sec) => s + sec.questions.length, 0) + currentQuestionIdx;
        const isLast = currentSectionIdx === activeTest.sections.length - 1 && currentQuestionIdx === section.questions.length - 1;
        const isFirst = currentSectionIdx === 0 && currentQuestionIdx === 0;

        return (
            <>
                <JLPTTestTakeView
                    activeTest={activeTest}
                    currentSectionIdx={currentSectionIdx}
                    currentQuestionIdx={currentQuestionIdx}
                    answers={answers}
                    selectAnswer={selectAnswer}
                    selectAnswerSub={selectAnswerSub}
                    audioRef={audioRef}
                    isRealExam={isRealExam}
                    canEdit={canEdit}
                    onEditQuestion={(q, sIdx, qIdx, targetTab) => setEditingQuestionData({ question: targetTab ? { ...q, _targetTab: targetTab } : q, sectionIdx: sIdx, questionIdx: qIdx })}
                    setShowQuestionSearchModal={setShowQuestionSearchModal}
                    submitTest={submitTest}
                    exitTest={exitTest}
                    saveProgressAndExit={saveProgressAndExit}
                    goToQuestion={goToQuestion}
                    nextQuestion={nextQuestion}
                    prevQuestion={prevQuestion}
                    isFirst={isFirst}
                    isLast={isLast}
                    answeredCount={answeredCount}
                    totalQ={totalQ}
                    globalIdx={globalIdx}
                    timeRemaining={timeRemaining}
                    formatTime={formatTime}
                    showTimer={showTimer}
                    showFurigana={showFurigana}
                    setShowFurigana={setShowFurigana}
                    furiganaColor={furiganaColor}
                    setFuriganaColor={setFuriganaColor}
                    showSettingsMenu={showSettingsMenu}
                    setShowSettingsMenu={setShowSettingsMenu}
                    settingsMenuRef={settingsMenuRef}
                    furiganaStyleElement={furiganaStyleElement}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    containerRef={containerRef}
                    notes={notes}
                    isEditingNote={isEditingNote}
                    setIsEditingNote={setIsEditingNote}
                    noteDraft={noteDraft}
                    setNoteDraft={setNoteDraft}
                    noteTab={noteTab}
                    setNoteTab={setNoteTab}
                    drawDraftStrokes={drawDraftStrokes}
                    setDrawDraftStrokes={setDrawDraftStrokes}
                    drawDraftDataUrl={drawDraftDataUrl}
                    setDrawDraftDataUrl={setDrawDraftDataUrl}
                    saveNotesMultiple={saveNotesMultiple}
                    deleteNotesMultiple={deleteNotesMultiple}
                    showScratchpad={showScratchpad}
                    setShowScratchpad={setShowScratchpad}
                    editingQuestionData={editingQuestionData}
                    setEditingQuestionData={setEditingQuestionData}
                    handleSaveQuestionHtml={handleSaveQuestionHtml}
                    onSaveSections={canEdit ? handleSaveTestSections : null}
                    showViolationWarning={showViolationWarning}
                    setShowViolationWarning={setShowViolationWarning}
                    violationCount={violationCount}
                    showFullscreenRequired={showFullscreenRequired}
                    setShowFullscreenRequired={setShowFullscreenRequired}
                    pendingStartTest={pendingStartTest}
                    resumeTest={() => initTest(pendingStartTest, 'practice', true)}
                    startNewPracticeConfirm={() => {
                        if (pendingStartTest) {
                            const testId = pendingStartTest.id || pendingStartTest._id;
                            const newProgresses = { ...savedProgresses };
                            delete newProgresses[testId];
                            delete newProgresses[String(testId)];
                            setSavedProgresses(newProgresses);
                            try { localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(newProgresses)); } catch (e) {}
                            saveProgressesToFirestore(newProgresses);
                        }
                        initTest(pendingStartTest, 'practice', false);
                    }}
                    startRealExamConfirm={() => initTest(pendingStartTest, 'real', false)}
                    handleToggleTestFixed={handleToggleTestFixed}
                    handleStartPrint={() => handleStartPrint(activeTest)}
                    onOpenExportImport={() => setShowExportImportModal(true)}
                    onEditTest={canEdit ? setEditingFullTest : null}
                    setAnswers={setAnswers}
                    examPhases={examPhases}
                    currentPhaseIdx={currentPhaseIdx}
                    onAdvancePhase={handleAdvanceExamPhase}
                    onSaveQuestionImage={canEdit ? handleSaveQuestionImage : null}
                />
                {renderModeSelectionModal()}
                {renderQuickEditModal()}
                {renderPrintElements()}
                {canEdit && (
                    <JLPTQuestionSearchModal
                        isOpen={showQuestionSearchModal}
                        onClose={() => setShowQuestionSearchModal(false)}
                        tests={tests}
                        onSaveQuestion={handleSaveSearchedQuestion}
                        onSelectTest={handleSelectTestFromSearch}
                    />
                )}
                {canEdit && showExportImportModal && activeTest && (
                    <JLPTExportImportModal
                        isOpen={showExportImportModal}
                        onClose={() => setShowExportImportModal(false)}
                        test={activeTest}
                        activeSectionIdx={currentSectionIdx}
                        onSaveSections={handleImportTestSections}
                        showToast={showToast}
                    />
                )}
            </>
        );
    }

    // Main Test Dashboard View
    return (
        <>
            <JLPTTestDashboard
                tests={tests}
                completedTests={completedTests}
                savedProgresses={savedProgresses}
                targetLevel={targetLevel}
                handleUpdateTargetLevel={handleUpdateTargetLevel}
                activeMainTab={activeMainTab}
                setActiveMainTab={setActiveMainTab}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                roadmapProgress={roadmapProgress}
                toggleRoadmapDay={toggleRoadmapDay}
                allCards={allCards}
                canEdit={canEdit}
                hasPremiumAccess={hasPremiumAccess}
                startTest={startTest}
                reviewTest={reviewTest}
                handleStartPrint={handleStartPrint}
                handleToggleTestPremium={handleToggleTestPremium}
                handleToggleTestFixed={handleToggleTestFixed}
                setShowPremiumModal={setShowPremiumModal}
                setLockedPkgName={setLockedPkgName}
                notification={notification}
                wrongQuestions={wrongQuestions}
                onRemoveWrongQuestion={removeWrongQuestion}
                onClearAllWrongQuestions={clearAllWrongQuestions}
                onStartPracticeWrong={handleStartPracticeWrong}
                onOpenQuestionSearch={() => setShowQuestionSearchModal(true)}
                onEditTest={canEdit ? setEditingFullTest : null}
                onDeleteTest={canEdit ? setConfirmDeleteTest : null}
            />
            {renderModeSelectionModal()}
            {renderQuickEditModal()}
            {loadingTestDetails && !pendingStartTest && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl px-6 py-4 shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                        <span className="text-sm font-bold text-slate-800 dark:text-white">Đang nạp nội dung đề thi...</span>
                    </div>
                </div>
            )}
            <PremiumLockedModal 
                isOpen={showPremiumModal} 
                onClose={() => setShowPremiumModal(false)} 
                pkgName={lockedPkgName} 
            />
            {renderPrintElements()}
            {canEdit && (
                <JLPTQuestionSearchModal
                    isOpen={showQuestionSearchModal}
                    onClose={() => setShowQuestionSearchModal(false)}
                    tests={tests}
                    onSaveQuestion={handleSaveSearchedQuestion}
                    onSelectTest={handleSelectTestFromSearch}
                />
            )}
        </>
    );
};

export default JLPTTestScreen;
