import React, { useState } from 'react';
import { X, Copy, Check, FileJson, Download, AlertCircle } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { cleanJapaneseExampleSentence } from '../../utils/furiganaHelper';
import { useTargetLanguage } from '../../contexts/TargetLanguageContext';

const SAMPLE_PROMPT_JA = `Hãy tạo cho tôi danh sách từ vựng tiếng Nhật theo định dạng mảng JSON bên dưới. Trả về ĐÚNG 1 mảng JSON thuần túy (không kèm bất kỳ lời giải thích hay ký tự thừa nào ngoài cặp dấu ngoặc vuông []).

LƯU Ý ĐẶC BIỆT VỀ CÂU VÍ DỤ:
1. Mỗi từ vựng hãy tạo từ 2 đến 3 câu ví dụ tự nhiên hoàn chỉnh thể hiện các ngữ cảnh và cấu trúc câu thông dụng (giữ nguyên từ gốc trong câu ví dụ, không che từ hay dùng dấu gạch dưới).
2. Phân dòng (\\n) và đánh số thứ tự 1., 2., 3. cho từng câu ví dụ ở trường "example".
3. Dịch nghĩa tiếng Việt tương ứng cho từng câu ở trường "exampleMeaning", phân dòng (\\n) và đánh số 1., 2., 3. khớp hoàn toàn với các câu ở trường "example".

[
  {
    "front": "勉強",
    "reading": "べんきょう",
    "back": "Học tập, học hành; nghiên cứu",
    "sinoVietnamese": "MIỄN CƯỜNG",
    "pos": "Danh từ / Động từ nhóm 3",
    "level": "N5",
    "example": "1. 毎日日本語を2時間勉強しています。\\n2. 図書館で友達と一緒に勉強しました。\\n3. 社会に出てからの方が勉強になることが多い。",
    "exampleMeaning": "1. Tôi học tiếng Nhật 2 tiếng mỗi ngày.\\n2. Tôi đã cùng bạn học bài ở thư viện.\\n3. Sau khi ra xã hội có nhiều điều giúp mình học hỏi được hơn.",
    "synonym": "学習",
    "synonymSinoVietnamese": "HỌC TẬP",
    "nuance": "Dùng cho việc học tập kiến thức, thi cử hoặc học hỏi trải nghiệm thực tế."
  },
  {
    "front": "約束",
    "reading": "やくそく",
    "back": "Lời hứa, hẹn ước; cuộc hẹn",
    "sinoVietnamese": "ƯỚC THÚC",
    "pos": "Danh từ / Động từ nhóm 3",
    "level": "N5",
    "example": "1. 明日友達と会う約束があります。\\n2. 一度した約束は必ず守らなければならない。",
    "exampleMeaning": "1. Ngày mai tôi có hẹn gặp bạn bè.\\n2. Lời hứa một khi đã đưa ra thì nhất định phải giữ.",
    "synonym": "契り",
    "synonymSinoVietnamese": "KHẾ",
    "nuance": "Dùng cho cả cuộc hẹn (appointment) lẫn lời hứa (promise)."
  }
]`;

const SAMPLE_PROMPT_KO = `Hãy tạo cho tôi danh sách từ vựng tiếng Hàn theo định dạng mảng JSON bên dưới. Trả về ĐÚNG 1 mảng JSON thuần túy (không kèm bất kỳ lời giải thích hay ký tự thừa nào ngoài cặp dấu ngoặc vuông []).

LƯU Ý ĐẶC BIỆT VỀ CÂU VÍ DỤ:
1. Mỗi từ vựng hãy tạo từ 2 đến 3 câu ví dụ tiếng Hàn tự nhiên hoàn chỉnh thể hiện các ngữ cảnh và cấu trúc câu thông dụng (giữ nguyên từ gốc trong câu ví dụ, không che từ hay dùng dấu gạch dưới).
2. Phân dòng (\\n) và đánh số thứ tự 1., 2., 3. cho từng câu ví dụ ở trường "example".
3. Dịch nghĩa tiếng Việt tương ứng cho từng câu ở trường "exampleMeaning", phân dòng (\\n) và đánh số 1., 2., 3. khớp hoàn toàn với các câu ở trường "example".

[
  {
    "front": "공부하다",
    "reading": "gong-bu-ha-da",
    "back": "Học, học tập; nghiên cứu",
    "sinoVietnamese": "CÔNG PHU",
    "pos": "Động từ",
    "level": "TOPIK 1",
    "example": "1. 저는 매일 한국어를 2시간 공부해요.\\n2. 도서관에서 친구와 같이 공부했어요.\\n3. 열심히 공부해서 시험에 합격했어요.",
    "exampleMeaning": "1. Tôi học tiếng Hàn 2 tiếng mỗi ngày.\\n2. Tôi đã cùng bạn học bài ở thư viện.\\n3. Tôi đã học hành chăm chỉ và thi đậu.",
    "synonym": "배우다, 학습하다",
    "synonymSinoVietnamese": "HỌC TẬP",
    "nuance": "Dùng cho việc học tập kiến thức, thi cử hoặc nỗ lực rèn luyện."
  },
  {
    "front": "약속",
    "reading": "yak-sok",
    "back": "Lời hứa, hẹn ước; cuộc hẹn",
    "sinoVietnamese": "ƯỚC THÚC",
    "pos": "Danh từ",
    "level": "TOPIK 1",
    "example": "1. 내일 친구와 만날 약속이 있어요.\\n2. 한번 한 약속은 꼭 지켜야 해요.",
    "exampleMeaning": "1. Ngày mai tôi có hẹn gặp bạn bè.\\n2. Lời hứa một khi đã đưa ra thì nhất định phải giữ.",
    "synonym": "다짐, 계약",
    "synonymSinoVietnamese": "ƯỚC",
    "nuance": "Dùng cho cả cuộc hẹn gặp mặt lẫn lời hứa thực hiện điều gì."
  }
]`;

