// aiPdfIngestorService.js — AI Parsing & Ingestion Service for PDF Documents
import { callAI, getEffectiveModel } from '../../utils/aiProvider';
import { db, appId } from '../../config/firebase';
import { collection, addDoc, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { extractPdfText, chunkPdfPages } from './pdfExtractorService';
import { invalidateGrammarCache } from '../../utils/grammarService';

export const INGESTOR_CATEGORIES = {
    VOCABULARY_BOOK: {
        id: 'VOCABULARY_BOOK',
        label: 'Sách Từ Vựng (Vocabulary Book)',
        icon: 'BookOpen',
        description: 'Soạn giáo trình, bộ sách từ vựng theo cấu trúc: Sách -> Chương -> Bài học -> Danh sách từ vựng.',
        defaultPromptNote: 'Trích xuất toàn bộ từ vựng, chữ Hán, cách đọc Furigana/Hiragana, nghĩa tiếng Việt, từ loại, ví dụ minh họa và dịch nghĩa ví dụ.'
    },
    JLPT_TEST: {
        id: 'JLPT_TEST',
        label: 'Đề Thi Thử JLPT (N1 - N5)',
        icon: 'Award',
        description: 'Soạn toàn bộ đề thi JLPT: Phần từ vựng, ngữ pháp, chữ Hán, đọc hiểu (kèm bài đọc) & nghe hiểu.',
        defaultPromptNote: 'Trích xuất các Mondai, từng câu hỏi (kèm gạch chân từ khóa <u>...</u>), 4 lựa chọn, đáp án đúng (0-3), giải thích chi tiết và đoạn văn bài đọc.'
    },
    GRAMMAR_BOOK: {
        id: 'GRAMMAR_BOOK',
        label: 'Giáo Trình Ngữ Pháp (Grammar Textbook)',
        icon: 'Layers',
        description: 'Soạn sách ngữ pháp: Bài học -> Mẫu ngữ pháp (công thức kết nối [ ... ], nghĩa, giải thích, ví dụ & câu hỏi trắc nghiệm/dịch).',
        defaultPromptNote: 'Trích xuất mẫu ngữ pháp, công thức kết nối [ ... ] chuẩn sách giáo khoa, nghĩa ngắn gọn, giải thích chi tiết, ví dụ và bài tập.'
    },
    SHARED_VOCAB: {
        id: 'SHARED_VOCAB',
        label: 'Kho Từ Vựng Chung / Flashcards',
        icon: 'Languages',
        description: 'Trích xuất danh sách từ vựng đơn lẻ hoặc bộ thẻ học để lưu vào kho từ vựng dùng chung của hệ thống.',
        defaultPromptNote: 'Trích xuất danh sách từ vựng sạch sẽ gồm: chữ Nhật, Hán Việt, nghĩa tiếng Việt, từ loại và ví dụ.'
    }
};

export const RECOMMENDED_INGESTOR_MODELS = [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Rất nhanh, rẻ, xử lý văn bản dài cực tốt (Khuyên dùng)', tag: 'Tốc độ & Rẻ' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Độ chính xác cao nhất cho cấu trúc phức tạp và đọc hiểu dài', tag: 'Chính xác cao' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Văn phong dịch nghĩa tiếng Nhật & giải thích tuyệt hảo', tag: 'Chất lượng cao' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', desc: 'Ổn định, mạnh về phân tích đề thi và định dạng JSON', tag: 'Tiêu chuẩn' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', desc: 'Chi phí cực thấp, phù hợp trích xuất số lượng lớn', tag: 'Tiết kiệm' }
];

/**
 * Build Category-specific AI Prompts
 */
const buildPromptForCategory = (category, chunkText, customInstructions, chunkIndex, totalChunks) => {
    switch (category) {
        case 'VOCABULARY_BOOK':
            return `Bạn là chuyên gia số hóa giáo trình tiếng Nhật/tiếng Anh hàng đầu.
Nhiệm vụ: Hãy phân tích đoạn văn bản tài liệu PDF sau (Phần ${chunkIndex}/${totalChunks}) và trích xuất thành cấu trúc DỮ LIỆU SÁCH TỪ VỰNG HOÀN CHỈNH.

HƯỚNG DẪN TÙY CHỈNH CỦA NGƯỜI DÙNG:
"${customInstructions || 'Trích xuất toàn bộ từ vựng, phân loại theo chương và bài học nếu có.'}"

VĂN BẢN TRÍCH XUẤT TỪ PDF:
"""
${chunkText}
"""

QUY TẮC BẮT BUỘC KHI TRÍCH XUẤT TỪ VỰNG:
1. "front": Chữ viết chính (Kanji hoặc từ tiếng Anh/Nhật). Nếu có cách đọc Furigana thì định dạng như "学校（がっこう）" hoặc để "reading" riêng.
2. "back": Nghĩa tiếng Việt rõ ràng, ngắn gọn, chuẩn xác.
3. "sinoVietnamese": Âm Hán Việt viết HOA (ví dụ: "HỌC HIỆU" cho 学校). Nếu là tiếng Anh thì bỏ trống "".
4. "pos": Từ loại ('noun', 'verb', 'suru_verb', 'adjective_i', 'adjective_na', 'adverb', 'pronoun', 'phrase', 'other').
5. "level": Cấp độ JLPT (N1, N2, N3, N4, N5) hoặc CEFR (A1, A2, B1, B2, C1).
6. "example": Câu ví dụ tiếng Nhật/Anh có chứa từ vựng đó.
7. "exampleMeaning": Bản dịch tiếng Việt của câu ví dụ.
8. "nuance": Sắc thái hoặc hoàn cảnh dùng nếu có trong bài.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH):
{
  "bookTitle": "Tên sách (Ví dụ: Mimikara Oboeru N3)",
  "subtitle": "Phụ đề sách (Ví dụ: 880 từ vựng N3)",
  "level": "N3",
  "chapters": [
    {
      "name": "Chương 1: Tên chương",
      "lessons": [
        {
          "name": "Bài 1: Tên bài",
          "vocabularies": [
            {
              "front": "単語",
              "reading": "たんご",
              "back": "Từ vựng",
              "sinoVietnamese": "ĐƠN NGỮ",
              "pos": "noun",
              "level": "N3",
              "example": "新しい単語を覚える。",
              "exampleMeaning": "Ghi nhớ từ vựng mới."
            }
          ]
        }
      ]
    }
  ]
}`;

        case 'JLPT_TEST':
            return `Bạn là chuyên gia biên soạn đề thi JLPT Nhật ngữ học thuật chính thức.
Nhiệm vụ: Phân tích đoạn văn bản đề thi PDF sau (Phần ${chunkIndex}/${totalChunks}) và trích xuất thành CẤU TRÚC ĐỀ THI JLPT HOÀN CHỈNH.

HƯỚNG DẪN TÙY CHỈNH:
"${customInstructions || 'Trích xuất toàn bộ các Mondai, câu hỏi, 4 đáp án và lời giải thích.'}"

VĂN BẢN TRÍCH XUẤT TỪ PDF:
"""
${chunkText}
"""

QUY TẮC BẮT BUỘC CHO ĐỀ THI JLPT:
1. "sections": Phân chia thành các phần:
   - "vocabulary": Kiến thức ngôn ngữ - Chữ Hán & Từ vựng (文字・語彙)
   - "grammar": Ngữ pháp (文法)
   - "reading": Đọc hiểu (読解) -> Kèm theo trường "passage" chứa toàn bộ bài đọc!
   - "listening": Nghe hiểu (聴解)
2. "questions":
   - "question": Nội dung câu hỏi. Dùng thẻ <u>...</u> để gạch chân từ khóa/chỗ trống cần hỏi.
   - "options": Mảng chính xác 4 lựa chọn ["1...", "2...", "3...", "4..."].
   - "correctAnswer": Index của đáp án đúng (0 cho đáp án 1, 1 cho đáp án 2, 2 cho đáp án 3, 3 cho đáp án 4).
   - "explanation": Giải thích ngắn gọn tại sao đáp án đó đúng và dịch nghĩa câu.
   - "passage": Nội dung bài đọc dài (nếu là bài Đọc hiểu / Mondai đọc).

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH):
{
  "title": "Đề thi thử JLPT N3 - Đề số 1",
  "level": "N3",
  "timeLimit": 60,
  "isSkillTest": false,
  "sections": [
    {
      "type": "vocabulary",
      "title": "Từ vựng (文字・語彙)",
      "questions": [
        {
          "question": "この<u>法律</u>は来年から施行される。",
          "options": ["ほうりつ", "ほうりち", "ほりつ", "ほうりっ"],
          "correctAnswer": 0,
          "explanation": "法律（ほうりつ）= pháp luật."
        }
      ]
    },
    {
      "type": "reading",
      "title": "Đọc hiểu (読解)",
      "questions": [
        {
          "passage": "<b>[Đoạn văn đọc hiểu]</b><br/>最近、環境問題についての関心が高まっている...",
          "question": "筆者が最も言いたいことは何か。",
          "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
          "correctAnswer": 2,
          "explanation": "Dựa vào đoạn cuối bài..."
        }
      ]
    }
  ]
}`;

        case 'GRAMMAR_BOOK':
            return `Bạn là chuyên gia sư phạm biên soạn giáo trình Ngữ pháp tiếng Nhật JLPT (Try!, Shinkanzen, Soumatome).
Nhiệm vụ: Phân tích tài liệu PDF sau (Phần ${chunkIndex}/${totalChunks}) và trích xuất thành CẤU TRÚC GIÁO TRÌNH NGỮ PHÁP HOÀN CHỈNH.

HƯỚNG DẪN TÙY CHỈNH:
"${customInstructions || 'Trích xuất các mẫu ngữ pháp, công thức ngoặc vuông [ ... ], nghĩa, giải thích và ví dụ.'}"

VĂN BẢN TRÍCH XUẤT TỪ PDF:
"""
${chunkText}
"""

QUY TẮC CÔNG THỨC & NỘI DUNG:
1. "structureRaw": Công thức chuẩn ngoặc vuông [ ... ] (ĐÚNG VỊ TRÍ TỪ: Phó từ đứng trước như とても + [ いA / なA ], Hậu tố đứng sau [ N ] + びる, Liên từ ở giữa [ V-た ] + あげく + [ Kết quả ]).
2. "meaningShort": Nghĩa ngắn gọn (ví dụ: "Rất...", "Sau một hồi... rốt cuộc").
3. "meaningFull": Giải thích sư phạm ngắn gọn (2-3 câu, nêu cách dùng, sắc thái và lưu ý).
4. "examples": Mảng các ví dụ [{ "ja": "Câu tiếng Nhật", "vi": "Bản dịch tiếng Việt" }].
5. "quizzes": Mảng 1-2 câu trắc nghiệm điền từ nếu có.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH):
{
  "textbookTitle": "Giáo trình Ngữ pháp Shinkanzen Master N3",
  "level": "N3",
  "lessons": [
    {
      "title": "Bài 1: Diễn tả sự biến đổi & Kết quả",
      "grammarPoints": [
        {
          "pattern": "〜あげく",
          "meaningShort": "Sau một hồi... rốt cuộc lại (kết quả xấu)",
          "meaning": "Sau một hồi làm gì đó kéo dài, cuối cùng dẫn đến một kết quả đáng tiếc",
          "meaningFull": "Diễn tả ý nghĩa sau một khoảng thời gian dài nỗ lực hoặc chịu đựng, rốt cuộc lại nhận một kết quả xấu. Không dùng cho kết quả tốt.",
          "structureRaw": "[ V-た / N-の ] + あげく (、) + [ Kết quả xấu ]",
          "connection": [
            "[ V-た / N-の ] + あげく (、) + [ Kết quả xấu ]"
          ],
          "tips": [
            "Vế sau luôn mang sắc thái tiêu cực, không dùng cho kết quả tốt."
          ],
          "examples": [
            {
              "ja": "散々迷ったあげく、何も買わなかった。",
              "vi": "Sau một hồi phân vân mãi, rốt cuộc tôi không mua gì cả."
            }
          ]
        }
      ]
    }
  ]
}`;

        case 'SHARED_VOCAB':
        default:
            return `Bạn là chuyên gia từ điển ngôn ngữ học.
Nhiệm vụ: Trích xuất toàn bộ từ vựng tiếng Nhật/tiếng Anh từ văn bản PDF sau (Phần ${chunkIndex}/${totalChunks}) thành mảng từ vựng chuẩn.

HƯỚNG DẪN TÙY CHỈNH:
"${customInstructions || 'Trích xuất toàn bộ từ vựng gồm chữ Hán, cách đọc, nghĩa tiếng Việt, Hán Việt và ví dụ.'}"

VĂN BẢN TRÍCH XUẤT TỪ PDF:
"""
${chunkText}
"""

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG DÙNG MARKDOWN, KHÔNG GIẢI THÍCH):
{
  "vocabularies": [
    {
      "front": "警告を与える",
      "reading": "けいこくをあたえる",
      "back": "Đưa ra cảnh báo, cảnh cáo",
      "sinoVietnamese": "CẢNH CÁO DƯ THƯ",
      "pos": "phrase",
      "level": "N2",
      "example": "警察が犯人に警告を与える。",
      "exampleMeaning": "Cảnh sát đưa ra cảnh báo cho kẻ phạm tội."
    }
  ]
}`;
    }
};

/**
 * Merge chunks of extracted JSON data intelligently
 */
const mergeExtractedChunks = (category, chunksData) => {
    if (!Array.isArray(chunksData) || chunksData.length === 0) return null;

    if (chunksData.length === 1) return chunksData[0];

    switch (category) {
        case 'VOCABULARY_BOOK': {
            const first = chunksData[0] || {};
            const merged = {
                bookTitle: first.bookTitle || 'Sách Từ Vựng AI Ingested',
                subtitle: first.subtitle || '',
                level: first.level || 'N3',
                chapters: []
            };

            const chapterMap = new Map();

            for (const chunk of chunksData) {
                if (!chunk || !Array.isArray(chunk.chapters)) continue;
                for (const ch of chunk.chapters) {
                    const chName = (ch.name || 'Chương 1').trim();
                    if (!chapterMap.has(chName)) {
                        chapterMap.set(chName, { name: chName, lessons: [] });
                    }
                    const targetCh = chapterMap.get(chName);
                    const lessonMap = new Map();
                    targetCh.lessons.forEach(l => lessonMap.set(l.name, l));

                    for (const ls of (ch.lessons || [])) {
                        const lsName = (ls.name || 'Bài 1').trim();
                        if (!lessonMap.has(lsName)) {
                            const newLesson = { name: lsName, vocabularies: [] };
                            targetCh.lessons.push(newLesson);
                            lessonMap.set(lsName, newLesson);
                        }
                        const targetLs = lessonMap.get(lsName);
                        if (Array.isArray(ls.vocabularies)) {
                            targetLs.vocabularies.push(...ls.vocabularies);
                        }
                    }
                }
            }

            merged.chapters = Array.from(chapterMap.values());
            return merged;
        }

        case 'JLPT_TEST': {
            const first = chunksData[0] || {};
            const merged = {
                title: first.title || 'Đề thi JLPT AI Ingested',
                level: first.level || 'N3',
                timeLimit: first.timeLimit || 60,
                isSkillTest: Boolean(first.isSkillTest),
                sections: []
            };

            const sectionMap = new Map();

            for (const chunk of chunksData) {
                if (!chunk || !Array.isArray(chunk.sections)) continue;
                for (const sec of chunk.sections) {
                    const secType = sec.type || 'vocabulary';
                    if (!sectionMap.has(secType)) {
                        sectionMap.set(secType, {
                            type: secType,
                            title: sec.title || secType,
                            questions: []
                        });
                    }
                    const targetSec = sectionMap.get(secType);
                    if (Array.isArray(sec.questions)) {
                        targetSec.questions.push(...sec.questions);
                    }
                }
            }

            merged.sections = Array.from(sectionMap.values());
            return merged;
        }

        case 'GRAMMAR_BOOK': {
            const first = chunksData[0] || {};
            const merged = {
                textbookTitle: first.textbookTitle || 'Giáo Trình Ngữ Pháp AI Ingested',
                level: first.level || 'N3',
                lessons: []
            };

            const lessonMap = new Map();

            for (const chunk of chunksData) {
                if (!chunk || !Array.isArray(chunk.lessons)) continue;
                for (const ls of chunk.lessons) {
                    const lsTitle = (ls.title || 'Bài 1').trim();
                    if (!lessonMap.has(lsTitle)) {
                        lessonMap.set(lsTitle, { title: lsTitle, grammarPoints: [] });
                    }
                    const targetLs = lessonMap.get(lsTitle);
                    if (Array.isArray(ls.grammarPoints)) {
                        targetLs.grammarPoints.push(...ls.grammarPoints);
                    }
                }
            }

            merged.lessons = Array.from(lessonMap.values());
            return merged;
        }

        case 'SHARED_VOCAB':
        default: {
            const merged = { vocabularies: [] };
            for (const chunk of chunksData) {
                if (chunk && Array.isArray(chunk.vocabularies)) {
                    merged.vocabularies.push(...chunk.vocabularies);
                }
            }
            return merged;
        }
    }
};

/**
 * Resilient JSON Parser with Automatic Repair for Markdown code fences, preambles, and truncated streams
 */
export const safeParseJsonWithRepair = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Không có dữ liệu phản hồi từ AI.');
    }

    let cleaned = rawText.trim();

    // 1. Remove markdown code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // 2. Direct JSON.parse
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Proceed to extracting and repairing
    }

    // 3. Extract outermost JSON structure ({ ... } or [ ... ])
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let startIndex = -1;
    let expectedEndChar = '';
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        expectedEndChar = '}';
    } else if (firstBracket !== -1) {
        startIndex = firstBracket;
        expectedEndChar = ']';
    }

    if (startIndex !== -1) {
        const lastMatchingIndex = cleaned.lastIndexOf(expectedEndChar);
        if (lastMatchingIndex > startIndex) {
            const candidate = cleaned.slice(startIndex, lastMatchingIndex + 1);
            try {
                return JSON.parse(candidate);
            } catch (e) {
                cleaned = candidate;
            }
        } else {
            cleaned = cleaned.slice(startIndex);
        }
    }

    // 4. Automatic repair of unclosed quotes, brackets, or trailing dangling tokens
    try {
        let repaired = cleaned;
        
        // Remove trailing commas
        repaired = repaired.replace(/,\s*$/, '');
        
        // Track open quotes and brackets
        let inString = false;
        let escaped = false;
        const stack = [];
        
        for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{' || char === '[') {
                    stack.push(char);
                } else if (char === '}') {
                    if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
                } else if (char === ']') {
                    if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
                }
            }
        }

        // If truncated inside a string literal, close it
        if (inString) {
            repaired += '"';
        }

        // Remove trailing dangling key/colon or comma
        repaired = repaired.replace(/,\s*$/, '').replace(/:\s*$/, ': null');

        // Close unclosed brackets/braces in reverse order
        while (stack.length > 0) {
            const last = stack.pop();
            if (last === '{') repaired += '}';
            else if (last === '[') repaired += ']';
        }

        return JSON.parse(repaired);
    } catch (repairErr) {
        console.error('Failed to repair JSON. Raw text preview:', rawText.slice(0, 300));
        throw new Error(`Phản hồi AI không đúng định dạng JSON: ${repairErr.message}`);
    }
};

