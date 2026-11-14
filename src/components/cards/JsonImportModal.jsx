import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, FileJson, Sparkles, AlertCircle, ArrowDownToLine } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { cleanJapaneseExampleSentence } from '../../utils/furiganaHelper';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';

const SAMPLE_PROMPT_JA = `Bạn là chuyên gia ngôn ngữ và công cụ trích xuất/chuyển đổi từ vựng tiếng Nhật chuẩn cho ứng dụng Flashcard QuizKi.

Nhiệm vụ: Chuyển đổi dữ liệu input hoặc tài liệu đính kèm thành bộ thẻ từ vựng đơn giản, dễ nhớ nhất cho người học.
CHỈ trả về JSON Array hợp lệ, KHÔNG giải thích, KHÔNG markdown, KHÔNG code block.

Format output:
[
  {
    "word": "từ vựng (Kanji/Katakana/Hiragana)",
    "reading": "cách đọc Hiragana (Katakana giữ nguyên)",
    "sinoVietnamese": "ÂM HÁN VIỆT VIẾT HOA (để trống \"\" nếu không có Kanji)",
    "meaning": "Nghĩa tiếng Việt ngắn gọn cốt lõi (1 - 5 từ)",
    "pos": "noun / verb / adj-i / adj-na / adverb / phrase / other",
    "level": "N5 / N4 / N3 / N2 / N1",
    "example": "Câu ví dụ tiếng Nhật ngắn thông dụng (5 - 10 từ)",
    "exampleMeaning": "Nghĩa câu ví dụ tiếng Việt"
  }
]

User có thể cung cấp input ở BẤT KỲ dạng nào:
- Chỉ list từ vựng (vd: 学校, 先生, すみません)
- Chỉ nghĩa tiếng Việt (vd: trường học, giáo viên) → tra ngược ra từ tiếng Nhật thông dụng nhất
- JSON thiếu field (vd: [{"word":"学校"}])
- Text thô có hoặc không có nghĩa, reading
- Bảng copy từ sách/web hoặc tài liệu đính kèm

QUY TẮC BẮT BUỘC ĐỂ THẺ ĐƠN GIẢN, DỄ HỌC NHẤT:
1. word: 
   - Giữ nguyên chữ Kanji/Katakana/Hiragana gốc.
   - Nếu input chỉ có Hiragana và nghĩa (vd: がっこう + trường học), hãy đưa về đúng chữ Kanji tương ứng (学校). Nếu từ thuần Hiragana/Katakana thì giữ nguyên.
   - Giữ nguyên cụm từ nếu người dùng nhập cụm (vd: "お腹が空いた").

2. reading:
   - Cách đọc phiên âm Hiragana thuần túy cho Kanji (từ gốc Katakana giữ nguyên Katakana).
   - TUYỆT ĐỐI KHÔNG để lẫn chữ Hán trong trường reading.

3. sinoVietnamese (Âm Hán Việt):
   - PHIÊN ÂM Hán Việt TỪNG CHỮ HÁN theo âm chuẩn, viết HOA TOÀN BỘ, phân cách bằng dấu cách (ĐÚNG: 前日 → "TIỀN NHẬT", 学校 → "HỌC HIỆU", 先生 → "TIÊN SINH"; SAI: "TIỀN NGÀY", "HỌC TRƯỜNG").
   - Nếu từ không chứa chữ Hán nào (như すみません, パン) thì để rỗng "".

4. meaning (Tối ưu cho người học dễ nhớ):
   - BẮT BUỘC NGẮN GỌN (chỉ từ 1 đến 5 từ tiếng Việt), viết hoa chữ cái đầu tiên (vd: "Trường học", "Ăn", "Giáo viên").
   - TUYỆT ĐỐI KHÔNG sao chép nguyên cả bài từ điển dài dòng; CHỈ chọn 1 đến 2 nét nghĩa thông dụng nhất trong đời sống hàng ngày (ngăn cách bằng dấu chấm phẩy ";" nếu có 2 nghĩa).

5. example & exampleMeaning (Nhớ lâu & đúng ngữ cảnh):
   - CHỈ 1 CÂU HOẶC CỤM COLLOCATION NGẮN (từ 5 đến 10 từ tiếng Nhật), phản ánh ngữ cảnh quen thuộc nhất của từ đó (vd: "毎朝8時に学校へ行きます。", "約束を守る。").
   - Ngữ pháp và từ vựng trong câu ví dụ phải phù hợp với trình độ của từ (từ N5 dùng câu N5, tránh dùng câu phức tạp nhiều mệnh đề).
   - Giữ nguyên từ vựng trong câu (có thể chia thể tự nhiên như 食べた, 行きます), KHÔNG chèn ngoặc furigana hay dấu gạch dưới trong câu.
   - exampleMeaning: Dịch thoát ý, tự nhiên sang tiếng Việt.

6. pos & level:
   - pos: Chọn 1 trong các giá trị: "noun", "verb", "adj-i", "adj-na", "adverb", "phrase", "other".
   - level: Điền cấp độ JLPT từ "N5", "N4", "N3", "N2", "N1". Nếu không rõ ghi "".

7. Bảo toàn dữ liệu:
   - Mỗi từ = 1 item trong mảng, giữ nguyên thứ tự xuất hiện gốc trong tài liệu/input.
   - Nếu người dùng đã cung cấp sẵn trường nào thì ưu tiên giữ nguyên, chỉ bổ sung các trường còn thiếu.`;

