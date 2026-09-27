// AdminGrammarStandardizerModal.jsx — Batch AI Grammar Structure Standardizer
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Sparkles, CheckCircle2, AlertTriangle, Play, Pause, Square, Download,
    RefreshCw, Layers, BookOpen, ChevronDown, ChevronRight, Check, Eye
} from 'lucide-react';
import { getSharedGrammarData, updateGrammarPoint } from '../../utils/grammarService';
import { aiStandardizeGrammarStructure, aiBatchStandardizeGrammarStructures } from '../../services/ai/grammarAiService';
import { OPENROUTER_MODELS } from '../../utils/adminSettings';
import { showToast } from '../../utils/toast';

const LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];

const AdminGrammarStandardizerModal = ({ isOpen, onClose, adminConfig, onSyncCache }) => {
    const [selectedLevel, setSelectedLevel] = useState('ALL');
    const [onlyUnstandardized, setOnlyUnstandardized] = useState(true);
    const [concurrency, setConcurrency] = useState(2);
    const [selectedModel, setSelectedModel] = useState(adminConfig?.aiFeatureModels?.grammar_gen || 'google/gemini-2.5-flash');

    // Data loading states
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [allGrammarPoints, setAllGrammarPoints] = useState([]);
    const [filteredPoints, setFilteredPoints] = useState([]);

    // Single preview states
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewSample, setPreviewSample] = useState(null);

    // Batch run states
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState({ total: 0, processed: 0, succeeded: 0, failed: 0, percent: 0, currentPattern: '' });
    const [logs, setLogs] = useState([]);
    const [batchResults, setBatchResults] = useState([]);
    const [expandedResultId, setExpandedResultId] = useState(null);

    const abortControllerRef = useRef(null);
    const logsEndRef = useRef(null);

    // Auto scroll logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Load grammar points when modal opens
    useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const textbooks = await getSharedGrammarData();
                const list = [];
                if (Array.isArray(textbooks)) {
                    textbooks.forEach(tb => {
                        (tb.lessons || []).forEach(ls => {
                            (ls.points || ls.grammarPoints || []).forEach(gp => {
                                list.push({
                                    ...gp,
                                    textbookId: tb.id,
                                    lessonId: ls.id,
                                    level: gp.level || ls.sectionLabel || tb.levels?.[0] || 'N3'
                                });
                            });
                        });
                    });
                }
                setAllGrammarPoints(list);
            } catch (err) {
                console.error('Failed to load grammar points for standardizer:', err);
                showToast('Lỗi khi tải dữ liệu ngữ pháp', 'error');
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [isOpen]);

    // Filter points based on selected level & options
    useEffect(() => {
        let list = [...allGrammarPoints];
        if (selectedLevel !== 'ALL') {
            list = list.filter(gp => (gp.level || '').toUpperCase() === selectedLevel);
        }
        if (onlyUnstandardized) {
            list = list.filter(gp => {
                const raw = (gp.structureRaw || (Array.isArray(gp.connection) ? gp.connection.join('\n') : '')).trim();
                const hasBrackets = raw.includes('[') && raw.includes(']');
                return !hasBrackets;
            });
        }
        setFilteredPoints(list);
    }, [allGrammarPoints, selectedLevel, onlyUnstandardized]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString('vi-VN');
        setLogs(prev => [...prev.slice(-300), `[${time}] ${msg}`]);
    };

    // 1. Preview a random sample
    const handlePreviewSample = async () => {
        if (filteredPoints.length === 0) {
            showToast('Không có mẫu ngữ pháp nào phù hợp bộ lọc để thử nghiệm', 'info');
            return;
        }

        const randomIndex = Math.floor(Math.random() * filteredPoints.length);
        const sampleGp = filteredPoints[randomIndex];

        setIsPreviewing(true);
        setPreviewSample(null);
        try {
            const result = await aiStandardizeGrammarStructure(sampleGp, selectedModel);
            setPreviewSample({
                gp: sampleGp,
                result
            });
            showToast(`Đã chuẩn hóa mẫu "${sampleGp.pattern}"`, 'success');
        } catch (err) {
            console.error('Preview error:', err);
            showToast('Lỗi khi thử nghiệm: ' + err.message, 'error');
        } finally {
            setIsPreviewing(false);
        }
    };

    // Save previewed sample to Firestore
    const handleSavePreviewSample = async () => {
        if (!previewSample || !previewSample.result) return;
        const { gp, result } = previewSample;
        try {
            const targetTb = gp.textbookId || 'master_bank';
            const targetLs = gp.lessonId || (gp.level ? `master_lesson_${gp.level.toLowerCase()}` : 'master_lesson');
            await updateGrammarPoint(targetTb, targetLs, gp.id, {
                structureRaw: result.structureRaw,
                connection: result.connection,
                structure: result.connection.map(c => ({ text: c, type: 'connector' })),
                meaningShort: result.meaningShort || gp.meaningShort || '',
                meaning: result.meaning || gp.meaning || '',
                meaningFull: result.meaningFull || gp.meaningFull || '',
                tips: (result.tips && result.tips.length > 0) ? result.tips : (gp.tips || [])
            });

            // Update in local state
            setAllGrammarPoints(prev => prev.map(p => p.id === gp.id ? {
                ...p,
                structureRaw: result.structureRaw,
                connection: result.connection,
                meaningShort: result.meaningShort || p.meaningShort,
                meaning: result.meaning || p.meaning,
                meaningFull: result.meaningFull || p.meaningFull,
                tips: (result.tips && result.tips.length > 0) ? result.tips : p.tips
            } : p));
            showToast(`Đã lưu cấu trúc mới cho "${gp.pattern}"!`, 'success');
        } catch (err) {
            showToast('Lỗi khi lưu: ' + err.message, 'error');
        }
    };

    // 2. Start Batch Standardization
    const handleStartBatch = async () => {
        if (filteredPoints.length === 0) {
            showToast('Danh sách xử lý đang rỗng', 'warning');
            return;
        }

        setIsRunning(true);
        setLogs([]);
        setBatchResults([]);
        setProgress({ total: filteredPoints.length, processed: 0, succeeded: 0, failed: 0, percent: 0, currentPattern: '' });

        abortControllerRef.current = new AbortController();

        try {
            const outcome = await aiBatchStandardizeGrammarStructures(filteredPoints, {
                onProgress: (prog) => setProgress(prog),
                onLog: (msg) => addLog(msg),
                signal: abortControllerRef.current.signal,
                forcedModel: selectedModel,
                concurrency: Number(concurrency),
                saveToFirestore: true
            });

            setBatchResults(outcome.results || []);

            // Update in local memory state
            if (outcome.results?.length > 0) {
                const updatedMap = new Map();
                outcome.results.forEach(r => {
                    if (r.success && r.updatedGp) {
                        updatedMap.set(r.id, r.updatedGp);
                    }
                });
                setAllGrammarPoints(prev => prev.map(p => updatedMap.get(p.id) || p));
            }

            showToast(`Hoàn tất! Thành công: ${outcome.succeeded}/${outcome.total}`, 'success');
        } catch (err) {
            console.error('Batch error:', err);
            addLog(`❌ Lỗi batch: ${err.message}`);
            showToast('Có lỗi xảy ra trong quá trình xử lý', 'error');
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    // 3. Stop Batch
    const handleStopBatch = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            addLog('🛑 Đang yêu cầu dừng tiến trình...');
        }
    };

    // 4. Export JSON
    const handleExportJson = () => {
        if (allGrammarPoints.length === 0) return;
        const blob = new Blob([JSON.stringify(allGrammarPoints, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grammar_standardized_${selectedLevel.toLowerCase()}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Đã tải file JSON về máy', 'success');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10010] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI Chuẩn Hóa Cấu Trúc Ngữ Pháp Giáo Trình
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                                    [ ] Bracket Formula
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Tự động chuyển đổi cấu trúc Mazii rải rác thành công thức đóng mở ngoặc gọn gàng theo sách Shinkanzen Master / Soumatome
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRunning}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Control Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                        {/* Level selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                Cấp độ JLPT
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {LEVELS.map(lvl => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        disabled={isRunning}
                                        onClick={() => setSelectedLevel(lvl)}
                                        className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            selectedLevel === lvl
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                        }`}
                                    >
                                        {lvl === 'ALL' ? 'Tất cả' : lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter Option & Model */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Bộ lọc & Mô hình AI
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    disabled={isRunning}
                                    checked={onlyUnstandardized}
                                    onChange={(e) => setOnlyUnstandardized(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Chỉ mẫu chưa có ngoặc [ ]</span>
                            </label>
                            <select
                                value={selectedModel}
                                disabled={isRunning}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                            >
                                {OPENROUTER_MODELS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Concurrency & Stats */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    Đồng thời (Luồng)
                                </label>
                                <select
                                    value={concurrency}
                                    disabled={isRunning}
                                    onChange={(e) => setConcurrency(Number(e.target.value))}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none mb-2"
                                >
                                    <option value={1}>1 request (An toàn, chống rate limit)</option>
                                    <option value={2}>2 requests (Khuyên dùng)</option>
                                    <option value={3}>3 requests (Nhanh)</option>
                                    <option value={5}>5 requests (Siêu tốc)</option>
                                </select>
                            </div>
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                                <span>Mẫu cần chuẩn hóa:</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    {isLoadingData ? 'Đang đếm...' : `${filteredPoints.length} / ${allGrammarPoints.length}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Single Sample Preview Card */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-indigo-500" />
                                Thử nghiệm kiểm tra trước (1 Mẫu ngẫu nhiên)
                            </h3>
                            <button
                                type="button"
                                onClick={handlePreviewSample}
                                disabled={isPreviewing || isRunning || filteredPoints.length === 0}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isPreviewing ? 'animate-spin' : ''}`} />
                                {isPreviewing ? 'Đang chuẩn hóa...' : '✨ Thử 1 mẫu ngẫu nhiên'}
                            </button>
                        </div>

                        {previewSample && (
                            <div className="bg-white dark:bg-slate-850 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in text-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 dark:text-white text-sm font-japanese">{previewSample.gp.pattern}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold text-[10px]">
                                            {previewSample.gp.level || 'N/A'}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400">{previewSample.gp.meaningShort || previewSample.gp.meaning}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSavePreviewSample}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1 shadow-2xs"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Lưu mẫu này
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                        <p className="font-bold text-rose-700 dark:text-rose-400 text-[11px] mb-1">Cấu trúc cũ (Mazii / Thô):</p>
                                        <pre className="font-japanese text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                            {previewSample.result.originalStructureRaw || '(Trống)'}
                                        </pre>
                                    </div>
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] mb-1">Cấu trúc mới (Chuẩn giáo trình):</p>
                                        <pre className="font-japanese text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap font-sans text-xs leading-relaxed font-bold">
                                            {previewSample.result.structureRaw}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar (when running or completed) */}
                    {(isRunning || progress.processed > 0) && (
                        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isRunning ? 'animate-spin' : ''}`} />
                                    Tiến độ: {progress.processed} / {progress.total} ({progress.percent}%)
                                </span>
                                <span className="text-slate-500">
                                    Thành công: <strong className="text-emerald-600">{progress.succeeded}</strong> | Thất bại: <strong className="text-rose-600">{progress.failed}</strong>
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percent}%` }}
                                ></div>
                            </div>
                            {progress.currentPattern && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Đang xử lý: <span className="font-japanese font-semibold text-slate-700 dark:text-slate-200">{progress.currentPattern}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Terminal Logs */}
                    {logs.length > 0 && (
                        <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-3.5 rounded-2xl max-h-48 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
                            {logs.map((log, lIdx) => (
                                <div key={lIdx} className="leading-relaxed opacity-90">{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                    <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={isRunning || allGrammarPoints.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                    >
                        <Download className="w-4 h-4" />
                        Tải file JSON ({allGrammarPoints.length})
                    </button>

                    <div className="flex items-center gap-2.5">
                        {isRunning ? (
                            <button
                                type="button"
                                onClick={handleStopBatch}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Square className="w-4 h-4 fill-white" />
                                Dừng lại
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartBatch}
                                disabled={filteredPoints.length === 0}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-40"
                            >
                                <Play className="w-4 h-4 fill-white" />
                                Chạy chuẩn hóa {filteredPoints.length} mẫu
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminGrammarStandardizerModal;