/**
 * Main Process: Ingest PDF File and Generate Structured Data via AI
 */
export const processPdfWithAI = async (pdfFile, {
    category = 'VOCABULARY_BOOK',
    model = 'google/gemini-2.5-flash',
    pageRange = 'ALL',
    customInstructions = '',
    onProgress = () => {},
    onLog = () => {},
    signal = null
} = {}) => {
    onLog(`📄 Đang mở và phân tích cấu trúc tài liệu PDF "${pdfFile.name}"...`);

    // 1. Extract text from PDF
    const { totalPages, pageCount, pages, fullText } = await extractPdfText(pdfFile, {
        pageRange,
        onProgress: (p) => {
            onProgress({
                stage: 'EXTRACTING_PDF',
                percent: Math.round(p.percent * 0.3),
                detail: `Đang trích xuất trang ${p.currentPageNumber}/${p.totalPages || p.total} (${p.current}/${p.total} trang chọn)...`
            });
        },
        signal
    });

    onLog(`✅ Đã trích xuất ${pageCount} trang (${fullText.length.toLocaleString()} ký tự).`);

    if (!fullText.trim()) {
        throw new Error('Không tìm thấy nội dung văn bản trong tài liệu PDF này. Có thể đây là file PDF dạng hình ảnh quét (Scanned Image).');
    }

    // 2. Chunk text logically (3500 chars for optimal balance of speed, accuracy and token limits)
    const chunks = chunkPdfPages(pages, 3500);
    onLog(`🧩 Đã chia văn bản thành ${chunks.length} phân đoạn xử lý AI.`);

    const effectiveModel = getEffectiveModel(model || 'google/gemini-2.5-flash');
    const parsedChunksData = [];

    // 3. Process each chunk through AI
    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) {
            throw new Error('Tiến trình AI đã bị người dùng hủy.');
        }

        const chunk = chunks[i];
        const chunkIndex = i + 1;
        onLog(`🤖 [${chunkIndex}/${chunks.length}] Đang gửi phân đoạn (Trang: ${chunk.pages.join(', ')}) tới mô hình "${effectiveModel}"...`);

        onProgress({
            stage: 'AI_PROCESSING',
            percent: 30 + Math.round(((i) / chunks.length) * 65),
            detail: `AI đang phân tích và cấu trúc dữ liệu phân đoạn ${chunkIndex}/${chunks.length}...`
        });

        const prompt = buildPromptForCategory(category, chunk.text, customInstructions, chunkIndex, chunks.length);

        try {
            const rawResponse = await callAI(prompt, effectiveModel, 'pdf_ingest');
            if (!rawResponse) throw new Error('Mô hình AI không trả về phản hồi.');

            const chunkJson = safeParseJsonWithRepair(rawResponse);
            parsedChunksData.push(chunkJson);
            onLog(`✨ [${chunkIndex}/${chunks.length}] Hoàn tất phân đoạn ${chunkIndex}!`);
        } catch (err) {
            console.error(`Lỗi phân đoạn ${chunkIndex}:`, err);
            onLog(`⚠️ [${chunkIndex}/${chunks.length}] Lỗi phân đoạn ${chunkIndex}: ${err.message}`);
        }

        // Brief throttle between AI calls
        await new Promise(r => setTimeout(r, 400));
    }

    if (parsedChunksData.length === 0) {
        throw new Error('Không thể phân tích dữ liệu từ bất kỳ phân đoạn nào. Vui lòng kiểm tra lại tài liệu hoặc chọn mô hình AI khác.');
    }

    // 4. Merge results
    onLog(`🔄 Đang tổng hợp và chuẩn hóa dữ liệu đầu ra...`);
    const finalMergedData = mergeExtractedChunks(category, parsedChunksData);

    onProgress({
        stage: 'COMPLETED',
        percent: 100,
        detail: 'Đã hoàn tất trích xuất dữ liệu thành công!'
    });

    onLog(`🎉 Hoàn tất toàn bộ quá trình trích xuất dữ liệu từ PDF!`);
    return {
        category,
        model: effectiveModel,
        totalPages,
        processedPages: pageCount,
        data: finalMergedData,
        rawChunks: parsedChunksData
    };
};

