import React, { useState } from 'react';
import { X, Copy, Check, FileJson, Sparkles, Download, AlertCircle } from 'lucide-react';

const SAMPLE_PROMPT = `Hãy tạo cho tôi danh sách từ vựng tiếng Nhật theo định dạng mảng JSON bên dưới. Trả về ĐÚNG 1 mảng JSON thuần túy (không kèm bất kỳ lời giải thích hay ký tự thừa nào).

LƯU Ý QUAN TRỌNG VỀ CÂU VÍ DỤ: Hãy thay thế từ gốc (hoặc dạng chia của từ gốc) trong câu ví dụ bằng ＿＿＿＿ để che phần từ vựng.

[
  {
    "front": "Từ vựng / Kanji (ví dụ: 勉強)",
    "reading": "Cách đọc Hiragana (ví dụ: べんきょう)",
    "back": "Nghĩa tiếng Việt (ví dụ: Học tập, học hành)",
    "sinoVietnamese": "Âm Hán Việt (ví dụ: MIỄN CƯỜNG)",
    "pos": "Từ loại (ví dụ: Danh từ / Động từ nhóm 3)",
    "level": "Cấp độ JLPT (ví dụ: N5 / N4 / N3 / N2 / N1)",
    "example": "Câu ví dụ tiếng Nhật đã ẩn từ vựng (ví dụ: 毎日日本語を＿＿＿＿します。)",
    "exampleMeaning": "Dịch câu ví dụ tiếng Việt (ví dụ: Tôi học tiếng Nhật mỗi ngày.)",
    "synonym": "Từ đồng nghĩa nếu có (ví dụ: 学習)",
    "synonymSinoVietnamese": "Hán Việt từ đồng nghĩa (ví dụ: HỌC TẬP)",
    "nuance": "Sắc thái / Ghi chú ngữ cảnh (ví dụ: Dùng trong ngữ cảnh học tập kiến thức, thi cử)"
  }
]`;

const JsonImportModal = ({ isOpen, onClose, onImport }) => {
    const [jsonInput, setJsonInput] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(SAMPLE_PROMPT);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    const handleImportSubmit = () => {
        setErrorMsg('');
        if (!jsonInput.trim()) {
            setErrorMsg('Vui lòng nhập hoặc dán nội dung JSON vào ô bên dưới!');
            return;
        }

        try {
            let cleaned = jsonInput.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(cleaned);
            let items = [];
            if (Array.isArray(parsed)) {
                items = parsed;
            } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.cards)) items = parsed.cards;
                else if (Array.isArray(parsed.vocabularies)) items = parsed.vocabularies;
                else if (Array.isArray(parsed.words)) items = parsed.words;
                else if (Array.isArray(parsed.data)) items = parsed.data;
                else items = [parsed];
            }

            if (items.length === 0) {
                setErrorMsg('Không tìm thấy danh sách từ vựng hợp lệ trong chuỗi JSON!');
                return;
            }

            const formattedCards = items.map((item, idx) => {
                const front = String(item.front || item.word || item.kanji || item.vocabulary || item.term || '').trim();
                const reading = String(item.reading || item.furigana || item.kana || item.pronunciation || item.romaji || '').trim();
                const back = String(item.back || item.meaning || item.definition || item.vietnamese || item.definition_vi || '').trim();
                const sinoVietnamese = String(item.sinoVietnamese || item.hanViet || item.sino_vietnamese || '').trim();
                const pos = String(item.pos || item.partOfSpeech || item.type || '').trim();
                const level = String(item.level || item.jlpt || item.jlptLevel || '').trim();
                const example = String(item.example || item.exampleSentence || item.sentence || '').trim();
                const exampleMeaning = String(item.exampleMeaning || item.exampleTranslation || item.example_meaning || item.sentence_meaning || '').trim();
                const synonym = String(item.synonym || item.synonyms || '').trim();
                const synonymSinoVietnamese = String(item.synonymSinoVietnamese || item.synonymHanViet || item.synonym_sino_vietnamese || '').trim();
                const nuance = String(item.nuance || item.note || item.notes || '').trim();

                return {
                    id: Date.now() + Math.random().toString(36).substr(2, 9) + idx,
                    front: front || `Từ vựng ${idx + 1}`,
                    reading: reading,
                    back: back,
                    sinoVietnamese: sinoVietnamese,
                    pos: pos,
                    level: level,
                    example: example,
                    exampleMeaning: exampleMeaning,
                    synonym: synonym,
                    synonymSinoVietnamese: synonymSinoVietnamese,
                    nuance: nuance,
                    ipa: '',
                    accent: '',
                    imageBase64: null,
                    audioBase64: null
                };
            });

            onImport(formattedCards);
            setJsonInput('');
            onClose();
        } catch (err) {
            console.error('JSON Parse error:', err);
            setErrorMsg('Cú pháp JSON chưa hợp lệ! Vui lòng kiểm tra lại cấu trúc JSON.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50">
                            <FileJson className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                Nhập từ vựng bằng JSON thủ công
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Sao chép Prompt đầy đủ trường dữ liệu bên dưới để nhờ AI soạn danh sách từ vựng
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Full Prompt AI Copy Box */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span>Prompt AI đầy đủ các trường từ vựng (ChatGPT / Gemini / Claude)</span>
                        </div>
                        <button
                            onClick={handleCopyPrompt}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                        >
                            {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPrompt ? 'Đã chép Prompt!' : 'Sao chép Prompt'}</span>
                        </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed bg-white/90 dark:bg-slate-950/90 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar">
                        {SAMPLE_PROMPT}
                    </pre>
                </div>

                {/* Textarea Input */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Dán chuỗi mảng JSON từ vựng do AI tạo vào đây:
                    </label>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => {
                            setJsonInput(e.target.value);
                            setErrorMsg('');
                        }}
                        rows={6}
                        placeholder={`Dán chuỗi JSON từ AI vào đây, ví dụ:\n[\n  {\n    "front": "勉強",\n    "reading": "べんきょう",\n    "back": "Học tập, học hành",\n    "sinoVietnamese": "MIỄN CƯỜNG",\n    "pos": "Danh từ",\n    "level": "N5",\n    "example": "毎日日本語を＿＿＿＿します。",\n    "exampleMeaning": "Tôi học tiếng Nhật mỗi ngày.",\n    "synonym": "学習",\n    "synonymSinoVietnamese": "HỌC TẬP",\n    "nuance": "Dùng trong ngữ cảnh học tập kiến thức, thi cử."\n  }\n]`}
                        className="w-full p-3.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all custom-scrollbar"
                    />
                    {errorMsg && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold mt-1">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleImportSubmit}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Nhập từ vựng vào bài</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JsonImportModal;