const SAMPLE_PROMPT_EN = `Hãy tạo cho tôi danh sách từ vựng tiếng Anh theo định dạng mảng JSON bên dưới. Trả về ĐÚNG 1 mảng JSON thuần túy (không kèm bất kỳ lời giải thích hay ký tự thừa nào ngoài cặp dấu ngoặc vuông []).

LƯU Ý ĐẶC BIỆT VỀ CÂU VÍ DỤ:
1. Mỗi từ vựng hãy tạo từ 2 đến 3 câu ví dụ tự nhiên hoàn chỉnh thể hiện các ngữ cảnh và cấu trúc câu thông dụng (giữ nguyên từ gốc trong câu ví dụ, không che từ hay dùng dấu gạch dưới).
2. Phân dòng (\\n) và đánh số thứ tự 1., 2., 3. cho từng câu ví dụ ở trường "example".
3. Dịch nghĩa tiếng Việt tương ứng cho từng câu ở trường "exampleMeaning", phân dòng (\\n) và đánh số 1., 2., 3. khớp hoàn toàn với các câu ở trường "example".

[
  {
    "front": "Accomplish",
    "reading": "/əˈkɑːm.plɪʃ/",
    "back": "Hoàn thành, đạt được, thực hiện",
    "pos": "Verb (Động từ)",
    "level": "B2",
    "example": "1. If we work together, we can accomplish anything.\\n2. She accomplished such a lot during her visit.\\n3. I don't feel I've accomplished very much today.",
    "exampleMeaning": "1. Nếu chúng ta làm việc cùng nhau, chúng ta có thể hoàn thành bất cứ điều gì.\\n2. Cô ấy đã đạt được rất nhiều thành tựu trong chuyến thăm của mình.\\n3. Tôi cảm thấy hôm nay mình chưa làm được gì nhiều.",
    "synonym": "Achieve, Complete, Fulfill",
    "antonym": "Fail, Abandon",
    "nuance": "Nhấn mạnh việc hoàn thành một mục tiêu, kế hoạch hoặc nhiệm vụ sau nhiều nỗ lực."
  },
  {
    "front": "Resilient",
    "reading": "/rɪˈzɪl.jənt/",
    "back": "Kiên cường, có khả năng phục hồi nhanh chóng",
    "pos": "Adjective (Tính từ)",
    "level": "C1",
    "example": "1. The local economy is remarkably resilient.\\n2. Children are often very resilient and adapt quickly to change.",
    "exampleMeaning": "1. Nền kinh tế địa phương kiên cường một cách đáng kể.\\n2. Trẻ em thường rất kiên cường và thích nghi nhanh chóng với sự thay đổi.",
    "synonym": "Tough, Robust, Adaptable",
    "antonym": "Fragile, Vulnerable",
    "nuance": "Dùng để miêu tả người hoặc hệ thống có thể nhanh chóng vượt qua khó khăn, bệnh tật hoặc thất bại."
  }
]`;

