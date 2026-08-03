import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const QuestionEditModal = ({ isOpen, onClose, initialQuestion, onSave }) => {
    const [formData, setFormData] = useState(null);

    useEffect(() => {
        if (initialQuestion) {
            setFormData(JSON.parse(JSON.stringify(initialQuestion)));
        } else {
            setFormData(null);
        }
    }, [initialQuestion]);

    if (!isOpen || !formData) return null;

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
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg border-b border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => insertTag(elementId, '<b>', '</b>')} className="px-2 py-1 text-xs font-bold hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer" title="In đậm">B</button>
                <button type="button" onClick={() => insertTag(elementId, '<i>', '</i>')} className="px-2 py-1 text-xs italic hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer" title="In nghiêng">I</button>
                <button type="button" onClick={() => insertTag(elementId, '<u>', '</u>')} className="px-2 py-1 text-xs underline hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer" title="Gạch chân">U</button>
                <button type="button" onClick={() => insertTag(elementId, '<ruby>', '<rt>よみかた</rt></ruby>')} className="px-2 py-1 text-xs hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-rose-600 dark:text-rose-400 font-bold cursor-pointer" title="Thêm Furigana">Ruby</button>
                <button type="button" onClick={() => insertTag(elementId, '<br/>', '')} className="px-2 py-1 text-xs hover:bg-slate-250 dark:hover:bg-slate-700 rounded text-sky-650 dark:text-sky-400 font-bold cursor-pointer" title="Xuống dòng">BR</button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/60 my-8">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-750 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-md">Chế độ Admin</span>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1 leading-snug">Chỉnh sửa HTML câu hỏi</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5 text-left">
                    {/* Passage */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Đoạn văn đọc hiểu (Passage HTML)</label>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {renderToolbar('edit-passage')}
                            <textarea
                                id="edit-passage"
                                value={formData.passage || ''}
                                onChange={(e) => handleFieldChange('passage', e.target.value)}
                                placeholder="Nhập HTML của đoạn văn đọc hiểu..."
                                className="w-full min-h-[100px] p-3 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                            />
                        </div>
                    </div>

                    {/* Question */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Nội dung câu hỏi (Question HTML)</label>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {renderToolbar('edit-question')}
                            <textarea
                                id="edit-question"
                                value={formData.question || ''}
                                onChange={(e) => handleFieldChange('question', e.target.value)}
                                placeholder="Nhập HTML của câu hỏi..."
                                className="w-full min-h-[80px] p-3 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                            />
                        </div>
                    </div>

                    {/* Options (if no subquestions) */}
                    {(!formData.subQuestions || formData.subQuestions.length === 0) && (
                        <div className="space-y-4">
                            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Các đáp án lựa chọn (Options HTML)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0, 1, 2, 3].map((oi) => (
                                    <div key={oi} className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-500">Đáp án {String.fromCharCode(65 + oi)}</span>
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            {renderToolbar(`edit-option-${oi}`)}
                                            <textarea
                                                id={`edit-option-${oi}`}
                                                value={formData.options?.[oi] || ''}
                                                onChange={(e) => handleOptionChange(oi, e.target.value)}
                                                className="w-full min-h-[60px] p-2 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explanation (if no subquestions) */}
                    {(!formData.subQuestions || formData.subQuestions.length === 0) && (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Giải thích đáp án (Explanation HTML)</label>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                {renderToolbar('edit-explanation')}
                                <textarea
                                    id="edit-explanation"
                                    value={formData.explanation || ''}
                                    onChange={(e) => handleFieldChange('explanation', e.target.value)}
                                    placeholder="Nhập giải thích cho câu hỏi..."
                                    className="w-full min-h-[80px] p-3 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                                />
                            </div>
                        </div>
                    )}

                    {/* Sub-questions */}
                    {formData.subQuestions && formData.subQuestions.length > 0 && (
                        <div className="space-y-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white font-sans">Các câu hỏi phụ</h4>
                            {formData.subQuestions.map((sq, sqi) => (
                                <div key={sqi} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 font-sans">Câu hỏi phụ {sqi + 1} (HTML)</label>
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                            {renderToolbar(`edit-sq-${sqi}-question`)}
                                            <textarea
                                                id={`edit-sq-${sqi}-question`}
                                                value={sq.question || ''}
                                                onChange={(e) => handleSubQuestionFieldChange(sqi, 'question', e.target.value)}
                                                className="w-full min-h-[60px] p-2 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold text-slate-500 font-sans">Các đáp án lựa chọn câu phụ {sqi + 1}</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[0, 1, 2, 3].map((oi) => (
                                                <div key={oi} className="space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400">Đáp án {String.fromCharCode(65 + oi)}</span>
                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                        {renderToolbar(`edit-sq-${sqi}-option-${oi}`)}
                                                        <textarea
                                                            id={`edit-sq-${sqi}-option-${oi}`}
                                                            value={sq.options?.[oi] || ''}
                                                            onChange={(e) => handleSubQuestionOptionChange(sqi, oi, e.target.value)}
                                                            className="w-full min-h-[60px] p-2 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 font-sans">Giải thích câu phụ {sqi + 1} (HTML)</label>
                                        <div className="border border-slate-205 dark:border-slate-700 rounded-lg overflow-hidden">
                                            {renderToolbar(`edit-sq-${sqi}-explanation`)}
                                            <textarea
                                                id={`edit-sq-${sqi}-explanation`}
                                                value={sq.explanation || ''}
                                                onChange={(e) => handleSubQuestionFieldChange(sqi, 'explanation', e.target.value)}
                                                className="w-full min-h-[60px] p-2 text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-0 border-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-bold cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={() => onSave(formData)}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition text-sm font-bold shadow-md hover:shadow-lg cursor-pointer"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionEditModal;
