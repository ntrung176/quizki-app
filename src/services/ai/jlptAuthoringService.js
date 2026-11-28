/**
 * JLPT Authoring Service (Yearly Exams 2010–2025 & Listening by Mondai)
 * Combines PDF/Image extraction, Whisper timestamp alignment, Gemini AI structuring,
 * Mondai splitting, Firestore publishing, and static JSON export.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { callAI, getEffectiveModel } from '../../utils/aiProvider';
import { safeParseJsonWithRepair } from './aiPdfIngestorService';
import { compressImage } from '../../utils/image';
import { extractPdfText, extractPdfPageImages, chunkPdfPages } from './pdfExtractorService';
import { sanitizeDataForFirestore } from '../../components/jlptTest/JLPTExportImportModal';
import { normalizeAnswerIndex, detectBatchOneBasedIndexing } from '../../utils/jlptAnswerIndex';
import {
    JLPT_TOTAL_TIME_BY_LEVEL,
    JLPT_LISTENING_TIME_BY_LEVEL,
    getMondaiListForLevel,
    getMondaiMeta,
    getLevelExamBlueprint,
    resolveQuestionMondai,
    testHasListening,
    isThreeOptionMondai,
    isBareNumberOptions
} from '../../components/jlptTest/jlptYearlyConstants';
import { generateReadingLangSectionsWithAI } from './jlptLangReadingAuthoringService';
import { updateSingleJLPTTestInCache } from '../jlptDataService';

export { generateReadingLangSectionsWithAI };

const countJapaneseChars = (str = '') => {
    const matches = String(str || '').match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
    return matches ? matches.length : 0;
};

/**
 * Extracts text and/or visual page images from mixed user files (PDF, PNG/JPG, TXT).
 * Checks Japanese character quality per-page so CID-broken or scanned PDF pages automatically go through Vision OCR.
 */
export const readExamSourceFiles = async (fileList = [], {
    maxScannedPages = 50,
    forceVisionOcr = false,
    pdfSectionFilter = 'all', // 'all' | 'listening_only' | 'lang_reading_only'
    onLog = () => {},
    signal = null
} = {}) => {
    const files = Array.from(fileList || []).filter(Boolean);
    let combinedText = '';
    const visualPages = []; // { label, pageNumber, base64 }
    let clippedByChoukai = false;

    for (const file of files) {
        if (signal?.aborted) throw new Error('Đã hủy đọc tài liệu.');
        const lower = (file.name || '').toLowerCase();

        if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
            onLog(`📄 Đang đọc PDF "${file.name}"...`);
            const extracted = await extractPdfText(file, { pageRange: 'ALL', signal });

            // Detect where 聴解 (Listening) starts when someone uploads a combined full-exam PDF
            let targetPagesList = extracted.pages;
            if (pdfSectionFilter === 'listening_only' || pdfSectionFilter === 'lang_reading_only') {
                const choukaiPage = extracted.pages.find((p, idx) => {
                    const t = p.text || '';
                    if (/問題\s*[1１]\s+では、?まず質問を聞いて/.test(t)) return true;
                    if (idx === 0 && extracted.totalPages > 6) return false;
                    return /(?:^|\n)\s*聴\s*解\s*(?:\n|$)/.test(t);
                });
                if (choukaiPage) {
                    clippedByChoukai = true;
                    if (pdfSectionFilter === 'listening_only') {
                        targetPagesList = extracted.pages.filter((p) => p.pageNumber >= choukaiPage.pageNumber);
                        onLog(`🎧 Phát hiện phần 聴解 (Nghe hiểu) bắt đầu từ trang ${choukaiPage.pageNumber}/${extracted.totalPages} — tự động lọc đúng trang Nghe.`);
                    } else {
                        targetPagesList = extracted.pages.filter((p) => p.pageNumber < choukaiPage.pageNumber);
                        onLog(`📘 Tự động giữ trang 1–${Math.max(0, choukaiPage.pageNumber - 1)} cho Từ vựng · Ngữ pháp · Đọc hiểu (loại bỏ trang 聴解).`);
                    }
                }
            }

            const pagesNeedingVision = [];
            targetPagesList.forEach((p) => {
                const jpCount = countJapaneseChars(p.text);
                const replacementCount = (p.text.match(/\uFFFD/g) || []).length;
                const looksBroken = forceVisionOcr || jpCount < 35 || replacementCount > 4;
                if (looksBroken) {
                    pagesNeedingVision.push(p.pageNumber);
                } else {
                    combinedText += `\n--- [TRANG ${p.pageNumber}] ---\n${p.text}\n`;
                }
            });

            if (pagesNeedingVision.length > 0) {
                const targetPages = pagesNeedingVision.slice(0, maxScannedPages);
                const reason = forceVisionOcr
                    ? 'đã bật AI Vision đọc trực tiếp ảnh trang'
                    : 'có trang ảnh/scan hoặc font chữ Nhật bị lỗi khi copy';
                onLog(`👁️ PDF "${file.name}" (${reason}): đang render ${targetPages.length} trang ảnh để AI đọc chính xác chữ Nhật & đáp án...`);
                const imgs = await extractPdfPageImages(file, {
                    pageRange: targetPages.join(','),
                    scale: 1.8,
                    maxPages: maxScannedPages,
                    signal
                });
                imgs.forEach((im) => {
                    visualPages.push({ label: file.name, pageNumber: im.pageNumber, base64: im.base64 });
                });
                onLog(`✅ Đã chuyển ${imgs.length} trang PDF sang ảnh chất lượng cao để AI Vision đọc.`);
            }
            if (!pagesNeedingVision.length) {
                onLog(`✅ Đã lấy text tiếng Nhật chuẩn từ PDF "${file.name}" (${targetPagesList.length} trang).`);
            }
        } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
            const compressed = await compressImage(file, 1600, 1600, 0.88);
            visualPages.push({ label: file.name, pageNumber: visualPages.length + 1, base64: compressed });
            onLog(`🖼️ Đã nạp ảnh "${file.name}".`);
        } else {
            const txt = await file.text();
            combinedText += `\n=== FILE: ${file.name} ===\n${txt}\n`;
            onLog(`📝 Đã nạp file text "${file.name}" (${txt.length.toLocaleString()} ký tự).`);
        }
    }

    return { text: combinedText.trim(), visualPages, clippedByChoukai };
};

