// AdminPdfIngestorModal.jsx — AI PDF Ingestor & Data Generator
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Upload, FileText, Wand2, BookOpen, Award, Layers, Languages,
    Play, Square, Check, CheckCircle2, AlertTriangle, ChevronRight,
    ChevronDown, Eye, Code, Save, Download, RefreshCw, Loader2, ArrowLeft,
    Sliders, HelpCircle, FileCheck
} from 'lucide-react';
import {
    INGESTOR_CATEGORIES,
    RECOMMENDED_INGESTOR_MODELS,
    processPdfWithAI,
    saveIngestedDataToFirestore
} from '../../services/ai/aiPdfIngestorService';
import { getPdfMetadata } from '../../services/ai/pdfExtractorService';
import { getSharedBookGroups } from '../../utils/bookService';
import { showToast, showConfirm } from '../../utils/toast';

const AdminPdfIngestorModal = ({
    isOpen,
    onClose,
    initialCategory = 'VOCABULARY_BOOK',
    onSuccess = () => {}
}) => {
    // Stepper: 1: Configure & Upload | 2: Processing | 3: Preview & Save
    const [step, setStep] = useState(1);

    // Configuration states
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfMeta, setPdfMeta] = useState(null);
    const [pageRangeMode, setPageRangeMode] = useState('all');
    const [customPageRange, setCustomPageRange] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percent: 0, detail: '' });
    const [logs, setLogs] = useState([]);
    const abortControllerRef = useRef(null);
    const logsEndRef = useRef(null);

    // Preview & Result states
    const [extractedResult, setExtractedResult] = useState(null);
    const [previewTab, setPreviewTab] = useState('visual'); // 'visual' | 'json'
    const [editableJsonStr, setEditableJsonStr] = useState('');
    const [jsonParseError, setJsonParseError] = useState('');

    // Destination Save Options
    const [existingBookGroups, setExistingBookGroups] = useState([]);
    const [targetGroupId, setTargetGroupId] = useState('');
    const [syncSharedVocab, setSyncSharedVocab] = useState(true);
    const [isSavingToDb, setIsSavingToDb] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedCategory(initialCategory);
            setStep(1);
            setPdfFile(null);
            setPdfMeta(null);
            setExtractedResult(null);
            setLogs([]);
            setProgress({ stage: '', percent: 0, detail: '' });

            // Load existing book groups for target selection
            getSharedBookGroups(false).then(groups => {
                setExistingBookGroups(groups || []);
            }).catch(() => {});
        }
    }, [isOpen, initialCategory]);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (!isOpen) return null;

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString('vi-VN');
        setLogs(prev => [...prev.slice(-300), `[${time}] ${msg}`]);
    };

    // Handle File Drop / Select
    const handleFileSelect = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            showToast('Vui lòng chọn một file định dạng PDF (.pdf)', 'warning');
            return;
        }
        setPdfFile(file);
        try {
            const meta = await getPdfMetadata(file);
            setPdfMeta(meta);
            showToast(`Đã nạp file PDF (${meta.numPages} trang)`, 'success');
        } catch (e) {
            console.error('PDF meta error:', e);
            setPdfMeta(null);
        }
    };

    // Start AI Process
    const handleStartIngest = async () => {
        if (!pdfFile) {
            showToast('Vui lòng tải lên file PDF trước khi bắt đầu', 'warning');
            return;
        }

        setStep(2);
        setIsProcessing(true);
        setLogs([]);
        setExtractedResult(null);

        abortControllerRef.current = new AbortController();

        const range = pageRangeMode === 'all' ? 'ALL' : customPageRange;

        try {
            const result = await processPdfWithAI(pdfFile, {
                category: selectedCategory,
                model: selectedModel,
                pageRange: range,
                customInstructions: customInstructions.trim(),
                onProgress: (p) => setProgress(p),
                onLog: (m) => addLog(m),
                signal: abortControllerRef.current.signal
            });

            setExtractedResult(result);
            setEditableJsonStr(JSON.stringify(result.data, null, 2));
            setStep(3);
            showToast('🎉 Trích xuất dữ liệu thành công!', 'success');
        } catch (err) {
            console.error('Ingest error:', err);
            addLog(`❌ Lỗi: ${err.message}`);
            showToast('Lỗi trích xuất: ' + err.message, 'error');
        } finally {
            setIsProcessing(false);
            abortControllerRef.current = null;
        }
    };

    const handleStopProcess = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            addLog('🛑 Đã yêu cầu dừng tiến trình.');
        }
    };

    // Save Ingested Data to Firestore
    const handleSaveToFirestore = async () => {
        let finalDataToSave = extractedResult?.data;

        // If user edited JSON
        if (previewTab === 'json') {
            try {
                finalDataToSave = JSON.parse(editableJsonStr);
            } catch (e) {
                showToast('JSON đang có lỗi cú pháp, vui lòng sửa lại.', 'error');
                return;
            }
        }

        const confirmed = await showConfirm(
            `Bạn có chắc chắn muốn lưu toàn bộ dữ liệu vừa trích xuất vào cơ sở dữ liệu ứng dụng?`,
            { confirmText: 'Lưu Dữ Liệu Ngay', cancelText: 'Kiểm tra lại' }
        );
        if (!confirmed) return;

        setIsSavingToDb(true);
        try {
            const res = await saveIngestedDataToFirestore(selectedCategory, { data: finalDataToSave }, {
                targetGroupId: targetGroupId || null,
                syncSharedVocabulary: syncSharedVocab
            });

            if (res.success) {
                showToast(res.message, 'success');
                onSuccess(res);
                onClose();
            }
        } catch (err) {
            console.error('Save to Firestore error:', err);
            showToast('Lỗi khi lưu vào CSDL: ' + err.message, 'error');
        } finally {
            setIsSavingToDb(false);
        }
    };

    // Export Backup JSON
    const handleExportBackupJson = () => {
        const jsonStr = previewTab === 'json' ? editableJsonStr : JSON.stringify(extractedResult?.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quizki_ai_ingested_${selectedCategory.toLowerCase()}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Đã tải file JSON dự phòng về máy', 'success');
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in overflow-hidden">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-left">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI PDF Data Ingestor
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold">
                                    Tự Động 100%
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Trích xuất sách từ vựng, đề thi JLPT & giáo trình ngữ pháp từ file PDF bằng AI
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {step === 3 && (
                            <button
                                onClick={() => setStep(1)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Soạn tài liệu khác
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">

                    {/* STEP 1: CONFIGURATION & UPLOAD */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                            
                            {/* 1. Category Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2.5">
                                    1. Chọn danh mục dữ liệu cần trích xuất
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {Object.values(INGESTOR_CATEGORIES).map(cat => {
                                        const isSelected = selectedCategory === cat.id;
                                        return (
                                            <div
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xl">
                                                            {cat.id === 'VOCABULARY_BOOK' && '📘'}
                                                            {cat.id === 'JLPT_TEST' && '📝'}
                                                            {cat.id === 'GRAMMAR_BOOK' && '📚'}
                                                            {cat.id === 'SHARED_VOCAB' && '🎴'}
                                                        </span>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-xs md:text-sm">
                                                        {cat.label}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {cat.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. PDF Upload Box */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2.5">
                                    2. Tải lên tệp tài liệu PDF
                                </label>
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                                    }}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-850/50 cursor-pointer relative"
                                >
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    
                                    {pdfFile ? (
                                        <div className="flex items-center justify-center gap-4 py-2">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                                <FileCheck className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">
                                                    {pdfFile.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB {pdfMeta ? `• ${pdfMeta.numPages} trang` : ''}
                                                </p>
                                            </div>
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold ml-3 underline">
                                                Thay đổi file
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="py-4 space-y-2">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                Kéo thả tệp PDF vào đây, hoặc <span className="text-indigo-600 dark:text-indigo-400 underline">chọn từ máy tính</span>
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Hỗ trợ tài liệu giáo trình, sách từ vựng, đề thi JLPT PDF mọi kích thước
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Page Range & AI Model Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                
                                {/* Page Range */}
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                                        3. Phạm vi trang trích xuất
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="pageRangeMode"
                                                checked={pageRangeMode === 'all'}
                                                onChange={() => setPageRangeMode('all')}
                                                className="text-indigo-600"
                                            />
                                            Toàn bộ ({pdfMeta ? `${pdfMeta.numPages} trang` : 'ALL'})
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="pageRangeMode"
                                                checked={pageRangeMode === 'custom'}
                                                onChange={() => setPageRangeMode('custom')}
                                                className="text-indigo-600"
                                            />
                                            Tùy chọn trang
                                        </label>
                                    </div>
                                    {pageRangeMode === 'custom' && (
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: 1-15, 20-35"
                                            value={customPageRange}
                                            onChange={(e) => setCustomPageRange(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                        />
                                    )}
                                </div>

                                {/* AI Model Picker */}
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                                        4. Chọn Mô hình AI (OpenRouter)
                                    </label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                    >
                                        {RECOMMENDED_INGESTOR_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.tag})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-400">
                                        {RECOMMENDED_INGESTOR_MODELS.find(m => m.id === selectedModel)?.desc}
                                    </p>
                                </div>
                            </div>

                            {/* 4. Custom Instructions Box */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center justify-between">
                                    <span>5. Ghi chú & Yêu cầu riêng cho AI (Tùy chọn)</span>
                                    <span className="text-[11px] text-slate-400 normal-case font-normal">
                                        Ví dụ: "Chỉ lấy từ vựng bài 1 đến 3", "Bỏ qua các trang mục lục"...
                                    </span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={customInstructions}
                                    onChange={(e) => setCustomInstructions(e.target.value)}
                                    placeholder={INGESTOR_CATEGORIES[selectedCategory]?.defaultPromptNote}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white resize-none"
                                />
                            </div>

                            {/* Launch Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleStartIngest}
                                    disabled={!pdfFile || isProcessing}
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                                >
                                    <Wand2 className="w-5 h-5 text-amber-300" />
                                    <span>Bắt đầu Trích xuất & Soạn dữ liệu bằng AI</span>
                                </button>
                            </div>

                        </div>
                    )}

                    {/* STEP 2: PROCESSING & LIVE TERMINAL LOGS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto py-4">
                            
                            {/* Progress Header */}
                            <div className="text-center space-y-3">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Đang phân tích và trích xuất dữ liệu từ PDF...
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {progress.detail || 'Đang khởi chạy tiến trình trích xuất và gọi mô hình AI...'}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <span>Tiến trình hoàn thành</span>
                                    <span>{progress.percent}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Live Terminal Log */}
                            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-[11px] text-emerald-400 h-64 overflow-y-auto space-y-1 shadow-inner">
                                {logs.map((log, lIdx) => (
                                    <div key={lIdx} className="leading-relaxed">
                                        {log}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>

                            {/* Cancel Button */}
                            <div className="text-center pt-2">
                                <button
                                    onClick={handleStopProcess}
                                    className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                                >
                                    Dừng tiến trình
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INTERACTIVE PREVIEW & DIRECT SAVE */}
                    {step === 3 && extractedResult && (
                        <div className="space-y-6 animate-fade-in">
                            
                            {/* Summary & Mode Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                                <div>
                                    <h3 className="text-sm md:text-base font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        Đã trích xuất thành công {selectedCategory === 'VOCABULARY_BOOK' && (extractedResult.data?.bookTitle || 'Sách từ vựng')}
                                        {selectedCategory === 'JLPT_TEST' && (extractedResult.data?.title || 'Đề thi JLPT')}
                                        {selectedCategory === 'GRAMMAR_BOOK' && (extractedResult.data?.textbookTitle || 'Giáo trình ngữ pháp')}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Mô hình sử dụng: <strong>{extractedResult.model}</strong> • Đã quét {extractedResult.processedPages} trang PDF
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => setPreviewTab('visual')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            previewTab === 'visual'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Trực quan
                                    </button>
                                    <button
                                        onClick={() => setPreviewTab('json')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            previewTab === 'json'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        <Code className="w-3.5 h-3.5" /> Mã JSON
                                    </button>
                                </div>
                            </div>

                            {/* VISUAL PREVIEW TAB */}
                            {previewTab === 'visual' && (
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                    
                                    {/* Vocabulary Book Render */}
                                    {selectedCategory === 'VOCABULARY_BOOK' && (
                                        <div className="space-y-4">
                                            {(extractedResult.data?.chapters || []).map((ch, cIdx) => (
                                                <div key={cIdx} className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-indigo-500" />
                                                        {ch.name || `Chương ${cIdx + 1}`}
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {(ch.lessons || []).map((ls, lIdx) => (
                                                            <div key={lIdx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-750">
                                                                <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mb-2">
                                                                    {ls.name} ({(ls.vocabularies || []).length} từ vựng)
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                    {(ls.vocabularies || []).slice(0, 15).map((v, vIdx) => (
                                                                        <div key={vIdx} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs border border-slate-150 dark:border-slate-700">
                                                                            <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between">
                                                                                <span>{v.front}</span>
                                                                                {v.sinoVietnamese && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{v.sinoVietnamese}</span>}
                                                                            </div>
                                                                            <div className="text-slate-600 dark:text-slate-300 mt-0.5">{v.back}</div>
                                                                        </div>
                                                                    ))}
                                                                    {(ls.vocabularies || []).length > 15 && (
                                                                        <div className="p-2 flex items-center justify-center text-slate-400 text-xs italic font-medium">
                                                                            + {(ls.vocabularies || []).length - 15} từ vựng khác...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* JLPT Exam Render */}
                                    {selectedCategory === 'JLPT_TEST' && (
                                        <div className="space-y-4">
                                            {(extractedResult.data?.sections || []).map((sec, sIdx) => (
                                                <div key={sIdx} className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center justify-between">
                                                        <span className="flex items-center gap-2">
                                                            <Award className="w-4 h-4 text-indigo-500" />
                                                            {sec.title} ({sec.type})
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold">
                                                            {(sec.questions || []).length} câu hỏi
                                                        </span>
                                                    </h4>
                                                    <div className="space-y-2.5">
                                                        {(sec.questions || []).slice(0, 10).map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-750 text-xs space-y-2">
                                                                {q.passage && (
                                                                    <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg text-slate-700 dark:text-slate-300 leading-relaxed font-japanese" dangerouslySetInnerHTML={{ __html: q.passage }} />
                                                                )}
                                                                <p className="font-bold text-slate-800 dark:text-white" dangerouslySetInnerHTML={{ __html: `${qIdx + 1}. ${q.question}` }} />
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    {(q.options || []).map((opt, oIdx) => (
                                                                        <div key={oIdx} className={`p-1.5 rounded-lg border text-[11px] ${q.correctAnswer === oIdx ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                                                            {oIdx + 1}. {opt}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Grammar Book Render */}
                                    {selectedCategory === 'GRAMMAR_BOOK' && (
                                        <div className="space-y-4">
                                            {(extractedResult.data?.lessons || []).map((ls, lIdx) => (
                                                <div key={lIdx} className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                        <Layers className="w-4 h-4 text-indigo-500" />
                                                        {ls.title || `Bài ${lIdx + 1}`}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {(ls.grammarPoints || []).map((gp, gIdx) => (
                                                            <div key={gIdx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-750 text-xs space-y-1.5">
                                                                <div className="flex items-center justify-between font-bold">
                                                                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-japanese">{gp.pattern}</span>
                                                                    <span className="text-slate-500">{gp.meaningShort}</span>
                                                                </div>
                                                                <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg text-slate-700 dark:text-slate-300">
                                                                    {gp.structureRaw}
                                                                </div>
                                                                <p className="text-slate-600 dark:text-slate-400">{gp.meaningFull}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* JSON CODE EDITOR TAB */}
                            {previewTab === 'json' && (
                                <div className="space-y-2">
                                    <textarea
                                        rows={14}
                                        value={editableJsonStr}
                                        onChange={(e) => {
                                            setEditableJsonStr(e.target.value);
                                            try {
                                                JSON.parse(e.target.value);
                                                setJsonParseError('');
                                            } catch (err) {
                                                setJsonParseError('Cú pháp JSON không hợp lệ: ' + err.message);
                                            }
                                        }}
                                        className="w-full p-4 bg-slate-950 font-mono text-xs text-emerald-400 rounded-2xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-inner"
                                    />
                                    {jsonParseError && (
                                        <div className="text-xs text-rose-500 font-bold flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" /> {jsonParseError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Destination Settings & Save Bar */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                
                                {selectedCategory === 'VOCABULARY_BOOK' && (
                                    <div className="flex items-center gap-4 flex-wrap text-xs">
                                        <select
                                            value={targetGroupId}
                                            onChange={(e) => setTargetGroupId(e.target.value)}
                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none"
                                        >
                                            <option value="">+ Tạo nhóm sách mới</option>
                                            {existingBookGroups.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    Thêm vào: {g.name}
                                                </option>
                                            ))}
                                        </select>
                                        
                                        <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={syncSharedVocab}
                                                onChange={(e) => setSyncSharedVocab(e.target.checked)}
                                                className="rounded text-indigo-600"
                                            />
                                            Đồng bộ vào Kho từ vựng chung
                                        </label>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={handleExportBackupJson}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Tải JSON
                                    </button>

                                    <button
                                        onClick={handleSaveToFirestore}
                                        disabled={isSavingToDb || Boolean(jsonParseError)}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingToDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Lưu vào CSDL Ứng Dụng</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPdfIngestorModal;
