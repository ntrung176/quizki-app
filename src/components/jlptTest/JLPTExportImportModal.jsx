import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Copy, Check, Download, Upload, AlertCircle, 
    CheckCircle2, FileCode, Sparkles, RefreshCw, 
    Layers, BookOpen, HelpCircle, ChevronDown, ChevronRight,
    ArrowRight, Info
} from 'lucide-react';

/**
 * Normalizes answer to 0-based index (0, 1, 2, 3)
 */
export const normalizeAnswerIndex = (rawAnswer, options = []) => {
    if (typeof rawAnswer === 'number') {
        // If 1-based (1..4)
        if (rawAnswer >= 1 && rawAnswer <= options.length) {
            return rawAnswer - 1;
        }
        // If 0-based (0..3)
        if (rawAnswer >= 0 && rawAnswer < options.length) {
            return rawAnswer;
        }
    }
    if (typeof rawAnswer === 'string') {
        const trimmed = rawAnswer.trim().toUpperCase();
        if (trimmed === 'A' || trimmed === '1') return 0;
        if (trimmed === 'B' || trimmed === '2') return 1;
        if (trimmed === 'C' || trimmed === '3') return 2;
        if (trimmed === 'D' || trimmed === '4') return 3;
        
        // Find matching text in options
        if (Array.isArray(options)) {
            const foundIdx = options.findIndex(opt => {
                if (!opt || typeof opt !== 'string') return false;
                const cleanOpt = opt.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
                const cleanRaw = rawAnswer.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
                return cleanOpt === cleanRaw || (cleanOpt && cleanRaw.includes(cleanOpt));
            });
            if (foundIdx !== -1) return foundIdx;
        }
    }
    return 0;
};

/**
 * Strips all undefined fields recursively to prevent Firestore setDoc errors
 */
export const sanitizeDataForFirestore = (data) => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) {
        return data.filter(item => item !== undefined).map(sanitizeDataForFirestore);
    }
    if (typeof data === 'object') {
        const clean = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                clean[key] = sanitizeDataForFirestore(value);
            }
        }
        return clean;
    }
    return data;
};

/**
 * Builds a clean question object with no undefined fields
 */
export const buildCleanQuestion = (oldQ = {}, newQ = {}) => {
    const optList = Array.isArray(newQ.options) && newQ.options.length > 0 ? newQ.options : (oldQ.options || []);
    const rawAns = newQ.correctAnswer ?? newQ.answer ?? newQ.correct ?? oldQ.correctAnswer ?? 0;
    const normalizedAns = normalizeAnswerIndex(rawAns, optList);

    const qObj = {
        ...oldQ,
        question: newQ.question || oldQ.question || '',
        options: optList,
        correctAnswer: normalizedAns,
        answer: normalizedAns,
        correct: normalizedAns,
        explanation: newQ.explanation || newQ.detail || oldQ.explanation || '',
        detail: newQ.explanation || newQ.detail || oldQ.detail || ''
    };

    const passageText = newQ.passage || oldQ.passage;
    if (passageText) {
        qObj.passage = passageText;
    } else {
        delete qObj.passage;
    }

    if (Array.isArray(newQ.subQuestions) && newQ.subQuestions.length > 0) {
        qObj.subQuestions = newQ.subQuestions.map((sq, sqi) => {
            const oldSq = (oldQ.subQuestions || [])[sqi] || {};
            const sqOpts = Array.isArray(sq.options) && sq.options.length > 0 ? sq.options : (oldSq.options || []);
            const sqRawAns = sq.correctAnswer ?? sq.answer ?? oldSq.correctAnswer ?? 0;
            const sqNormAns = normalizeAnswerIndex(sqRawAns, sqOpts);
            return {
                ...oldSq,
                question: sq.question || oldSq.question || '',
                options: sqOpts,
                correctAnswer: sqNormAns,
                answer: sqNormAns,
                explanation: sq.explanation || sq.detail || oldSq.explanation || '',
                detail: sq.explanation || sq.detail || oldSq.detail || ''
            };
        });
    } else if (Array.isArray(oldQ.subQuestions) && oldQ.subQuestions.length > 0) {
        qObj.subQuestions = oldQ.subQuestions;
    } else {
        delete qObj.subQuestions;
    }

    Object.keys(qObj).forEach(k => {
        if (qObj[k] === undefined) delete qObj[k];
    });

    return qObj;
};

