import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { PremiumLockedModal } from '../ui';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { playCompletionFanfare } from '../../utils/soundEffects';

import { useJLPTTestData } from '../../hooks/useJLPTTestData';
import PrintErrorBoundary from '../jlptTest/PrintErrorBoundary';
import JLPTPrintView from '../jlptTest/JLPTPrintView';
import PrintPortal from '../jlptTest/PrintPortal';
import QuestionEditModal from '../jlptTest/QuestionEditModal';
import JLPTTestTakeView from '../jlptTest/JLPTTestTakeView';
import JLPTTestResultView from '../jlptTest/JLPTTestResultView';
import JLPTTestDashboard from '../jlptTest/JLPTTestDashboard';
import { X, Play, BookOpen, Lock, ChevronRight, FileText, Printer, Check } from 'lucide-react';

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

    // Admin Edit HTML states
    const [editingQuestionData, setEditingQuestionData] = useState(null);
    const [savingHtml, setSavingHtml] = useState(false);

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

    // Settings for furigana and timer
    const [showFurigana, setShowFurigana] = useState(() => localStorage.getItem('quizki_jlpt_show_furigana') !== 'false');
    const [showTimer, setShowTimer] = useState(() => localStorage.getItem('quizki_jlpt_show_timer') !== 'false');
    const [furiganaColor, setFuriganaColor] = useState(() => localStorage.getItem('quizki_jlpt_furigana_color') || 'default');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const settingsMenuRef = useRef(null);

    // Timer
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [testStartTime, setTestStartTime] = useState(null);
    const [timeTaken, setTimeTaken] = useState(0);
    const [wasRealExam, setWasRealExam] = useState(false);
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const containerRef = useRef(null);

    // Premium Lock State
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [lockedPkgName, setLockedPkgName] = useState('');
    const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
    const hasPremiumAccess = isAdmin || userIsAdmin || profile?.isPremiumUnlocked || (profile?.unlockedSpecializedPackages || []).includes('jlpt_prep');
    const canEdit = isAdmin || userIsAdmin;

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

    // Timer countdown
    useEffect(() => {
        if (timerActive && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setTimerActive(false);
                        setShowResult(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [timerActive]);

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
    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    const selectAnswer = useCallback((si, qi, optIdx) => {
        if (showResult) return;
        setAnswers(prev => ({ ...prev, [answerKey(si, qi)]: optIdx }));
    }, [showResult]);

    const selectAnswerSub = useCallback((si, qi, sqi, optIdx) => {
        if (showResult) return;
        setAnswers(prev => ({ ...prev, [subAnswerKey(si, qi, sqi)]: optIdx }));
    }, [showResult]);

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
        return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0, sectionResults };
    };

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const startTest = async (test) => {
        let isPremium = test?.isPremium;
        if (isPremium && !hasPremiumAccess) {
            setLockedPkgName('jlpt_prep');
            setShowPremiumModal(true);
            return;
        }
        setPendingStartTest(test);
    };

    const initTest = (test, mode = 'practice') => {
        setPendingStartTest(null);
        setActiveTest(test);
        setIsRealExam(mode === 'real');
        setViolationCount(0);
        setShowViolationWarning(false);
        setShowFullscreenRequired(false);
        setCurrentSectionIdx(0);
        setCurrentQuestionIdx(0);
        setAnswers({});
        setShowResult(false);
        setTestStartTime(Date.now());
        setWasRealExam(mode === 'real');

        if (mode === 'real') {
            setTimeRemaining(test.timeLimit * 60);
            setTimerActive(true);
            sessionStorage.setItem('realExamModeActive', 'true');
            window.dispatchEvent(new Event('realExamModeChange'));
        } else {
            setTimeRemaining(0);
            setTimerActive(false);
            sessionStorage.removeItem('realExamModeActive');
            window.dispatchEvent(new Event('realExamModeChange'));
        }
    };

    const reviewTest = (test) => {
        if (test.isPremium && !hasPremiumAccess) {
            setLockedPkgName('jlpt_prep');
            setShowPremiumModal(true);
            return;
        }
        const saved = completedTests[test.id];
        if (saved) {
            setIsRealExam(false);
            setWasRealExam(saved.wasRealExam !== undefined ? saved.wasRealExam : true);
            setTimeTaken(saved.timeTaken || 0);
            setActiveTest(test);
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
            ? (activeTest.timeLimit * 60) - timeRemaining 
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

        setShowResult(true);
        setShowDetailedReview(false);
        playCompletionFanfare();

        if (awardXP && results) {
            const testXp = ((results.correct || 0) * 10) + 100;
            if (testXp > 0) awardXP(testXp);
        }
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
        const elapsed = Math.round((Date.now() - (testStartTime || Date.now())) / 1000);
        const progressData = {
            answers: answers,
            currentSectionIdx: currentSectionIdx,
            currentQuestionIdx: currentQuestionIdx,
            timeSpentSoFar: elapsed,
            date: new Date().toISOString()
        };
        const newProgresses = { ...savedProgresses, [activeTest.id]: progressData };
        setSavedProgresses(newProgresses);
        localStorage.setItem('quizki_jlpt_saved_progresses', JSON.stringify(newProgresses));
        saveProgressesToFirestore(newProgresses);
        setNotification("Đã lưu tiến trình làm bài!");
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
            await updateDoc(testRef, { sections: updatedSections });

            setActiveTest(prev => ({ ...prev, sections: updatedSections }));
            setTests(prevTests => prevTests.map(t => t.id === activeTest.id ? { ...t, sections: updatedSections } : t));
            setEditingQuestionData(null);
            setNotification('Đã lưu thay đổi HTML câu hỏi thành công!');
        } catch (err) {
            console.error('Error updating question HTML:', err);
            alert('Lỗi khi lưu HTML câu hỏi: ' + err.message);
        } finally {
            setSavingHtml(false);
        }
    };

    const handleToggleTestPremium = async (e, test) => {
        if (e) e.stopPropagation();
        if (!canEdit) return;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, test.id);
            const nextVal = !test.isPremium;
            await setDoc(testRef, { isPremium: nextVal }, { merge: true });
            setNotification(`Đã chuyển đề thi sang: ${nextVal ? 'Premium' : 'Miễn phí'}`);
            setTests(prevTests => {
                const updated = prevTests.map(t => t.id === test.id ? { ...t, isPremium: nextVal } : t);
                try { localStorage.setItem('quizki_cached_jlpt_tests', JSON.stringify(updated)); } catch (e) {}
                return updated;
            });
        } catch (err) { setNotification('Lỗi: ' + err.message); }
    };

    const handleToggleTestFixed = async (e, test) => {
        if (e) e.stopPropagation();
        if (!canEdit) return;
        try {
            const testRef = doc(db, `artifacts/${appId}/jlptTests`, test.id);
            const nextVal = !test.isFixed;
            await updateDoc(testRef, { isFixed: nextVal });
            setNotification(`Đã đánh dấu đề thi: ${nextVal ? 'Đã sửa' : 'Chưa sửa'}`);
            setTests(prevTests => prevTests.map(t => t.id === test.id ? { ...t, isFixed: nextVal } : t));
            if (activeTest && activeTest.id === test.id) {
                setActiveTest(prev => ({ ...prev, isFixed: nextVal }));
            }
        } catch (err) { setNotification('Lỗi: ' + err.message); }
    };

    const handleStartPrint = (test) => {
        if (!test) return;
        if (test.isPremium && !hasPremiumAccess) {
            setShowPremiumModal(true);
            return;
        }
        setPrintingTest(test);
    };

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
        const savedProgress = savedProgresses[pendingStartTest.id];
        let totalQ = 0;
        if (pendingStartTest.sections) {
            pendingStartTest.sections.forEach(sec => {
                if (sec.questions) {
                    sec.questions.forEach(q => {
                        if (q.subQuestions && q.subQuestions.length > 0) totalQ += q.subQuestions.length;
                        else totalQ++;
                    });
                }
            });
        }
        const answeredSaved = savedProgress ? Object.keys(savedProgress.answers || {}).length : 0;

        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-sky-50/50 dark:from-slate-800 dark:to-slate-800">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-0.5 rounded-md">Cấu hình bài thi</span>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1 leading-snug">{pendingStartTest.title}</h3>
                        </div>
                        <button onClick={() => setPendingStartTest(null)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vui lòng chọn chế độ làm bài thi phù hợp với nhu cầu của bạn:</p>
                        <div className="grid grid-cols-1 gap-4">
                            {savedProgress && (
                                <div 
                                    onClick={() => initTest(pendingStartTest, 'practice')}
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
                                            Đã làm: <strong className="text-emerald-600 dark:text-emerald-400">{answeredSaved}/{totalQ}</strong> câu.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div 
                                onClick={() => initTest(pendingStartTest, 'practice')}
                                className="group border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                                        {savedProgress ? 'Bắt đầu Luyện tập mới' : 'Chế độ Luyện tập'}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Làm bài thoải mái. Hỗ trợ dịch thuật AI và tra từ vựng trực tiếp.
                                    </p>
                                </div>
                            </div>

                            <div 
                                onClick={() => initTest(pendingStartTest, 'real')}
                                className="group border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5"
                            >
                                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Chế độ Thi thực tế</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Giả lập phòng thi thật. Bắt buộc Full màn hình. Tự động nộp bài nếu vi phạm 3 lần.</p>
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
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
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
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
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
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
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
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
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
        const passed = results.percentage >= 60;
        return (
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
                startTest={startTest}
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
            />
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
                    onEditQuestion={(q, sIdx, qIdx) => setEditingQuestionData({ question: q, sectionIdx: sIdx, questionIdx: qIdx })}
                    submitTest={submitTest}
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
                    showViolationWarning={showViolationWarning}
                    setShowViolationWarning={setShowViolationWarning}
                    violationCount={violationCount}
                    showFullscreenRequired={showFullscreenRequired}
                    setShowFullscreenRequired={setShowFullscreenRequired}
                    pendingStartTest={pendingStartTest}
                    setPendingStartTest={setPendingStartTest}
                    savedProgresses={savedProgresses}
                    resumeTest={() => initTest(pendingStartTest, 'practice')}
                    startNewPracticeConfirm={() => initTest(pendingStartTest, 'practice')}
                    startRealExamConfirm={() => initTest(pendingStartTest, 'real')}
                    handleToggleTestFixed={handleToggleTestFixed}
                />
                {renderModeSelectionModal()}
                {renderPrintElements()}
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
            />
            {renderModeSelectionModal()}
            <PremiumLockedModal 
                isOpen={showPremiumModal} 
                onClose={() => setShowPremiumModal(false)} 
                pkgName={lockedPkgName} 
            />
            {renderPrintElements()}
        </>
    );
};

export default JLPTTestScreen;
