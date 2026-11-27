/**
 * JLPT Authoring Service (Yearly Exams 2010–2025 & Listening by Mondai)
 * Combines PDF/Image extraction, Whisper timestamp alignment, Gemini AI structuring,
 * Mondai splitting, Firestore publishing, and static JSON export.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { callAI, parseJsonFromAI, getEffectiveModel } from '../../utils/aiProvider';
import { compressImage } from '../../utils/image';
import { extractPdfText, extractPdfPageImages, chunkPdfPages } from './pdfExtractorService';
import { sanitizeDataForFirestore, normalizeAnswerIndex } from '../../components/jlptTest/JLPTExportImportModal';
import {
    JLPT_TOTAL_TIME_BY_LEVEL,
    JLPT_LISTENING_TIME_BY_LEVEL,
    getMondaiListForLevel,
    getMondaiMeta,
    resolveQuestionMondai,
    testHasListening
} from '../../components/jlptTest/jlptYearlyConstants';
import { updateSingleJLPTTestInCache } from '../jlptDataService';

/**
 * Extracts text and/or visual page images from mixed user files (PDF, PNG/JPG, TXT).
 * Automatically falls back to page rendering when a PDF is scanned (very little selectable text).
 */
export const readExamSourceFiles = async (fileList = [], {
    maxScannedPages = 20,
    onLog = () => {},
    signal = null
} = {}) => {
    const files = Array.from(fileList || []).filter(Boolean);
    let combinedText = '';
    const visualPages = []; // { label, pageNumber, base64 }

    for (const file of files) {
        if (signal?.aborted) throw new Error('Đã hủy đọc tài liệu.');
        const lower = (file.name || '').toLowerCase();

        if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
            onLog(`📄 Đang đọc PDF "${file.name}"...`);
            const extracted = await extractPdfText(file, { pageRange: 'ALL', signal });
            const avgCharsPerPage = extracted.pageCount > 0 ? extracted.fullText.length / extracted.pageCount : 0;

            if (extracted.fullText.trim().length > 60 && avgCharsPerPage >= 60) {
                combinedText += `\n=== FILE: ${file.name} ===\n${extracted.fullText}\n`;
                onLog(`✅ Đã lấy text PDF "${file.name}" (${extracted.pageCount} trang, ${extracted.fullText.length.toLocaleString()} ký tự).`);
            } else {
                onLog(`🖼️ PDF "${file.name}" là file scan ảnh, đang render ${Math.min(extracted.totalPages, maxScannedPages)} trang để AI OCR...`);
                const imgs = await extractPdfPageImages(file, {
                    pageRange: `1-${Math.min(extracted.totalPages, maxScannedPages)}`,
                    scale: 1.45,
                    maxPages: maxScannedPages,
                    signal
                });
                imgs.forEach((im) => {
                    visualPages.push({ label: file.name, pageNumber: im.pageNumber, base64: im.base64 });
                });
                onLog(`✅ Đã render ${imgs.length} trang ảnh từ "${file.name}".`);
            }
        } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
            const compressed = await compressImage(file, 1400, 1400, 0.85);
            visualPages.push({ label: file.name, pageNumber: visualPages.length + 1, base64: compressed });
            onLog(`🖼️ Đã nạp ảnh "${file.name}".`);
        } else {
            const txt = await file.text();
            combinedText += `\n=== FILE: ${file.name} ===\n${txt}\n`;
            onLog(`📝 Đã nạp file text "${file.name}" (${txt.length.toLocaleString()} ký tự).`);
        }
    }

    return { text: combinedText.trim(), visualPages };
};

/**
 * Uses multimodal Vision AI to OCR scanned exam pages into clean Japanese exam text.
 */
