/**
 * Japanese AI Prompt Generators
 */

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const isGrammar = contextPos === 'grammar';
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    let grammarInstruction = '';
    let exampleRule = '';
    let exampleMeaningRule = '';

    if (isGrammar) {
        grammarInstruction = `CHÚ Ý ĐẶC BIỆT (ĐÂY LÀ ĐIỂM NGỮ PHÁP TIẾNG NHẬT):
- "meaning": Giải thích nghĩa tiếng Việt ngắn gọn, súc tích của cấu trúc ngữ pháp này.
- "nuance": Giải thích CẤU TRÚC KẾT HỢP chi tiết (Ví dụ: V-て + から, N + に限って, A-い / A-な + くらい), sắc thái ý nghĩa đặc trưng, bối cảnh sử dụng, lưu ý quan trọng.
- Trường "sinoVietnamese": Bỏ trống "".`;

        if (hasMeaning) {
            exampleRule = `4. example: Viết 1 câu ví dụ mẫu tự nhiên tiêu biểu nhất cho điểm ngữ pháp "${frontText}" với nghĩa "${contextMeaning}". Thay thế cấu trúc ngữ pháp "${frontText}" trong câu ví dụ bằng ＿＿＿＿. KHÔNG thêm phiên âm furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch câu ví dụ sang tiếng Việt.`;
        } else {
            exampleRule = `4. example: Đối với MỖI nghĩa của ngữ pháp được liệt kê ở trường "meaning", hãy viết 1 câu ví dụ tương ứng tiêu biểu nhất thể hiện đặc trưng của nghĩa đó (đánh số 1, 2, 3... tương ứng trên từng dòng). Hãy thay thế cấu trúc ngữ pháp "${frontText}" trong mỗi câu ví dụ bằng ＿＿＿＿. Các câu ví dụ phải có cấu trúc kết hợp chuẩn xác tuyệt đối, tự nhiên, chuẩn Nhật Bản. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch nghĩa tiếng Việt tương ứng cho từng câu ví dụ ở trên, phân dòng và đánh số 1, 2, 3... khớp hoàn toàn với các câu ví dụ ở trường "example".`;
        }
    } else {
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật với ngữ cảnh phong phú, rõ ràng để thể hiện rõ nét nghĩa được nêu trong trường "meaning", giúp người học dễ hiểu và phân biệt bối cảnh sử dụng của từ này. Tránh các câu quá ngắn hoặc chung chung. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        if (contextLevel === 'N5') {
            exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết bằng HIRAGANA chủ yếu, câu ngắn đơn giản dễ hiểu (tối đa 8-10 từ) nhưng có ngữ cảnh rõ ràng thể hiện đúng nghĩa. KHÔNG thêm ngoặc phiên âm furigana.`;
        }
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}${hasMeaning ? ` [Nghĩa yêu cầu: ${contextMeaning}]` : ''}
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管（はいかん）","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt.","reading":"すいどう","accent":"0"}

${grammarInstruction}

QUY TẮC BẮT BUỘC:
1. Giữ nguyên cụm từ dài: Nếu người dùng nhập cụm từ dài hoặc cả câu, TUYỆT ĐỐI KHÔNG được rút gọn thành từ vựng đơn.
2. Từ vựng (frontWithFurigana) & Từ đồng nghĩa (synonym) định dạng cách đọc:
   - BẮT BUỘC dùng định dạng: "Từ gốc（cách đọc hiragana của CẢ TỪ）".
   - Ngoặc cách đọc phải đặt duy nhất ở CUỐI CÙNG sau toàn bộ từ gốc.
3. meaning: ${isGrammar ? 'Định nghĩa ngữ pháp theo hướng dẫn ở trên.' : 'Ngắn gọn, nghĩa khác nhau ngăn ";".'}
4. pos/level: Phải khớp ngữ cảnh nếu đã chọn.
5. sinoVietnamese: BẮT BUỘC dịch ĐẦY ĐỦ TẤT CẢ các chữ Kanji xuất hiện sang âm Hán Việt viết IN HOA.
6. reading: Bắt buộc điền cách đọc chỉ bằng chữ Hiragana/Katakana của từ gốc.
7. accent: Bắt buộc điền số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2'.

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `Bạn là giáo viên tiếng Nhật. Hãy tạo 1 câu ví dụ ngắn gọn, tự nhiên và dễ hiểu cho từ vựng "${frontText}" với nghĩa cụ thể là "${targetMeaning}".

YÊU CẦU BẮT BUỘC:
1. Ngắn gọn & Tự nhiên: Câu ví dụ phải tự nhiên, ngắn gọn (tối đa 10-14 từ tiếng Nhật), có ngữ cảnh rõ ràng giúp thể hiện đúng nét nghĩa "${targetMeaning}".
2. Thay thế từ gốc: Trong câu tiếng Nhật, BẮT BUỘC thay thế từ "${frontText}" (hoặc các dạng chia của nó) bằng ký hiệu ＿＿＿＿ (4 dấu gạch dưới).
3. "exampleMeaning": Dịch nghĩa câu ví dụ sang tiếng Việt tự nhiên, chuẩn ngữ cảnh.

GỬI TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không chứa mã markdown/backticks):
{"example":"[câu tiếng Nhật có chứa ＿＿＿＿]","exampleMeaning":"[bản dịch tiếng Việt]"}`;
};