/**
 * Uses multimodal Vision AI to OCR scanned or CID-broken exam pages into clean Japanese exam text.
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
    const BATCH = 2;

    for (let i = 0; i < visualPages.length; i += BATCH) {
        if (signal?.aborted) throw new Error('Đã hủy tiến trình OCR.');
        const slice = visualPages.slice(i, i + BATCH);
        onLog(`👁️ AI Vision OCR đang đọc ${roleDescription} (trang ${slice.map((s) => s.pageNumber).join(', ')})...`);

        const contentParts = [
            {
                type: 'text',
                text: `Bạn là chuyên gia OCR đề thi tiếng Nhật JLPT. Hãy đọc TOÀN BỘ ảnh trang ${roleDescription} sau và chép lại CHÍNH XÁC.
QUY TẮC BẮT BUỘC:
- Giữ rõ tiêu đề từng 問題 (問題1, 問題2, 問題3, 問題4, 問題5) và số thứ tự câu (1番, 2番, 3番... và 質問1, 質問2 nếu có). Bỏ qua ví dụ (例) nếu có.
- Nếu câu có phương án in chữ trên giấy hoặc nằm trong khung hộp chữ nhật (ví dụ: "1 アパートの情報誌...", hoặc 4 khung "田中さんへ..."), PHẢI chép ĐẦY ĐỦ từng chữ của 4 đáp án đó! Không được rút gọn thành số 1 2 3 4.
- QUAN TRỌNG VỚI SCRIPT / ĐÁP ÁN: Nếu phương án nào được tô MÀU ĐỎ, in đậm hoặc khoanh tròn làm đáp án đúng trên trang ảnh (như ở 問題3, 問題4, 問題5), PHẢI ghi thêm nhãn "[ĐÁP ÁN ĐÚNG: <số>]" (ví dụ "[ĐÁP ÁN ĐÚNG: 2]") ngay tại câu đó! Nếu trang ghi "(正解:4)" thì giữ nguyên "(正解:4)".
- Ghép chữ kanji có furigana (nếu bị tách ký tự furigana phía trên) thành chữ Kanji tự nhiên sạch đẹp (ví dụ giữ 地震, bỏ chú thích じしん rời dòng).
- Nếu câu nào trên đề thi chỉ có tranh vẽ minh họa hoặc tờ đề trống không in chữ lựa chọn, ghi rõ [HÌNH MINH HỌA] hoặc [KHÔNG IN CHỮ LỰA CHỌN].
- Nếu đề có gạch chân, bọc bằng <u>...</u>.
Trả về JSON hợp lệ dạng: { "extractedText": "..." }`
            },
            ...slice.map((p) => ({
                type: 'image_url',
                image_url: { url: p.base64 }
            }))
        ];

        const raw = await callAI(contentParts, effectiveModel, 'pdf_ingest', 16384);
        try {
            const parsed = safeParseJsonWithRepair(raw);
            ocrOutput += `\n--- [TRANG ${slice.map((s) => s.pageNumber).join(',')}] ---\n${parsed?.extractedText || raw}\n`;
        } catch {
            ocrOutput += `\n--- [TRANG ${slice.map((s) => s.pageNumber).join(',')}] ---\n${raw}\n`;
        }
    }

    return ocrOutput.trim();
};

/**
 * Specialized Vision OCR for pasted/uploaded JLPT answer key table screenshots (正答表 / bảng đáp án dạng ảnh).
 */