const SAMPLE_PROMPT_KO = `Bạn là chuyên gia ngôn ngữ tiếng Hàn cho ứng dụng QuizKi.
CHỈ trả về JSON Array hợp lệ, KHÔNG giải thích, KHÔNG markdown.

Format output:
[
  {
    "word": "từ vựng Hangul",
    "reading": "phiên âm Romaja",
    "sinoVietnamese": "ÂM HÁN HÀN VIẾT HOA (hoặc \"\")",
    "meaning": "Nghĩa tiếng Việt ngắn gọn (1 - 5 từ)",
    "pos": "noun / verb / adjective / adverb / other",
    "level": "TOPIK 1 / TOPIK 2 / ...",
    "example": "Câu ví dụ tiếng Hàn ngắn thông dụng (5 - 10 từ)",
    "exampleMeaning": "Nghĩa tiếng Việt của câu ví dụ"
  }
]

Quy tắc:
1. word: Giữ nguyên từ Hangul chuẩn.
2. meaning: Ngắn gọn (1-5 từ), dễ học, viết hoa chữ cái đầu.
3. example: 1 câu ví dụ ngắn gọn, tự nhiên, không che từ hay dùng gạch dưới.`;

const SAMPLE_PROMPT_EN = `You are an English vocabulary flashcard assistant for QuizKi.
Output ONLY a valid JSON Array, NO markdown, NO code block.

Format output:
[
  {
    "word": "English word/phrase",
    "reading": "/IPA pronunciation/",
    "meaning": "Concise Vietnamese meaning (1 - 5 words)",
    "pos": "noun / verb / adjective / adverb / phrase / other",
    "level": "A1 / A2 / B1 / B2 / C1 / C2",
    "example": "1 short natural English example sentence (5 - 12 words)",
    "exampleMeaning": "Vietnamese translation of the example sentence"
  }
]

Rules:
1. word: Keep the original English word/phrase.
2. meaning: Short, practical Vietnamese meaning.
3. example: 1 natural collocation/sentence without blanks or underscores.`;

