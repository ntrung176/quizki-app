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

${cleanPassage ? `📖 Trích dẫn: 「...」\n[Chỉ trích 1 câu ngắn then chốt chứa thông tin trong bài đọc/đoạn văn]\n` : ''}
📌 Phân tích các phương án:
✗ (a) [1 dòng siêu ngắn chỉ ra lỗi sai của phương án A - chỉ viết nếu A sai]
✗ (b) [1 dòng siêu ngắn chỉ ra lỗi sai của phương án B - chỉ viết nếu B sai]
✗ (c) [1 dòng siêu ngắn chỉ ra lỗi sai của phương án C - chỉ viết nếu C sai]
✗ (d) [1 dòng siêu ngắn chỉ ra lỗi sai của phương án D - chỉ viết nếu D sai]
(LƯU Ý: Chỉ liệt kê các phương án SAI với dấu ✗. Tuyệt đối KHÔNG liệt kê phương án đúng trong mục 📌 Phân tích các phương án)

📖 Căn cứ & Giải thích chi tiết:
[Chỉ 1-2 câu ngắn hoặc 2-3 gạch đầu dòng siêu súc tích làm sáng tỏ bản chất (ngữ pháp, từ vựng hoặc công thức tính toán). Đọc là hiểu ngay]

💡 Mẹo làm bài:
[Chỉ 1 câu mẹo ngắn đắt giá hoặc dấu hiệu nhận biết nhanh]

=======================================================
ĐỊNH DẠNG TRẢ VỀ:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown ngoài JSON):
{
  "detectedCorrectIndex": 0, // số nguyên từ 0 đến 3 (0=A, 1=B, 2=C, 3=D)
  "detectedCorrectLetter": "A", // "A", "B", "C" hoặc "D"
  "isCurrentAnswerCorrect": true, // boolean so sánh với ${currentCorrectIndex}
  "mismatchNotice": null, // Nếu sai thì ghi rõ: "Đáp án cấu hình là ${currentLetter} bị sai. Đáp án đúng thực sự là [X] vì...", nếu đúng ghi null
  "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📌 Phân tích các phương án: ...\\n\\n📖 Căn cứ & Giải thích chi tiết: ...\\n\\n💡 Mẹo làm bài: ..."
}`;

    const rawResponse = await callAI(prompt, null, 'grammar_check', 2000);
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

