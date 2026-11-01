import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FileCheck, X, Check, Languages, BookOpen, Wrench, ArrowLeft } from 'lucide-react'
import { shuffleArray } from '../../utils/textProcessing';
import { celebrateCorrectAnswer, flashCorrect, launchFanfare } from '../../utils/celebrations'
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { showToast } from '../../utils/toast';
const TestScreen = ({ allCards, onBack }) => {
    const { t } = useLanguage();
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
            showToast('Không có đủ dữ liệu để tạo câu hỏi. Vui lòng thêm ví dụ và nghĩa cho từ vựng hoặc chọn cấp độ khác.', 'warning');
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
                    // Use first example line for context if multiple
                    const firstExample = (card.example || '').split('\n')[0].trim();
                    return {
                        question: t('test.readingQuestion', 'Reading of "___BOLD___{word}___BOLD___" is:').replace('{word}', kanjiOnly),
                        context: firstExample,
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: kanjiOnly,
                        vocabWord: card.front,
                        vocabMeaning: card.back
                    };
                });
            } else if (type === 2) {
                generatedQuestions = selectedCards.map(card => {
                    const hiragana = extractHiragana(card.front);
                    const kanjiOnly = card.front.split('（')[0];
                    const correctAnswer = kanjiOnly;
                    const wrongOptions = generateWrongKanji(card, allCards, 3);
                    const options = shuffleArray([correctAnswer, ...wrongOptions]);
                    // Use first example line for context if multiple
                    const firstExample = (card.example || '').split('\n')[0].trim();
                    const contextWithHiragana = firstExample.replace(kanjiOnly, hiragana);
                    return {
                        question: t('test.kanjiQuestion', 'Kanji for "___BOLD___{word}___BOLD___" is:').replace('{word}', hiragana),
                        context: contextWithHiragana || '',
                        options: options,
                        correctAnswer: correctAnswer,
                        explanation: card.back,
                        highlightWord: hiragana,
                        vocabWord: card.front,
                        vocabMeaning: card.back
                    };
                });
            }
        } else if (mode === 'vocab') {
            if (type === 3) {
                generatedQuestions = selectedCards.flatMap(card => {
                    // Split examples by newline - each line becomes an independent question
                    const examples = card.example.split('\n').map(e => e.trim()).filter(e => e);
                    const exampleMeanings = (card.exampleMeaning || card.back || '').split('\n').map(e => e.trim());
                    return examples.map((exampleLine, idx) => {
                        const blankSentence = exampleLine.replace(card.front.split('（')[0], '＿＿＿');
                        const correctAnswer = card.front;
                        const wrongOptions = generateSimilarVocab(card, allCards, 3);
                        const options = shuffleArray([correctAnswer, ...wrongOptions]);
                        return {
                            question: t('test.fillBlankQuestion', 'Choose the correct word to fill in the blank:'),
                            context: blankSentence,
                            options: options,
                            correctAnswer: correctAnswer,
                            explanation: exampleMeanings[idx] || card.back,
                            vocabWord: card.front,
                            vocabMeaning: card.back
                        };
                    });
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
                            question: t('test.synonymQuestion', 'Synonym of "___BOLD___{word}___BOLD___" is:').replace('{word}', card.front),
                            context: '',
                            options: options,
                            correctAnswer: correctAnswer,
                            explanation: t('test.synonymExplanation', '{word} = {synonym}. Meaning: {meaning}').replace('{word}', card.front).replace('{synonym}', card.synonym).replace('{meaning}', card.back),
                            vocabWord: t('test.synonymVocabWord', '{word} (Synonym: {synonym})').replace('{word}', card.front).replace('{synonym}', card.synonym),
                            vocabMeaning: card.back
                        };
                    });
            }
        } else if (mode === 'grammar') {
            showToast('Tính năng Ngữ pháp đang được phát triển. Vui lòng thêm dữ liệu ngữ pháp.', 'info');
            return [];
        }
        return generatedQuestions;
    };
    // Helper functions
    const extractHiragana = (word) => {
        const match = word.match(/（(.+?)）/);
        return match ? match[1] : word;
    };
    const getSameLangCards = (correctCard, cards) => {
        const targetLang = correctCard?.targetLanguage || 'ja';
        return cards.filter(c => (c.targetLanguage || 'ja') === targetLang);
    };
    const generateWrongHiragana = (correctWord, allCards, count) => {
        const correctCard = allCards.find(card => card.front === correctWord);
        const pool = correctCard ? getSameLangCards(correctCard, allCards) : allCards;
        const correctHira = extractHiragana(correctWord);
        const samePosCards = pool.filter(c =>
            c.pos === correctCard?.pos &&
            c.front !== correctWord &&
            extractHiragana(c.front) !== correctHira
        );
        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => extractHiragana(c.front));
        while (options.length < count && pool.length > 0) {
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
            const hira = extractHiragana(randomCard.front);
            if (hira !== correctHira && !options.includes(hira)) {
                options.push(hira);
            }
        }
        return options;
    };
    const generateWrongKanji = (correctCard, allCards, count) => {
        const pool = getSameLangCards(correctCard, allCards);
        const correctKanji = correctCard.front.split('（')[0];
        const samePosCards = pool.filter(c =>
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.front.split('（')[0] !== correctKanji
        );
        const options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.front.split('（')[0]);
        while (options.length < count && pool.length > 0) {
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
            const kanji = randomCard.front.split('（')[0];
            if (kanji !== correctKanji && !options.includes(kanji)) {
                options.push(kanji);
            }
        }
        return options;
    };
    const generateSimilarVocab = (correctCard, allCards, count) => {
        const pool = getSameLangCards(correctCard, allCards);
        const correctWord = correctCard.front;
        const samePosCards = pool.filter(c =>
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
            const similarLengthCards = pool.filter(c =>
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
        while (options.length < count && pool.length > 0) {
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
            if (randomCard.front !== correctWord && !options.includes(randomCard.front)) {
                options.push(randomCard.front);
            }
        }
        return options;
    };
    const generateWrongSynonyms = (correctCard, allCards, count) => {
        const pool = getSameLangCards(correctCard, allCards);
        const correctSynonym = correctCard.synonym?.split(',')[0].trim();
        const samePosCards = pool.filter(c =>
            c.pos === correctCard.pos &&
            c.front !== correctCard.front &&
            c.synonym && c.synonym.trim() !== ''
        );
        let options = samePosCards
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(c => c.synonym.split(',')[0].trim());
        while (options.length < count && pool.length > 0) {
            const randomCard = pool[Math.floor(Math.random() * pool.length)];
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
            playCorrectSound();
        } else {
            playIncorrectSound();
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
                return <span key={idx} className="font-bold text-emerald-700 underline decoration-2 font-japanese">{part}</span>;
            }
            return part;
        });
    };
    // Trigger fanfare on result screen
    useEffect(() => {
        if (showResult) {
            launchFanfare();
        }
    }, [showResult]);
    // Auto-exit after 3 seconds when showing results
    useEffect(() => {
        if (showResult) {
            const timer = setTimeout(() => {
                if (onBack) onBack();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showResult, onBack]);
    // Enter key handler for test result screen
    useEffect(() => {
        const handleResultKeyDown = (e) => {
            if (showResult && e.key === 'Enter') {
                e.preventDefault();
                if (onBack) onBack();
            }
        };
        window.addEventListener('keydown', handleResultKeyDown);
        return () => window.removeEventListener('keydown', handleResultKeyDown);
    }, [showResult, onBack]);

    // Render result screen
    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        const passed = percentage >= 70;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm animate-fade-in">
                <div className="flex flex-col items-center justify-center text-center space-y-6 p-6 max-w-md">
                    <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-sky-200 dark:from-emerald-900/30 dark:to-sky-900/30 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 animate-bounce">
                            <Award className="w-10 h-10 text-white" strokeWidth={2} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-gray-800 dark:text-gray-100 mb-3">
                            {passed ? t('test.greatJob', 'Tuyệt vời! 🎉') : t('test.completed', 'Hoàn thành! 💪')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                            {t('test.completedSub', 'Bạn đã hoàn thành bài kiểm tra này.')}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xl mt-2">
                            {t('test.scoreResult', 'Đạt {score}/{total} câu đúng ({percent}%)').replace('{score}', score).replace('{total}', questions.length).replace('{percent}', percentage)}
                        </p>
                    </div>
                    <button
                        onClick={() => { if (onBack) onBack(); }}
                        className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer select-none"
                    >{t('test.returnBtn', 'Trở về')}</button>
                </div>
            </div>
        );
    }
    // Render question screen
    if (testMode && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];
        return (
            <div className="relative min-h-screen bg-transparent p-4 md:p-8">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-4 left-4 z-50 p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all border border-gray-200 dark:border-slate-700 hover:scale-105"
                        title={t('test.back', 'Trở lại')}
                    >
                        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                )}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                        {/* Progress bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span>{t('test.questionProgress', 'Câu {current}/{total}').replace('{current}', currentQuestionIndex + 1).replace('{total}', questions.length)}</span>
                                <span>{t('test.scoreLabel', 'Điểm: {score}').replace('{score}', score)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                                />
                            </div>
                        </div>
                        {/* Question */}
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-auto-fit">
                                {renderBoldText(currentQuestion.question)}
                            </h3>
                            {currentQuestion.context && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                    <p className="text-gray-800 dark:text-gray-200 quiz-example-text text-auto-fit">{renderBoldText(currentQuestion.context)}</p>
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
                                    <div
                                        key={idx}
                                        onClick={(e) => { if (!isAnswered) handleAnswerSelect(option, e); }}
                                        className={`w-full p-4 rounded-2xl text-left font-bold transition-all border-2 border-b-4 active:translate-y-0.5 active:border-b-2 select-none ${showCorrect
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300'
                                            : showWrong
                                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 text-rose-800 dark:text-rose-300'
                                                : isSelected
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 dark:border-sky-600 text-slate-900 dark:text-white'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                            } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-japanese text-base">{option}</span>
                                            {showCorrect && <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />}
                                            {showWrong && <X className="w-5 h-5 text-rose-600" strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Explanation */}
                        {isAnswered && (
                            <div className={`p-4 rounded-2xl mb-6 border-2 ${selectedAnswer === currentQuestion.correctAnswer
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                                }`}>
                                <p className="text-sm font-bold mb-1 dark:text-slate-200">
                                    {selectedAnswer === currentQuestion.correctAnswer ? t('test.correct', '✓ Chính xác!') : t('test.incorrect', '✗ Chưa đúng')}
                                </p>
                                {selectedAnswer !== currentQuestion.correctAnswer && (currentQuestion.vocabWord || currentQuestion.vocabMeaning) ? (
                                    <div className="space-y-1 mt-2 text-sm border-t border-rose-200 dark:border-rose-800/40 pt-2">
                                        <p className="text-rose-800 dark:text-rose-300">
                                            {t('test.vocab', 'Từ vựng:')} <span className="font-japanese font-bold text-base">{currentQuestion.vocabWord}</span>
                                        </p>
                                        <p className="text-rose-800 dark:text-rose-300">
                                            {t('test.meaning', 'Ý nghĩa:')} <span className="font-semibold">{currentQuestion.vocabMeaning}</span>
                                        </p>
                                        {currentQuestion.explanation && currentQuestion.explanation !== currentQuestion.vocabMeaning && (
                                            <p className="text-slate-500 dark:text-slate-400 text-xs italic mt-1">
                                                {t('test.explanation', 'Giải thích: {text}').replace('{text}', currentQuestion.explanation)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{currentQuestion.explanation}</p>
                                )}
                            </div>
                        )}
                        {/* Next button */}
                        <button
                            onClick={handleNextQuestion}
                            disabled={!isAnswered}
                            className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all select-none ${isAnswered
                                ? 'bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 text-white cursor-pointer shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {currentQuestionIndex < questions.length - 1 ? t('test.nextQuestion', 'Câu tiếp theo') : t('test.viewResults', 'Xem kết quả')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // Render config screen
    if (showConfig) {
        return (
            <div className="min-h-screen bg-transparent p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8 border-2 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('test.configTitle', 'Cấu hình bài kiểm tra')}</h2>
                            <button onClick={handleBackToMenu} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        {/* JLPT Level Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                {t('test.selectLevel', 'Chọn cấp độ JLPT:')}
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`py-2 px-3 rounded-2xl font-black text-xs transition-all cursor-pointer select-none border-2 border-b-4 active:translate-y-0.5 active:border-b-2 ${selectedLevel === level
                                            ? 'bg-emerald-500 border-emerald-700 text-white'
                                            : 'bg-white dark:bg-gray-700 border-slate-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {level === 'all' ? t('test.allLevels', 'Tất cả') : level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Question Count Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                {t('test.questionCount', 'Số lượng câu hỏi: {count}').replace('{count}', '')}<span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{questionCount}</span>
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs font-mono font-bold text-gray-400 mt-1">
                                <span>5</span>
                                <span>25</span>
                                <span>50</span>
                            </div>
                        </div>
                        {/* Start button */}
                        <button
                            onClick={handleStartTest}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer select-none"
                        >
                            {t('test.startTest', 'Bắt đầu kiểm tra')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // Render menu screen (initial)
    return (
        <div className="relative min-h-screen bg-transparent p-4 md:p-8">
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 z-50 p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all border border-gray-200 dark:border-slate-700 hover:scale-105"
                    title={t('test.back', 'Trở lại')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            )}
            <div className="max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <FileCheck className="w-8 h-8 mr-3 text-emerald-600 dark:text-emerald-400" />
                            {t('test.title', 'Luyện Thi JLPT')}
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
                        {t('test.subtitle', 'Chọn dạng bài tập bạn muốn luyện tập')}
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
                                className="p-5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:translate-y-0.5 active:border-b-2 rounded-3xl transition-all cursor-pointer text-left select-none"
                            >
                                <div className="text-left">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{t('test.type1Title', 'Loại 1: Kanji → Hiragana')}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t('test.type1Desc', 'Nhìn Kanji, chọn cách đọc đúng')}</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('kanji', 2)}
                                className="p-5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:translate-y-0.5 active:border-b-2 rounded-3xl transition-all cursor-pointer text-left select-none"
                            >
                                <div className="text-left">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{t('test.type2Title', 'Loại 2: Hiragana → Kanji')}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t('test.type2Desc', 'Nhìn Hiragana, chọn Kanji đúng')}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    {/* Vocab Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <BookOpen className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" />
                            {t('test.vocabSection', 'Từ vựng')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleShowConfig('vocab', 3)}
                                className="p-5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:translate-y-0.5 active:border-b-2 rounded-3xl transition-all cursor-pointer text-left select-none"
                            >
                                <div className="text-left">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{t('test.type3Title', 'Loại 3: Điền từ vào câu')}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t('test.type3Desc', 'Chọn từ phù hợp với ngữ cảnh')}</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleShowConfig('vocab', 4)}
                                className="p-5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:translate-y-0.5 active:border-b-2 rounded-3xl transition-all cursor-pointer text-left select-none"
                            >
                                <div className="text-left">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{t('test.type4Title', 'Loại 4: Từ đồng nghĩa')}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t('test.type4Desc', 'Tìm từ có nghĩa tương đồng')}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    {/* Grammar Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                            <Wrench className="w-6 h-6 mr-2 text-sky-600 dark:text-sky-400" />
                            {t('test.grammarSection', 'Ngữ pháp')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                disabled
                                className="p-6 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">{t('test.type6Title', 'Loại 6: Chọn ngữ pháp')}</h3>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.inDevelopment', 'Đang phát triển...')}</p>
                                </div>
                            </button>
                            <button
                                disabled
                                className="p-6 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl cursor-not-allowed"
                            >
                                <div className="text-left">
                                    <h3 className="text-xl font-bold mb-2">{t('test.type7Title', 'Loại 7: Sắp xếp câu')}</h3>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.inDevelopment', 'Đang phát triển...')}</p>
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