export const ocrVisualExamPages = async (visualPages = [], {
    roleDescription = 'đề thi JLPT',
    model = 'google/gemini-2.5-flash',
    onLog = () => {},
    signal = null
} = {}) => {
    if (!visualPages.length) return '';
    const effectiveModel = getEffectiveModel(model);
    let ocrOutput = '';
    const BATCH = 3;

    for (let i = 0; i < visualPages.length; i += BATCH) {
        if (signal?.aborted) throw new Error('Đã hủy tiến trình OCR.');
        const slice = visualPages.slice(i, i + BATCH);
        onLog(`👁️ AI Vision OCR đang đọc ${roleDescription} (ảnh ${i + 1}–${i + slice.length}/${visualPages.length})...`);

        const contentParts = [
            {
                type: 'text',
                text: `Bạn là chuyên gia OCR đề thi tiếng Nhật JLPT. Hãy trích xuất NGUYÊN VĂN toàn bộ chữ tiếng Nhật, số câu hỏi, tiêu đề 問題 (Mondai), 4 đáp án lựa chọn (1, 2, 3, 4), gạch chân bằng <u>...</u> nếu có, và ghi chú [HÌNH MINH HỌA] tại những câu có tranh vẽ từ các trang ảnh ${roleDescription} sau.
Trả về JSON hợp lệ dạng: { "extractedText": "..." }`
            },
            ...slice.map((p) => ({
                type: 'image_url',
                image_url: { url: p.base64 }
            }))
        ];

        const raw = await callAI(contentParts, effectiveModel, 'pdf_ingest', 8192);
        try {
            const parsed = parseJsonFromAI(raw);
            ocrOutput += `\n--- [TRANG ${slice.map((s) => s.pageNumber).join(',')}] ---\n${parsed?.extractedText || raw}\n`;
        } catch {
            ocrOutput += `\n--- [TRANG ${slice.map((s) => s.pageNumber).join(',')}] ---\n${raw}\n`;
        }
    }

    return ocrOutput.trim();
};

/**
 * Generates structured Listening questions (with Mondai, script [{speaker, ja, vi}],
 * options, correctAnswer, explanation, and audioStartSec/audioEndSec) from Whisper blocks + exam text.
 */
