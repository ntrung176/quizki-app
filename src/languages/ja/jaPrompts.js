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
            exampleRule = `4. example: Viết 1 câu ví dụ mẫu tự nhiên tiêu biểu nhất thể hiện rõ cách dùng thông dụng của điểm ngữ pháp "${frontText}" với nghĩa "${contextMeaning}". Giữ nguyên vẹn cấu trúc ngữ pháp "${frontText}" trong câu (TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿ hay che từ). KHÔNG thêm phiên âm furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch câu ví dụ sang tiếng Việt tự nhiên, chuẩn ngữ cảnh.`;
        } else {
            exampleRule = `4. example: Đối với MỖI nghĩa của ngữ pháp được liệt kê ở trường "meaning", hãy viết 1 câu ví dụ tương ứng tiêu biểu nhất thể hiện cách dùng thông dụng của nghĩa đó (đánh số 1, 2, 3... tương ứng trên từng dòng). Giữ nguyên cấu trúc ngữ pháp "${frontText}" trong câu (TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿ hay che từ). Các câu ví dụ phải có cấu trúc kết hợp chuẩn xác tuyệt đối, tự nhiên, chuẩn Nhật Bản. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch nghĩa tiếng Việt tương ứng cho từng câu ví dụ ở trên, phân dòng và đánh số 1, 2, 3... khớp hoàn toàn với các câu ví dụ ở trường "example".`;
        }
    } else {
        exampleRule = `4. example: CHỈ 1 CÂU VÍ DỤ HOÀN CHỈNH. Viết 1 câu ví dụ tự nhiên bằng tiếng Nhật thể hiện CÁCH DÙNG THÔNG DỤNG NHẤT (collocation / ngữ cảnh phổ biến) của từ "${frontText}". Giữ nguyên vẹn từ vựng "${frontText}" trong câu (TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿, KHÔNG che từ). Câu ví dụ phải tự nhiên, chuẩn Nhật Bản. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        if (contextLevel === 'N5') {
            exampleRule = `4. example: CHỈ 1 CÂU VÍ DỤ HOÀN CHỈNH. Viết 1 câu ví dụ ngắn gọn (8-10 từ) thể hiện cách dùng thông dụng của từ "${frontText}". Giữ nguyên vẹn từ vựng trong câu (TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿, KHÔNG che từ), viết bằng HIRAGANA và Kanji đơn giản. KHÔNG thêm ngoặc phiên âm furigana.`;
        }
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}${hasMeaning ? ` [Nghĩa yêu cầu: ${contextMeaning}]` : ''}
JSON only, không markdown/backtick:
{"front":"${frontText}","reading":"すいどう","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管","synonymReading":"はいかん","synonymSinoVietnamese":"PHỐI QUẢN","example":"水道の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt.","accent":"0"}

${grammarInstruction}

QUY TẮC BẮT BUỘC:
1. Giữ nguyên cụm từ dài: Nếu người dùng nhập cụm từ dài hoặc cả câu (Ví dụ: "日本語を勉強する", "お腹が空いた"), TUYỆT ĐỐI KHÔNG được rút gọn thành từ vựng đơn.
2. front (Từ gốc): Chữ Hán/từ vựng thuần túy (TUYỆT ĐỐI KHÔNG chứa ngoặc phiên âm furigana, ví dụ "募集", "水道", "食べる", "日本語を勉強する").
3. reading (Cách đọc): BẮT BUỘC điền cách đọc chỉ bằng chữ Hiragana/Katakana cho TOÀN BỘ từ gốc/cụm từ (Ví dụ: "ぼしゅう", "すいどう", "たべる", "にほんごをべんきょうする"). TUYỆT ĐỐI KHÔNG chứa chữ Hán (Kanji).
4. synonym (Từ đồng nghĩa): Chữ Hán/từ thuần túy (TUYỆT ĐỐI KHÔNG chứa ngoặc phiên âm, ví dụ "配管"). Nếu không có thì để "".
5. meaning: ${isGrammar ? 'Định nghĩa ngữ pháp theo hướng dẫn ở trên.' : 'Ngắn gọn, nghĩa khác nhau ngăn ";".'}
6. pos/level: Phải khớp ngữ cảnh nếu đã chọn.
7. sinoVietnamese: BẮT BUỘC dịch ĐẦY ĐỦ TẤT CẢ các chữ Kanji xuất hiện sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách. Không có Kanji -> "".
8. accent: Bắt buộc điền số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2'.

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `Bạn là giáo viên tiếng Nhật. Hãy tạo 1 câu ví dụ ngắn gọn, tự nhiên và thể hiện CÁCH DÙNG THÔNG DỤNG NHẤT (collocation / ngữ cảnh quen thuộc) cho từ vựng "${frontText}" với nghĩa cụ thể là "${targetMeaning}".

YÊU CẦU BẮT BUỘC:
1. Ngắn gọn & Tự nhiên: Câu ví dụ phải tự nhiên, chuẩn văn phong Nhật Bản, có ngữ cảnh rõ ràng giúp thể hiện cách dùng thông dụng của từ "${frontText}" theo đúng nét nghĩa "${targetMeaning}".
2. Giữ nguyên từ vựng: Giữ nguyên vẹn từ "${frontText}" (hoặc dạng chia ngữ pháp tự nhiên của nó) trong câu. TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿ hay che từ.
3. Không thêm phiên âm/furigana/romaji hay bất kỳ dấu ngoặc nào vào câu tiếng Nhật.
4. "exampleMeaning": Dịch nghĩa câu ví dụ sang tiếng Việt tự nhiên, chuẩn ngữ cảnh.

GỬI TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không chứa mã markdown/backticks):
{"example":"[câu ví dụ tiếng Nhật hoàn chỉnh có chứa ${frontText}]","exampleMeaning":"[bản dịch tiếng Việt]"}`;
};
