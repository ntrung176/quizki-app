import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText, Plus, CheckCircle } from 'lucide-react';
import { aiBatchGenerateGrammarNotebook } from '../../utils/grammarNotebookService';
import { showToast } from '../../utils/toast';

export const GrammarNotebookBatchModal = ({ isOpen, onClose, onImportItems }) => {
    const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'raw'
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [rawText, setRawText] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) {
            showToast('Vui lòng nhập chủ đề hoặc yêu cầu cho AI.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const items = await aiBatchGenerateGrammarNotebook(aiTopic, aiCount);
            if (items && items.length > 0) {
                onImportItems(items);
                showToast(`AI đã soạn thành công ${items.length} mẫu ngữ pháp!`, 'success');
                onClose();
            } else {
                showToast('Không tạo được mẫu ngữ pháp nào. Vui lòng thử lại.', 'error');
            }
        } catch (err) {
            console.error('AI batch generation error:', err);
            showToast(err.message || 'Lỗi khi gọi AI', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRawImport = () => {
        if (!rawText.trim()) {
            showToast('Vui lòng nhập danh sách mẫu ngữ pháp.', 'warning');
            return;
        }

        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const items = lines.map(line => {
            // Check if line has pattern and meaning separated by : or - or TAB
            const parts = line.split(/[:\-\t—–]/);
            if (parts.length >= 2) {
                return {
                    pattern: parts[0].trim(),
                    meaning: parts.slice(1).join(' - ').trim(),
                    connection: '',
                    usageScope: '',
                    notes: '',
                    examples: []
                };
            }
            return {
                pattern: line.trim(),
                meaning: '',
                connection: '',
                usageScope: '',
                notes: '',
                examples: []
            };
        });

        onImportItems(items);
        showToast(`Đã thêm ${items.length} mẫu vào sổ tay! Bạn có thể nhấn nút AI trên từng mẫu để điền nhanh.`, 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                            Nhập hàng loạt & AI Soạn ngữ pháp
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'ai'
                                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-sky-500" />
                        <span>AI Soạn tự động</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('raw')}
                        className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'raw'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span>Dán danh sách thô</span>
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'ai' ? (
                    <div className="space-y-3.5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Chủ đề hoặc danh sách mẫu bạn muốn AI soạn:
                            </label>
                            <textarea
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                rows={3}
                                placeholder="VD: Các mẫu ngữ pháp chỉ sự tiếc nuối N2 (〜あげく, 〜末に...); hoặc Ngữ pháp so sánh N3..."
                                className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                Số lượng mẫu cần tạo:
                            </span>
                            <div className="flex items-center gap-2">
                                {[3, 5, 8, 10].map(cnt => (
                                    <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => setAiCount(cnt)}
                                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                            aiCount === cnt
                                                ? 'bg-sky-500 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {cnt} mẫu
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAiGenerate}
                            disabled={loading || !aiTopic.trim()}
                            className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-50 select-none shadow-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span>{loading ? 'AI đang soạn thông tin đầy đủ...' : 'AI Soạn và thêm vào sổ tay'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3.5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Dán danh sách mẫu (Mỗi dòng một mẫu, có thể kèm nghĩa bằng dấu - hoặc :):
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={5}
                                placeholder={"〜てから : Sau khi... rồi mới...\n〜うちに : Trong lúc...\n〜たとたん : Vừa mới... thì..."}
                                className="w-full text-xs sm:text-sm p-3 font-mono bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-emerald-500 dark:text-white resize-none"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleRawImport}
                            disabled={!rawText.trim()}
                            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-2 border-b-4 border-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-50 select-none shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Thêm vào sổ tay</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarNotebookBatchModal;