export const ocrAnswerTableImages = async (tableImages = [], {
    level = 'N3',
    model = 'google/gemini-2.5-flash',
    onLog = () => {},
    signal = null
} = {}) => {
    if (!Array.isArray(tableImages) || tableImages.length === 0) return '';
    const effectiveModel = getEffectiveModel(model);
    let combinedAnswerText = '';
    const BATCH = 2;

    for (let i = 0; i < tableImages.length; i += BATCH) {
        if (signal?.aborted) throw new Error('Đã hủy đọc ảnh bảng đáp án.');
        const slice = tableImages.slice(i, i + BATCH);
        onLog(`🖼️ AI Vision đang đọc bảng đáp án từ ảnh (${i + 1}–${i + slice.length}/${tableImages.length})...`);

        const parts = [
            {
                type: 'text',
                text: `Bạn là chuyên gia đọc BẢNG / TABLE ĐÁP ÁN đề thi JLPT ${level} (正答表 / Answer Key).
Hãy đọc TẤT CẢ đáp án có trong các ảnh bảng dưới đây một cách CHÍNH XÁC TUYỆT ĐỐI từng hàng từng cột:
- Chuyển các ký hiệu khoanh tròn ①②③④ hoặc số 1/2/3/4 thành số rõ ràng (1, 2, 3, 4).
- Nếu là bảng 文字・語彙 / 文法 / 読解: ghi rõ từng câu dạng "Câu 1: 3 | Câu 2: 1 | ..." (giữ nguyên số câu thực tế nếu bảng ghi 問題1..14 + số câu).
- Nếu là bảng 聴解 (Nghe hiểu): phân rõ từng Mondai ([聴解 問題1] 1番: 2 | 2番: 4 ...; chú ý 問題5 câu có 質問1 / 質問2).
- Không bỏ sót câu nào, đọc kỹ các hàng ngang/dọc để không lệch cột.
Trả về JSON: { "answerTableText": "..." }`
            },
            ...slice.map((img) => ({
                type: 'image_url',
                image_url: { url: img.base64 }
            }))
        ];

        const raw = await callAI(parts, effectiveModel, 'pdf_ingest', 8192);
        try {
            const parsed = safeParseJsonWithRepair(raw);
            combinedAnswerText += `\n=== BẢNG ĐÁP ÁN TỪ ẢNH ${i + 1} ===\n${parsed?.answerTableText || raw}\n`;
        } catch {
            combinedAnswerText += `\n=== BẢNG ĐÁP ÁN TỪ ẢNH ${i + 1} ===\n${raw}\n`;
        }
    }

    onLog(`✅ Đọc xong dữ liệu bảng đáp án từ ${tableImages.length} ảnh.`);
    return combinedAnswerText.trim();
};

/**
 * Stage A: Extracts exact per-Mondai printed structure and choices from the full listening paper text
 * so printed Japanese options are never lost due to chunk slicing or Whisper alignment.
 */