/**
 * Extracts and cleans JSON from AI output (stripping ```json fences and notes)
 */
export const cleanAndExtractJson = (text) => {
    if (!text || typeof text !== 'string') return null;
    let str = text.trim();

    // 1. Strip markdown fences ```json ... ```
    if (str.includes('```')) {
        const matches = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (matches && matches[1]) {
            str = matches[1].trim();
        }
    }

    // 2. Locate outermost array [...] or object {...}
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        str = str.slice(firstBracket, lastBracket + 1);
    } else {
        const firstBrace = str.indexOf('{');
        const lastBrace = str.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            str = str.slice(firstBrace, lastBrace + 1);
        }
    }

    return JSON.parse(str);
};

const JLPTExportImportModal = ({
    isOpen,
    onClose,
    test,
    activeSectionIdx = 0,
    onSaveSections,
    showToast = () => {}
}) => {
    const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
    const [selectedScope, setSelectedScope] = useState('all'); // 'all' | sectionIdx number as string
    const [jsonInput, setJsonInput] = useState('');
    const [markStandardized, setMarkStandardized] = useState(true);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedPreviewIdx, setExpandedPreviewIdx] = useState(0);
    const [previewFilter, setPreviewFilter] = useState('changed'); // 'changed' | 'all'

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedScope(typeof activeSectionIdx === 'number' ? String(activeSectionIdx) : 'all');
            setJsonInput('');
            setCopiedPrompt(false);
            setCopiedJson(false);
            setMarkStandardized(true);
            setPreviewFilter('changed');
        }
    }, [isOpen, activeSectionIdx]);

    if (!isOpen || !test) return null;

    const sections = Array.isArray(test.sections) ? test.sections : [];

    // Calculate total questions in current test
    const totalTestQuestions = useMemo(() => {
        return sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
    }, [sections]);

    // Build questions list to export based on selected scope
    const questionsToExport = useMemo(() => {
        if (selectedScope === 'all') {
            const list = [];
            let globalIdx = 1;
            sections.forEach((sec, sIdx) => {
                const secTitle = sec.title || `Phần ${sIdx + 1}`;
                (sec.questions || []).forEach((q, qIdx) => {
                    const rawAns = q.correctAnswer ?? q.answer ?? q.correct ?? 0;
                    const optList = Array.isArray(q.options) ? q.options : [];
                    const normalizedAnsIdx = normalizeAnswerIndex(rawAns, optList);

                    const item = {
                        id: globalIdx++,
                        section: secTitle,
                        question: q.question || '',
                        options: optList.length > 0 ? optList : ['', '', '', ''],
                        correctAnswer: normalizedAnsIdx + 1, // 1-based (1, 2, 3, 4) for AI clarity
                        explanation: q.explanation || q.detail || q.grammarNote || ''
                    };

                    if (q.passage) {
                        item.passage = q.passage;
                    }
                    if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                        item.subQuestions = q.subQuestions.map((sq, sqi) => {
                            const sqAns = sq.correctAnswer ?? sq.answer ?? 0;
                            const sqOpts = Array.isArray(sq.options) ? sq.options : [];
                            return {
                                subId: sqi + 1,
                                question: sq.question || '',
                                options: sqOpts,
                                correctAnswer: normalizeAnswerIndex(sqAns, sqOpts) + 1,
                                explanation: sq.explanation || sq.detail || ''
                            };
                        });
                    }

                    list.push(item);
                });
            });
            return list;
        } else {
            const sIdx = parseInt(selectedScope, 10);
            const sec = sections[sIdx];
            if (!sec) return [];
            const secTitle = sec.title || `Phần ${sIdx + 1}`;
            return (sec.questions || []).map((q, qIdx) => {
                const rawAns = q.correctAnswer ?? q.answer ?? q.correct ?? 0;
                const optList = Array.isArray(q.options) ? q.options : [];
                const normalizedAnsIdx = normalizeAnswerIndex(rawAns, optList);

                const item = {
                    id: qIdx + 1,
                    section: secTitle,
                    question: q.question || '',
                    options: optList.length > 0 ? optList : ['', '', '', ''],
                    correctAnswer: normalizedAnsIdx + 1,
                    explanation: q.explanation || q.detail || q.grammarNote || ''
                };

                if (q.passage) {
                    item.passage = q.passage;
                }
                if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                    item.subQuestions = q.subQuestions.map((sq, sqi) => {
                        const sqAns = sq.correctAnswer ?? sq.answer ?? 0;
                        const sqOpts = Array.isArray(sq.options) ? sq.options : [];
                        return {
                            subId: sqi + 1,
                            question: sq.question || '',
                            options: sqOpts,
                            correctAnswer: normalizeAnswerIndex(sqAns, sqOpts) + 1,
                            explanation: sq.explanation || sq.detail || ''
                        };
                    });
                }

                return item;
            });
        }
    }, [sections, selectedScope]);

    const formattedExportJson = useMemo(() => {
        return JSON.stringify(questionsToExport, null, 2);
    }, [questionsToExport]);

    // Build the ready-to-use Prompt for ChatGPT / Gemini
    const fullAiPrompt = useMemo(() => {
        const level = test.level || 'JLPT';
        const testName = test.title || 'Đề thi thử JLPT';
        const scopeText = selectedScope === 'all' 
            ? `Toàn bộ ${questionsToExport.length} câu hỏi` 
            : `Phần "${sections[parseInt(selectedScope, 10)]?.title || ''}" (${questionsToExport.length} câu hỏi)`;

        return `Bạn là chuyên gia thẩm định và biên soạn đề thi tiếng Nhật JLPT cấp độ ${level}.
Dưới đây là danh sách câu hỏi của ${testName} (${scopeText}) dưới định dạng JSON.

NHIỆM VỤ CỦA BẠN:
1. Rà soát KỸ CÀNG từng câu hỏi và các lựa chọn đáp án:
   - Sửa lỗi chính tả Kanji/Hiragana nếu có sai sót.
   - Kiểm tra và xác định CHÍNH XÁC đáp án đúng chuẩn JLPT, ghi vào trường "correctAnswer" (giá trị 1, 2, 3 hoặc 4 tương ứng với vị trí trong mảng "options").
2. Viết LỜI GIẢI THÍCH CHI TIẾT, DỄ HIỂU, CHUẨN XÁC cho từng câu vào trường "explanation":
   - Dịch nghĩa câu hỏi sang tiếng Việt tự nhiên, chính xác.
   - Phân tích từ vựng / ngữ pháp trọng tâm (âm Hán Việt, cách phát âm, ý nghĩa, cấu trúc ngữ pháp).
   - Chỉ ra lý do vì sao đáp án được chọn là đúng, và giải thích ngắn gọn vì sao các phương án còn lại chưa phù hợp nếu có bẫy.
3. QUY TẮC ĐẦU RA:
   - CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON thuần túy (JSON Array).
   - Giữ nguyên cấu trúc các field (id, section, question, options, correctAnswer, explanation).
   - KHÔNG thêm bất kỳ câu giải thích hay văn bản phụ nào bên ngoài JSON.

DƯỚI ĐÂY LÀ DỮ LIỆU ĐỀ THI CẦN CHUẨN HÓA:
${formattedExportJson}`;
    }, [test, selectedScope, sections, questionsToExport, formattedExportJson]);

    // Copy Prompt
    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(fullAiPrompt);
            setCopiedPrompt(true);
            showToast('Đã sao chép Prompt & Dữ liệu bài thi!', 'success');
            setTimeout(() => setCopiedPrompt(false), 2500);
        } catch (e) {
            showToast('Không thể sao chép: ' + e.message, 'error');
        }
    };

    // Copy Pure JSON
    const handleCopyJson = async () => {
        try {
            await navigator.clipboard.writeText(formattedExportJson);
            setCopiedJson(true);
            showToast('Đã sao chép chuỗi JSON!', 'success');
            setTimeout(() => setCopiedJson(false), 2500);
        } catch (e) {
            showToast('Không thể sao chép: ' + e.message, 'error');
        }
    };

    // Download JSON file
    const handleDownloadJson = () => {
        try {
            const blob = new Blob([formattedExportJson], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeTitle = (test.title || 'jlpt_test').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
            a.href = url;
            a.download = `${test.level || 'JLPT'}_${safeTitle}_export.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Đã tải xuống file JSON!', 'success');
        } catch (e) {
            showToast('Lỗi khi tải file: ' + e.message, 'error');
        }
    };

    // Parse and validate imported JSON in realtime
    const importValidation = useMemo(() => {
        if (!jsonInput.trim()) {
            return { isValid: false, questions: [], error: null, count: 0 };
        }

        try {
            const parsed = cleanAndExtractJson(jsonInput);
            if (!parsed) {
                return { isValid: false, questions: [], error: 'Không tìm thấy dữ liệu mảng JSON hợp lệ.', count: 0 };
            }

            let extractedList = [];

            // Case A: parsed is an array of questions
            if (Array.isArray(parsed)) {
                // If it's an array of sections: [ { questions: [...] }, ... ]
                if (parsed.length > 0 && Array.isArray(parsed[0]?.questions)) {
                    parsed.forEach(sec => {
                        if (Array.isArray(sec.questions)) {
                            extractedList.push(...sec.questions);
                        }
                    });
                } else {
                    extractedList = parsed;
                }
            } else if (parsed && typeof parsed === 'object') {
                // Case B: object with questions or sections
                if (Array.isArray(parsed.questions)) {
                    extractedList = parsed.questions;
                } else if (Array.isArray(parsed.sections)) {
                    parsed.sections.forEach(sec => {
                        if (Array.isArray(sec.questions)) {
                            extractedList.push(...sec.questions);
                        }
                    });
                }
            }

            if (!Array.isArray(extractedList) || extractedList.length === 0) {
                return { isValid: false, questions: [], error: 'Mảng JSON không chứa danh sách câu hỏi nào.', count: 0 };
            }

            // Validate that elements resemble questions
            const validQuestions = extractedList.filter(item => {
                return item && (item.question || item.passage || (Array.isArray(item.options) && item.options.length > 0));
            });

            if (validQuestions.length === 0) {
                return { isValid: false, questions: [], error: 'Các mục trong JSON không đúng định dạng câu hỏi JLPT (thiếu "question" hoặc "options").', count: 0 };
            }

            return {
                isValid: true,
                questions: validQuestions,
                error: null,
                count: validQuestions.length
            };
        } catch (err) {
            return {
                isValid: false,
                questions: [],
                error: 'Lỗi cú pháp JSON: ' + err.message,
                count: 0
            };
        }
    }, [jsonInput]);

    // Compute questions whose correct answer was changed compared to original
    const changedAnswerQuestions = useMemo(() => {
        if (!importValidation.isValid || !Array.isArray(importValidation.questions)) return [];

        const diffList = [];
        const newQuestions = importValidation.questions;

        newQuestions.forEach((newQ, idx) => {
            const oldQ = questionsToExport[idx];
            if (!oldQ) return;

            // 1. Check SubQuestions if passage exists
            if (Array.isArray(oldQ.subQuestions) && oldQ.subQuestions.length > 0) {
                oldQ.subQuestions.forEach((oldSq, sqi) => {
                    const newSq = (newQ.subQuestions || [])[sqi];
                    if (!newSq) return;
                    const oldSqOpts = Array.isArray(oldSq.options) ? oldSq.options : [];
                    const newSqOpts = Array.isArray(newSq.options) && newSq.options.length > 0 ? newSq.options : oldSqOpts;

                    const oldSqRaw = oldSq.correctAnswer !== undefined ? (typeof oldSq.correctAnswer === 'number' ? oldSq.correctAnswer - 1 : oldSq.correctAnswer) : 0;
                    const oldSqAns = normalizeAnswerIndex(oldSqRaw, oldSqOpts);

                    const newSqRaw = newSq.correctAnswer ?? newSq.answer ?? newSq.correct;
                    const newSqAns = normalizeAnswerIndex(newSqRaw, newSqOpts);

                    if (oldSqAns !== newSqAns) {
                        diffList.push({
                            qNum: `${oldQ.id || idx + 1}.${sqi + 1}`,
                            question: newSq.question || oldSq.question || `Câu hỏi phụ ${sqi + 1}`,
                            oldAnsIdx: oldSqAns,
                            newAnsIdx: newSqAns,
                            oldLetter: String.fromCharCode(65 + oldSqAns),
                            newLetter: String.fromCharCode(65 + newSqAns),
                            oldOptionText: oldSqOpts[oldSqAns] || '',
                            newOptionText: newSqOpts[newSqAns] || '',
                            options: newSqOpts,
                            explanation: newSq.explanation || newSq.detail || oldSq.explanation || ''
                        });
                    }
                });
            } else {
                // 2. Standard single question
                const oldOpts = Array.isArray(oldQ.options) ? oldQ.options : [];
                const newOpts = Array.isArray(newQ.options) && newQ.options.length > 0 ? newQ.options : oldOpts;

                const oldRaw = oldQ.correctAnswer !== undefined ? (typeof oldQ.correctAnswer === 'number' ? oldQ.correctAnswer - 1 : oldQ.correctAnswer) : 0;
                const oldAnsIdx = normalizeAnswerIndex(oldRaw, oldOpts);

                const newRaw = newQ.correctAnswer ?? newQ.answer ?? newQ.correct;
                const newAnsIdx = normalizeAnswerIndex(newRaw, newOpts);

                if (oldAnsIdx !== newAnsIdx) {
                    diffList.push({
                        qNum: `${oldQ.id || idx + 1}`,
                        question: newQ.question || oldQ.question || '',
                        oldAnsIdx,
                        newAnsIdx,
                        oldLetter: String.fromCharCode(65 + oldAnsIdx),
                        newLetter: String.fromCharCode(65 + newAnsIdx),
                        oldOptionText: oldOpts[oldAnsIdx] || '',
                        newOptionText: newOpts[newAnsIdx] || '',
                        options: newOpts,
                        explanation: newQ.explanation || newQ.detail || oldQ.explanation || ''
                    });
                }
            }
        });

        return diffList;
    }, [importValidation, questionsToExport]);

    // Execute Import and Save
    const handleExecuteImport = async () => {
        if (!importValidation.isValid || importValidation.questions.length === 0) {
            showToast('Dữ liệu JSON chưa hợp lệ, vui lòng kiểm tra lại!', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const updatedSections = JSON.parse(JSON.stringify(sections));
            const newQuestions = importValidation.questions;

            if (selectedScope !== 'all') {
                // Import into a single specific section
                const sIdx = parseInt(selectedScope, 10);
                if (updatedSections[sIdx]) {
                    const targetSec = updatedSections[sIdx];
                    const existingQList = targetSec.questions || [];
                    
                    const mergedQuestions = newQuestions.map((newQ, idx) => {
                        const oldQ = existingQList[idx] || {};
                        return buildCleanQuestion(oldQ, newQ);
                    });

                    targetSec.questions = mergedQuestions;
                }
            } else {
                // Scope = 'all': Sequential mapping across sections
                let cursor = 0;
                updatedSections.forEach((sec) => {
                    const secCount = sec.questions?.length || 0;
                    if (secCount > 0) {
                        const secSlice = newQuestions.slice(cursor, cursor + secCount);
                        cursor += secCount;

                        sec.questions = sec.questions.map((oldQ, idx) => {
                            const newQ = secSlice[idx];
                            if (!newQ) return oldQ;
                            return buildCleanQuestion(oldQ, newQ);
                        });
                    }
                });
            }

            const cleanSections = sanitizeDataForFirestore(updatedSections);

            // Call parent save handler
            if (onSaveSections) {
                await onSaveSections(cleanSections, markStandardized);
            }

            showToast(`Đã cập nhật thành công ${importValidation.count} câu hỏi vào đề thi!`, 'success');
            onClose();
        } catch (err) {
            console.error('Import error:', err);
            showToast('Lỗi khi cập nhật dữ liệu: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                            <FileCode className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                <span>Xuất & Nhập dữ liệu đề thi</span>
                                <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-500 text-white shrink-0">
                                    {test.level || 'JLPT'}
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {test.title} • Tổng {totalTestQuestions} câu hỏi
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-Header: Tabs + Scope Selector */}
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                    {/* Tab Switcher */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('export')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'export'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>1. Xuất dữ liệu & Prompt</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('import')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'import'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>2. Nhập dữ liệu mới (Import)</span>
                            {importValidation.isValid && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* Scope Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Phạm vi:</span>
                        <select
                            value={selectedScope}
                            onChange={(e) => setSelectedScope(e.target.value)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                        >
                            <option value="all">Toàn bộ đề thi ({totalTestQuestions} câu)</option>
                            {sections.map((sec, idx) => (
                                <option key={idx} value={String(idx)}>
                                    {sec.title || `Phần ${idx + 1}`} ({sec.questions?.length || 0} câu)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                    {activeTab === 'export' ? (
                        /* TAB 1: EXPORT & PROMPT */
                        <div className="space-y-4">
                            {/* Workflow Guide Banner */}
                            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-3">
                                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold">Cách chuẩn hóa dữ liệu đề thi với ChatGPT hoặc Gemini:</p>
                                    <ol className="list-decimal list-inside space-y-0.5 text-sky-800 dark:text-sky-300">
                                        <li>Nhấn nút <strong>Sao chép Prompt & Dữ liệu</strong> màu xanh bên dưới.</li>
                                        <li>Mở <strong>ChatGPT</strong> (GPT-4o) hoặc <strong>Google Gemini</strong> và nhấn <code className="bg-sky-100 dark:bg-sky-900/60 px-1 py-0.2 rounded font-mono font-bold">Ctrl + V</code> gửi đi.</li>
                                        <li>Copy kết quả JSON từ AI, chuyển sang tab <strong>2. Nhập dữ liệu mới</strong> và dán vào để lưu đè!</li>
                                    </ol>
                                </div>
                            </div>

                            {/* Action Buttons Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    Đang xuất: <strong className="text-emerald-600 dark:text-emerald-400">{questionsToExport.length}</strong> câu hỏi
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleDownloadJson}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        title="Tải về file JSON"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Tải file .json</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyJson}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        title="Chỉ sao chép chuỗi JSON dữ liệu"
                                    >
                                        {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedJson ? 'Đã chép JSON!' : 'Chỉ chép JSON'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyPrompt}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 border-b-2 border-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs select-none"
                                        title="Sao chép toàn bộ Prompt chuẩn kèm dữ liệu câu hỏi"
                                    >
                                        {copiedPrompt ? <Check className="w-4 h-4 text-white stroke-[3]" /> : <Copy className="w-4 h-4" />}
                                        <span>{copiedPrompt ? 'Đã sao chép Prompt!' : 'Sao chép Prompt & Dữ liệu'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Preview Code View */}
                            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-hidden max-h-96 overflow-y-auto custom-scrollbar">
                                <div className="text-emerald-400 font-bold mb-2 pb-2 border-b border-slate-800 flex items-center justify-between">
                                    <span>// Prompt kèm dữ liệu đề thi ({questionsToExport.length} câu)</span>
                                    <span className="text-[10px] text-slate-400">Xem trước</span>
                                </div>
                                <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 text-[11px] sm:text-xs">
                                    {fullAiPrompt}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        /* TAB 2: IMPORT JSON */
                        <div className="space-y-4">
                            {/* Input Textarea */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Dán kết quả JSON từ AI vào đây:</span>
                                    <span className="text-[11px] font-normal text-slate-400">
                                        Tự động nhận diện JSON trong khối code ```json
                                    </span>
                                </label>
                                <textarea
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    placeholder="Dán mảng JSON vào đây, ví dụ:&#10;[&#10;  {&#10;    &quot;id&quot;: 1,&#10;    &quot;question&quot;: &quot;彼には（補助）が必要だ。&quot;,&#10;    &quot;options&quot;: [&quot;ほうじょ&quot;, &quot;ほじょ&quot;, &quot;ぼじょ&quot;, &quot;ぼうじょ&quot;],&#10;    &quot;correctAnswer&quot;: 2,&#10;    &quot;explanation&quot;: &quot;ほじょ (補助 - HỖ TRỢ): Sự hỗ trợ...&quot;&#10;  }&#10;]"
                                    rows={8}
                                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 leading-relaxed custom-scrollbar"
                                />
                            </div>

                            {/* Realtime Validation Indicator */}
                            {jsonInput.trim() && (
                                importValidation.isValid ? (
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold min-w-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span>
                                                JSON hợp lệ! Nhận diện thành công <strong>{importValidation.count}</strong> câu hỏi.
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                                            Sẵn sàng cập nhật
                                        </span>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold">Dữ liệu chưa hợp lệ: </span>
                                            <span>{importValidation.error}</span>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Preview parsed questions */}
                            {importValidation.isValid && importValidation.questions.length > 0 && (
                                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                                    {/* Header & Filter Controls */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                {changedAnswerQuestions.length > 0
                                                    ? `⚠️ Câu hỏi bị sửa đáp án đúng (${changedAnswerQuestions.length} câu):`
                                                    : `✓ Kiểm tra đáp án: Khớp 100% (${importValidation.questions.length} câu)`}
                                            </span>
                                            {changedAnswerQuestions.length > 0 ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                                                    Đã đổi đáp án: {changedAnswerQuestions.length} câu
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                    Đáp án chuẩn
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewFilter('changed')}
                                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                                    previewFilter === 'changed'
                                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                Câu đổi đáp án ({changedAnswerQuestions.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewFilter('all')}
                                                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                                    previewFilter === 'all'
                                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                Tất cả câu ({importValidation.questions.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* List Content */}
                                    <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                        {previewFilter === 'changed' ? (
                                            changedAnswerQuestions.length > 0 ? (
                                                changedAnswerQuestions.map((cq, cqi) => (
                                                    <div 
                                                        key={cqi}
                                                        className="p-3.5 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-2.5 shadow-2xs"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 min-w-0 flex-1">
                                                                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-mono font-black shrink-0 shadow-2xs">
                                                                    {cq.qNum}
                                                                </span>
                                                                <span className="truncate text-xs sm:text-sm font-japanese">{cq.question}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-black text-[11px] shrink-0">
                                                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 line-through border border-rose-200/60 dark:border-rose-900">
                                                                    Cũ: {cq.oldLetter}
                                                                </span>
                                                                <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-white font-black shadow-2xs flex items-center gap-1">
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                    <span>Mới: {cq.newLetter}</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Direct comparison */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-8">
                                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-slate-700 dark:text-slate-300">
                                                                <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                                                                    <span>✕ Đáp án ban đầu ({cq.oldLetter}):</span>
                                                                </div>
                                                                <div className="text-xs font-japanese line-through opacity-80">{cq.oldOptionText || '(Trống)'}</div>
                                                            </div>
                                                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 font-bold">
                                                                <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                    <span>✓ Đáp án đã sửa sang ({cq.newLetter}):</span>
                                                                </div>
                                                                <div className="text-xs font-japanese">{cq.newOptionText || '(Trống)'}</div>
                                                            </div>
                                                        </div>

                                                        {/* Explanation */}
                                                        {cq.explanation && (
                                                            <div className="pl-0 sm:pl-8 text-[11px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-800/50 leading-relaxed">
                                                                <strong className="text-slate-900 dark:text-white">💡 Giải thích AI: </strong>
                                                                <span>{cq.explanation}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                                                    <div className="flex items-center gap-2 font-black text-sm text-emerald-700 dark:text-emerald-300">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <span>Không có câu hỏi nào bị thay đổi đáp án đúng!</span>
                                                    </div>
                                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                                                        Toàn bộ <strong>{importValidation.questions.length}</strong> câu hỏi đều giữ nguyên đáp án đúng ban đầu (AI chỉ chuẩn hóa câu chữ, sửa lỗi chính tả Kanji/Hiragana hoặc cập nhật giải thích).
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewFilter('all')}
                                                        className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 underline hover:no-underline cursor-pointer"
                                                    >
                                                        Bấm vào đây để xem tất cả {importValidation.questions.length} câu hỏi →
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            /* All questions preview */
                                            importValidation.questions.map((pq, pqi) => {
                                                const optList = Array.isArray(pq.options) ? pq.options : [];
                                                const ansIdx = normalizeAnswerIndex(pq.correctAnswer ?? pq.answer, optList);
                                                const oldQ = questionsToExport[pqi];
                                                const oldRaw = oldQ?.correctAnswer !== undefined ? (typeof oldQ.correctAnswer === 'number' ? oldQ.correctAnswer - 1 : oldQ.correctAnswer) : 0;
                                                const oldAnsIdx = oldQ ? normalizeAnswerIndex(oldRaw, oldQ.options) : ansIdx;
                                                const isChanged = oldQ && ansIdx !== oldAnsIdx;

                                                return (
                                                    <div 
                                                        key={pqi}
                                                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                                                            isChanged 
                                                                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20' 
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 min-w-0">
                                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold ${
                                                                    isChanged ? 'bg-amber-500 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                }`}>
                                                                    {pqi + 1}
                                                                </span>
                                                                <span className="truncate font-japanese">{pq.question || pq.passage || 'Câu hỏi'}</span>
                                                            </div>
                                                            {isChanged && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                                                                    Đổi đáp án: {String.fromCharCode(65 + oldAnsIdx)} ➔ {String.fromCharCode(65 + ansIdx)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Options */}
                                                        <div className="grid grid-cols-2 gap-1.5 pl-7">
                                                            {optList.map((opt, oi) => {
                                                                const isCorrect = oi === ansIdx;
                                                                return (
                                                                    <div 
                                                                        key={oi}
                                                                        className={`px-2 py-1 rounded-lg text-[11px] truncate flex items-center gap-1.5 ${
                                                                            isCorrect 
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
                                                                                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                                                                        }`}
                                                                    >
                                                                        <span className="font-mono text-[10px]">{String.fromCharCode(65 + oi)}.</span>
                                                                        <span className="truncate">{opt}</span>
                                                                        {isCorrect && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Explanation Preview */}
                                                        {pq.explanation && (
                                                            <div className="pl-7 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                                                <strong>Giải thích:</strong> {pq.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mark Standardized Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
                                <input
                                    type="checkbox"
                                    checked={markStandardized}
                                    onChange={(e) => setMarkStandardized(e.target.checked)}
                                    className="w-4 h-4 rounded border-emerald-400 text-emerald-500 cursor-pointer accent-emerald-500"
                                />
                                <span>Tự động đánh dấu bài thi này là "Đã chuẩn data" khi lưu</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    >
                        Đóng
                    </button>

                    {activeTab === 'export' ? (
                        <button
                            type="button"
                            onClick={() => setActiveTab('import')}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                            <span>Sang bước 2: Nhập dữ liệu</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={!importValidation.isValid || isSaving}
                            onClick={handleExecuteImport}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md select-none ${
                                !importValidation.isValid || isSaving
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-b-0'
                                    : 'bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 border-b-2 border-emerald-700 text-white'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Đang cập nhật đề...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                    <span>Cập nhật đè dữ liệu bài thi ({importValidation.count} câu)</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default JLPTExportImportModal;
