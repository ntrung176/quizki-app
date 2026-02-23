import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { Link } from 'react-router-dom';
import {
    FileCheck, Clock, Play, ChevronRight, ChevronLeft,
    Maximize, Minimize, X, Check, CheckCircle, XCircle,
    Home, Languages, BookOpen, FileText, Headphones,
    Loader2, Timer, Volume2, AlertTriangle, Award
} from 'lucide-react';
import { ROUTES } from '../../router';

const SECTION_ICONS = {
    vocabulary: Languages, grammar: BookOpen,
    reading: FileText, listening: Headphones,
};
const SECTION_COLORS = {
    vocabulary: 'blue', grammar: 'purple',
    reading: 'green', listening: 'orange',
};
const LEVEL_GRADIENTS = {
    N5: 'from-emerald-500 to-teal-600',
    N4: 'from-teal-500 to-cyan-600',
    N3: 'from-blue-500 to-indigo-600',
    N2: 'from-violet-500 to-purple-600',
    N1: 'from-rose-500 to-red-600',
};

const JLPTTestScreen = ({ isAdmin }) => {
    // State
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('all');

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

    // Load tests
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, testsPath), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [testsPath]);

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

    // Submit test
    const submitTest = () => {
        setTimerActive(false);
        clearInterval(timerRef.current);
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
    const filteredTests = selectedLevel === 'all' ? tests : tests.filter(t => t.level === selectedLevel);

    // Render: Loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" /><p className="text-gray-500">Đang tải đề thi...</p></div>
            </div>
        );
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
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{q.question}</p>
                                                        {userAns !== undefined && (
                                                            <p className="text-xs mt-1">
                                                                <span className="text-gray-500">Bạn chọn: </span>
                                                                <span className={isCorrect ? 'text-green-600 font-bold' : 'text-red-600 font-bold line-through'}>
                                                                    {q.options[userAns]}
                                                                </span>
                                                            </p>
                                                        )}
                                                        {!isCorrect && (
                                                            <p className="text-xs mt-1">
                                                                <span className="text-gray-500">Đáp án: </span>
                                                                <span className="text-green-600 font-bold">{q.options[q.correctAnswer]}</span>
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
                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-japanese whitespace-pre-wrap">
                                        {question.passage}
                                    </p>
                                </div>
                            )}

                            {/* Question */}
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-relaxed">
                                {question?.question}
                            </h3>

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
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <FileCheck className="w-6 h-6 text-white" />
                            </div>
                            Luyện Thi JLPT
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Chọn đề thi và bắt đầu luyện tập theo cấu trúc JLPT chuẩn</p>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Link to={ROUTES.JLPT_ADMIN}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Quản lý đề thi
                            </Link>
                        )}
                        <Link to={ROUTES.VOCAB_REVIEW}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                            <Home className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Level filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                        <button key={level} onClick={() => setSelectedLevel(level)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${selectedLevel === level
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                }`}>
                            {level === 'all' ? 'Tất cả' : level}
                        </button>
                    ))}
                </div>

                {/* Test cards */}
                {filteredTests.length === 0 ? (
                    <div className="text-center py-20">
                        <FileCheck className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">Chưa có đề thi nào</h3>
                        <p className="text-gray-400 dark:text-gray-500">
                            {isAdmin ? 'Hãy vào phần quản lý để tạo đề thi mới!' : 'Vui lòng chờ admin thêm đề thi.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTests.map(test => {
                            const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                            const sectionTypes = [...new Set((test.sections || []).map(s => s.type))];
                            const gradient = LEVEL_GRADIENTS[test.level] || LEVEL_GRADIENTS.N5;

                            return (
                                <div key={test.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                                    <div className={`bg-gradient-to-r ${gradient} p-4`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{test.level}</span>
                                            <div className="flex items-center gap-1 text-white/80 text-xs">
                                                <Clock className="w-3.5 h-3.5" />{test.timeLimit} phút
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mt-2">{test.title}</h3>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                            {sectionTypes.map(type => {
                                                const SIcon = SECTION_ICONS[type] || FileText;
                                                const meta = { vocabulary: '文字語彙', grammar: '文法', reading: '読解', listening: '聴解' };
                                                return (
                                                    <span key={type} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg">
                                                        <SIcon className="w-3 h-3" />{meta[type] || type}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">{totalQ} câu hỏi • {(test.sections || []).length} phần</span>
                                            <button onClick={() => startTest(test)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 group-hover:scale-105">
                                                <Play className="w-4 h-4" /> Bắt đầu
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default JLPTTestScreen;