export const generateListeningQuestionsWithAI = async ({
    level = 'N3',
    examYear = '',
    examSession = '',
    targetMondai = null,
    blocks = [],
    audioUrl = '',
    examPaperText = '',
    answerScriptText = '',
    model = 'google/gemini-2.5-flash',
    onProgress = () => {},
    onLog = () => {},
    signal = null
} = {}) => {
    const effectiveModel = getEffectiveModel(model);
    const mondaiList = getMondaiListForLevel(level);
    const mondaiSummary = mondaiList.map((m) => `Mondai ${m.mondai}: ${m.ja} (${m.vi})`).join(' | ');

    // If no audio Whisper blocks exist yet, let AI build questions directly from examPaperText + answerScriptText
    const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
    const batches = [];

    if (hasBlocks) {
        const CHUNK_SIZE = 7;
        for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
            batches.push(blocks.slice(i, i + CHUNK_SIZE));
        }
    } else {
        // Chunk text lines if very long
        const combinedLen = (examPaperText + answerScriptText).trim().length;
        if (!combinedLen) {
            throw new Error('Cần ít nhất File Audio MP3 (chạy Whisper) hoặc Văn bản/PDF Đề Nghe / Script để AI soạn câu hỏi.');
        }
        const pages = chunkPdfPages([{ pageNumber: 1, text: answerScriptText || examPaperText }], 7000);
        pages.forEach((p) => batches.push(p.text));
    }

    const allQuestions = [];
    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        if (signal?.aborted) throw new Error('Đã hủy soạn phần Nghe hiểu.');
        const batch = batches[bIdx];

        onProgress({
            stage: 'AI_LISTENING',
            percent: Math.round((bIdx / batches.length) * 100),
            detail: `AI đang biên soạn & căn mốc câu nghe đợt ${bIdx + 1}/${batches.length}...`
        });
        onLog(`🤖 AI Nghe hiểu [${bIdx + 1}/${batches.length}] bằng ${effectiveModel}...`);

        const blockText = hasBlocks
            ? batch.map((bl, idx) =>
                `[BLOCK #${idx + 1} | Mondai gợi ý: ${bl.mondai} | Câu gợi ý: ${bl.questionNumber} | Thời gian: ${bl.startSec}s -> ${bl.endSec}s]\n${bl.transcriptJa}`
            ).join('\n\n')
            : batch;

        const prompt = `Bạn là chuyên gia biên soạn đề Nghe hiểu JLPT cấp độ ${level} (${examYear ? `Kỳ ${examSession}/${examYear}` : 'Luyện theo Mondai'}).
Cấu trúc Mondai chuẩn của ${level}: ${mondaiSummary}.
${targetMondai ? `Chú ý: Bộ đề này tập trung vào Mondai ${targetMondai}.` : ''}

NHIỆM VỤ:
Chuyển dữ liệu dưới đây thành danh sách câu hỏi Nghe hiểu hoàn chỉnh (LOẠI BỎ các đoạn "例 / Ví dụ" hoặc hướng dẫn đầu Mondai chỉ giữ lại các câu thi thật).

${hasBlocks ? `TRANSCRIPT WHISPER CÓ MỐC GIÂY:\n"""\n${blockText}\n"""\n` : ''}
${examPaperText ? `VĂN BẢN TỜ ĐỀ THI (Lựa chọn in trên giấy / câu hỏi):\n"""\n${examPaperText.slice(0, 12000)}\n"""\n` : ''}
${answerScriptText ? `SCRIPT GỐC / BẢNG ĐÁP ÁN KÈM THEO:\n"""\n${answerScriptText.slice(0, 12000)}\n"""\n` : ''}

QUY TẮC BẮT BUỘC:
1. "mondai": Số nguyên 1..${mondaiList.length}.
2. "questionNumber": Số thứ tự câu trong Mondai (1, 2, 3...).
3. "audioStartSec" & "audioEndSec": Giữ nguyên hoặc tinh chỉnh chính xác mốc giây bắt đầu và kết thúc của câu đó từ BLOCK tương ứng (số thực, ví dụ 14.5). Nếu không có mốc audio thì để null.
4. "stem": Tình huống mở đầu bằng tiếng Nhật (VD: "レストランで 店長と 女の人が 話しています。").
5. "question": Câu hỏi chính bằng tiếng Nhật (VD: "女の人は このあと 何を しますか。"). Nếu là câu phản xạ nhanh không in câu hỏi, ghi ngắn gọn: "適切な返答を選んでください。(Chọn câu hồi đáp phù hợp nhất)".
6. "options": Mảng 4 phương án (riêng Mondai 発話表現 / 即時応答 có thể 3 phương án). Nếu trên đề giấy có chữ (Mondai 2...), ghi chính xác phương án đó kèm tiếng Nhật sạch. Nếu là câu nghe tranh/không in chữ (Mondai 1 tranh, Mondai 3/4/5), ghi rõ ["1", "2", "3", "4"] (hoặc ["1", "2", "3"] nếu 3 đáp án).
7. "correctAnswer": Chỉ số 0-based (0 cho đáp án 1, 1 cho đáp án 2, 2 cho đáp án 3, 3 cho đáp án 4).
8. "script": Mảng đối thoại đã chỉnh chính tả chuẩn Nhật dựa theo audio/script gốc:
   [{ "speaker": "M" | "F" | "Narrator", "ja": "Câu thoại tiếng Nhật tự nhiên", "vi": "Bản dịch tiếng Việt mượt mà" }]
9. "explanation": Giải thích súc tích bằng tiếng Việt: vì sao đáp án đúng chính xác và loại trừ các phương án gây nhiễu.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG MARKDOWN):
{
  "questions": [
    {
      "mondai": 1,
      "questionNumber": 1,
      "audioStartSec": 14.2,
      "audioEndSec": 72.8,
      "stem": "...",
      "question": "...",
      "options": ["1", "2", "3", "4"],
      "correctAnswer": 2,
      "hasIllustrationNote": true,
      "script": [
        { "speaker": "F", "ja": "...", "vi": "..." },
        { "speaker": "M", "ja": "...", "vi": "..." }
      ],
      "explanation": "..."
    }
  ]
}`;

        try {
            const raw = await callAI(prompt, effectiveModel, 'pdf_ingest', 8192);
            const parsed = parseJsonFromAI(raw);
            const qArr = Array.isArray(parsed) ? parsed : (parsed?.questions || []);

            qArr.forEach((rawQ) => {
                const mondaiNum = targetMondai ? Number(targetMondai) : resolveQuestionMondai(rawQ);
                const mMeta = getMondaiMeta(level, mondaiNum);
                const opts = Array.isArray(rawQ.options) && rawQ.options.length > 0 ? rawQ.options.map(String) : ['1', '2', '3', '4'];
                const normAns = normalizeAnswerIndex(rawQ.correctAnswer ?? rawQ.answer ?? 0, opts);

                const scriptList = Array.isArray(rawQ.script)
                    ? rawQ.script.filter((line) => line && (line.ja || line.text)).map((line) => ({
                        speaker: line.speaker || 'Narrator',
                        ja: (line.ja || line.text || '').trim(),
                        vi: (line.vi || '').trim()
                    }))
                    : [];

                const displayQuestion = rawQ.stem && !String(rawQ.question || '').includes(rawQ.stem)
                    ? `<div class="text-xs font-bold text-slate-500 mb-1">${rawQ.stem}</div>${rawQ.question || ''}`
                    : (rawQ.question || rawQ.stem || 'Nghe và chọn đáp án đúng nhất');

                allQuestions.push({
                    mondai: mondaiNum,
                    mondaiTitle: `Mondai ${mondaiNum}: ${mMeta.ja} · ${mMeta.vi}`,
                    questionNumber: Number(rawQ.questionNumber || allQuestions.length + 1),
                    stem: rawQ.stem || '',
                    question: displayQuestion,
                    options: opts,
                    correctAnswer: normAns,
                    answer: normAns,
                    audioUrl: audioUrl || '',
                    audioStartSec: typeof rawQ.audioStartSec === 'number' ? Number(rawQ.audioStartSec.toFixed(1)) : undefined,
                    audioEndSec: typeof rawQ.audioEndSec === 'number' ? Number(rawQ.audioEndSec.toFixed(1)) : undefined,
                    imageUrl: '',
                    hasIllustrationNote: Boolean(rawQ.hasIllustrationNote),
                    script: scriptList,
                    explanation: rawQ.explanation || ''
                });
            });
            onLog(`✅ Đợt ${bIdx + 1}/${batches.length}: tạo thành công ${qArr.length} câu nghe.`);
        } catch (err) {
            onLog(`⚠️ Lỗi AI đợt ${bIdx + 1}: ${err.message}`);
        }
    }

    onProgress({ stage: 'AI_LISTENING', percent: 100, detail: `Đã biên soạn xong ${allQuestions.length} câu Nghe hiểu.` });
    return allQuestions;
};

