import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FileCheck, X, Check, CheckCircle, XCircle, ChevronRight,
    Languages, BookOpen, Wrench, Home
} from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import { ROUTES } from '../../router';
import { celebrateCorrectAnswer, flashCorrect, launchFanfare } from '../../utils/celebrations';

const TestScreen = ({ allCards }) => {
    const [testMode, setTestMode] = useState(null);
    const [testType, setTestType] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [questionCount, setQuestionCount] = useState(10);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [userAnswers, setUserAnswers] = useState([]);

    // Generate questions based on test type
    const generateQuestions = (mode, type, count = 10, level = 'all') => {
        let cardsWithContext = allCards.filter(card =>
            card.example && card.example.trim() !== '' &&
            card.back && card.back.trim() !== ''
        );

        if (level !== 'all') {
            cardsWithContext = cardsWithContext.filter(card => card.level === level);
        }

        if (cardsWithContext.length === 0) {
            alert('Không có đủ dữ liệu để tạo câu hỏi. Vui lòng thêm ví dụ và nghĩa cho từ vựng hoặc chọn cấp độ khác.');
            return [];
        }

        const shuffled = cardsWithContext.sort(() => Math.random() - 0.5);
        const selectedCards = shuffled.slice(0, Math.min(count, shuffled.length));

        let generatedQuestions = [];

        if (mode === 'kanji') {
            if (type === 1) {
                generatedQuestions = selectedCards.map(card => {
                    const kanjiOnly = card.front.split('（')[0];
                    const correctAnswer = extractHiragana(card.front);
                    const wrongOptions = generateWrongHiragana(card.front, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);

                    return {
                        question: `Cách đọc của "___BOLD___${kanjiOnly}___BOLD___" là:`,
                        context: card.example || '',
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: kanjiOnly
                    };
                });
            } else if (type === 2) {
                generatedQuestions = selectedCards.map(card => {
                    const hiragana = extractHiragana(card.front);
                    const kanjiOnly = card.front.split('（')[0];
                    const correctAnswer = kanjiOnly;
                    const wrongOptions = generateWrongKanji(card, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);

                    const contextWithHiragana = card.example.replace(kanjiOnly, hiragana);

                    return {
                        question: `Kanji của "___BOLD___${hiragana}___BOLD___" là:`,
                        context: contextWithHiragana || '',
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: hiragana
                    };
                });
            }
        } else if (mode === 'vocab') {
            if (type === 3) {
                generatedQuestions = selectedCards.map(card => {
                    const blankSentence = card.example.replace(card.front.split('（')[0], '＿＿＿');
                    const correctAnswer = card.front;
                    const wrongOptions = generateSimilarVocab(card, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);

                    return {
                        question: `Chọn từ phù hợp để điền vào chỗ trống:`,
                        context: blankSentence,
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.exampleMeaning || card.back
                    };
                });
            } else if (type === 4) {
                generatedQuestions = selectedCards
                    .filter(card => card.synonym && card.synonym.trim() !== '')
                    .slice(0, Math.min(count, selectedCards.length))
                    .map(card => {
                        const correctAnswer = card.synonym.split(',')[0].trim();
                        const wrongOptions = generateWrongSynonyms(card, allCards, 3);
                        const options = shuffleArray([correctAnswer, ...wrongOptions]);

                        return {
                            question: `Từ đồng nghĩa với "___BOLD___${card.front}___BOLD___" là:`,
                            context: '',
                            options: options,
                            correctAnswer: correctAnswer,
                            explanation: `${card.front} = ${card.synonym}. Nghĩa: ${card.back}`
                        };
                    });
            }
        } else if (mode === 'grammar') {
            alert('Tính năng Ngữ pháp đang được phát triển. Vui lòng thêm dữ liệu ngữ pháp.');
            return [];
        }

        return generatedQuestions;
    };

    // Helper functions
    const extractHiragana = (word) => {
        const match = word.match(/（(.+?)）/);
        return match ? match[1] : word;
    };

    const generateWrongHiragana = (correctWord, allCards, count) => {
        const correctHira = extractHiragana(correctWord);
        const samePosCards = allCards.filter(c =>
            c.pos === allCards.find(card => card.front === correctWord)?.pos &&
            c.front !== correctWord &&
            extractHiragana(c.front) !== correctHira
        );

        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => extractHiragana(c.front));

        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const hira = extractHiragana(randomCard.front);
            if (hira !== correctHira && !options.includes(hira)) {
                options.push(hira);
            }
        }

        return options;
    };

    const generateWrongKanji = (correctCard, allCards, count) => {
        const correctKanji = correctCard.front.split('（')[0];
        const samePosCards = allCards.filter(c =>
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.front.split('（')[0] !== correctKanji
        );

        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.front.split('（')[0]);

        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const kanji = randomCard.front.split('（')[0];
            if (kanji !== correctKanji && !options.includes(kanji)) {
                options.push(kanji);
            }
        }

        return options;
    };

    const generateSimilarVocab = (correctCard, allCards, count) => {
        const correctWord = correctCard.front;

        const samePosCards = allCards.filter(c =>
            c.pos === correctCard.pos &&
            c.front !== correctWord &&
            c.example && c.example.trim() !== ''
        );

        let options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.front);

        if (options.length < count) {
            const correctLength = correctWord.length;
            const similarLengthCards = allCards.filter(c =>
                Math.abs(c.front.length - correctLength) <= 2 &&
                c.front !== correctWord &&
                !options.includes(c.front) &&
                c.example && c.example.trim() !== ''
            );

            options = options.concat(
                similarLengthCards
                    .sort(() => Math.random() - 0.5)
                    .slice(0, count - options.length)
                    .map(c => c.front)
            );
        }

        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            if (randomCard.front !== correctWord && !options.includes(randomCard.front)) {
                options.push(randomCard.front);
            }
        }

        return options;
    };

    const generateWrongSynonyms = (correctCard, allCards, count) => {
        const correctSynonym = correctCard.synonym?.split(',')[0].trim();

        const samePosCards = allCards.filter(c =>
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.synonym && c.synonym.trim() !== ''
        );

        let options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.synonym.split(',')[0].trim());

        while (options.length < count) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            const syn = randomCard.synonym?.split(',')[0].trim();
            if (syn && syn !== correctSynonym && !options.includes(syn)) {
                options.push(syn);
            }
        }

        return options;
    };

    const handleShowConfig = (mode, type) => {
        setTestMode(mode);
        setTestType(type);
        setShowConfig(true);
    };

    const handleStartTest = () => {
        const qs = generateQuestions(testMode, testType, questionCount, selectedLevel);
        if (qs.length === 0) return;

        setQuestions(qs);
        setShowConfig(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setUserAnswers([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowResult(false);
    };

    const handleAnswerSelect = (answer, event) => {
        if (isAnswered) return;

        setSelectedAnswer(answer);
        setIsAnswered(true);

        const currentQuestion = questions[currentQuestionIndex];
        const isCorrect = answer === currentQuestion.correctAnswer;

        if (isCorrect) {
            setScore(score + 1);
            celebrateCorrectAnswer(event);
            flashCorrect();
        }

        setUserAnswers([...userAnswers, {
            question: currentQuestion.question,
            context: currentQuestion.context,
            selectedAnswer: answer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: isCorrect,
            explanation: currentQuestion.explanation
        }]);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            setShowResult(true);
        }
    };

    const handleRestart = () => {
        setTestMode(null);
        setTestType(null);
        setShowConfig(false);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setScore(0);
        setUserAnswers([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowResult(false);
    };

    const handleBackToMenu = () => {
        handleRestart();
    };

    // Helper function to render bold text
    const renderBoldText = (text) => {
        if (!text) return text;

        const parts = text.split('___BOLD___');
        return parts.map((part, idx) => {
            if (idx % 2 === 1) {
                return <span key={idx} className="font-bold text-indigo-700 underline decoration-2 font-japanese">{part}</span>;
            }
            return part;
        });
    };

    // Trigger fanfare on result screen
    useEffect(() => {
        if (showResult && score / questions.length >= 0.7) {
            launchFanfare();
        }
    }, [showResult]);

    // Render result screen
    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        const passed = percentage >= 70;

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="text-center mb-8">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${passed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                                }`}>
                                {passed ? (
                                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                                )}
                            </div>
                            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                                {passed ? 'Xuất sắc! 🎉' : 'Cố gắng thêm! 💪'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Bạn đạt {score}/{questions.length} câu đúng ({percentage}%)
                            </p>
                        </div>

                        {/* Review answers */}
                        <div className="space-y-4 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Chi tiết câu trả lời:</h3>
                            {userAnswers.map((answer, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-2 ${answer.isCorrect
                                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                    }`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Câu {idx + 1}:</span>
                                        {answer.isCorrect ? (
                                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        )}
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 mb-2">{renderBoldText(answer.question)}</p>
                                    {answer.context && (
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 italic">{renderBoldText(answer.context)}</p>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-sm dark:text-gray-300">
                                            <span className="font-semibold">Câu trả lời của bạn: </span>
                                            <span className={answer.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                {answer.selectedAnswer}
                                            </span>
                                        </p>
                                        {!answer.isCorrect && (
                                            <p className="text-sm dark:text-gray-300">
                                                <span className="font-semibold">Đáp án đúng: </span>
                                                <span className="text-green-600 dark:text-green-400">{answer.correctAnswer}</span>
                                            </p>
                                        )}
                                        {answer.explanation && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-semibold">Giải thích: </span>
                                                {answer.explanation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBackToMenu}
                                className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition"
                            >
                                Làm bài khác
                            </button>
                            <Link
                                to={ROUTES.HOME}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition text-center font-medium"
                            >
                                Về trang chủ
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render question screen
    if (testMode && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                        {/* Back button */}
                        <button
                            onClick={handleBackToMenu}
                            className="mb-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
                            Quay lại menu
                        </button>

                        {/* Progress bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span>Câu {currentQuestionIndex + 1}/{questions.length}</span>
                                <span>Điểm: {score}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Question */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                                {renderBoldText(currentQuestion.question)}
                            </h3>
                            {currentQuestion.context && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                    <p className="text-gray-800 dark:text-gray-200 text-lg">{renderBoldText(currentQuestion.context)}</p>
                                </div>
                            )}
                        </div>

                        {/* Options */}
                        <div className="space-y-3 mb-6">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = selectedAnswer === option;
                                const isCorrect = option === currentQuestion.correctAnswer;
                                const showCorrect = isAnswered && isCorrect;
                                const showWrong = isAnswered && isSelected && !isCorrect;

                                return (
                                    <button
                                        key={idx}
                                        onClick={(e) => handleAnswerSelect(option, e)}
                                        disabled={isAnswered}
                                        className={`w-full p-4 rounded-xl text-left font-medium transition-all ${showCorrect
                                            ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 text-green-800 dark:text-green-300'
                                            : showWrong
                                                ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 text-red-800 dark:text-red-300'
                                                : isSelected
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500 dark:border-indigo-600 text-gray-900 dark:text-gray-100'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-900 dark:text-gray-100'
                                            } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-japanese">{option}</span>
                                            {showCorrect && <Check className="w-5 h-5" />}
                                            {showWrong && <X className="w-5 h-5" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {isAnswered && (
                            <div className={`p-4 rounded-xl mb-6 ${selectedAnswer === currentQuestion.correctAnswer
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}>
                                <p className="text-sm font-semibold mb-1 dark:text-gray-200">
                                    {selectedAnswer === currentQuestion.correctAnswer ? '✓ Chính xác!' : '✗ Chưa đúng'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
                            </div>
                        )}

                        {/* Next button */}
                        <button
                            onClick={handleNextQuestion}
                            disabled={!isAnswered}
                            className={`w-full py-3 rounded-xl font-bold transition ${isAnswered
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render config screen
    if (showConfig) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Cấu hình bài kiểm tra</h2>
                            <button onClick={handleBackToMenu} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* JLPT Level Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                Chọn cấp độ JLPT:
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`py-2 px-4 rounded-xl font-bold transition ${selectedLevel === level
                                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {level === 'all' ? 'Tất cả' : level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question Count Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                Số lượng câu hỏi: <span className="text-indigo-600 dark:text-indigo-400">{questionCount}</span>
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>5</span>
                                <span>25</span>
                                <span>50</span>
                            </div>
                        </div>

                        {/* Start button */}
                        <button
                            onClick={handleStartTest}
                            className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition text-lg"
                        >
                            Bắt đầu kiểm tra
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render menu screen (initial)
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <FileCheck className="w-8 h-8 mr-3 text-indigo-600 dark:text-indigo-400" />
                            Luyện Thi JLPT
                        </h1>
                        <Link to={ROUTES.HOME} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                            <Home className="w-6 h-6" />
                        </Link>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
                        Chọn dạng bài tập bạn muốn luyện tập
                    </p>

                    {/* Kanji Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <Languages className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                            Kanji
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleShowConfig('kanji', 1)}
                                className="p-6 bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 1: Kanji → Hiragana</h3>
                                    <p className="text-blue-100 dark:text-blue-200 text-sm">Nhìn Kanji, chọn cách đọc đúng</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('kanji', 2)}
                                className="p-6 bg-gradient-to-br from-cyan-400 to-cyan-600 dark:from-cyan-500 dark:to-cyan-700 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 2: Hiragana → Kanji</h3>
                                    <p className="text-cyan-100 dark:text-cyan-200 text-sm">Nhìn Hiragana, chọn Kanji đúng</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Vocab Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <BookOpen className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" />
                            Từ vựng
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleShowConfig('vocab', 3)}
                                className="p-6 bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 3: Điền từ vào câu</h3>
                                    <p className="text-green-100 dark:text-green-200 text-sm">Chọn từ phù hợp với ngữ cảnh</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('vocab', 4)}
                                className="p-6 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 text-white rounded-2xl hover:shadow-lg transition transform hover:-translate-y-1"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 4: Từ đồng nghĩa</h3>
                                    <p className="text-emerald-100 dark:text-emerald-200 text-sm">Tìm từ có nghĩa tương đồng</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Grammar Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <Wrench className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400" />
                            Ngữ pháp
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                disabled
                                className="p-6 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 6: Chọn ngữ pháp</h3>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">Đang phát triển...</p>
                                </div>
                            </button>
                            <button
                                disabled
                                className="p-6 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">Loại 7: Sắp xếp câu</h3>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">Đang phát triển...</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestScreen;
