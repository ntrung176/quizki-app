import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, FileJson, AlertCircle, ArrowDownToLine } from 'lucide-react';
import { showToast } from '../../utils/toast';

const GRAMMAR_SAMPLE_PROMPT = `Bạn là chuyên gia ngôn ngữ tiếng Nhật JLPT cho ứng dụng QuizKi.
Nhiệm vụ: Chuyển đổi tài liệu hoặc danh sách ngữ pháp được cung cấp thành định dạng JSON chuẩn.
CHỈ trả về JSON Array hợp lệ, KHÔNG markdown, KHÔNG code block (\`\`\`json).

Format output:
[
  {
    "pattern": "Mẫu ngữ pháp (có kanji thì ghi kèm cách đọc trong ngoặc đơn, ví dụ: 〜並(な)み, 〜込(こ)む, 〜際(さい)に)",
    "meaning": "Ý nghĩa tiếng Việt ngắn gọn, súc tích (dưới 15 từ)",
    "connection": "Công thức kết nối tối giản, gom thể bằng '/' (Ví dụ: 'V-る / Nの + うちに', 'N + 並(な)み')",
    "usageScope": "Phạm vi & sắc thái sử dụng ngắn gọn 1-2 câu",
    "notes": "Lưu ý hoặc mẹo phân biệt ngắn (để trống \"\" nếu không có)",
    "examples": [
      {
        "ja": "Câu ví dụ tiếng Nhật (có kanji thì kèm ngoặc cách đọc Hiragana ví dụ: 彼(かれ)は素人(しろうと)だが...)",
        "vi": "Dịch nghĩa tiếng Việt tự nhiên"
      }
    ]
  }
]`;

const SAMPLE_JSON_PREVIEW = `[
  {
    "pattern": "〜並(な)み",
    "meaning": "Ngang bằng với, tương đương...",
    "connection": "N + 並(な)み",
    "usageScope": "So sánh mức độ với người hoặc sự việc thông thường",
    "notes": "Thường đi kèm với 世間(せけん), 人(ひと), プロ",
    "examples": [
      {
        "ja": "彼(かれ)は素人(しろうと)だが、料理(りょうり)の腕(うで)はプロ並(な)みだ。",
        "vi": "Anh ấy là người nghiệp dư nhưng tay nghề nấu ăn ngang ngửa đầu bếp chuyên nghiệp."
      }
    ]
  }
]`;

const GrammarJsonImportModal = ({ isOpen, onClose, onImport }) => {
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(GRAMMAR_SAMPLE_PROMPT).then(() => {
            setCopied(true);
            showToast('Đã sao chép prompt AI tạo JSON ngữ pháp!', 'success');
            setTimeout(() => setCopied(false), 2500);
        }).catch(() => {
            showToast('Không thể sao chép tự động', 'error');
        });
    };

    const handlePasteExample = () => {
        setJsonInput(SAMPLE_JSON_PREVIEW);
        setError('');
    };

    const handleValidateAndImport = () => {
        setError('');
        if (!jsonInput.trim()) {
            setError('Vui lòng dán chuỗi JSON.');
            return;
        }

        let cleanJson = jsonInput.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
        cleanJson = cleanJson.trim();

        try {
            const parsed = JSON.parse(cleanJson);
            const arrayData = Array.isArray(parsed) ? parsed : (parsed.items || parsed.grammars || [parsed]);

            if (!Array.isArray(arrayData) || arrayData.length === 0) {
                setError('Dữ liệu JSON phải là một mảng [] chứa ít nhất 1 mẫu ngữ pháp.');
                return;
            }

            const validItems = [];
            arrayData.forEach((it, idx) => {
                if (!it || typeof it !== 'object') return;
                const pattern = (it.pattern || it.title || it.name || it.grammar || '').trim();
                const meaning = (it.meaning || it.meaningShort || it.mean || it.definition || '').trim();
                const connection = (it.connection || it.structure || it.formula || '').trim();
                const usageScope = (it.usageScope || it.usage || it.explanation || '').trim();
                const notes = (it.notes || it.note || it.attention || '').trim();

                let examples = [];
                const rawEx = it.examples || it.example || [];
                if (Array.isArray(rawEx)) {
                    examples = rawEx.map(ex => {
                        if (typeof ex === 'string') {
                            const lines = ex.split('\n').map(l => l.trim()).filter(Boolean);
                            return { ja: lines[0] || '', vi: lines[1] || '' };
                        }
                        if (ex && typeof ex === 'object') {
                            return {
                                ja: (ex.ja || ex.japanese || ex.sentence || '').trim(),
                                vi: (ex.vi || ex.vietnamese || ex.meaning || '').trim()
                            };
                        }
                        return null;
                    }).filter(ex => ex && (ex.ja || ex.vi));
                }

                if (pattern || meaning) {
                    validItems.push({
                        id: `item_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
                        pattern,
                        meaning,
                        connection,
                        usageScope,
                        notes,
                        examples
                    });
                }
            });

            if (validItems.length === 0) {
                setError('Không tìm thấy mẫu ngữ pháp hợp lệ trong JSON (cần có ít nhất trường "pattern" hoặc "meaning").');
                return;
            }

            onImport(validItems);
            showToast(`Đã nhập thành công ${validItems.length} mẫu ngữ pháp vào sổ tay!`, 'success');
            onClose();
        } catch (e) {
            setError(`Cú pháp JSON không hợp lệ: ${e.message}`);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <FileJson className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                Nhập JSON Sổ tay ngữ pháp
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Dán mảng JSON chứa các mẫu ngữ pháp để thêm nhanh vào sổ tay
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
                    {/* Action banner: Copy prompt & paste sample */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Bạn có tài liệu hoặc muốn AI sinh JSON chuẩn?
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyPrompt}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:translate-y-0.5"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Đã sao chép' : 'Sao chép Prompt AI'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handlePasteExample}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                            >
                                Dán mẫu thử
                            </button>
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            DÁN MẢNG JSON VÀO ĐÂY:
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                if (error) setError('');
                            }}
                            rows={10}
                            placeholder={SAMPLE_JSON_PREVIEW}
                            className="w-full text-xs sm:text-sm font-mono p-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 text-slate-800 dark:text-slate-200 resize-none transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                    >
                        HỦY
                    </button>
                    <button
                        type="button"
                        onClick={handleValidateAndImport}
                        disabled={!jsonInput.trim()}
                        className="px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl text-white bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer select-none"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                        <span>NHẬP VÀO SỔ TAY</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GrammarJsonImportModal;
