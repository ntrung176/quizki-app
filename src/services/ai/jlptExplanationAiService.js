import { callAI, parseJsonFromAI } from '../../utils/aiProvider';

/**
 * Strips HTML tags for clean AI prompt context
 */
const stripHtml = (html) => {
    if (!html) return '';
    return String(html).replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * AI Service to verify JLPT question correct answer and generate concise, structured explanation
 * Form:
 * ✅ Lựa chọn chính xác: ...
 * 📖 Trích dẫn: 「...」
 * 📌 Phân tích các phương án:
 * ✗ (a) ...
 * ✗ (b) ...
 * 📖 Căn cứ & Giải thích chi tiết: ...
 * 💡 Mẹo làm bài: ...
 */
export const aiGenerateAndCheckQuestionExplanation = async ({
    questionText = '',
    options = [],
    currentCorrectIndex = 0,
    passage = '',
    audioTranscript = '',
    level = 'N3',
    sectionName = ''
}) => {
    const cleanQ = stripHtml(questionText);
    const cleanPassage = stripHtml(passage);
    const cleanTranscript = stripHtml(audioTranscript);
    const cleanOpts = (options || []).map((o, idx) => {
        const letter = String.fromCharCode(65 + idx);
        return `${letter}. ${stripHtml(o)}`;
    }).join('\n');

    const currentLetter = String.fromCharCode(65 + (Number.isInteger(currentCorrectIndex) ? currentCorrectIndex : 0));

    const prompt = `Bạn là chuyên gia khảo thí và sư phạm tiếng Nhật JLPT hàng đầu (JLPT Test Creator & Auditor).
Nhiệm vụ của bạn là KIỂM TRA ĐÁP ÁN và TẠO BẢN GIẢI THÍCH CHI TIẾT THEO CHUẨN FORM QUIZKI cho câu hỏi thi sau đây.

DỮ LIỆU ĐỀ BÀI:
- Cấp độ JLPT: ${level || 'N/A'}
- Phần thi: ${sectionName || 'N/A'}
${cleanPassage ? `- Bài đọc / Đoạn văn:\n"""\n${cleanPassage.slice(0, 3000)}\n"""\n` : ''}
${cleanTranscript ? `- Lời thoại / Transcript bài nghe:\n"""\n${cleanTranscript.slice(0, 2000)}\n"""\n` : ''}
- Câu hỏi: ${cleanQ || 'Chọn phương án phù hợp'}
- 4 Phương án lựa chọn:
${cleanOpts}
- Đáp án hiện tại đang được cấu hình: Phương án ${currentLetter} (Index ${currentCorrectIndex})

=======================================================
YÊU CẦU 1: XÁC MINH ĐÁP ÁN (CHECK ĐÁP ÁN CHÍNH XÁC 100%)
=======================================================
1. Phân tích logic toàn diện đề bài, đoạn văn và 4 phương án để xác định đáp án ĐÚNG DUY NHẤT.
2. Xác định index phương án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D).
3. So sánh với đáp án đang cấu hình (${currentLetter}):
   - Nếu phương án đúng KHÁC với ${currentLetter}, đánh dấu isCurrentAnswerCorrect = false và nêu rõ phương án nào mới là đúng.
   - Nếu phương án đúng TRÙNG với ${currentLetter}, đánh dấu isCurrentAnswerCorrect = true.

=======================================================
YÊU CẦU 2: TẠO GIẢI THÍCH SIÊU NGẮN GỌN ("RẤT NGẮN ĐỌC VÀ HIỂU LUÔN")
=======================================================
⚠️ QUY TẮC BẮT BUỘC VỀ ĐỘ DÀI:
- NGƯỜI DÙNG CHỈ CẦN 5-10 GIÂY ĐỂ ĐỌC VÀ HIỂU BẢN CHẤT. TUYỆT ĐỐI KHÔNG VIẾT DÀI DÒNG, KHÔNG LAN MAN PHỨC TẠP!
- Tạo đúng cấu trúc form sau đây trong trường "explanation":

✅ Lựa chọn chính xác:
[Chỉ 1 câu ngắn gọn nêu trực diện lý do phương án này đúng, giải thích thẳng vào trọng tâm]

📖 Dịch câu hỏi:
[Dịch tự nhiên câu đề / câu hỏi / ý chốt chính sang tiếng Việt trong 1–2 câu để người học hình dung ngữ cảnh ngay]

${cleanPassage ? `📖 Trích dẫn: 「...」\n[Chỉ trích 1 câu ngắn then chốt chứa thông tin trong bài đọc/đoạn văn]\n` : ''}
📌 Phân tích các phương án:
✗ (a) [1 dòng siêu ngắn: nghĩa + lý do phương án A sai - chỉ viết nếu A sai]
✗ (b) [1 dòng siêu ngắn: nghĩa + lý do phương án B sai - chỉ viết nếu B sai]
✗ (c) [1 dòng siêu ngắn: nghĩa + lý do phương án C sai - chỉ viết nếu C sai]
✗ (d) [1 dòng siêu ngắn: nghĩa + lý do phương án D sai - chỉ viết nếu D sai]
(LƯU Ý: Chỉ liệt kê các phương án SAI với dấu ✗. Tuyệt đối KHÔNG liệt kê phương án đúng trong mục 📌 Phân tích các phương án)

📖 Căn cứ & Giải thích chi tiết:
[Chỉ 1-2 câu ngắn hoặc 2-3 gạch đầu dòng siêu súc tích làm sáng tỏ bản chất (ngữ pháp, từ vựng hoặc công thức). Đọc là hiểu ngay]

💡 Mẹo làm bài:
[Chỉ 1 câu mẹo ngắn đắt giá giúp hình dung nhanh hoặc dấu hiệu nhận biết]

=======================================================
ĐỊNH DẠNG TRẢ VỀ:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown ngoài JSON):
{
  "detectedCorrectIndex": 0, // số nguyên từ 0 đến 3 (0=A, 1=B, 2=C, 3=D)
  "detectedCorrectLetter": "A", // "A", "B", "C" hoặc "D"
  "isCurrentAnswerCorrect": true, // boolean so sánh với ${currentCorrectIndex}
  "mismatchNotice": null, // Nếu sai thì ghi rõ: "Đáp án cấu hình là ${currentLetter} bị sai. Đáp án đúng thực sự là [X] vì...", nếu đúng ghi null
  "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📖 Dịch câu hỏi: ...\\n\\n📌 Phân tích các phương án:\\n✗ (b) ...\\n\\n📖 Căn cứ & Giải thích chi tiết: ...\\n\\n💡 Mẹo làm bài: ..."
}`;

    const rawResponse = await callAI(prompt, null, 'jlpt_explain', 2000);
    const parsed = parseJsonFromAI(rawResponse);

    if (!parsed || typeof parsed.detectedCorrectIndex !== 'number') {
        // Fallback if AI returned raw explanation text without JSON wrapping
        const isMatchA = /đáp án\s*(?:đúng|chính xác)?\s*[:：]?\s*([A-D1-4])/i.exec(rawResponse);
        let fbIndex = currentCorrectIndex;
        if (isMatchA) {
            const letter = isMatchA[1].toUpperCase();
            if (letter === 'A' || letter === '1') fbIndex = 0;
            else if (letter === 'B' || letter === '2') fbIndex = 1;
            else if (letter === 'C' || letter === '3') fbIndex = 2;
            else if (letter === 'D' || letter === '4') fbIndex = 3;
        }

        return {
            detectedCorrectIndex: fbIndex,
            detectedCorrectLetter: String.fromCharCode(65 + fbIndex),
            isCurrentAnswerCorrect: fbIndex === currentCorrectIndex,
            mismatchNotice: fbIndex !== currentCorrectIndex 
                ? `AI nhận định đáp án đúng là ${String.fromCharCode(65 + fbIndex)}, khác với đáp án đang chọn là ${currentLetter}.`
                : null,
            explanation: (parsed?.explanation || rawResponse || '').trim()
        };
    }

    // Ensure valid index 0-3
    const safeIdx = Math.max(0, Math.min(3, parsed.detectedCorrectIndex));
    const safeLetter = String.fromCharCode(65 + safeIdx);
    const isCorrect = safeIdx === currentCorrectIndex;

    return {
        detectedCorrectIndex: safeIdx,
        detectedCorrectLetter: safeLetter,
        isCurrentAnswerCorrect: isCorrect,
        mismatchNotice: parsed.mismatchNotice || (!isCorrect ? `Đáp án đúng là ${safeLetter}, khác với ${currentLetter} đang chọn.` : null),
        explanation: (parsed.explanation || '').trim()
    };
};

const stripPassageToReadableText = (html = '') => {
    return String(html || '')
        .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:td|th)>/gi, ' | ')
        .replace(/<\/?[a-z][\s\S]*?>/gi, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Normalizes passageData produced either by Gemini Pro Neon external JSON or internal AI batch analyzer.
 */
export const normalizePassageBreakdownPayload = (rawPd, passageHtml = '') => {
    if (!rawPd || typeof rawPd !== 'object') return null;
    const rawSentences = Array.isArray(rawPd.sentences) ? rawPd.sentences : [];
    const sentences = rawSentences
        .filter((s) => s && (s.jp || s.rawJp))
        .map((s) => {
            const jp = String(s.jp || s.rawJp || '').trim();
            const vocab = Array.isArray(s.vocab)
                ? s.vocab
                    .filter((v) => v && v.w)
                    .map((v) => ({
                        w: String(v.w || '').trim(),
                        read: String(v.read || v.w || '').trim(),
                        vi: String(v.vi || v.meaning || '').trim()
                    }))
                : [];
            const grammar = Array.isArray(s.grammar)
                ? s.grammar
                    .filter((g) => g && g.point)
                    .map((g) => {
                        const vi = String(g.vi || g.meaning || '').trim();
                        return {
                            point: String(g.point || '').trim(),
                            vi,
                            meaning: vi,
                            structure: String(g.structure || '').trim()
                        };
                    })
                : [];
            return {
                jp,
                rawJp: jp.replace(/<\/?[^>]+(>|$)/g, '').trim(),
                vi: String(s.vi || '').trim(),
                vocab,
                grammar
            };
        });

    const vietnamese = String(rawPd.vietnamese || '').trim()
        || sentences.map((s) => s.vi).filter(Boolean).join(' ');

    if (sentences.length === 0 && !vietnamese) return null;

    const vocabList = [];
    const seenVocab = new Set();
    sentences.forEach((s) => {
        (s.vocab || []).forEach((v) => {
            const key = `${v.w}_${v.read}`;
            if (!seenVocab.has(key) && v.vi) {
                seenVocab.add(key);
                vocabList.push(v);
            }
        });
    });

    const grammarPoints = [];
    const seenGrammar = new Set();
    sentences.forEach((s, idx) => {
        (s.grammar || []).forEach((g) => {
            if (!seenGrammar.has(g.point)) {
                seenGrammar.add(g.point);
                grammarPoints.push({ ...g, sentenceIdx: idx });
            }
        });
    });

    const cleanJp = stripPassageToReadableText(passageHtml || rawPd.japanese || rawPd.rawJapanese || '');
    return {
        title: String(rawPd.title || 'Đọc hiểu chuyên sâu').trim(),
        titleVi: String(rawPd.titleVi || '').trim(),
        japanese: cleanJp,
        rawJapanese: cleanJp,
        vietnamese,
        sentences,
        vocabList,
        grammarPoints
    };
};

export const hasRichReadingAnalysis = (q) => {
    const pd = q?.passageData;
    if (!pd || !Array.isArray(pd.sentences) || pd.sentences.length === 0) return false;
    return Boolean(pd.vietnamese) && pd.sentences.some((s) => Boolean(s?.vi));
};

/**
 * Uses AI (Gemini 2.5 Flash) to generate full Vietnamese translation + per-sentence vocab & grammar breakdown
 * for a single JLPT reading passage so learners get instant interactive breakdowns in Practice Mode.
 */
export const aiAnalyzeReadingPassage = async ({
    passageHtml = '',
    level = 'N3'
} = {}) => {
    const cleanText = stripPassageToReadableText(passageHtml);
    if (!cleanText || cleanText.length < 10) {
        throw new Error('Đoạn văn quá ngắn hoặc rỗng, không thể phân tích.');
    }

    const prompt = `Bạn là giảng viên JLPT ${level} chuyên đọc hiểu. Hãy phân tích chi tiết BÀI ĐỌC sau sang JSON cho học viên luyện tập (dịch toàn bài + phân tích từng câu với từ vựng & ngữ pháp trọng tâm):

BÀI ĐỌC TIẾNG NHẬT:
"""
${cleanText.slice(0, 6500)}
"""

YÊU CẦU:
1. "title": Tên ngắn gọn tiếng Nhật đại diện bài đọc (vd: AとBの意見, 図書館案内...).
2. "titleVi": Tiêu đề tiếng Việt ngắn gọn (3–8 từ).
3. "vietnamese": Bản dịch tiếng Việt hoàn chỉnh, tự nhiên, sát nghĩa toàn bộ bài đọc (kể cả ghi chú (注) nếu có).
4. "sentences": Tách toàn bộ bài đọc thành TỪNG CÂU (hoặc từng mục thông tin rõ ràng nếu là bảng thông báo/tìm kiếm thông tin), theo đúng thứ tự từ đầu đến cuối bài:
   - "jp": Nguyên văn tiếng Nhật câu/mục đó (giữ nguyên chữ trong bài).
   - "vi": Dịch nghĩa tiếng Việt chuẩn xác cho riêng câu đó.
   - "vocab": 1–4 từ vựng / kanji đáng chú ý trong câu (mỗi từ: { "w": "漢字", "read": "hiragana", "vi": "nghĩa ngắn" }).
   - "grammar": 0–2 mẫu ngữ pháp nổi bật trong câu (mỗi mẫu: { "point": "〜...", "vi": "ý nghĩa & cách dùng siêu ngắn" }).

Trả về DUY NHẤT 1 OBJECT JSON HỢP LỆ (không markdown thừa):
{
  "title": "...",
  "titleVi": "...",
  "vietnamese": "...",
  "sentences": [
    {
      "jp": "...",
      "vi": "...",
      "vocab": [{ "w": "...", "read": "...", "vi": "..." }],
      "grammar": [{ "point": "...", "vi": "..." }]
    }
  ]
}`;

    const raw = await callAI(prompt, 'google/gemini-2.5-flash', 'jlpt_explain', 4096);
    const parsed = parseJsonFromAI(raw);
    const normalized = normalizePassageBreakdownPayload(parsed, passageHtml);
    if (!normalized) {
        throw new Error('AI không trả về dữ liệu phân tích hợp lệ cho bài đọc này.');
    }
    return normalized;
};

/**
 * Batch-analyzes reading passages across one or all sections, deduplicating shared multi-question passages
 * so each unique passage is analyzed only once by AI.
 */
export const aiBatchAnalyzeReadingSections = async (sections = [], {
    targetSectionIdx = null,
    level = 'N3',
    forceAll = false,
    onProgress = () => {},
    signal = null
} = {}) => {
    const updatedSections = JSON.parse(JSON.stringify(sections || []));
    const passageTasksMap = new Map(); // normalizedKey -> { passageHtml, targets: [{ sIdx, qIdx }] }

    updatedSections.forEach((sec, sIdx) => {
        if (targetSectionIdx !== null && sIdx !== targetSectionIdx) return;
        if (sec?.type === 'listening') return;

        (sec?.questions || []).forEach((q, qIdx) => {
            const rawHtml = String(q?.passage || '').trim();
            if (!rawHtml || rawHtml.replace(/<[^>]+>/g, '').trim().length < 20) return;
            if (!forceAll && hasRichReadingAnalysis(q)) return;

            const key = rawHtml.replace(/\s+/g, ' ').trim();
            if (!passageTasksMap.has(key)) {
                passageTasksMap.set(key, { passageHtml: rawHtml, targets: [] });
            }
            passageTasksMap.get(key).targets.push({ sIdx, qIdx });
        });
    });

    const tasks = Array.from(passageTasksMap.values());
    if (tasks.length === 0) {
        return { updatedSections, analyzedCount: 0, totalUnique: 0 };
    }

    let analyzedCount = 0;
    for (let i = 0; i < tasks.length; i++) {
        if (signal?.aborted) break;
        const task = tasks[i];
        onProgress({
            current: i + 1,
            total: tasks.length,
            percent: Math.round((i / tasks.length) * 100),
            detail: `AI đang phân tích bài đọc ${i + 1}/${tasks.length}...`
        });
        try {
            const pd = await aiAnalyzeReadingPassage({ passageHtml: task.passageHtml, level });
            task.targets.forEach(({ sIdx, qIdx }) => {
                updatedSections[sIdx].questions[qIdx].passageData = pd;
            });
            analyzedCount += 1;
        } catch (err) {
            console.warn(`Batch reading analysis failed at passage ${i + 1}:`, err);
        }
    }

    onProgress({ current: tasks.length, total: tasks.length, percent: 100, detail: 'Hoàn tất phân tích bài đọc!' });
    return {
        updatedSections,
        analyzedCount,
        totalUnique: tasks.length
    };
};