/**
 * Persistence Handler: Save Extracted Data Directly to Firestore
 */
export const saveIngestedDataToFirestore = async (category, extractedData, options = {}) => {
    if (!extractedData || !extractedData.data) {
        throw new Error('Không có dữ liệu hợp lệ để lưu.');
    }

    const { data } = extractedData;

    switch (category) {
        case 'VOCABULARY_BOOK': {
            const COLLECTION = 'bookGroups';
            const groupName = options.groupName || data.bookTitle || 'Sách Từ Vựng Mới';
            const subtitle = options.groupSubtitle || data.subtitle || '';
            const targetLanguage = options.targetLanguage || 'ja';

            let groupId = options.targetGroupId;

            // 1. Create new group if not targeting existing one
            if (!groupId) {
                const groupRef = await addDoc(collection(db, COLLECTION), {
                    name: groupName,
                    subtitle: subtitle,
                    targetLanguage: targetLanguage,
                    imageUrl: '',
                    order: Date.now(),
                    createdAt: Date.now()
                });
                groupId = groupRef.id;
            }

            // 2. Create Book under group
            const bookName = data.bookTitle || groupName;
            const bookRef = await addDoc(collection(db, COLLECTION, groupId, 'books'), {
                name: bookName,
                subtitle: subtitle,
                color: options.color || '#3B82F6',
                order: 0,
                createdAt: Date.now()
            });
            const bookId = bookRef.id;

            let totalWordsSaved = 0;

            // 3. Create Chapters and Lessons
            const chapters = data.chapters || [];
            for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
                const ch = chapters[cIdx];
                const chapterRef = await addDoc(collection(db, COLLECTION, groupId, 'books', bookId, 'chapters'), {
                    name: ch.name || `Chương ${cIdx + 1}`,
                    order: cIdx,
                    createdAt: Date.now()
                });
                const chapterId = chapterRef.id;

                const lessons = ch.lessons || [];
                for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
                    const ls = lessons[lIdx];
                    const vocabItems = (ls.vocabularies || []).map((v, vIdx) => ({
                        id: `v_${Date.now()}_${cIdx}_${lIdx}_${vIdx}`,
                        front: v.front || '',
                        reading: v.reading || '',
                        back: v.back || v.meaning || '',
                        sinoVietnamese: (v.sinoVietnamese || '').toUpperCase(),
                        pos: v.pos || 'noun',
                        level: v.level || data.level || 'N3',
                        example: v.example || '',
                        exampleMeaning: v.exampleMeaning || '',
                        nuance: v.nuance || '',
                        synonym: v.synonym || ''
                    }));

                    await addDoc(
                        collection(db, COLLECTION, groupId, 'books', bookId, 'chapters', chapterId, 'lessons'),
                        {
                            name: ls.name || `Bài ${lIdx + 1}`,
                            order: lIdx,
                            vocab: vocabItems,
                            isPremium: false,
                            createdAt: Date.now()
                        }
                    );

                    totalWordsSaved += vocabItems.length;

                    // Option: Sync to Shared Vocabulary
                    if (options.syncSharedVocabulary && vocabItems.length > 0) {
                        for (const v of vocabItems) {
                            if (!v.front) continue;
                            const key = v.front.trim().replace(/\s+/g, ' ');
                            const encodedKey = encodeURIComponent(key);
                            const vocabRef = doc(db, targetLanguage === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary', encodedKey);
                            await setDoc(vocabRef, {
                                front: v.front,
                                reading: v.reading || '',
                                back: v.back,
                                sinoVietnamese: v.sinoVietnamese || '',
                                pos: v.pos || 'noun',
                                level: v.level || 'N3',
                                example: v.example || '',
                                exampleMeaning: v.exampleMeaning || '',
                                updatedAt: Date.now()
                            }, { merge: true });
                        }
                    }
                }
            }

            return {
                success: true,
                message: `Đã lưu thành công Sách từ vựng "${bookName}" (${chapters.length} chương, ${totalWordsSaved} từ vựng)!`,
                groupId,
                bookId,
                totalWords: totalWordsSaved
            };
        }

        case 'JLPT_TEST': {
            const testsPath = `artifacts/${appId}/jlptTests`;
            const testTitle = data.title || 'Đề thi JLPT';
            const level = data.level || 'N3';
            const timeLimit = data.timeLimit || 60;
            const isSkillTest = Boolean(data.isSkillTest);

            const testDocRef = await addDoc(collection(db, testsPath), {
                title: testTitle,
                level: level,
                timeLimit: timeLimit,
                isSkillTest: isSkillTest,
                skillType: data.skillType || (data.sections?.[0]?.type || 'vocabulary'),
                isPremium: false,
                sections: data.sections || [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            const totalQuestions = (data.sections || []).reduce((sum, s) => sum + (s.questions?.length || 0), 0);

            return {
                success: true,
                message: `Đã lưu thành công Đề thi JLPT "${testTitle}" (${totalQuestions} câu hỏi)!`,
                testId: testDocRef.id,
                totalQuestions
            };
        }

        case 'GRAMMAR_BOOK': {
            const textbooksPath = `artifacts/${appId}/grammarTextbooks`;
            const tbTitle = data.textbookTitle || 'Giáo Trình Ngữ Pháp';
            const level = data.level || 'N3';

            const tbRef = await addDoc(collection(db, textbooksPath), {
                title: tbTitle,
                levels: [level],
                description: `Giáo trình được soạn tự động bằng AI từ tài liệu PDF.`,
                isPremium: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            const textbookId = tbRef.id;

            let totalPointsSaved = 0;
            const lessons = data.lessons || [];

            for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
                const ls = lessons[lIdx];
                const lsRef = await addDoc(collection(db, `${textbooksPath}/${textbookId}/lessons`), {
                    title: ls.title || `Bài ${lIdx + 1}`,
                    sectionLabel: `Bài ${lIdx + 1}`,
                    order: lIdx,
                    isPremium: false,
                    createdAt: Date.now()
                });
                const lessonId = lsRef.id;

                const points = ls.grammarPoints || [];
                for (let pIdx = 0; pIdx < points.length; pIdx++) {
                    const gp = points[pIdx];
                    const connection = gp.connection || (gp.structureRaw ? gp.structureRaw.split('\n') : []);
                    await addDoc(collection(db, `${textbooksPath}/${textbookId}/lessons/${lessonId}/points`), {
                        pattern: gp.pattern || '',
                        meaningShort: gp.meaningShort || '',
                        meaning: gp.meaning || '',
                        meaningFull: gp.meaningFull || '',
                        structureRaw: gp.structureRaw || '',
                        connection: connection,
                        structure: connection.map(c => ({ text: c, type: 'connector' })),
                        tips: gp.tips || [],
                        examples: gp.examples || [],
                        quizzes: gp.quizzes || [],
                        exercises: gp.exercises || [],
                        order: pIdx,
                        createdAt: Date.now()
                    });
                    totalPointsSaved++;
                }
            }

            invalidateGrammarCache();

            return {
                success: true,
                message: `Đã lưu thành công Giáo trình "${tbTitle}" (${lessons.length} bài học, ${totalPointsSaved} mẫu ngữ pháp)!`,
                textbookId,
                totalPoints: totalPointsSaved
            };
        }

        case 'SHARED_VOCAB':
        default: {
            const targetCollection = options.targetLanguage === 'en' ? 'sharedVocabulary_en' : 'sharedVocabulary';
            const vocabularies = data.vocabularies || [];
            let savedCount = 0;

            for (const v of vocabularies) {
                if (!v.front) continue;
                const key = v.front.trim().replace(/\s+/g, ' ');
                const encodedKey = encodeURIComponent(key);
                const vocabRef = doc(db, targetCollection, encodedKey);
                await setDoc(vocabRef, {
                    front: v.front,
                    reading: v.reading || '',
                    back: v.back || v.meaning || '',
                    sinoVietnamese: (v.sinoVietnamese || '').toUpperCase(),
                    pos: v.pos || 'noun',
                    level: v.level || 'N3',
                    example: v.example || '',
                    exampleMeaning: v.exampleMeaning || '',
                    nuance: v.nuance || '',
                    synonym: v.synonym || '',
                    updatedAt: Date.now()
                }, { merge: true });
                savedCount++;
            }

            return {
                success: true,
                message: `Đã lưu thành công ${savedCount} từ vựng vào Kho từ vựng chung (${targetCollection})!`,
                totalSaved: savedCount
            };
        }
    }
};