const extractListeningPaperStructureWithAI = async ({
    level = 'N3',
    examYear = null,
    examPaperText = '',
    model = 'google/gemini-2.5-flash',
    onLog = () => {},
    signal = null
}) => {
    if (!examPaperText || examPaperText.trim().length < 25) return [];
    if (signal?.aborted) throw new Error('Đã hủy.');
    const effectiveModel = getEffectiveModel(model);
    const mondaiList = getMondaiListForLevel(level);
    const bp = getLevelExamBlueprint(level, examYear);
    onLog(`📋 Đang bóc tách chính xác danh sách Mondai & đáp án in trên tờ đề ${bp.level} (${bp.eraLabel})...`);

    const prompt = `Bạn nhận toàn bộ văn bản đề thi Nghe hiểu JLPT ${bp.level}.
${bp.listeningPromptRules}

Hãy trích xuất ĐÚNG từng câu hỏi có trên TỜ ĐỀ IN (bỏ phần Ví dụ "例"):
"""
${examPaperText.slice(0, 36000)}
"""

QUY TẮC:
- Trả về danh sách câu theo đúng thứ tự Mondai (1..${mondaiList.length}) và câu (questionNumber = 1, 2, 3...).
- "options": Nếu trên tờ đề có chữ in cạnh số 1, 2, 3, 4 hoặc 4 khung hộp (ví dụ "アパートの情報誌を買いに行く", "田中さんへ 会議の時間が変わりました"), PHẢI chép NGUYÊN VĂN chữ đó (bỏ số 1/2/3/4 ở đầu), KHÔNG rút gọn thành "1", "2", "3", "4"!
- Chỉ ghi ["1", "2", "3", "4"] (hoặc ["1", "2", "3"] với câu 3 lựa chọn như 発話表現 / 即時応答) KHI VÀ CHỈ KHI tờ đề câu đó là câu tranh vẽ (kể cả tranh 4 ô) hoặc tờ giấy trống không in chữ lựa chọn ("問題用紙に何も印刷されていません").
- CHỈ với câu thực sự có 2 câu hỏi con "質問1" và "質問2" in trên đề (như câu cuối 問題5 ở N1/N2; N3/N4/N5 KHÔNG có dạng này): đặt "subQuestions": [{ "question": "質問1", "options": [...] }, { "question": "質問2", "options": [...] }] và "options": [].
- "paperPrompt": Chỉ ghi bảng biểu/hướng dẫn thực sự in trên giấy của riêng câu đó (nếu trên giấy chỉ in số "2番" + options/tranh thì để "").

Trả về DUY NHẤT 1 JSON:
{
  "items": [
    { "mondai": 1, "questionNumber": 1, "hasIllustration": false, "paperPrompt": "", "options": ["アパートの情報誌を買いに行く", "不動産屋に行く", "希望の条件を書きだす", "住みたい町を歩く"] },
    { "mondai": 4, "questionNumber": 1, "hasIllustration": false, "paperPrompt": "", "options": ["1", "2", "3"] },
    { "mondai": 5, "questionNumber": 2, "hasIllustration": false, "paperPrompt": "", "options": [], "subQuestions": [{ "question": "質問1", "options": ["コースA", "コースB", "コースC", "コースD"] }, { "question": "質問2", "options": ["コースA", "コースB", "コースC", "コースD"] }] }
  ]
}`;

    try {
        const raw = await callAI(prompt, effectiveModel, 'pdf_ingest', 16384);
        const parsed = safeParseJsonWithRepair(raw);
        const items = Array.isArray(parsed) ? parsed : (parsed?.items || []);
        onLog(`✅ Đọc được ${items.length} mục câu hỏi & lựa chọn in từ tờ đề.`);
        return items;
    } catch (err) {
        onLog(`⚠️ Không tách riêng được cấu trúc tờ đề (${err.message}), sẽ đối chiếu trực tiếp.`);
        return [];
    }
};