const JsonImportModal = ({ isOpen, onClose, onImport, existingCards = [] }) => {
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
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    const normalizeFrontText = (str) => {
        if (!str) return '';
        return str.split('（')[0].split('(')[0].trim().toLowerCase();
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
                const sinoVietnamese = String(item.sinoVietnamese || item.hanViet || item.sino_vietnamese || '').trim();
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
                    ipa: isEnglishMode ? (reading || String(item.ipa || '').trim()) : '',
                    accent: '',
                    imageBase64: null,
                    audioBase64: null
                });
            });

            if (formattedCards.length === 0) {
                if (duplicateCount > 0) {
                    setErrorMsg(`Tất cả ${duplicateCount} từ vựng trong file JSON đều đã tồn tại trong danh sách!`);
                } else {
                    setErrorMsg('Không tìm thấy từ vựng hợp lệ nào trong chuỗi JSON!');
                }
                return;
            }

            if (duplicateCount > 0) {
                showToast(`Đã nhập ${formattedCards.length} từ vựng mới! (Đã tự động loại bỏ ${duplicateCount} từ bị trùng lặp)`, 'info');
            } else {
                showToast(`Đã nhập thành công ${formattedCards.length} từ vựng mới từ JSON!`, 'success');
            }

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
                                {isKoreanMode
                                    ? 'Sao chép Prompt chuẩn tiếng Hàn bên dưới để nhờ AI soạn danh sách từ vựng'
                                    : isEnglishMode
                                    ? 'Sao chép Prompt chuẩn tiếng Anh bên dưới để nhờ AI soạn danh sách từ vựng'
                                    : 'Sao chép Prompt đầy đủ trường dữ liệu bên dưới để nhờ AI soạn danh sách từ vựng'}
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
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-xs">
                            <FileJson className="w-4 h-4 text-blue-500" />
                            <span>
                                {isKoreanMode
                                    ? 'Prompt AI đầy đủ các trường từ vựng tiếng Hàn (ChatGPT / Gemini / Claude)'
                                    : isEnglishMode
                                    ? 'Prompt AI đầy đủ các trường từ vựng tiếng Anh (ChatGPT / Gemini / Claude)'
                                    : 'Prompt AI đầy đủ các trường từ vựng tiếng Nhật (ChatGPT / Gemini / Claude)'}
                            </span>
                        </div>
                        <button
                            onClick={handleCopyPrompt}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                        >
                            {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPrompt ? 'Đã chép Prompt!' : 'Sao chép Prompt'}</span>
                        </button>
                    </div>
                    <pre className="text-[11px] font-mono leading-relaxed bg-white/90 dark:bg-slate-950/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar">
                        {currentPrompt}
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
                        placeholder={
                            isKoreanMode
                                ? `Dán chuỗi JSON từ AI vào đây, ví dụ:\n[\n  {\n    "front": "공부하다",\n    "reading": "gong-bu-ha-da",\n    "back": "Học, học tập",\n    "sinoVietnamese": "CÔNG PHU",\n    "pos": "Động từ",\n    "level": "TOPIK 1",\n    "example": "1. 저는 매일 한국어를 2시간 공부해요.\\n2. 도서관에서 친구와 같이 공부했어요.",\n    "exampleMeaning": "1. Tôi học tiếng Hàn 2 tiếng mỗi ngày.\\n2. Tôi đã cùng bạn học bài ở thư viện.",\n    "synonym": "배우다",\n    "nuance": "Dùng cho việc học tập rèn luyện."\n  }\n]`
                                : isEnglishMode
                                ? `Dán chuỗi JSON từ AI vào đây, ví dụ:\n[\n  {\n    "front": "Accomplish",\n    "reading": "/əˈkɑːm.plɪʃ/",\n    "back": "Hoàn thành, đạt được",\n    "pos": "Verb (Động từ)",\n    "level": "B2",\n    "example": "1. If we work together, we can accomplish anything.\\n2. She accomplished such a lot during her visit.",\n    "exampleMeaning": "1. Nếu chúng ta làm việc cùng nhau, chúng ta có thể hoàn thành bất cứ điều gì.\\n2. Cô ấy đã đạt được rất nhiều thành tựu.",\n    "synonym": "Achieve, Complete",\n    "nuance": "Dùng cho việc hoàn thành mục tiêu sau nỗ lực."\n  }\n]`
                                : `Dán chuỗi JSON từ AI vào đây, ví dụ:\n[\n  {\n    "front": "勉強",\n    "reading": "べんきょう",\n    "back": "Học tập, học hành",\n    "sinoVietnamese": "MIỄN CƯỜNG",\n    "pos": "Danh từ / Động từ nhóm 3",\n    "level": "N5",\n    "example": "1. 毎日日本語を2時間勉強しています。\\n2. 図書館で友達と一緒に勉強しました。",\n    "exampleMeaning": "1. Tôi học tiếng Nhật 2 tiếng mỗi ngày.\\n2. Tôi đã cùng bạn học bài ở thư viện.",\n    "synonym": "学習",\n    "synonymSinoVietnamese": "HỌC TẬP",\n    "nuance": "Dùng trong học tập kiến thức, thi cử."\n  }\n]`
                        }
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