/**
 * Generates Vocabulary / Grammar / Reading sections from Language Knowledge & Reading exam text.
 */
export const generateReadingLangSectionsWithAI = async ({
    level = 'N3',
    langPaperText = '',
    answerKeyText = '',
    model = 'google/gemini-2.5-flash',
    onProgress = () => {},
    onLog = () => {},
    signal = null
} = {}) => {
    if (!langPaperText?.trim()) return [];
    const effectiveModel = getEffectiveModel(model);
    const chunks = chunkPdfPages([{ pageNumber: 1, text: langPaperText }], 7500);
    const sectionsMap = new Map();

    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new Error('Đã hủy xử lý phần Kiến thức ngôn ngữ & Đọc hiểu.');
        const chunk = chunks[i];
        onProgress({
            stage: 'AI_LANG_READING',
            percent: Math.round((i / chunks.length) * 100),
            detail: `Đang phân tích Kiến thức ngôn ngữ & Đọc hiểu phần ${i + 1}/${chunks.length}...`
        });
        onLog(`📘 Đọc hiểu & Từ vựng/Ngữ pháp [${i + 1}/${chunks.length}]...`);

        const prompt = `Bạn là chuyên gia khảo thí JLPT ${level}. Hãy trích xuất CHÍNH XÁC phần thi trong đoạn đề thi dưới đây (Phần ${i + 1}/${chunks.length}) sang JSON chuẩn.
${answerKeyText ? `\nBẢNG ĐÁP ÁN THAM CHIẾU (ưu tiên khớp đáp án theo bảng này nếu có):\n"""\n${answerKeyText.slice(0, 6000)}\n"""` : ''}

VĂN BẢN ĐỀ THI:
"""
${chunk.text}
"""

QUY TẮC:
- Phân loại section "type": "vocabulary" (文字・語彙), "grammar" (文法), hoặc "reading" (読解).
- Với bài đọc hiểu ("reading" hoặc điền từ vào đoạn văn), PHẢI giữ đầy đủ đoạn văn vào trường "passage" của từng câu hỏi.
- Gạch chân từ khóa bằng <u>...</u>, điền sao bằng "<u>\u3000</u> <u>\u3000</u> <u>★</u> <u>\u3000</u>".
- "correctAnswer": index 0..3; "explanation": dịch nghĩa & giải thích rõ ràng bằng tiếng Việt.

TRẢ VỀ DUY NHẤT 1 JSON:
{
  "sections": [
    {
      "type": "vocabulary",
      "title": "Từ vựng (文字・語彙)",
      "questions": [
        {
          "passage": "",
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "..."
        }
      ]
    }
  ]
}`;

        try {
            const raw = await callAI(prompt, effectiveModel, 'pdf_ingest', 8192);
            const parsed = parseJsonFromAI(raw);
            (parsed?.sections || []).forEach((sec) => {
                const secType = ['vocabulary', 'grammar', 'kanji', 'reading'].includes(sec.type) ? sec.type : 'vocabulary';
                if (!sectionsMap.has(secType)) {
                    sectionsMap.set(secType, {
                        type: secType,
                        title: sec.title || secType,
                        questions: []
                    });
                }
                const target = sectionsMap.get(secType);
                (sec.questions || []).forEach((q) => {
                    const opts = Array.isArray(q.options) ? q.options.map(String) : [];
                    const normAns = normalizeAnswerIndex(q.correctAnswer ?? q.answer ?? 0, opts);
                    const cleanQ = {
                        question: q.question || '',
                        options: opts,
                        correctAnswer: normAns,
                        answer: normAns,
                        explanation: q.explanation || ''
                    };
                    if (q.passage) cleanQ.passage = q.passage;
                    target.questions.push(cleanQ);
                });
            });
            onLog(`✅ Đọc hiểu/Ngôn ngữ đợt ${i + 1}/${chunks.length} hoàn tất.`);
        } catch (err) {
            onLog(`⚠️ Lỗi AI phần Ngôn ngữ/Đọc đợt ${i + 1}: ${err.message}`);
        }
    }

    onProgress({ stage: 'AI_LANG_READING', percent: 100, detail: 'Hoàn tất trích xuất Từ vựng, Ngữ pháp & Đọc hiểu.' });
    return Array.from(sectionsMap.values()).filter((s) => s.questions.length > 0);
};

