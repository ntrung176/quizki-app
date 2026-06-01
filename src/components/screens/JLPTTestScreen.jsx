import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import {
    FileCheck, Clock, Play, ChevronRight, ChevronLeft,
    Maximize, Minimize, X, Check, CheckCircle, XCircle,
    Home, Languages, BookOpen, FileText, Headphones,
    Loader2, Timer, Volume2, AlertTriangle, Award, Lock, Calendar, Edit3
} from 'lucide-react';
import { ROUTES } from '../../router';

const SECTION_ICONS = {
    vocabulary: Languages, grammar: BookOpen, kanji: Award,
    reading: FileText, listening: Headphones,
};
const SECTION_COLORS = {
    vocabulary: 'blue', grammar: 'purple', kanji: 'teal',
    reading: 'green', listening: 'orange',
};
const LEVEL_GRADIENTS = {
    N5: 'from-emerald-500 to-teal-600',
    N4: 'from-teal-500 to-cyan-600',
    N3: 'from-blue-500 to-indigo-600',
    N2: 'from-violet-500 to-purple-600',
    N1: 'from-rose-500 to-red-600',
};

const JLPTTestScreen = ({ isAdmin, allCards = [], profile = {} }) => {
    const navigate = useNavigate();
    
    // State
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('N2'); // Set default level filter to N2 matching user's request/screenshot
    const [completedTests, setCompletedTests] = useState({});
    const [notification, setNotification] = useState(null);
    const [selectedSkillPractice, setSelectedSkillPractice] = useState(null); // { type, label, tests }
    const [selectedFullExamLevel, setSelectedFullExamLevel] = useState(null); // 'N5', 'N4', 'N3', 'N2', 'N1'
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    // Test taking state
    const [activeTest, setActiveTest] = useState(null);
    const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { "s0_q0": 2 }
    const [showResult, setShowResult] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Timer
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const timerRef = useRef(null);

    // Audio
    const audioRef = useRef(null);

    const testsPath = `artifacts/${appId}/jlptTests`;

    // Load tests and completed status
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, testsPath), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [testsPath]);

    useEffect(() => {
        const saved = localStorage.getItem('quizki_completed_tests');
        if (saved) {
            try {
                setCompletedTests(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing completed tests:', e);
            }
        }
    }, []);

    // Notification auto-dismiss
    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(t);
        }
    }, [notification]);

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

    // Fullscreen API
    const containerRef = useRef(null);
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await containerRef.current?.requestFullscreen?.();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen?.();
                setIsFullscreen(false);
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Start test
    const startTest = (test) => {
        setActiveTest(test);
        setCurrentSectionIdx(0);
        setCurrentQuestionIdx(0);
        setAnswers({});
        setShowResult(false);
        setTimeRemaining(test.timeLimit * 60);
        setTimerActive(true);
    };

    // Review completed test
    const reviewTest = (test) => {
        const saved = completedTests[test.id];
        if (saved) {
            setActiveTest(test);
            setAnswers(saved.answers || {});
            setShowResult(true);
        }
    };

    // Submit test
    const submitTest = () => {
        setTimerActive(false);
        clearInterval(timerRef.current);
        
        const results = getResults();
        const newCompleted = {
            ...completedTests,
            [activeTest.id]: {
                percentage: results.percentage,
                correct: results.correct,
                total: results.total,
                answers: answers,
                date: new Date().toISOString()
            }
        };
        setCompletedTests(newCompleted);
        localStorage.setItem('quizki_completed_tests', JSON.stringify(newCompleted));
        
        setShowResult(true);
    };

    // Exit test
    const exitTest = () => {
        setTimerActive(false);
        clearInterval(timerRef.current);
        setActiveTest(null);
        setShowResult(false);
        setAnswers({});
        if (document.fullscreenElement) document.exitFullscreen?.();
    };

    // Answer handling
    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const selectAnswer = (si, qi, optIdx) => {
        if (showResult) return;
        setAnswers(prev => ({ ...prev, [answerKey(si, qi)]: optIdx }));
    };

    // Navigation
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
            sec.questions.forEach((q, qi) => {
                total++;
                const userAns = answers[answerKey(si, qi)];
                if (userAns === q.correctAnswer) { correct++; secCorrect++; }
            });
            return { ...sec, correct: secCorrect, total: sec.questions.length };
        });
        return { correct, total, percentage: Math.round((correct / total) * 100), sectionResults };
    };

    // Format time
    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    // Filter tests
    const filteredTests = (selectedLevel === 'all' ? tests : tests.filter(t => t.level === selectedLevel))
        .filter(t => !t.isSkillTest);

    const getSkillProgress = (skillType) => {
        const skillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && t.level === selectedLevel);
        if (skillTests.length === 0) return 0;
        const completedCount = skillTests.filter(t => !!completedTests[t.id]).length;
        return Math.round((completedCount / skillTests.length) * 100);
    };

    const handleStartPractice = (skillType, skillLabel) => {
        const matchingTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && t.level === selectedLevel);
        setSelectedSkillPractice({ type: skillType, label: skillLabel, tests: matchingTests });
    };

    // Render: Loading
    if (loading) {
        return <LoadingIndicator text="Đang tải đề thi..." />;
    }

    // ======================== RESULT SCREEN ========================
    if (showResult && activeTest) {
        const results = getResults();
        const passed = results.percentage >= 60;

        return (
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Score card */}
                    <div className={`bg-gradient-to-r ${passed ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-red-600'} rounded-3xl p-8 text-white text-center shadow-xl`}>
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                            {passed ? <Award className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{passed ? '🎉 Chúc mừng!' : '💪 Cố gắng thêm!'}</h2>
                        <div className="text-6xl font-black my-4">{results.percentage}%</div>
                        <p className="text-xl opacity-90">{results.correct}/{results.total} câu đúng</p>
                        <p className="text-sm opacity-75 mt-2">
                            Thời gian: {formatTime((activeTest.timeLimit * 60) - timeRemaining)} / {activeTest.timeLimit} phút
                        </p>
                    </div>

                    {/* Section scores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.sectionResults.map((sec, si) => {
                            const Icon = SECTION_ICONS[sec.type] || FileText;
                            const pct = Math.round((sec.correct / sec.total) * 100);
                            return (
                                <div key={si} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon className="w-5 h-5 text-indigo-500" />
                                        <span className="font-bold text-gray-800 dark:text-white">{sec.title}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                            <div className={`h-3 rounded-full transition-all ${pct >= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sec.correct}/{sec.total}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed review */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">📝 Chi tiết câu trả lời</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {activeTest.sections.map((sec, si) => (
                                <div key={si}>
                                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50">
                                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{sec.title}</span>
                                    </div>
                                    {sec.questions.map((q, qi) => {
                                        const userAns = answers[answerKey(si, qi)];
                                        const isCorrect = userAns === q.correctAnswer;
                                        return (
                                            <div key={qi} className={`p-4 ${isCorrect ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                                                <div className="flex items-start gap-2 mb-2">
                                                    {isCorrect
                                                        ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                        : <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                                                    <div className="flex-1 space-y-2">
                                                        {q.passage && (
                                                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-japanese leading-relaxed max-h-40 overflow-y-auto mb-2" dangerouslySetInnerHTML={{ __html: q.passage }} />
                                                        )}
                                                        {q.audioUrl && (
                                                            <div className="mb-2">
                                                                <audio src={q.audioUrl} controls className="h-7 max-w-full text-xs" />
                                                            </div>
                                                        )}
                                                        {q.imageUrl && (
                                                            <div className="mb-2 max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-1">
                                                                <img src={q.imageUrl} alt="Câu hỏi" className="max-h-48 object-contain" />
                                                            </div>
                                                        )}
                                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm font-japanese" dangerouslySetInnerHTML={{ __html: q.question }} />
                                                        {userAns !== undefined && (
                                                            <p className="text-xs mt-1">
                                                                <span className="text-gray-500">Bạn chọn: </span>
                                                                <span className={isCorrect ? 'text-green-600 font-bold font-japanese' : 'text-red-600 font-bold line-through font-japanese'}>
                                                                    {q.options[userAns]}
                                                                </span>
                                                            </p>
                                                        )}
                                                        {!isCorrect && (
                                                            <p className="text-xs mt-1">
                                                                <span className="text-gray-500">Đáp án: </span>
                                                                <span className="text-green-600 font-bold font-japanese">{q.options[q.correctAnswer]}</span>
                                                            </p>
                                                        )}
                                                        {q.explanation && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">💡 {q.explanation}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={() => startTest(activeTest)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                            Làm lại
                        </button>
                        <button onClick={exitTest} className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
                            Quay lại danh sách
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ======================== TEST TAKING SCREEN ========================
    if (activeTest && !showResult) {
        const section = activeTest.sections[currentSectionIdx];
        const question = section?.questions?.[currentQuestionIdx];
        const Icon = SECTION_ICONS[section?.type] || FileText;
        const totalQ = activeTest.sections.reduce((s, sec) => s + sec.questions.length, 0);
        const answeredCount = Object.keys(answers).length;
        const globalIdx = activeTest.sections.slice(0, currentSectionIdx).reduce((s, sec) => s + sec.questions.length, 0) + currentQuestionIdx;
        const isLast = currentSectionIdx === activeTest.sections.length - 1 && currentQuestionIdx === section.questions.length - 1;
        const isFirst = currentSectionIdx === 0 && currentQuestionIdx === 0;
        const timeWarning = timeRemaining < 300;

        return (
            <div ref={containerRef} className={`min-h-screen flex flex-col ${isFullscreen ? 'bg-white dark:bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20'}`}>
                {/* Top bar */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={exitTest} className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                                <X className="w-5 h-5" />
                            </button>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{activeTest.title}</p>
                                <p className="text-xs text-gray-500">{section.title}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Timer */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${timeWarning
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}>
                                <Timer className="w-4 h-4" />
                                {formatTime(timeRemaining)}
                            </div>

                            {/* Progress */}
                            <span className="text-xs text-gray-500 hidden md:inline">{answeredCount}/{totalQ} đã trả lời</span>

                            {/* Fullscreen */}
                            <button onClick={toggleFullscreen}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex">
                    {/* Sidebar - question navigator */}
                    <div className="hidden md:block w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
                        {activeTest.sections.map((sec, si) => {
                            const SIcon = SECTION_ICONS[sec.type] || FileText;
                            return (
                                <div key={si}>
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                        <SIcon className="w-3.5 h-3.5" /> {sec.title}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 p-2">
                                        {sec.questions.map((_, qi) => {
                                            const key = answerKey(si, qi);
                                            const isActive = si === currentSectionIdx && qi === currentQuestionIdx;
                                            const isAnswered = answers[key] !== undefined;
                                            return (
                                                <button key={qi} onClick={() => goToQuestion(si, qi)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${isActive
                                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                                                        : isAnswered
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                                        }`}>
                                                    {qi + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Submit button in sidebar */}
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={submitTest}
                                className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">
                                Nộp bài ({answeredCount}/{totalQ})
                            </button>
                        </div>
                    </div>

                    {/* Main question area */}
                    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                            {/* Question number */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold bg-${SECTION_COLORS[section.type]}-100 dark:bg-${SECTION_COLORS[section.type]}-900/30 text-${SECTION_COLORS[section.type]}-700 dark:text-${SECTION_COLORS[section.type]}-400`}>
                                    {section.title}
                                </span>
                                <span className="text-sm text-gray-500">Câu {currentQuestionIdx + 1}/{section.questions.length}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
                                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${((globalIdx + 1) / totalQ) * 100}%` }} />
                            </div>

                            {/* Audio player for listening */}
                            {section.type === 'listening' && question?.audioUrl && (
                                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Volume2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        <audio ref={audioRef} controls className="flex-1 h-10"
                                            src={question.audioUrl} preload="auto">
                                            Trình duyệt không hỗ trợ audio.
                                        </audio>
                                    </div>
                                </div>
                            )}

                            {/* Reading passage */}
                            {section.type === 'reading' && question?.passage && (
                                <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-xl">
                                    <div className="text-gray-800 dark:text-gray-200 leading-relaxed font-japanese" dangerouslySetInnerHTML={{ __html: question.passage }} />
                                </div>
                            )}

                            {/* Question Image */}
                            {question?.imageUrl && (
                                <div className="mb-6 max-w-2xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-2 flex justify-center">
                                    <img src={question.imageUrl} alt="Câu hỏi" className="max-h-96 object-contain" />
                                </div>
                            )}

                            {/* Question */}
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed font-japanese" dangerouslySetInnerHTML={{ __html: question?.question }} />

                            {/* Options */}
                            <div className="space-y-3 mb-8">
                                {question?.options?.map((opt, oi) => {
                                    const key = answerKey(currentSectionIdx, currentQuestionIdx);
                                    const isSelected = answers[key] === oi;
                                    return (
                                        <button key={oi} onClick={() => selectAnswer(currentSectionIdx, currentQuestionIdx, oi)}
                                            className={`w-full p-4 rounded-xl text-left font-medium transition-all border-2 ${isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                                                }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                    }`}>
                                                    {String.fromCharCode(65 + oi)}
                                                </div>
                                                <span className="font-japanese">{opt}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between">
                                <button onClick={prevQuestion} disabled={isFirst}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${isFirst
                                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}>
                                    <ChevronLeft className="w-4 h-4" /> Câu trước
                                </button>

                                {/* Mobile submit */}
                                <button onClick={submitTest}
                                    className="md:hidden px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">
                                    Nộp bài
                                </button>

                                {isLast ? (
                                    <button onClick={submitTest}
                                        className="flex items-center gap-1 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">
                                        Nộp bài <Check className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button onClick={nextQuestion}
                                        className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                                        Câu tiếp <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ======================== TEST LIST SCREEN ========================
    const jlptCountdown = (() => {
        const now = new Date();
        const julyExam = new Date(2026, 6, 5);
        const decExam = new Date(2026, 11, 6);
        let target = julyExam;
        if (now > julyExam) {
            target = decExam;
        }
        if (now > decExam) {
            target = new Date(2027, 6, 4);
        }
        const diffTime = target - now;
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        return diffDays;
    })();

    const countdownLevel = selectedLevel === 'all' ? 'N2' : selectedLevel;

    // Completed tests stats
    const completedCount = Object.keys(completedTests).length;
    let avgPercentage = 0;
    if (completedCount > 0) {
        const sum = Object.values(completedTests).reduce((s, item) => s + (item.percentage || 0), 0);
        avgPercentage = sum / completedCount;
    }
    const avgScore = completedCount > 0 ? Math.round((avgPercentage / 100) * 180) : 124;

    // Kanji known count
    const kanjiKnownCount = allCards && allCards.length > 0
        ? allCards.filter(c => c.front && c.front.length === 1 && /[\u4e00-\u9faf]/.test(c.front)).length
        : 850;



    const handleSeeAll = () => {
        setSelectedLevel('all');
        setNotification("Hiển thị tất cả các đề thi.");
    };

    const getTestStatus = (test) => {
        const completed = completedTests[test.id];
        if (completed) {
            return completed.percentage >= 60 ? 'completed' : 'retry';
        }
        // Check if there is an in-progress draft in localStorage
        const progress = localStorage.getItem(`quizki_progress_${test.id}`);
        if (progress) {
            return 'in_progress';
        }
        // If created in the last 14 days
        const createdAt = test.createdAt?.seconds ? new Date(test.createdAt.seconds * 1000) : new Date();
        const diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) {
            return 'new';
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

    const renderSkillPracticeScreen = () => {
        const skillType = selectedSkillPractice.type;
        const skillLabel = selectedSkillPractice.label;

        // Filter tests of this skill type
        const skillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && (selectedLevel === 'all' || t.level === selectedLevel));

        // Filter by Status
        const filteredSkillTests = skillTests.filter(test => {
            if (statusFilter === 'all') return true;
            const status = getTestStatus(test);
            return status === statusFilter;
        });

        // Sort
        const sortedSkillTests = [...filteredSkillTests].sort((a, b) => {
            if (sortBy === 'newest') {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            }
            if (sortBy === 'questions') {
                const countA = (a.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                const countB = (b.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                return countB - countA;
            }
            if (sortBy === 'time') {
                return (b.timeLimit || 0) - (a.timeLimit || 0);
            }
            return 0;
        });

        // Personal stats calculations
        const completedSkillTests = tests.filter(t => t.isSkillTest && t.skillType === skillType && !!completedTests[t.id]);
        
        // Dynamic Accuracy
        const avgAccuracy = completedSkillTests.length > 0
            ? Math.round(completedSkillTests.reduce((sum, t) => sum + (completedTests[t.id].percentage || 0), 0) / completedSkillTests.length)
            : 0;

        // Dynamic Completed Count
        const completedCount = completedSkillTests.length;

        // Total Time Limits in hours
        const totalTimeMinutes = completedSkillTests.reduce((sum, t) => sum + (t.timeLimit || 0), 0);
        const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
        const avgTimePerTest = completedSkillTests.length > 0
            ? (totalTimeMinutes / completedSkillTests.length).toFixed(1)
            : 0;

        // Smart Advice
        let adviceText = "Hãy bắt đầu giải bộ đề đầu tiên để đánh giá năng lực của mình!";
        if (completedCount > 0) {
            if (avgAccuracy < 60) {
                adviceText = `Bạn đang gặp khó khăn ở các mẫu câu ${selectedLevel !== 'all' ? selectedLevel : ''} của kỹ năng ${skillLabel}. Hãy dành thêm thời gian ôn tập lý thuyết và giải lại các câu làm sai.`;
            } else if (avgAccuracy < 80) {
                adviceText = `Phong độ luyện tập ${skillLabel} của bạn đang khá ổn định. Hãy chú ý đọc kỹ câu hỏi để giảm thiểu những sai sót nhỏ nhé!`;
            } else {
                adviceText = `Tuyệt vời! Bạn đã nắm vững các kiến thức ${skillLabel} ${selectedLevel !== 'all' ? selectedLevel : ''}. Hãy tiếp tục luyện đề để duy trì phong độ cao nhất.`;
            }
        }

        // Recent Activity
        const recentActivities = Object.entries(completedTests)
            .map(([id, info]) => {
                const test = tests.find(t => t.id === id);
                return test ? { ...test, ...info } : null;
            })
            .filter(t => t && t.isSkillTest && t.skillType === skillType)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        const SkillIcon = SECTION_ICONS[skillType] || FileText;

        return (
            <div className="min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans animate-fade-in">
                {/* Header breadcrumb */}
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

                {/* Filter and Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left main area: Filters + Cards */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Filters row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                            {/* Level Tabs */}
                            <div className="flex flex-wrap gap-1.5">
                                {['all', 'N1', 'N2', 'N3', 'N4', 'N5'].map(lvl => {
                                    const isActive = selectedLevel === lvl;
                                    return (
                                        <button
                                            key={lvl}
                                            onClick={() => setSelectedLevel(lvl)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                                                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            {lvl === 'all' ? 'Tất cả' : lvl}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Dropdowns */}
                            <div className="flex items-center gap-3">
                                {/* Status filter */}
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="all">Trạng thái: Tất cả</option>
                                        <option value="completed">Đã hoàn thành</option>
                                        <option value="retry">Cần ôn lại</option>
                                        <option value="in_progress">Đang làm</option>
                                        <option value="not_started">Chưa làm</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                    </div>
                                </div>

                                {/* Sort filter */}
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="newest">Sắp xếp: Mới nhất</option>
                                        <option value="questions">Số câu hỏi</option>
                                        <option value="time">Thời gian làm bài</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedSkillTests.map((test, index) => {
                                const status = getTestStatus(test);
                                const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                                const completedInfo = completedTests[test.id];

                                return (
                                    <div
                                        key={test.id}
                                        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[250px] relative overflow-hidden group shadow-sm"
                                    >
                                        <div>
                                            {/* Top badges */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                                                    <SkillIcon className="w-5 h-5" />
                                                </div>
                                                {status === 'completed' && (
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
                                                        HOÀN THÀNH
                                                    </span>
                                                )}
                                                {status === 'retry' && (
                                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-full">
                                                        CẦN ÔN LẠI
                                                    </span>
                                                )}
                                                {status === 'in_progress' && (
                                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-full">
                                                        ĐANG LÀM
                                                    </span>
                                                )}
                                                {status === 'new' && (
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-full">
                                                        MỚI
                                                    </span>
                                                )}
                                                {status === 'not_started' && (
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-700/30 px-3 py-1.5 rounded-full">
                                                        CHƯA LÀM
                                                    </span>
                                                )}
                                            </div>

                                            {/* Test title and details */}
                                            <h4 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                                                {test.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                                                {test.description || `Trọng tâm: Các câu hỏi luyện tập chuyên sâu cho kỹ năng ${skillLabel} cấp độ ${test.level}.`}
                                            </p>

                                            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-[11px] font-bold mt-4">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {totalQ} Câu hỏi
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Timer className="w-3.5 h-3.5" />
                                                    {test.timeLimit} Phút
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Action Section */}
                                        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                                            {status === 'completed' && (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                                            Điểm: {completedInfo?.percentage}%
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => reviewTest(test)}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                                                    >
                                                        Xem lại <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}

                                            {status === 'retry' && (
                                                <>
                                                    <span className="text-xs font-bold text-rose-500">
                                                        Lần cuối: {completedInfo?.percentage}%
                                                    </span>
                                                    <button
                                                        onClick={() => startTest(test)}
                                                        className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                    >
                                                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                    </button>
                                                </>
                                            )}

                                            {(status === 'new' || status === 'not_started') && (
                                                <>
                                                    <span className="text-xs font-medium text-slate-400">Chưa có lượt thi</span>
                                                    <button
                                                        onClick={() => startTest(test)}
                                                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-650 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                    >
                                                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                    </button>
                                                </>
                                            )}

                                            {status === 'in_progress' && (
                                                <>
                                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[100px] mr-2">
                                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '40%' }} />
                                                    </div>
                                                    <button
                                                        onClick={() => startTest(test)}
                                                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                    >
                                                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Coming Soon Card */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700/50 p-6 flex flex-col items-center justify-center text-center min-h-[250px] shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Coming Soon</h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 max-w-[180px] leading-relaxed">
                                    Bộ đề tiếp theo sẽ được cập nhật vào tuần tới.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side panel: Statistics and Recent Activity */}
                    <div className="space-y-6">
                        {/* Statistics Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                <Award className="w-4 h-4 text-amber-500" />
                                Thống kê cá nhân
                            </h3>

                            {/* Accuracy progress */}
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <span>ĐỘ CHÍNH XÁC TRUNG BÌNH</span>
                                    <span className="text-indigo-650 dark:text-indigo-400">{avgAccuracy}%</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                    <div className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-500" style={{ width: `${avgAccuracy}%` }} />
                                </div>
                            </div>

                            {/* Sub stats grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block uppercase">Đã làm</span>
                                    <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-1">{completedCount}</span>
                                    <span className="text-[9px] text-emerald-500 font-semibold block mt-0.5">đã xong</span>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block uppercase">Thời gian</span>
                                    <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-1">{totalTimeHours}h</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">{avgTimePerTest} phút/bộ</span>
                                </div>
                            </div>

                            {/* Advice */}
                            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-500/10 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-1">Lời khuyên:</span>
                                {adviceText}
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                Hoạt động gần đây
                            </h3>

                            <div className="space-y-3">
                                {recentActivities.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                                        Chưa có hoạt động nào gần đây
                                    </p>
                                ) : (
                                    recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/80"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-bold text-slate-800 dark:text-white leading-snug">
                                                    Hoàn thành {act.title}
                                                </h5>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                                                    {getRelativeTimeString(act.date)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getLevelProgress = (lvl) => {
        const lvlTests = tests.filter(t => !t.isSkillTest && t.level === lvl);
        if (lvlTests.length === 0) return 0;
        const completedLvlTests = lvlTests.filter(t => !!completedTests[t.id]);
        return Math.round((completedLvlTests.length / lvlTests.length) * 100);
    };

    const renderFullExamPracticeScreen = (level) => {
        // Filter full exams of this level
        const lvlTests = tests.filter(t => !t.isSkillTest && t.level === level);

        // Filter by Status
        const filteredLvlTests = lvlTests.filter(test => {
            if (statusFilter === 'all') return true;
            const status = getTestStatus(test);
            return status === statusFilter;
        });

        // Sort
        const sortedLvlTests = [...filteredLvlTests].sort((a, b) => {
            if (sortBy === 'newest') {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            }
            if (sortBy === 'questions') {
                const countA = (a.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                const countB = (b.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                return countB - countA;
            }
            if (sortBy === 'time') {
                return (b.timeLimit || 0) - (a.timeLimit || 0);
            }
            return 0;
        });

        // Personal stats calculations for full exams of this level
        const completedLvlTests = lvlTests.filter(t => !!completedTests[t.id]);
        
        // Dynamic Accuracy
        const avgAccuracy = completedLvlTests.length > 0
            ? Math.round(completedLvlTests.reduce((sum, t) => sum + (completedTests[t.id].percentage || 0), 0) / completedLvlTests.length)
            : 0;

        // Dynamic Completed Count
        const completedCount = completedLvlTests.length;

        // Total Time Limits in hours
        const totalTimeMinutes = completedLvlTests.reduce((sum, t) => sum + (t.timeLimit || 0), 0);
        const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
        const avgTimePerTest = completedLvlTests.length > 0
            ? (totalTimeMinutes / completedLvlTests.length).toFixed(1)
            : 0;

        // Smart Advice
        let adviceText = `Hãy bắt đầu giải đề thi thử N4 đầu tiên để đánh giá năng lực của mình!`;
        if (completedCount > 0) {
            if (avgAccuracy < 60) {
                adviceText = `Bạn đang gặp khó khăn ở các đề thi ${level}. Hãy dành thêm thời gian luyện tập từng kỹ năng yếu và làm lại các câu bị sai.`;
            } else if (avgAccuracy < 80) {
                adviceText = `Phong độ giải đề ${level} của bạn khá tốt. Hãy chú ý cải thiện tốc độ làm bài để đạt điểm số cao hơn!`;
            } else {
                adviceText = `Tuyệt vời! Bạn đã hoàn thành xuất sắc các đề thi thử ${level}. Bạn đã sẵn sàng cho kỳ thi JLPT chính thức!`;
            }
        }

        // Recent Activity
        const recentActivities = Object.entries(completedTests)
            .map(([id, info]) => {
                const test = tests.find(t => t.id === id);
                return test ? { ...test, ...info } : null;
            })
            .filter(t => t && !t.isSkillTest && t.level === level)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        const lvlGradient = LEVEL_GRADIENTS[level] || 'from-slate-500 to-slate-600';

        return (
            <div className="min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans animate-fade-in">
                {/* Header breadcrumb */}
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
                    {isAdmin && (
                        <Link to={ROUTES.JLPT_ADMIN}
                            className="px-4 py-2 bg-[#2E5B70] hover:bg-[#254A5C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0">
                            <FileText className="w-3.5 h-3.5" /> Quản lý đề thi
                        </Link>
                    )}
                </div>

                {/* Filter and Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left main area: Filters + Cards */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Filters row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2">
                                Danh sách đề thi chính thức
                            </div>

                            {/* Dropdowns */}
                            <div className="flex items-center gap-3">
                                {/* Status filter */}
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="appearance-none bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="all">Trạng thái: Tất cả</option>
                                        <option value="completed">Đã hoàn thành</option>
                                        <option value="retry">Cần ôn lại</option>
                                        <option value="in_progress">Đang làm</option>
                                        <option value="not_started">Chưa làm</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                    </div>
                                </div>

                                {/* Sort filter */}
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="appearance-none bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-700/50 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="newest">Sắp xếp: Mới nhất</option>
                                        <option value="questions">Số câu hỏi</option>
                                        <option value="time">Thời gian làm bài</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450 dark:text-slate-500">
                                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedLvlTests.length === 0 ? (
                                <div className="col-span-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-12 flex flex-col items-center justify-center text-center h-64 shadow-sm">
                                    <FileCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có đề thi nào phù hợp bộ lọc</h4>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[250px]">
                                        Hãy điều chỉnh bộ lọc hoặc vào trang quản trị để thêm đề mới.
                                    </p>
                                </div>
                            ) : (
                                sortedLvlTests.map((test, index) => {
                                    const status = getTestStatus(test);
                                    const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                                    const completedInfo = completedTests[test.id];

                                    return (
                                        <div
                                            key={test.id}
                                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[250px] relative overflow-hidden group shadow-sm"
                                        >
                                            {isAdmin && (
                                                <button
                                                    onClick={() => navigate(ROUTES.JLPT_ADMIN, { state: { editTest: test } })}
                                                    className="absolute top-4 right-4 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer border border-slate-100 dark:border-slate-800 z-10 hover:scale-105"
                                                    title="Chỉnh sửa đề thi"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <div>
                                                {/* Top badges */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lvlGradient} text-white flex items-center justify-center font-black text-[11px]`}>
                                                        {test.level}
                                                    </div>
                                                    {status === 'completed' && (
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
                                                            HOÀN THÀNH
                                                        </span>
                                                    )}
                                                    {status === 'retry' && (
                                                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-full">
                                                            CẦN ÔN LẠI
                                                        </span>
                                                    )}
                                                    {status === 'in_progress' && (
                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-full">
                                                            ĐANG LÀM
                                                        </span>
                                                    )}
                                                    {status === 'new' && (
                                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-full">
                                                            MỚI
                                                        </span>
                                                    )}
                                                    {status === 'not_started' && (
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-700/30 px-3 py-1.5 rounded-full">
                                                            CHƯA LÀM
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Test title and details */}
                                                <h4 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                                                    {test.title}
                                                </h4>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                                                    {test.description || `Đề thi trọn gói đầy đủ các kỹ năng từ đề thi JLPT chính thức các năm của cấp độ ${test.level}.`}
                                                </p>

                                                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-[11px] font-bold mt-4">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {totalQ} Câu hỏi
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Timer className="w-3.5 h-3.5" />
                                                        {test.timeLimit} Phút
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bottom Action Section */}
                                            <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                                                {status === 'completed' && (
                                                    <>
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                Điểm: {completedInfo?.percentage}%
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => reviewTest(test)}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                                                        >
                                                            Xem lại <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}

                                                {status === 'retry' && (
                                                    <>
                                                        <span className="text-xs font-bold text-rose-500">
                                                            Lần cuối: {completedInfo?.percentage}%
                                                        </span>
                                                        <button
                                                            onClick={() => startTest(test)}
                                                            className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                        >
                                                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                        </button>
                                                    </>
                                                )}

                                                {(status === 'new' || status === 'not_started') && (
                                                    <>
                                                        <span className="text-xs font-medium text-slate-400">Chưa có lượt thi</span>
                                                        <button
                                                            onClick={() => startTest(test)}
                                                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-650 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                        >
                                                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                        </button>
                                                    </>
                                                )}

                                                {status === 'in_progress' && (
                                                    <>
                                                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[100px] mr-2">
                                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '40%' }} />
                                                        </div>
                                                        <button
                                                            onClick={() => startTest(test)}
                                                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105"
                                                        >
                                                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Coming Soon Card */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700/50 p-6 flex flex-col items-center justify-center text-center min-h-[250px] shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Coming Soon</h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 max-w-[180px] leading-relaxed">
                                    Bộ đề tiếp theo sẽ được cập nhật vào tuần tới.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side panel: Statistics and Recent Activity */}
                    <div className="space-y-6">
                        {/* Statistics Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                <Award className="w-4 h-4 text-amber-500" />
                                Thống kê cá nhân
                            </h3>

                            {/* Accuracy progress */}
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <span>ĐỘ CHÍNH XÁC TRUNG BÌNH</span>
                                    <span className="text-indigo-650 dark:text-indigo-400">{avgAccuracy}%</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                    <div className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-500" style={{ width: `${avgAccuracy}%` }} />
                                </div>
                            </div>

                            {/* Sub stats grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block uppercase">Đã làm</span>
                                    <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-1">{completedCount}</span>
                                    <span className="text-[9px] text-emerald-500 font-semibold block mt-0.5">đã xong</span>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 block uppercase">Thời gian</span>
                                    <span className="text-xl font-extrabold text-slate-800 dark:text-white block mt-1">{totalTimeHours}h</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">{avgTimePerTest} phút/bộ</span>
                                </div>
                            </div>

                            {/* Advice */}
                            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-2xl border border-indigo-500/10 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-1">Lời khuyên:</span>
                                {adviceText}
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                Hoạt động gần đây
                            </h3>

                            <div className="space-y-3">
                                {recentActivities.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                                        Chưa có hoạt động nào gần đây
                                    </p>
                                ) : (
                                    recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/80"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h5 className="text-[11px] font-bold text-slate-800 dark:text-white leading-snug">
                                                    Hoàn thành {act.title}
                                                </h5>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                                                    {getRelativeTimeString(act.date)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (selectedFullExamLevel) {
        return renderFullExamPracticeScreen(selectedFullExamLevel);
    }

    if (selectedSkillPractice) {
        return renderSkillPracticeScreen();
    }

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans animate-fade-in">
            {/* Toast Notification */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-2 animate-bounce text-xs font-bold">
                    <span>{notification}</span>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
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
                        {isAdmin && (
                            <Link to={ROUTES.JLPT_ADMIN}
                                className="px-4 py-2 bg-[#2E5B70] hover:bg-[#254A5C] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                                <FileText className="w-3.5 h-3.5" /> Quản lý đề thi
                            </Link>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-[10px] border border-emerald-100/50 dark:border-emerald-900/30 uppercase tracking-wide">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500" /> CẤP ĐỘ {countdownLevel} - CÒN {jlptCountdown} NGÀY THI
                        </div>
                    </div>
                </div>

                {/* Section 1: Đề JLPT Các Năm */}
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pl-2 border-l-4 border-[#2E5B70] dark:border-sky-500 mb-6">
                        Đề JLPT Các Năm
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => {
                            const progress = getLevelProgress(lvl);
                            const gradient = LEVEL_GRADIENTS[lvl] || 'from-slate-500 to-slate-600';
                            return (
                                <div key={lvl} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${gradient} opacity-5 rounded-bl-full pointer-events-none`} />
                                    <div>
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black text-sm mb-4`}>
                                            {lvl}
                                        </div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white">Cấp độ {lvl}</h4>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                            Đề thi trọn gói đầy đủ các kỹ năng từ đề thi JLPT chính thức các năm của cấp độ {lvl}.
                                        </p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className={`bg-gradient-to-r ${gradient} h-1.5 rounded-full`} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 w-8 text-right">{progress}%</span>
                                        </div>
                                        <button onClick={() => setSelectedFullExamLevel(lvl)} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-300 font-extrabold text-[10px] tracking-wider rounded-xl transition cursor-pointer border border-slate-100 dark:border-slate-700/50 hover:scale-105 shrink-0">
                                            BẮT ĐẦU LUYỆN
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Luyện từng Kỹ Năng */}
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pl-2 border-l-4 border-[#2E5B70] dark:border-sky-500 mb-6">
                        Luyện từng Kỹ Năng
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {/* Card 1: Từ vựng */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                    <Languages className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Từ vựng (Vocabulary)</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                    Ôn luyện từ vựng cần thiết cho cấp độ {countdownLevel}, phân loại theo chủ đề và độ thông dụng.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${getSkillProgress('vocabulary')}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{getSkillProgress('vocabulary')}%</span>
                                </div>
                                <button onClick={() => handleStartPractice('vocabulary', 'Từ vựng')} className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer">
                                    BẮT ĐẦU LUYỆN
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Ngữ pháp */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Ngữ pháp (Grammar)</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                    Tổng hợp cấu trúc câu phức, trợ từ và cách chia động từ nâng cao theo giáo trình chuẩn.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${getSkillProgress('grammar')}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{getSkillProgress('grammar')}%</span>
                                </div>
                                <button onClick={() => handleStartPractice('grammar', 'Ngữ pháp')} className="px-4 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer">
                                    BẮT ĐẦU LUYỆN
                                </button>
                            </div>
                        </div>

                        {/* Card 3: Hán tự */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-bl-full pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                                    <Award className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Hán tự (Kanji)</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                    Trau dồi bộ thủ, âm On-Kun và cách ghép chữ qua hệ thống Flashcard thông minh.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${getSkillProgress('kanji')}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{getSkillProgress('kanji')}%</span>
                                </div>
                                <button onClick={() => handleStartPractice('kanji', 'Hán tự')} className="px-4 py-2 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer">
                                    BẮT ĐẦU LUYỆN
                                </button>
                            </div>
                        </div>

                        {/* Card 4: Đọc hiểu */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Đọc hiểu (Reading)</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                    Rèn luyện kỹ năng đọc lướt, tìm ý chính và trả lời câu hỏi trong các đoạn văn dài.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${getSkillProgress('reading')}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{getSkillProgress('reading')}%</span>
                                </div>
                                <button onClick={() => handleStartPractice('reading', 'Đọc hiểu')} className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer">
                                    BẮT ĐẦU LUYỆN
                                </button>
                            </div>
                        </div>

                        {/* Card 5: Nghe hiểu */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 hover:shadow-md transition-all flex flex-col justify-between min-h-[14rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                                    <Headphones className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Nghe hiểu (Listening)</h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                    Luyện nghe với giọng người bản xứ đa dạng các tình huống hội thoại thực tế.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${getSkillProgress('listening')}%` }} />
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 w-8 text-right">{getSkillProgress('listening')}%</span>
                                </div>
                                <button onClick={() => handleStartPractice('listening', 'Nghe hiểu')} className="px-4 py-2 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 font-bold text-[10px] tracking-wider rounded-xl transition cursor-pointer">
                                    BẮT ĐẦU LUYỆN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats & Registration Grid */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-base font-bold text-slate-800 dark:text-white">Lộ trình 60 ngày chinh phục {countdownLevel}</h4>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Đã hoàn thành 24/60 ngày</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-3 mb-6">
                            <div className="bg-slate-700 dark:bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: '40%' }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100/50 dark:border-slate-700/20 text-center md:text-left">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ĐIỂM TRUNG BÌNH</span>
                            <div className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                                {avgScore}/180
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100/50 dark:border-slate-700/20 text-center md:text-left">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">THỜI GIAN ÔN</span>
                            <div className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                                {completedCount > 0 ? `${completedCount * 2 + 40} giờ` : '42 giờ'}
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100/50 dark:border-slate-700/20 text-center md:text-left">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">HÁN TỰ ĐÃ BIẾT</span>
                            <div className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                                {kanjiKnownCount}
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100/50 dark:border-slate-700/20 text-center md:text-left">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">THỨ HẠNG</span>
                            <div className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">
                                Top 12%
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Luyện kỹ năng */}
            {selectedSkillPractice && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 relative border border-slate-100 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedSkillPractice(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                            🎯 Luyện kỹ năng: {selectedSkillPractice.label} ({selectedSkillPractice.tests.length})
                        </h3>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {selectedSkillPractice.tests.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50 p-4">
                                    <p className="text-xs font-bold">Chưa có bộ đề luyện nào cho kỹ năng này</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                                        Bạn có thể đăng nhập tài khoản quản trị để thêm các bộ đề luyện chuyên sâu cho kỹ năng {selectedSkillPractice.label} ở cấp độ {selectedLevel}.
                                    </p>
                                </div>
                            ) : (
                                selectedSkillPractice.tests.map(test => {
                                    const isCompleted = !!completedTests[test.id];
                                    const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                                    return (
                                        <div key={test.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100/50 transition gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{test.title}</h4>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-2 mt-1">
                                                    <span>{totalQ} câu hỏi</span>
                                                    <span>•</span>
                                                    <span>{test.timeLimit} phút</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSkillPractice(null);
                                                            navigate(ROUTES.JLPT_ADMIN, { state: { editTest: test } });
                                                        }}
                                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg transition cursor-pointer border border-amber-200/30 hover:scale-105 shrink-0 animate-fade-in"
                                                        title="Chỉnh sửa đề thi"
                                                    >
                                                        Sửa
                                                    </button>
                                                )}
                                                {isCompleted ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                                            Đã xong
                                                        </span>
                                                        <button onClick={() => { setSelectedSkillPractice(null); reviewTest(test); }} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg transition cursor-pointer">
                                                            Xem lại
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { setSelectedSkillPractice(null); startTest(test); }} className="px-4 py-1.5 bg-[#2E5B70] hover:bg-[#254A5C] text-white text-[10px] font-bold rounded-lg transition shadow-sm cursor-pointer">
                                                        Làm bài
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JLPTTestScreen;