/**
 * Generates structured Listening questions (separated cleanly by Mondai, preserving real printed choices,
 * supporting Mondai 5 subQuestions, hiding spoken spoilers into script, and trimming Mondai transition audio).
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
    const bp = getLevelExamBlueprint(level, examYear);

    const paperItems = await extractListeningPaperStructureWithAI({
        level,
        examYear,
        examPaperText,
        model: effectiveModel,
        onLog,
        signal
    });
    const paperMap = new Map();
    paperItems.forEach((it) => {
        const m = Number(it.mondai || 1);
        const qn = Number(it.questionNumber || 1);
        paperMap.set(`${m}_${qn}`, it);
    });

    const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
    const batches = [];

    if (hasBlocks) {
        const CHUNK_SIZE = 5;
        for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
            batches.push(blocks.slice(i, i + CHUNK_SIZE));
        }
    } else {
        const combinedLen = (examPaperText + answerScriptText).trim().length;
        if (!combinedLen) {
            throw new Error('Cần ít nhất File Audio MP3 (chạy Whisper) hoặc Văn bản/PDF Đề Nghe / Script để AI soạn câu hỏi.');
        }
        const pages = chunkPdfPages([{ pageNumber: 1, text: answerScriptText || examPaperText }], 4500);
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
                `[BLOCK #${idx + 1} | Mondai gợi ý: ${bl.mondai} | Câu gợi ý: ${bl.questionNumber} | Audio: ${bl.startSec}s -> ${bl.endSec}s]\n${bl.transcriptJa}`
            ).join('\n\n')
            : batch;

        const matchedPaperPreview = paperItems.length > 0
            ? JSON.stringify(paperItems, null, 0).slice(0, 18000)
            : '';

        const prompt = `Bạn là chuyên gia biên soạn đề Nghe hiểu JLPT cấp độ ${bp.level} (${examYear ? `Kỳ ${examSession}/${examYear}` : 'Luyện theo Mondai'}).
${bp.listeningPromptRules}
${targetMondai ? `Chú ý: Bộ đề này chỉ thuộc Mondai ${targetMondai}.` : ''}

NHIỆM VỤ:
Đối chiếu các đoạn audio Whisper đã có mốc giây [xx.xs] với TỜ ĐỀ IN và FILE SCRIPT/ĐÁP ÁN bên dưới để xuất danh sách câu hỏi Nghe hiểu chuẩn JLPT ${bp.level}.

${hasBlocks ? `TRANSCRIPT WHISPER CÓ MỐC GIÂY TỪNG DÒNG:\n"""\n${blockText}\n"""\n` : ''}
${matchedPaperPreview ? `DANH SÁCH CÂU & ĐÁP ÁN IN TRÊN TỜ ĐỀ (PHẢI CHÉP ĐÚNG OPTIONS TỪ ĐÂY NẾU CÓ CHỮ):\n${matchedPaperPreview}\n` : (examPaperText ? `VĂN BẢN TỜ ĐỀ THI:\n"""\n${examPaperText.slice(0, 22000)}\n"""\n` : '')}
${answerScriptText ? `SCRIPT GỐC / BẢNG ĐÁP ÁN KÈM THEO (chú ý các nhãn [ĐÁP ÁN ĐÚNG: X] hoặc (正解:X)):\n"""\n${answerScriptText.slice(0, 24000)}\n"""\n` : ''}

QUY TẮC BẮT BUỘC:
1. LOẠI BỎ HOÀN TOÀN lời dẫn đầu Mondai ("問題2では、まず質問を聞いてください... では、始めます") và Ví dụ ("例 / れい")!
2. "audioStartSec" & "audioEndSec": Đặt "audioStartSec" NGAY TẠI DÒNG BẮT ĐẦU "N番" của câu thi thật dựa theo mốc [xx.xs] trong BLOCK (tuyệt đối không tính phần nhạc/lời chuyển tiếp Mondai!). Nếu block chỉ là lời dẫn Mondai/Ví dụ, BỎ QUA block đó!
3. "mondai": Số nguyên 1..${mondaiList.length} đúng theo cấu trúc ${bp.level} ở trên.
4. "questionNumber": Số thứ tự BÊN TRONG Mondai đó (1, 2, 3... reset về 1 ở đầu mỗi Mondai mới!).
5. "paperPrompt": Chỉ ghi nội dung bảng biểu/hướng dẫn thực sự IN TRÊN TỜ ĐỀ (nếu trên giấy chỉ in số "1番/2番" + options hoặc tranh thì để "").
6. "stem" & "spokenQuestion": Lấy từ Script gốc hoặc chỉnh sửa lỗi chính tả Whisper cho chuẩn xác; KHÔNG dán vào đề bài trước khi nghe.
7. "options":
   - Nếu tờ đề (DANH SÁCH CÂU IN TRÊN TỜ ĐỀ) có chữ in cho các phương án (như 問題1, 問題2) -> CHÉP NGUYÊN VĂN chữ đó (không kèm số 1/2/3/4 ở đầu).
   - Nếu tờ đề KHÔNG in chữ phương án (câu tranh vẽ, câu 発話表現/即時応答 3 lựa chọn, câu 概要理解, câu đầu của 統合理解) -> giữ ["1","2","3","4"] (hoặc ["1","2","3"] nếu Mondai đó là loại 3 lựa chọn theo cấu trúc ${bp.level}), VÀ đặt nội dung thoại các phương án đọc từ Script vào mảng "spokenOptions".
8. Chỉ với bài nghe thực sự có 2 câu hỏi phụ ("質問 1" và "質問 2" in trên đề, như câu cuối 問題5 ở N1/N2; N5/N4/N3 KHÔNG dùng dạng này): trả "subQuestions": [{ "question": "...", "options": [...], "correctAnswer": 1, "explanation": "..." }, ...] và "options": [].
9. "correctAnswer": Chỉ số 0-based (0 = lựa chọn 1, 1 = lựa chọn 2, 2 = lựa chọn 3, 3 = lựa chọn 4), lấy chính xác từ (正解:X) hoặc [ĐÁP ÁN ĐÚNG: X] nếu có.
10. "script": Mảng đối thoại tiếng Nhật ĐÃ ĐƯỢC CHỈNH CHÍNH TẢ CHUẨN NHẬT kèm bản dịch tiếng Việt:
    [{ "speaker": "M" | "F" | "Narrator", "ja": "...", "vi": "..." }]
11. "explanation": Viết siêu ngắn gọn theo form (đọc 5 giây hình dung ngay tình huống):
    "✅ Lựa chọn chính xác: [1 câu chốt ý đúng]\\n\\n📖 Dịch câu hỏi: [Dịch ngắn bối cảnh + câu hỏi chốt]\\n\\n📌 Phân tích các phương án:\\n✗ (1) [1 dòng ngắn lý do sai — chỉ liệt kê đáp án sai]\\n\\n💡 Mẹo làm bài: [1 câu dấu hiệu/bẫy cần nghe kỹ]"
12. NẾU 1 BLOCK WHISPER BỊ DÍNH NHIỀU HƠN 1 CÂU NGHE (vd gộp cả 3番 và 4番, hoặc Mondai 4 thiếu block), BẮT BUỘC tách thành TỪNG object câu hỏi riêng tương ứng với mọi câu in trên Tờ Đề / Script và nội suy chính xác "audioStartSec" / "audioEndSec"!

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG MARKDOWN):
{
  "questions": [
    {
      "mondai": 1,
      "questionNumber": 1,
      "audioStartSec": 62.0,
      "audioEndSec": 135.5,
      "paperPrompt": "",
      "stem": "大学で男の人と女の人が話しています。",
      "spokenQuestion": "女の人はこの後何をしますか。",
      "options": ["アパートの情報誌を買いに行く", "不動産屋に行く", "希望の条件を書きだす", "住みたい町を歩く"],
      "spokenOptions": [],
      "correctAnswer": 3,
      "hasIllustrationNote": false,
      "script": [
        { "speaker": "M", "ja": "...", "vi": "..." }
      ],
      "explanation": "..."
    }
  ]
}`;

        try {
            const raw = await callAI(prompt, effectiveModel, 'pdf_ingest', 24576);
            const parsed = safeParseJsonWithRepair(raw);
            const qArr = Array.isArray(parsed) ? parsed : (parsed?.questions || []);
            const batchOneBased = detectBatchOneBasedIndexing(qArr, false);

            qArr.forEach((rawQ) => {
                const mondaiNum = targetMondai ? Number(targetMondai) : resolveQuestionMondai(rawQ);
                const mMeta = getMondaiMeta(level, mondaiNum);
                const qNumInMondai = Number(rawQ.questionNumber || 0) || (allQuestions.filter((x) => x.mondai === mondaiNum).length + 1);
                const matchedPaper = paperMap.get(`${mondaiNum}_${qNumInMondai}`);

                const scriptList = Array.isArray(rawQ.script)
                    ? rawQ.script.filter((line) => line && (line.ja || line.text)).map((line) => ({
                        speaker: line.speaker || 'Narrator',
                        ja: (line.ja || line.text || '').trim(),
                        vi: (line.vi || '').trim()
                    }))
                    : [];

                const paperPrompt = String(rawQ.paperPrompt || matchedPaper?.paperPrompt || '').trim();
                const spokenOptions = Array.isArray(rawQ.spokenOptions)
                    ? rawQ.spokenOptions.map((s) => String(s).trim()).filter(Boolean)
                    : [];

                // Handle subQuestions (e.g. N1/N2 Mondai 5 Q3 with 質問1 + 質問2)
                const rawSubs = Array.isArray(rawQ.subQuestions) && rawQ.subQuestions.length > 0
                    ? rawQ.subQuestions
                    : (Array.isArray(matchedPaper?.subQuestions) && matchedPaper.subQuestions.length > 0 ? matchedPaper.subQuestions : null);

                if (rawSubs && rawSubs.length > 0) {
                    const subQuestions = rawSubs.map((sq, sIdx) => {
                        const paperSub = matchedPaper?.subQuestions?.[sIdx];
                        let subOpts = Array.isArray(sq.options) && sq.options.length > 0 ? sq.options.map((o) => String(o).trim()) : [];
                        if (paperSub?.options?.length > 0 && (isBareNumberOptions(subOpts) || !isBareNumberOptions(paperSub.options))) {
                            subOpts = paperSub.options.map((o) => String(o).replace(/^[1-4][.)\s]+/, '').trim() || o);
                        }
                        if (subOpts.length === 0) subOpts = ['1', '2', '3', '4'];
                        const subAns = normalizeAnswerIndex(sq.correctAnswer ?? sq.answer ?? 0, subOpts, { oneBased: batchOneBased });
                        return {
                            question: sq.question || paperSub?.question || `質問 ${sIdx + 1}`,
                            options: subOpts,
                            correctAnswer: subAns,
                            answer: subAns,
                            explanation: sq.explanation || ''
                        };
                    });

                    allQuestions.push({
                        mondai: mondaiNum,
                        mondaiTitle: `Mondai ${mondaiNum}: ${mMeta.ja} · ${mMeta.vi}`,
                        questionNumber: qNumInMondai,
                        paperPrompt,
                        stem: (rawQ.stem || '').trim(),
                        spokenQuestion: (rawQ.spokenQuestion || '').trim(),
                        question: paperPrompt || `${qNumInMondai}番`,
                        options: [],
                        subQuestions,
                        audioUrl: audioUrl || '',
                        audioStartSec: typeof rawQ.audioStartSec === 'number' ? Number(rawQ.audioStartSec.toFixed(1)) : undefined,
                        audioEndSec: typeof rawQ.audioEndSec === 'number' ? Number(rawQ.audioEndSec.toFixed(1)) : undefined,
                        imageUrl: '',
                        hasIllustrationNote: Boolean(rawQ.hasIllustrationNote ?? matchedPaper?.hasIllustration),
                        script: scriptList,
                        explanation: rawQ.explanation || ''
                    });
                    return;
                }

                let opts = Array.isArray(rawQ.options) && rawQ.options.length > 0 ? rawQ.options.map((o) => String(o).trim()) : [];
                if (matchedPaper && Array.isArray(matchedPaper.options) && matchedPaper.options.length >= 3) {
                    if (isBareNumberOptions(opts) || !isBareNumberOptions(matchedPaper.options)) {
                        opts = matchedPaper.options.map((o) => String(o).replace(/^[1-4][.)\s]+/, '').trim() || o);
                    }
                }
                if (opts.length === 0 || isBareNumberOptions(opts)) {
                    opts = isThreeOptionMondai(level, mondaiNum) ? ['1', '2', '3'] : ['1', '2', '3', '4'];
                }

                const normAns = normalizeAnswerIndex(rawQ.correctAnswer ?? rawQ.answer ?? 0, opts, { oneBased: batchOneBased });

                allQuestions.push({
                    mondai: mondaiNum,
                    mondaiTitle: `Mondai ${mondaiNum}: ${mMeta.ja} · ${mMeta.vi}`,
                    questionNumber: qNumInMondai,
                    paperPrompt,
                    stem: (rawQ.stem || '').trim(),
                    spokenQuestion: (rawQ.spokenQuestion || '').trim(),
                    question: paperPrompt || `${qNumInMondai}番`,
                    options: opts,
                    spokenOptions,
                    correctAnswer: normAns,
                    answer: normAns,
                    audioUrl: audioUrl || '',
                    audioStartSec: typeof rawQ.audioStartSec === 'number' ? Number(rawQ.audioStartSec.toFixed(1)) : undefined,
                    audioEndSec: typeof rawQ.audioEndSec === 'number' ? Number(rawQ.audioEndSec.toFixed(1)) : undefined,
                    imageUrl: '',
                    hasIllustrationNote: Boolean(rawQ.hasIllustrationNote ?? matchedPaper?.hasIllustration),
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
 * Builds the canonical Test Object for a Yearly Exam (2010–2025) or a Mondai Pack.
 */