/**
 * Builds the canonical Test Object for a Yearly Exam (2010–2025) or a Mondai Pack.
 */
export const buildAuthoredTestObject = ({
    mode = 'yearly', // 'yearly' | 'mondai'
    level = 'N3',
    examYear = 2024,
    examSession = '12',
    mondaiNumber = 1,
    customTitle = '',
    sections = [],
    isPremium = false,
    description = ''
}) => {
    const normLevel = String(level || 'N3').toUpperCase().trim();
    const sess = String(examSession || '12').padStart(2, '0');
    const yearNum = Number(examYear) || 2024;
    const hasListen = sections.some((s) => s.type === 'listening' && (s.questions?.length || 0) > 0);

    const listeningCounts = {};
    sections.forEach((sec) => {
        if (sec.type === 'listening') {
            (sec.questions || []).forEach((q) => {
                const m = resolveQuestionMondai(q);
                listeningCounts[m] = (listeningCounts[m] || 0) + 1;
            });
        }
    });

    if (mode === 'mondai') {
        const mMeta = getMondaiMeta(normLevel, mondaiNumber);
        const id = `jlpt-mondai-${normLevel.toLowerCase()}-${yearNum}-${sess}-m${mMeta.mondai}`;
        return {
            id,
            title: customTitle.trim() || `Nghe ${normLevel} · Mondai ${mMeta.mondai} (${mMeta.ja}) · Kỳ ${sess}/${yearNum}`,
            level: normLevel,
            timeLimit: 15,
            isSkillTest: true,
            skillType: 'listening',
            category: 'mondai_listening',
            mondaiNumber: mMeta.mondai,
            examYear: yearNum,
            examSession: sess,
            hasListening: true,
            mondaiCounts: listeningCounts,
            bookSlug: `mondai_${normLevel.toLowerCase()}_m${mMeta.mondai}`,
            bookTitle: `Nghe Tổng Hợp ${normLevel} · Mondai ${mMeta.mondai}: ${mMeta.ja} (${mMeta.vi})`,
            isPremium: Boolean(isPremium),
            isFixed: true,
            description: description || `${mMeta.vi} — Tổng hợp câu nghe chuẩn kỳ ${sess}/${yearNum}.`,
            sections,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    const onlyListening = sections.length > 0 && sections.every((s) => s.type === 'listening');
    const defaultTime = onlyListening
        ? (JLPT_LISTENING_TIME_BY_LEVEL[normLevel] || 40)
        : (JLPT_TOTAL_TIME_BY_LEVEL[normLevel] || 140);

    const id = `jlpt-yearly-${normLevel.toLowerCase()}-${yearNum}-${sess}`;
    return {
        id,
        title: customTitle.trim() || `Đề thi JLPT ${normLevel} · Kỳ Tháng ${Number(sess)}/${yearNum}`,
        level: normLevel,
        timeLimit: defaultTime,
        isSkillTest: false,
        skillType: onlyListening ? 'listening' : 'full',
        category: 'yearly',
        examYear: yearNum,
        examSession: sess,
        hasListening: hasListen,
        mondaiCounts: listeningCounts,
        bookSlug: `yearly_${normLevel.toLowerCase()}`,
        bookTitle: `Tuyển Tập Đề Thi JLPT ${normLevel} Các Năm (2010–2025)`,
        isPremium: Boolean(isPremium),
        isFixed: true,
        description: description || `Đề thi chính thức JLPT ${normLevel} kỳ tháng ${Number(sess)} năm ${yearNum}${hasListen ? ' (Đầy đủ Nghe hiểu & Script)' : ''}.`,
        sections,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

/**
 * Splits listening questions from a yearly test into dedicated per-Mondai skill tests for that level.
 */
export const splitListeningIntoMondaiTests = (yearlyTest) => {
    if (!yearlyTest || !Array.isArray(yearlyTest.sections)) return [];
    const listeningQuestions = [];
    yearlyTest.sections.forEach((sec) => {
        if (sec.type === 'listening' && Array.isArray(sec.questions)) {
            listeningQuestions.push(...sec.questions);
        }
    });
    if (listeningQuestions.length === 0) return [];

    const byMondai = new Map();
    listeningQuestions.forEach((q) => {
        const m = resolveQuestionMondai(q);
        if (!byMondai.has(m)) byMondai.set(m, []);
        byMondai.get(m).push({ ...q, mondai: m });
    });

    const out = [];
    Array.from(byMondai.keys()).sort((a, b) => a - b).forEach((mNum) => {
        const qs = byMondai.get(mNum);
        const mMeta = getMondaiMeta(yearlyTest.level, mNum);
        out.push(buildAuthoredTestObject({
            mode: 'mondai',
            level: yearlyTest.level,
            examYear: yearlyTest.examYear || 2024,
            examSession: yearlyTest.examSession || '12',
            mondaiNumber: mNum,
            isPremium: yearlyTest.isPremium,
            sections: [{
                type: 'listening',
                title: `Mondai ${mNum}: ${mMeta.ja} · ${mMeta.vi}`,
                questions: qs
            }]
        }));
    });
    return out;
};

/**
 * Saves an authored test to Firestore (updates deterministic doc ID and local RAM cache immediately).
 */
export const saveAuthoredTestToFirestore = async (testObj) => {
    if (!testObj?.id) throw new Error('Thiếu ID đề thi.');
    if (!db) throw new Error('Firestore chưa sẵn sàng.');

    const clean = sanitizeDataForFirestore({
        ...testObj,
        hasListening: testHasListening(testObj),
        updatedAt: Date.now()
    });

    const approxBytes = new Blob([JSON.stringify(clean)]).size;
    if (approxBytes > 940000) {
        throw new Error(`Kích thước đề (${Math.round(approxBytes / 1024)} KB) vượt giới hạn 940 KB của Firestore! Hãy upload ảnh/audio lên Firebase Storage hoặc dùng link CDN thay vì base64.`);
    }

    const testRef = doc(db, `artifacts/${appId}/jlptTests`, clean.id);
    await setDoc(testRef, {
        ...clean,
        updatedAtServer: serverTimestamp()
    }, { merge: true });

    updateSingleJLPTTestInCache(clean.id, clean);
    return clean;
};

/**
 * Downloads any JS object/array as a clean .json file for static bank import.
 */
export const downloadJsonFile = (data, fileName = 'jlpt-export.json') => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