const JsonImportModal = ({ isOpen, onClose, onImport, existingCards = [] }) => {
    const { t } = useLanguage();
    let isEnglishMode = false;
    let isKoreanMode = false;
    try {
        const targetLang = useTargetLanguage();
        isEnglishMode = targetLang?.isEnglishMode || (localStorage.getItem('quizki_target_language') === 'en');
        isKoreanMode = targetLang?.isKoreanMode || (localStorage.getItem('quizki_target_language') === 'ko');
    } catch (_) {
        isEnglishMode = localStorage.getItem('quizki_target_language') === 'en';
        isKoreanMode = localStorage.getItem('quizki_target_language') === 'ko';
    }

    const currentPrompt = isKoreanMode ? SAMPLE_PROMPT_KO : (isEnglishMode ? SAMPLE_PROMPT_EN : SAMPLE_PROMPT_JA);

    const [jsonInput, setJsonInput] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(currentPrompt);
        setCopiedPrompt(true);
        showToast('Đã sao chép Prompt AI vào khay nhớ tạm! 🎉', 'success');
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    const normalizeFrontText = (str) => {
        if (!str) return '';
        return str.split('（')[0].split('(')[0].trim().toLowerCase();
    };

    const handleImportSubmit = () => {
        setErrorMsg('');
        if (!jsonInput.trim()) {
            setErrorMsg(t('jsonImport.emptyInputError', 'Vui lòng nhập hoặc dán nội dung JSON vào ô bên dưới!'));
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
                setErrorMsg(t('jsonImport.noValidCardsError', 'Không tìm thấy danh sách từ vựng hợp lệ trong chuỗi JSON!'));
                return;
            }

            const existingFrontSet = new Set(
                (existingCards || [])
                    .map(c => normalizeFrontText(c.front || c.word || c.character || ''))
                    .filter(Boolean)
            );

            const formattedCards = [];
            const seenInBatch = new Set();
            let duplicateCount = 0;

            items.forEach((item, idx) => {
                const rawFront = String(item.front || item.word || item.kanji || item.vocabulary || item.term || '').trim();
                if (!rawFront) return;

                const norm = normalizeFrontText(rawFront);
                if (existingFrontSet.has(norm) || seenInBatch.has(norm)) {
                    duplicateCount++;
                    return; // Skip duplicate vocabulary!
                }
                seenInBatch.add(norm);

                const reading = String(item.reading || item.furigana || item.kana || item.pronunciation || item.ipa || item.romaji || '').trim();
                const back = String(item.back || item.meaning || item.definition || item.vietnamese || item.definition_vi || '').trim();
                const sinoVietnamese = String(item.sinoVietnamese || item.hanviet || item.hanViet || item.sino_vietnamese || '').trim();
                const pos = String(item.pos || item.partOfSpeech || item.type || '').trim();
                const level = String(item.level || item.jlpt || item.jlptLevel || item.cefr || '').trim();

                let rawExample = '';
                let rawExampleMeaning = '';

                if (Array.isArray(item.examples) && item.examples.length > 0) {
                    const exList = [];
                    const exMeanList = [];
                    item.examples.forEach((ex, exIdx) => {
                        if (typeof ex === 'string') {
                            exList.push(ex.match(/^\d+\./) ? ex : `${exIdx + 1}. ${ex}`);
                        } else if (ex && typeof ex === 'object') {
                            const sentence = ex.sentence || ex.ja || ex.en || ex.japanese || ex.english || ex.example || ex.text || '';
                            const meaning = ex.meaning || ex.vi || ex.vietnamese || ex.exampleMeaning || ex.translation || '';
                            if (sentence) exList.push(sentence.match(/^\d+\./) ? sentence : `${exIdx + 1}. ${sentence}`);
                            if (meaning) exMeanList.push(meaning.match(/^\d+\./) ? meaning : `${exIdx + 1}. ${meaning}`);
                        }
                    });
                    rawExample = exList.join('\n');
                    rawExampleMeaning = exMeanList.join('\n');
                } else {
                    rawExample = Array.isArray(item.example)
                        ? item.example.map((ex, exIdx) => (String(ex).match(/^\d+\./) ? String(ex) : `${exIdx + 1}. ${ex}`)).join('\n')
                        : String(item.example || item.exampleSentence || item.sentence || '').trim();
                    rawExampleMeaning = Array.isArray(item.exampleMeaning)
                        ? item.exampleMeaning.map((exM, exMIdx) => (String(exM).match(/^\d+\./) ? String(exM) : `${exMIdx + 1}. ${exM}`)).join('\n')
                        : String(item.exampleMeaning || item.exampleTranslation || item.example_meaning || item.sentence_meaning || '').trim();
                }

                const example = (isEnglishMode || isKoreanMode) ? rawExample.trim() : cleanJapaneseExampleSentence(rawExample);
                const exampleMeaning = rawExampleMeaning.trim();
                const synonym = String(item.synonym || item.synonyms || item.antonym || item.antonyms || '').trim();
                const synonymSinoVietnamese = String(item.synonymSinoVietnamese || item.synonymHanViet || item.synonym_sino_vietnamese || '').trim();
                const nuance = String(item.nuance || item.note || item.notes || '').trim();

                formattedCards.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 9) + idx,
                    isNew: true,
                    front: rawFront,
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
                    accent: String(item.accent || '0'),
                    targetLanguage: isKoreanMode ? 'ko' : (isEnglishMode ? 'en' : 'ja'),
                    imageBase64: null,
                    audioBase64: null
                });
            });

            if (formattedCards.length === 0) {
                setErrorMsg(duplicateCount > 0 
                    ? `Toàn bộ ${duplicateCount} từ trong file JSON đều đã tồn tại trong học phần!`
                    : 'Không tìm thấy dữ liệu từ vựng hợp lệ.');
                return;
            }

            onImport(formattedCards);
            onClose();

            if (duplicateCount > 0) {
                showToast(`Đã nhập thành công ${formattedCards.length} từ! (Bỏ qua ${duplicateCount} từ bị trùng)`, 'warning');
            } else {
                showToast(`Đã nhập thành công ${formattedCards.length} từ vựng! 🎉`, 'success');
            }
        } catch (err) {
            setErrorMsg(`Cú pháp JSON không hợp lệ: ${err.message}`);
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border-2 border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Duolingo-Styled Header */}
                <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-400/40 flex items-center justify-center font-black shrink-0 shadow-xs">
                            <FileJson className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate">
                                Nhập từ vựng bằng JSON thủ công
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                                Sao chép Prompt đầy đủ trường dữ liệu bên dưới để nhờ AI soạn danh sách từ vựng
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* Prompt Box */}
                    <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-800/60 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span className="font-black text-xs sm:text-sm text-sky-900 dark:text-sky-200">
                                    Prompt AI đầy đủ các trường từ vựng (ChatGPT / Gemini / Claude)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyPrompt}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs border-b-2 ${
                                    copiedPrompt
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700'
                                        : 'bg-sky-500 hover:bg-sky-400 text-white border-sky-700'
                                }`}
                            >
                                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép Prompt'}</span>
                            </button>
                        </div>

                        {/* Prompt Preview Codebox */}
                        <div className="relative">
                            <textarea
                                readOnly
                                rows={6}
                                value={currentPrompt}
                                className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 border border-sky-200/80 dark:border-sky-900/50 text-slate-700 dark:text-slate-300 font-mono text-[11px] sm:text-xs leading-relaxed resize-none focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* JSON Input Area */}
                    <div className="space-y-2">
                        <label className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Dán chuỗi mảng JSON từ vựng do AI tạo vào đây:</span>
                            {jsonInput.trim().length > 0 && (
                                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold lowercase">
                                    {jsonInput.length} ký tự
                                </span>
                            )}
                        </label>
                        <textarea
                            rows={8}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder={`Dán chuỗi JSON từ AI vào đây, ví dụ:\n[\n  {\n    "word": "勉強",\n    "reading": "べんきょう",\n    "sinoVietnamese": "MIỄN CƯỜNG",\n    "meaning": "Học tập",\n    "example": "毎日日本語を勉強します。",\n    "exampleMeaning": "Mỗi ngày tôi đều học tiếng Nhật."\n  }\n]`}
                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-750 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 transition-all text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 outline-none leading-relaxed"
                        />
                    </div>

                    {/* Error Notice */}
                    {errorMsg && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 flex items-center gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* Duolingo-Styled Footer */}
                <div className="p-4 sm:p-5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2 transition cursor-pointer"
                    >
                        Hủy
                    </button>

                    <button
                        type="button"
                        onClick={handleImportSubmit}
                        className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 transition shadow-md flex items-center gap-2 cursor-pointer"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                        <span>Nhập từ vựng vào bài</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default JsonImportModal;
