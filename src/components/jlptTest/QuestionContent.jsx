import React from 'react';
import { Edit3, Volume2, Check, X } from 'lucide-react';

export const hasHtmlTags = (str) => {
    if (!str) return false;
    return /<\/?[a-z][\s\S]*>/i.test(str);
};

export const getCleanClassName = (baseClass, text) => {
    if (hasHtmlTags(text)) {
        return baseClass;
    }
    return `${baseClass} whitespace-pre-line`;
};

const QuestionContent = React.memo(({
    section,
    question,
    answers,
    currentSectionIdx,
    currentQuestionIdx,
    selectAnswer,
    selectAnswerSub,
    audioRef,
    isRealExam,
    isReview = false,
    canEdit = false,
    onEditQuestion = null
}) => {
    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    return (
        <>
            {canEdit && onEditQuestion && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => onEditQuestion(question, currentSectionIdx, currentQuestionIdx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-sm hover:shadow cursor-pointer select-none"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa HTML câu hỏi</span>
                    </button>
                </div>
            )}
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
                    <div className={getCleanClassName("text-gray-800 dark:text-gray-200 text-[17px] md:text-[19px] leading-relaxed font-japanese", question.passage)} dangerouslySetInnerHTML={{ __html: question.passage }} />
                </div>
            )}
            {/* Question Image */}
            {question?.imageUrl && (
                <div className="mb-6 max-w-2xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-2 flex justify-center">
                    <img src={question.imageUrl} alt="Câu hỏi" className="max-h-96 object-contain" />
                </div>
            )}
            {/* Question */}
            <div className="mb-6">
                <h3 className={getCleanClassName("text-xl md:text-2xl font-normal text-gray-800 dark:text-gray-100 leading-relaxed font-japanese", question?.question)} dangerouslySetInnerHTML={{ __html: question?.question }} />
            </div>
            {/* Options */}
            {question?.subQuestions && question.subQuestions.length > 0 ? (
                <div className="space-y-6 mb-8 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                    {question.subQuestions.map((sq, sqi) => {
                        const subAns = answers[subAnswerKey(currentSectionIdx, currentQuestionIdx, sqi)];
                        const isSqCorrect = subAns === sq.correctAnswer;
                        return (
                            <div key={sqi} className={`space-y-3 p-4 rounded-xl border ${
                                isReview
                                    ? isSqCorrect
                                        ? 'bg-green-50/40 dark:bg-green-950/10 border-green-250 dark:border-green-900/40'
                                        : 'bg-red-50/40 dark:bg-red-950/10 border-red-250 dark:border-red-900/40'
                                    : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/80'
                            }`}>
                                <h4 className={getCleanClassName("text-[17px] md:text-[19px] font-normal text-indigo-650 dark:text-indigo-400 font-japanese", sq.question)} dangerouslySetInnerHTML={{ __html: sq.question || `Câu hỏi phụ ${sqi + 1}:` }} />
                                <div className="grid grid-cols-1 gap-2.5">
                                    {sq.options?.map((opt, oi) => {
                                        const key = subAnswerKey(currentSectionIdx, currentQuestionIdx, sqi);
                                        const isSelected = answers[key] === oi;
                                        const isOptCorrect = sq.correctAnswer === oi;

                                        let optStyle = '';
                                        let circleStyle = '';

                                        if (isReview) {
                                            if (isOptCorrect) {
                                                optStyle = 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800/50 text-green-750 dark:text-green-350 font-semibold';
                                                circleStyle = 'bg-green-600 text-white';
                                            } else if (isSelected && !isOptCorrect) {
                                                optStyle = 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800/50 text-red-750 dark:text-red-300 font-semibold';
                                                circleStyle = 'bg-red-600 text-white';
                                            } else {
                                                optStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 dark:text-slate-400 opacity-60';
                                                circleStyle = 'bg-slate-200 dark:bg-slate-700 text-slate-500';
                                            }
                                        } else {
                                            optStyle = isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10';
                                            circleStyle = isSelected
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-400';
                                        }

                                        return (
                                            <div key={oi} onClick={(e) => {
                                                if (isReview) return;
                                                const selection = window.getSelection();
                                                if (selection && selection.toString().trim().length > 0) {
                                                    return;
                                                }
                                                selectAnswerSub(currentSectionIdx, currentQuestionIdx, sqi, oi);
                                            }}
                                                className={`w-full p-3.5 rounded-xl text-left text-[15px] md:text-[17px] font-medium transition-all border-2 ${
                                                    isReview ? 'cursor-default' : 'cursor-pointer'
                                                } ${optStyle}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none ${circleStyle}`}>
                                                            {String.fromCharCode(65 + oi)}
                                                        </div>
                                                        <span className={getCleanClassName("font-japanese animate-fade-in", opt)} dangerouslySetInnerHTML={{ __html: opt }} />
                                                    </div>
                                                    {isReview && (
                                                        <>
                                                            {isOptCorrect && <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />}
                                                            {isSelected && !isOptCorrect && <X className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {isReview && sq.explanation && (
                                    <p className={getCleanClassName("text-[15px] md:text-[16px] text-gray-500 dark:text-gray-400 mt-2 italic", sq.explanation)} dangerouslySetInnerHTML={{ __html: `💡 ${sq.explanation}` }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3 mb-8">
                    {question?.options?.map((opt, oi) => {
                        const key = answerKey(currentSectionIdx, currentQuestionIdx);
                        const isSelected = answers[key] === oi;
                        const isOptCorrect = question.correctAnswer === oi;

                        let optStyle = '';
                        let circleStyle = '';

                        if (isReview) {
                            if (isOptCorrect) {
                                optStyle = 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800/50 text-green-750 dark:text-green-350 font-semibold';
                                circleStyle = 'bg-green-600 text-white';
                            } else if (isSelected && !isOptCorrect) {
                                optStyle = 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800/50 text-red-750 dark:text-red-300 font-semibold';
                                circleStyle = 'bg-red-600 text-white';
                            } else {
                                optStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-550 dark:text-slate-400 opacity-60';
                                circleStyle = 'bg-slate-200 dark:bg-slate-700 text-slate-500';
                            }
                        } else {
                            optStyle = isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-500 text-gray-900 dark:text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10';
                            circleStyle = isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-400';
                        }

                        return (
                            <div key={oi} onClick={(e) => {
                                if (isReview) return;
                                const selection = window.getSelection();
                                if (selection && selection.toString().trim().length > 0) {
                                    return;
                                }
                                selectAnswer(currentSectionIdx, currentQuestionIdx, oi);
                            }}
                                className={`w-full p-4 rounded-xl text-left text-[15px] md:text-[17px] font-medium transition-all border-2 ${
                                    isReview ? 'cursor-default' : 'cursor-pointer'
                                } ${optStyle}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 select-none ${circleStyle}`}>
                                            {String.fromCharCode(65 + oi)}
                                        </div>
                                        <span className={getCleanClassName("font-japanese", opt)} dangerouslySetInnerHTML={{ __html: opt }} />
                                    </div>
                                    {isReview && (
                                        <>
                                            {isOptCorrect && <Check className="w-4 h-4 text-green-600 dark:text-green-405 shrink-0" />}
                                            {isSelected && !isOptCorrect && <X className="w-4 h-4 text-red-500 dark:text-red-405 shrink-0" />}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {isReview && (!question?.subQuestions || question.subQuestions.length === 0) && question?.explanation && (
                <p className={getCleanClassName("text-[15px] md:text-[16px] text-gray-500 dark:text-gray-400 mt-2 italic pl-2 mb-8", question.explanation)} dangerouslySetInnerHTML={{ __html: `💡 ${question.explanation}` }} />
            )}
        </>
    );
});

QuestionContent.displayName = 'QuestionContent';

export default QuestionContent;
