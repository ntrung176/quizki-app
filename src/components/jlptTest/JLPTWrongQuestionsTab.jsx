import React, { useState, useMemo } from 'react';
import { 
    AlertCircle, CheckCircle2, RotateCcw, Play, Trash2, 
    BookOpen, Search, Filter, Check, ArrowRight, 
    Layers, Plus, Trophy
} from 'lucide-react';
import { LEVEL_GRADIENTS } from './jlptConstants';
import QuestionExplanationCard from './QuestionExplanationCard';

const JLPTWrongQuestionsTab = ({
    wrongQuestions = {},
    selectedLevel = 'all',
    searchQuery = '',
    onRemoveWrongQuestion,
    onClearAllWrongQuestions,
    onStartPracticeWrong,
    onAddFlashcard
}) => {
    const [selectedSkill, setSelectedSkill] = useState('all');
    const [localSearch, setLocalSearch] = useState('');
    const [masteredMap, setMasteredMap] = useState({});

    // Convert object to array
    const wrongList = useMemo(() => {
        return Object.entries(wrongQuestions).map(([qKey, item]) => ({
            key: qKey,
            ...item
        }));
    }, [wrongQuestions]);

    const activeSearch = searchQuery || localSearch;

    const filteredList = useMemo(() => {
        return wrongList.filter(item => {
            if (selectedLevel !== 'all' && item.level !== selectedLevel) return false;
            if (selectedSkill !== 'all' && item.skillType !== selectedSkill && item.sectionType !== selectedSkill) return false;
            if (activeSearch.trim()) {
                const query = activeSearch.toLowerCase();
                const qText = (item.question || '').toLowerCase();
                const expText = (item.explanation || '').toLowerCase();
                const titleText = (item.testTitle || '').toLowerCase();
                if (!qText.includes(query) && !expText.includes(query) && !titleText.includes(query)) return false;
            }
            return true;
        });
    }, [wrongList, selectedLevel, selectedSkill, activeSearch]);

    const handleToggleMastered = (key) => {
        setMasteredMap(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            
            {/* 1. Header & Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Sổ tay câu làm sai</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {filteredList.length} câu
                        </span>
                    </h2>
                </div>

                {wrongList.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {onStartPracticeWrong && (
                            <button
                                onClick={() => onStartPracticeWrong(filteredList)}
                                disabled={filteredList.length === 0}
                                className="px-5 py-2.5 bg-[#f494bc] hover:bg-[#f6a0c5] disabled:opacity-40 text-slate-950 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-[0_4px_14px_rgba(244,148,188,0.4)] cursor-pointer active:scale-95"
                            >
                                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                                <span>Luyện lại câu sai ({filteredList.length})</span>
                            </button>
                        )}

                        {onClearAllWrongQuestions && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Bạn có chắc muốn xóa tất cả câu sai khỏi sổ tay?')) {
                                        onClearAllWrongQuestions();
                                    }
                                }}
                                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
                                title="Xóa tất cả câu trong sổ tay"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 2. List of Wrong Questions */}
            {filteredList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                        Sổ tay trống!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {wrongList.length === 0
                            ? 'Tuyệt vời! Hiện tại bạn chưa có câu hỏi nào làm sai hoặc đã hoàn thành ôn tập tất cả.'
                            : 'Không tìm thấy câu hỏi sai phù hợp với bộ lọc hiện tại.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredList.map((item, idx) => {
                        const isMastered = !!masteredMap[item.key];
                        return (
                            <div
                                key={item.key || idx}
                                className={`bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all space-y-4 shadow-xs ${
                                    isMastered
                                        ? 'opacity-60 border-emerald-300 dark:border-emerald-800 bg-emerald-50/10'
                                        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                                }`}
                            >
                                {/* Item Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/50">
                                            {item.level || 'JLPT'}
                                        </span>
                                        {item.testTitle && (
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                                                {item.testTitle}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleToggleMastered(item.key)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                                isMastered
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                            title="Đánh dấu đã hiểu"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>{isMastered ? 'Đã thành thạo' : 'Đã hiểu'}</span>
                                        </button>

                                        {onRemoveWrongQuestion && (
                                            <button
                                                onClick={() => onRemoveWrongQuestion(item.key)}
                                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                                title="Xóa khỏi sổ tay"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Question Stem */}
                                <div 
                                    className="font-japanese text-[16px] sm:text-[17px] font-medium text-slate-900 dark:text-white leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: item.question }}
                                />

                                {/* Options breakdown */}
                                {item.options && item.options.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {item.options.map((opt, oi) => {
                                            const isCorrect = oi === item.correctAnswer;
                                            const isUserChoice = oi === item.userAnswer;
                                            const letter = String.fromCharCode(65 + oi);

                                            return (
                                                <div
                                                    key={oi}
                                                    className={`p-3 rounded-xl border text-xs sm:text-sm font-japanese flex items-center justify-between gap-2.5 ${
                                                        isCorrect
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                                                            : isUserChoice
                                                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-400 line-through'
                                                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold opacity-70">[{letter}]</span>
                                                        <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                    </div>
                                                    {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Detailed Explanation Card */}
                                <QuestionExplanationCard 
                                    question={item}
                                    options={item.options || []}
                                    correctAnswer={item.correctAnswer}
                                    userAnswer={item.userAnswer}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default JLPTWrongQuestionsTab;
