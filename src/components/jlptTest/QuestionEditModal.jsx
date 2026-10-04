import React, { useState, useEffect } from 'react';
import { 
    X, BookOpen, HelpCircle, Plus, Trash2, 
    CheckCircle2, Eye, EyeOff, Layers, ListChecks, ArrowRight
} from 'lucide-react';

const QuestionEditModal = ({ isOpen, onClose, initialQuestion, onSave }) => {
    const [formData, setFormData] = useState(null);
    const [activeTab, setActiveTab] = useState('passage'); // 'passage' | 'q-main' | 'sq-0' | 'sq-1'...
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (initialQuestion) {
            const clone = JSON.parse(JSON.stringify(initialQuestion));
            // Default subQuestions if not present
            if (!clone.subQuestions) clone.subQuestions = [];
            setFormData(clone);
            // Default tab: if passage exists, focus passage, otherwise focus question 1
            if (clone.passage || clone.passageData) {
                setActiveTab('passage');
            } else {
                setActiveTab(clone.subQuestions?.length > 0 ? 'sq-0' : 'q-main');
            }
        } else {
            setFormData(null);
        }
    }, [initialQuestion]);

    if (!isOpen || !formData) return null;

    const hasSubQuestions = Array.isArray(formData.subQuestions) && formData.subQuestions.length > 0;

    // Field changers
    const handleFieldChange = (field, val) => {
        setFormData(prev => ({
            ...prev,
            [field]: val
        }));
    };

    const handleOptionChange = (optIdx, val) => {
        setFormData(prev => {
            const opts = [...(prev.options || ['', '', '', ''])];
            opts[optIdx] = val;
            return { ...prev, options: opts };
        });
    };

    const handleSetCorrectAnswer = (idx) => {
        setFormData(prev => ({
            ...prev,
            correctAnswer: idx
        }));
    };

    // Sub-question handlers
    const handleSubQuestionFieldChange = (sqi, field, val) => {
        setFormData(prev => {
            const subQs = [...(prev.subQuestions || [])];
            if (subQs[sqi]) {
                subQs[sqi] = { ...subQs[sqi], [field]: val };
            }
            return { ...prev, subQuestions: subQs };
        });
    };

    const handleSubQuestionOptionChange = (sqi, optIdx, val) => {
        setFormData(prev => {
            const subQs = [...(prev.subQuestions || [])];
            if (subQs[sqi]) {
                const opts = [...(subQs[sqi].options || ['', '', '', ''])];
                opts[optIdx] = val;
                subQs[sqi] = { ...subQs[sqi], options: opts };
            }
            return { ...prev, subQuestions: subQs };
        });
    };

    const handleSetSubCorrectAnswer = (sqi, idx) => {
        setFormData(prev => {
            const subQs = [...(prev.subQuestions || [])];
            if (subQs[sqi]) {
                subQs[sqi] = { ...subQs[sqi], correctAnswer: idx };
            }
            return { ...prev, subQuestions: subQs };
        });
    };

    const handleAddSubQuestion = () => {
        setFormData(prev => {
            const subQs = [...(prev.subQuestions || [])];
            // If converting from single question to multi questions for the first time
            if (subQs.length === 0 && prev.question) {
                subQs.push({
                    id: `${prev.id || 'q'}-1`,
                    question: prev.question,
                    options: prev.options || ['', '', '', ''],
                    correctAnswer: typeof prev.correctAnswer === 'number' ? prev.correctAnswer : 0,
                    explanation: prev.explanation || ''
                });
            }

            const newIdx = subQs.length;
            subQs.push({
                id: `${prev.id || 'q'}-${newIdx + 1}`,
                question: `Câu hỏi ${newIdx + 1}: `,
                options: ['', '', '', ''],
                correctAnswer: 0,
                explanation: ''
            });

            return {
                ...prev,
                subQuestions: subQs
            };
        });

        const nextIdx = (formData.subQuestions?.length || 0);
        setActiveTab(`sq-${nextIdx}`);
    };

    const handleRemoveSubQuestion = (sqi) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa Câu ${sqi + 1}?`)) return;
        setFormData(prev => {
            const subQs = prev.subQuestions.filter((_, idx) => idx !== sqi);
            return {
                ...prev,
                subQuestions: subQs
            };
        });
        setActiveTab('passage');
    };

    // Insert HTML formatting tag helper
    const insertTag = (elementId, startTag, endTag) => {
        const textarea = document.getElementById(elementId);
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const replacement = startTag + selectedText + endTag;
        const newVal = text.substring(0, start) + replacement + text.substring(end);
        
        if (elementId === 'edit-passage') {
            handleFieldChange('passage', newVal);
        } else if (elementId === 'edit-question') {
            handleFieldChange('question', newVal);
        } else if (elementId === 'edit-explanation') {
            handleFieldChange('explanation', newVal);
        } else if (elementId.startsWith('edit-option-')) {
            const oi = parseInt(elementId.replace('edit-option-', ''), 10);
            handleOptionChange(oi, newVal);
        } else if (elementId.startsWith('edit-sq-')) {
            const parts = elementId.split('-');
            const sqi = parseInt(parts[2], 10);
            const fieldType = parts[3];
            if (fieldType === 'question') {
                handleSubQuestionFieldChange(sqi, 'question', newVal);
            } else if (fieldType === 'explanation') {
                handleSubQuestionFieldChange(sqi, 'explanation', newVal);
            } else if (fieldType === 'option') {
                const oi = parseInt(parts[4], 10);
                handleSubQuestionOptionChange(sqi, oi, newVal);
            }
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + startTag.length, start + startTag.length + selectedText.length);
        }, 0);
    };

    const renderToolbar = (elementId) => {
        return (
            <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-t-xl border-b border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => insertTag(elementId, '<b>', '</b>')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer" title="In đậm">B</button>
                <button type="button" onClick={() => insertTag(elementId, '<i>', '</i>')} className="px-2 py-1 text-xs italic hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer" title="In nghiêng">I</button>
                <button type="button" onClick={() => insertTag(elementId, '<u>', '</u>')} className="px-2 py-1 text-xs underline hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer" title="Gạch chân">U</button>
                <button type="button" onClick={() => insertTag(elementId, '「', '」')} className="px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer" title="Ngoặc tiếng Nhật">「」</button>
                <button type="button" onClick={() => insertTag(elementId, '<ruby>', '<rt>よみかた</rt></ruby>')} className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-rose-600 dark:text-rose-400 font-bold cursor-pointer" title="Thêm Furigana (Ruby)">Ruby</button>
                <button type="button" onClick={() => insertTag(elementId, '<br/>', '')} className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sky-600 dark:text-sky-400 font-bold cursor-pointer" title="Xuống dòng">&lt;br/&gt;</button>
            </div>
        );
    };

    // Sub-question list to render
    const subQuestionsList = hasSubQuestions ? formData.subQuestions : [];

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-auto">
                
                {/* 1. Modal Header */}
                <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 px-2.5 py-0.5 rounded-md">
                                Chế độ Admin
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {hasSubQuestions ? `Dạng bài đọc gom nhóm (${subQuestionsList.length} câu hỏi)` : 'Biên tập bài đọc & câu hỏi'}
                            </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                            Chỉnh sửa Đoạn văn & Bộ câu hỏi
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                showPreview 
                                    ? 'bg-indigo-600 text-white shadow-xs' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                            title="Bật/Tắt xem trước giao diện"
                        >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Xem trước</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. Navigation Tabs (Đoạn văn, Câu 1, Câu 2, ...) */}
                <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-x-auto">
                    {/* Tab Đoạn văn */}
                    <button
                        type="button"
                        onClick={() => setActiveTab('passage')}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
                            activeTab === 'passage'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>📖 Đoạn văn bài đọc</span>
                    </button>

                    {/* Tabs for Questions */}
                    {!hasSubQuestions ? (
                        <button
                            type="button"
                            onClick={() => setActiveTab('q-main')}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
                                activeTab === 'q-main'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span>❓ Câu hỏi 1</span>
                        </button>
                    ) : (
                        subQuestionsList.map((sq, sqi) => (
                            <button
                                key={sqi}
                                type="button"
                                onClick={() => setActiveTab(`sq-${sqi}`)}
                                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
                                    activeTab === `sq-${sqi}`
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] flex items-center justify-center">
                                    {sqi + 1}
                                </span>
                                <span>Câu {sqi + 1}</span>
                            </button>
                        ))
                    )}

                    {/* Button to Add Sub Question (Gộp thêm câu hỏi con) */}
                    <button
                        type="button"
                        onClick={handleAddSubQuestion}
                        className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 shrink-0 cursor-pointer ml-auto"
                        title="Thêm câu hỏi mới vào chung bài đọc này"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm câu hỏi</span>
                    </button>
                </div>

                {/* 3. Modal Body Content */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 text-left">
                    
                    {/* TAB: Đoạn văn đọc hiểu (Passage) */}
                    {activeTab === 'passage' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                                    Nội dung Đoạn văn đọc hiểu (Passage HTML)
                                </label>
                                <span className="text-[11px] text-slate-400">
                                    Đoạn văn này được dùng chung cho tất cả các câu hỏi bên dưới
                                </span>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                                {renderToolbar('edit-passage')}
                                <textarea
                                    id="edit-passage"
                                    value={formData.passage || ''}
                                    onChange={(e) => handleFieldChange('passage', e.target.value)}
                                    placeholder="Dán hoặc nhập HTML của bài đọc tiếng Nhật (hoặc văn bản gốc)..."
                                    rows={10}
                                    className="w-full p-4 text-sm sm:text-base font-japanese leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                />
                            </div>

                            {/* Live Preview of Passage */}
                            {showPreview && formData.passage && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                                    <span className="text-[11px] font-black uppercase text-slate-500">Xem trước bài đọc:</span>
                                    <div 
                                        className="font-japanese text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line"
                                        dangerouslySetInnerHTML={{ __html: formData.passage }}
                                    />
                                </div>
                            )}

                            {/* Shortcut switch to questions */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(hasSubQuestions ? 'sq-0' : 'q-main')}
                                    className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 cursor-pointer"
                                >
                                    <span>Chuyển sang soạn Câu hỏi</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: Single Question (Câu 1 khi không có subquestions) */}
                    {activeTab === 'q-main' && !hasSubQuestions && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Question Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                    Nội dung câu hỏi (Question HTML)
                                </label>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                                    {renderToolbar('edit-question')}
                                    <textarea
                                        id="edit-question"
                                        value={formData.question || ''}
                                        onChange={(e) => handleFieldChange('question', e.target.value)}
                                        placeholder="Nhập nội dung câu hỏi tiếng Nhật..."
                                        rows={3}
                                        className="w-full p-3.5 text-sm sm:text-base font-japanese bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                    />
                                </div>
                            </div>

                            {/* 4 Options */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                    Các đáp án lựa chọn (Chọn dấu tích xanh ở phương án ĐÚNG)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {[0, 1, 2, 3].map((oi) => {
                                        const isCorrect = (formData.correctAnswer ?? 0) === oi;
                                        const letter = String.fromCharCode(65 + oi);
                                        return (
                                            <div 
                                                key={oi} 
                                                className={`p-3 rounded-2xl border transition-all ${
                                                    isCorrect 
                                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-2xs' 
                                                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                        Phương án {letter}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetCorrectAnswer(oi)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                                                            isCorrect
                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600'
                                                        }`}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>{isCorrect ? 'Đáp án ĐÚNG' : 'Chọn đúng'}</span>
                                                    </button>
                                                </div>
                                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                    {renderToolbar(`edit-option-${oi}`)}
                                                    <textarea
                                                        id={`edit-option-${oi}`}
                                                        value={formData.options?.[oi] || ''}
                                                        onChange={(e) => handleOptionChange(oi, e.target.value)}
                                                        rows={2}
                                                        placeholder={`Nội dung phương án ${letter}...`}
                                                        className="w-full p-2.5 text-sm font-japanese bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Explanation */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                    Giải thích chi tiết (Explanation HTML)
                                </label>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                                    {renderToolbar('edit-explanation')}
                                    <textarea
                                        id="edit-explanation"
                                        value={formData.explanation || ''}
                                        onChange={(e) => handleFieldChange('explanation', e.target.value)}
                                        placeholder="Nhập giải thích đáp án, phân tích các phương án và bí quyết làm bài..."
                                        rows={5}
                                        className="w-full p-3.5 text-sm leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: Sub-Questions (Câu 1, Câu 2... khi có danh sách câu hỏi gom nhóm) */}
                    {hasSubQuestions && activeTab.startsWith('sq-') && (() => {
                        const sqi = parseInt(activeTab.replace('sq-', ''), 10);
                        const sq = subQuestionsList[sqi];
                        if (!sq) return null;

                        return (
                            <div className="space-y-5 animate-fade-in" key={sqi}>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                            {sqi + 1}
                                        </span>
                                        <span className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-200">
                                            Đang chỉnh sửa: Câu hỏi số {sqi + 1}
                                        </span>
                                    </div>

                                    {subQuestionsList.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSubQuestion(sqi)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition flex items-center gap-1 cursor-pointer"
                                            title="Xóa câu hỏi này"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Xóa câu {sqi + 1}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Question Title */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                        Nội dung câu hỏi {sqi + 1} (HTML)
                                    </label>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                                        {renderToolbar(`edit-sq-${sqi}-question`)}
                                        <textarea
                                            id={`edit-sq-${sqi}-question`}
                                            value={sq.question || ''}
                                            onChange={(e) => handleSubQuestionFieldChange(sqi, 'question', e.target.value)}
                                            placeholder={`Nhập câu hỏi ${sqi + 1}...`}
                                            rows={3}
                                            className="w-full p-3.5 text-sm sm:text-base font-japanese bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                        />
                                    </div>
                                </div>

                                {/* 4 Options */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                        Các đáp án lựa chọn cho Câu {sqi + 1}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {[0, 1, 2, 3].map((oi) => {
                                            const isCorrect = (sq.correctAnswer ?? 0) === oi;
                                            const letter = String.fromCharCode(65 + oi);
                                            return (
                                                <div 
                                                    key={oi} 
                                                    className={`p-3 rounded-2xl border transition-all ${
                                                        isCorrect 
                                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-2xs' 
                                                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                            Phương án {letter}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetSubCorrectAnswer(sqi, oi)}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                                                                isCorrect
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600'
                                                            }`}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>{isCorrect ? 'Đáp án ĐÚNG' : 'Chọn đúng'}</span>
                                                        </button>
                                                    </div>
                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                        {renderToolbar(`edit-sq-${sqi}-option-${oi}`)}
                                                        <textarea
                                                            id={`edit-sq-${sqi}-option-${oi}`}
                                                            value={sq.options?.[oi] || ''}
                                                            onChange={(e) => handleSubQuestionOptionChange(sqi, oi, e.target.value)}
                                                            rows={2}
                                                            placeholder={`Nội dung phương án ${letter}...`}
                                                            className="w-full p-2.5 text-sm font-japanese bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                                        Giải thích câu {sqi + 1} (Explanation HTML)
                                    </label>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                                        {renderToolbar(`edit-sq-${sqi}-explanation`)}
                                        <textarea
                                            id={`edit-sq-${sqi}-explanation`}
                                            value={sq.explanation || ''}
                                            onChange={(e) => handleSubQuestionFieldChange(sqi, 'explanation', e.target.value)}
                                            placeholder={`Nhập giải thích đáp án cho câu ${sqi + 1}...`}
                                            rows={4}
                                            className="w-full p-3.5 text-sm leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none border-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 4. Modal Footer */}
                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
                    <div className="text-xs text-slate-500 font-medium hidden sm:block">
                        💡 Tip: Dùng tab phía trên để chuyển đổi giữa Đoạn văn và từng Câu hỏi
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs sm:text-sm font-bold cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button 
                            type="button"
                            onClick={() => onSave(formData)}
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition text-xs sm:text-sm font-black shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                        >
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionEditModal;
