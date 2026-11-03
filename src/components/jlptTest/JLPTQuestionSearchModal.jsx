import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Edit, BookOpen, CheckCircle2, ChevronRight, Layers, AlertCircle, FileText, Sparkles } from 'lucide-react';
import QuestionEditModal from './QuestionEditModal';

/**
 * Utility to strip HTML tags for clean search
 */
const stripHtml = (html) => {
    if (!html) return '';
    return String(html).replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Highlights matches in text safely
 */
const highlightMatch = (text, query) => {
    if (!text || !query.trim()) return text;
    const cleanStr = String(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = cleanStr.split(regex);
    return parts.map((part, i) => 
        regex.test(part) ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">
                {part}
            </mark>
        ) : part
    );
};

const JLPTQuestionSearchModal = ({
    isOpen,
    onClose,
    tests = [],
    onSaveQuestion
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [editingTarget, setEditingTarget] = useState(null); // { test, sectionIdx, questionIdx, question }
    const searchInputRef = useRef(null);

    // Auto focus search input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            setSearchQuery('');
            setEditingTarget(null);
        }
    }, [isOpen]);

    // Flatten all questions across all tests with indexing metadata
    const allQuestionsIndex = useMemo(() => {
        const list = [];
        if (!Array.isArray(tests)) return list;

        tests.forEach(test => {
            if (!test || !Array.isArray(test.sections)) return;
            const testLevel = (test.level || 'N5').toUpperCase();

            test.sections.forEach((section, sIdx) => {
                if (!section || !Array.isArray(section.questions)) return;
                const sectionName = section.title || section.name || `Phần ${sIdx + 1}`;

                section.questions.forEach((q, qIdx) => {
                    if (!q) return;

                    // Text representation for search
                    const qText = q.question || q.title || q.text || '';
                    const optionsText = Array.isArray(q.options) ? q.options.join(' ') : '';
                    const explainText = q.explanation || q.detail || '';
                    const passageText = q.passage || '';

                    // Check sub-questions text
                    let subText = '';
                    if (Array.isArray(q.subQuestions)) {
                        q.subQuestions.forEach(sq => {
                            subText += ` ${sq.question || ''} ${(sq.options || []).join(' ')} ${sq.explanation || ''}`;
                        });
                    }

                    const searchableBlob = stripHtml(`${qText} ${optionsText} ${explainText} ${passageText} ${subText} ${test.title || ''}`).toLowerCase();

                    list.push({
                        test,
                        testId: test.id,
                        testTitle: test.title || 'Đề thi JLPT',
                        testLevel,
                        section,
                        sectionIdx: sIdx,
                        sectionName,
                        question: q,
                        questionIdx: qIdx,
                        qText,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer ?? q.correct ?? 0,
                        explanation: explainText,
                        searchableBlob
                    });
                });
            });
        });

        return list;
    }, [tests]);

    // Search and filter questions
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const qClean = searchQuery.toLowerCase().trim();

        return allQuestionsIndex.filter(item => {
            if (selectedLevel !== 'all' && item.testLevel !== selectedLevel) {
                return false;
            }
            return item.searchableBlob.includes(qClean);
        }).slice(0, 50); // limit to top 50 matches for maximum UI responsiveness
    }, [allQuestionsIndex, searchQuery, selectedLevel]);

    const handleSaveQuestion = async (updatedQuestion) => {
        if (!editingTarget || !onSaveQuestion) return;
        const { testId, sectionIdx, questionIdx } = editingTarget;
        const success = await onSaveQuestion(testId, sectionIdx, questionIdx, updatedQuestion);
        if (success) {
            setEditingTarget(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100050] flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-4xl w-full h-[90vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                                <Search className="w-5 h-5 stroke-[2.5]" />
                            </span>
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    Tìm & Sửa Nhanh Câu Hỏi JLPT
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        Admin
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Tìm kiếm bất kỳ câu hỏi nào trong {allQuestionsIndex.length} câu hỏi của toàn bộ đề thi để sửa đáp án và giải thích ngay lập tức.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Search Controls */}
                    <div className="pt-4 pb-3 space-y-3 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Nhập từ khóa câu hỏi, chữ Hán, đáp án hoặc giải thích (VD: 森へ, まち, 行かないで)..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200/80 dark:border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        <X className="w-4 h-4 stroke-[2.5]" />
                                    </button>
                                )}
                            </div>

                            {/* Level Filter Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 overflow-x-auto">
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
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                            selectedLevel === lvl.key
                                                ? 'bg-emerald-500 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {lvl.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Info Indicator */}
                        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                            {searchQuery.trim() ? (
                                <span>
                                    Tìm thấy <strong className="text-emerald-600 dark:text-emerald-400 font-black">{searchResults.length}</strong> kết quả phù hợp {searchResults.length === 50 ? '(hiển thị 50 kết quả đầu tiên)' : ''}
                                </span>
                            ) : (
                                <span>Gõ từ khóa để bắt đầu tìm kiếm nhanh câu hỏi...</span>
                            )}
                            <span className="text-[11px] text-slate-400">
                                Mẹo: Bấm <strong>Sửa & AI</strong> để mở bảng chỉnh sửa, dùng AI check đáp án và tạo giải thích ngắn gọn tức thì.
                            </span>
                        </div>
                    </div>

                    {/* Search Results List */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
                        {!searchQuery.trim() ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <Search className="w-12 h-12 stroke-[1.5] text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                    Nhập từ trong câu hỏi bạn muốn sửa vào ô tìm kiếm ở trên
                                </p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Hệ thống sẽ tra cứu tức thì trên toàn bộ các cấp độ N5, N4, N3, N2, N1 và định vị chính xác vị trí câu hỏi để bạn chỉnh sửa.
                                </p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                <AlertCircle className="w-10 h-10 text-amber-500/80 mb-2" />
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Không tìm thấy câu hỏi nào chứa từ khóa "{searchQuery}"
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Hãy thử tìm một cụm từ ngắn hơn hoặc kiểm tra bộ lọc cấp độ JLPT.
                                </p>
                            </div>
                        ) : (
                            searchResults.map((item, idx) => {
                                const currentCorrectLetter = String.fromCharCode(65 + (item.correctAnswer || 0));
                                const currentCorrectText = item.options[item.correctAnswer] || '';

                                return (
                                    <div 
                                        key={`${item.testId}-${item.sectionIdx}-${item.questionIdx}-${idx}`}
                                        className="bg-white dark:bg-slate-950/60 rounded-2xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:border-emerald-400 dark:hover:border-emerald-700/70 transition-all shadow-xs space-y-3"
                                    >
                                        {/* Card Top: Breadcrumb metadata + Edit button */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-900/60">
                                                    {item.testLevel}
                                                </span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    {item.testTitle}
                                                </span>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    {item.sectionName}
                                                </span>
                                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                    • Câu #{item.questionIdx + 1}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => setEditingTarget(item)}
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 border-b-3 border-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none"
                                                title="Mở bảng sửa câu hỏi và dùng AI check đáp án / tạo giải thích"
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                                <span>Sửa & AI</span>
                                            </button>
                                        </div>

                                        {/* Question Stem */}
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-sm sm:text-base font-japanese font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                                            {highlightMatch(stripHtml(item.qText), searchQuery)}
                                        </div>

                                        {/* Options Grid */}
                                        {item.options && item.options.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {item.options.map((opt, optIdx) => {
                                                    const letter = String.fromCharCode(65 + optIdx);
                                                    const isCorrect = optIdx === item.correctAnswer;
                                                    return (
                                                        <div 
                                                            key={optIdx}
                                                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-all ${
                                                                isCorrect
                                                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                                                                isCorrect 
                                                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                                {letter}
                                                            </span>
                                                            <span className="font-japanese truncate flex-1">
                                                                {highlightMatch(stripHtml(opt), searchQuery)}
                                                            </span>
                                                            {isCorrect && (
                                                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 shrink-0">
                                                                    ✓ Đáp án đúng
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Explanation preview if available */}
                                        {item.explanation && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                                                <strong>Giải thích:</strong> {highlightMatch(stripHtml(item.explanation), searchQuery)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                        <span>Nhấn Esc hoặc bấm nút Đóng để quay lại.</span>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition cursor-pointer"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested Question Edit Modal */}
            {editingTarget && (
                <QuestionEditModal
                    isOpen={Boolean(editingTarget)}
                    onClose={() => setEditingTarget(null)}
                    initialQuestion={editingTarget.question}
                    onSave={handleSaveQuestion}
                />
            )}
        </>
    );
};

export default JLPTQuestionSearchModal;