export const countListeningMondais = (sections = []) => {
    const listeningCounts = {};
    (sections || []).forEach((sec) => {
        if (sec?.type === 'listening') {
            (sec.questions || []).forEach((q) => {
                const m = resolveQuestionMondai(q);
                listeningCounts[m] = (listeningCounts[m] || 0) + 1;
            });
        }
    });
    return listeningCounts;
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
    const listeningCounts = countListeningMondais(sections);

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
 * Merges newly authored listening questions into an existing test without losing Vocab/Grammar/Reading sections.
 */
export const mergeListeningIntoExistingTest = (existingTest, listeningQuestions = [], options = {}) => {
    if (!existingTest?.id) return null;
    const {
        level = existingTest.level || 'N3',
        examYear = 2024,
        examSession = '12',
        attachToYearly = true,
        replaceExistingListening = true,
        preservedSections = null,
        customTitle = '',
        isPremium = null
    } = options;

    const normLevel = String(level || existingTest.level || 'N3').toUpperCase().trim();
    const sess = String(examSession || '12').padStart(2, '0');
    const yearNum = Number(examYear) || 2024;

    const baseNonListening = Array.isArray(preservedSections)
        ? preservedSections.filter((s) => s && s.type !== 'listening')
        : (existingTest.sections || []).filter((s) => s && s.type !== 'listening');

    const prevListeningQs = replaceExistingListening
        ? []
        : (existingTest.sections || [])
            .filter((s) => s?.type === 'listening' && Array.isArray(s.questions))
            .flatMap((s) => s.questions);

    const combinedListening = [...prevListeningQs, ...(listeningQuestions || [])];
    const sections = [
        ...baseNonListening,
        ...(combinedListening.length > 0 ? [{
            type: 'listening',
            title: 'Nghe hiểu (聴解)',
            questions: combinedListening
        }] : [])
    ];

    const hasListen = combinedListening.length > 0;
    const listeningCounts = countListeningMondais(sections);
    const hadListenBefore = testHasListening(existingTest);
    const listenMinutes = JLPT_LISTENING_TIME_BY_LEVEL[normLevel] || 40;
    const fullTargetMinutes = JLPT_TOTAL_TIME_BY_LEVEL[normLevel] || 140;
    let nextTimeLimit = existingTest.timeLimit || fullTargetMinutes;
    if (!hadListenBefore && hasListen && nextTimeLimit < fullTargetMinutes - 15) {
        nextTimeLimit = Math.min(fullTargetMinutes, nextTimeLimit + listenMinutes);
    }

    const updated = {
        ...existingTest,
        id: existingTest.id,
        title: customTitle.trim() || existingTest.title,
        level: normLevel,
        timeLimit: nextTimeLimit,
        isSkillTest: baseNonListening.length > 0 ? false : Boolean(existingTest.isSkillTest),
        skillType: baseNonListening.length > 0 ? 'full' : (existingTest.skillType || 'listening'),
        hasListening: hasListen,
        mondaiCounts: listeningCounts,
        isPremium: typeof isPremium === 'boolean' ? isPremium : Boolean(existingTest.isPremium),
        sections,
        updatedAt: Date.now()
    };

    if (attachToYearly) {
        updated.category = 'yearly';
        updated.examYear = yearNum;
        updated.examSession = sess;
        if (!updated.bookSlug) updated.bookSlug = `yearly_${normLevel.toLowerCase()}`;
        if (!updated.bookTitle) updated.bookTitle = `Tuyển Tập Đề Thi JLPT ${normLevel} Các Năm (2010–2025)`;
    }

    return updated;
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
