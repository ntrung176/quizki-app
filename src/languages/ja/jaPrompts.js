/**
 * Japanese AI Prompt Generators (Standardized with QuizKi High-Efficiency Prompting)
 */

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const isGrammar = contextPos === 'grammar';
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    let grammarInstruction = '';
    let exampleRule = '';
    let exampleMeaningRule = '';

    if (isGrammar) {
        grammarInstruction = `CHÚ Ý ĐẶC BIỆT (ĐÂY LÀ ĐIỂM NGỮ PHÁP TIẾNG NHẬT):
- "meaning": Giải thích nghĩa tiếng Việt ngắn gọn, súc tích (1 - 8 từ) của cấu trúc ngữ pháp này, viết hoa chữ cái đầu tiên.
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
        exampleRule = `4. example: MỘT câu ví dụ tiếng Nhật ngắn, tự nhiên, đúng ngữ pháp (5 đến 10 từ tiếng Nhật), thể hiện cách dùng quen thuộc nhất trong đời sống thường nhật của từ "${frontText}" (Ví dụ các cụm collocation tự nhiên: 水を飲む, 約束を守る, 時間に間に合う, バスに乗る, 意見を述べる...). Giữ nguyên vẹn từ vựng "${frontText}" trong câu (hoặc dạng chia thì tự nhiên, TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿, KHÔNG che từ). TUYỆT ĐỐI KHÔNG viết câu phức ghép dài dòng, lan man, nhiều mệnh đề hay từ ngữ hàn lâm khó hiểu. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        if (contextLevel === 'N5') {
            exampleRule = `4. example: MỘT câu ví dụ tiếng Nhật ngắn đơn giản (5-10 từ tiếng Nhật) thể hiện cách dùng thông dụng nhất của từ "${frontText}". Giữ nguyên vẹn từ vựng trong câu (TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿, KHÔNG che từ), viết bằng HIRAGANA và Kanji cơ bản. TUYỆT ĐỐI KHÔNG viết câu dài lan man. KHÔNG thêm ngoặc phiên âm furigana.`;
        }
    }

    return `Từ điển Nhật-Việt thông minh. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}${hasMeaning ? ` [Nghĩa yêu cầu: ${contextMeaning}]` : ''}
JSON only, không markdown, không code block:
{"front":"${frontText}","reading":"すいどう","meaning":"Đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管","synonymReading":"はいかん","synonymSinoVietnamese":"PHỐI QUẢN","example":"水道の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt.","accent":"0"}

${grammarInstruction}

QUY TẮC BẮT BUỘC:
1. front: Giữ nguyên Kanji/Katakana/Hiragana gốc. Nếu input chỉ có cách đọc (hiragana) và nghĩa, hãy tìm đúng từ Kanji tương ứng dựa vào cách đọc + nghĩa (vd: がっこう + trường học → 学校). Nếu từ không có Kanji thì giữ nguyên Hiragana/Katakana. Nếu người dùng nhập cụm từ dài hoặc cả câu, giữ nguyên vẹn. TUYỆT ĐỐI KHÔNG chứa ngoặc phiên âm furigana.
2. reading: Chuyển sang Hiragana. Katakana giữ nguyên. Nếu input chỉ có Hiragana/Katakana thì reading = front. TUYỆT ĐỐI KHÔNG chứa chữ Hán (Kanji).
3. sinoVietnamese: PHIÊN ÂM Hán Việt TỪNG CHỮ HÁN theo âm chuẩn, viết HOA TOÀN BỘ — KHÔNG dịch nghĩa (ĐÚNG: 前日→"TIỀN NHẬT", 学校→"HỌC HIỆU", 先生→"TIÊN SINH"; SAI: "TIỀN NGÀY", "HỌC TRƯỜNG"). Nếu từ không có Kanji thì để "".
4. meaning: Nghĩa tiếng Việt ngắn gọn, viết hoa chữ cái đầu tiên (vd: "Giáo viên", "Trường học", "Ăn cơm"). BẮT BUỘC NGẮN GỌN (1 - 5 từ tiếng Việt), CHỈ CHỌN 1 ĐẾN 2 NÉT NGHĨA PHỔ BIẾN NHẤT trong đời sống thực tế (ngăn cách bởi dấu chấm phẩy ";" nếu có 2 nghĩa). TUYỆT ĐỐI KHÔNG sao chép nguyên bài từ điển dài dòng.
5. ${exampleRule}
6. ${exampleMeaningRule || 'exampleMeaning: Dịch nghĩa câu ví dụ sang tiếng Việt ngắn gọn, tự nhiên, chuẩn ngữ cảnh.'}
7. synonym: Chữ Hán/từ thuần túy (không chứa ngoặc phiên âm). Nếu không có để "".
8. pos / level: Phải khớp ngữ cảnh nếu có.
9. accent: Số biểu thị cao độ từ vựng (Pitch Accent), ví dụ: '0', '1', '2'.

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `Bạn là giáo viên tiếng Nhật. Hãy tạo 1 câu hoặc cụm từ ví dụ NGẮN GỌN (5-10 từ tiếng Nhật), tự nhiên và thể hiện CÁCH DÙNG THÔNG DỤNG NHẤT (collocation / ngữ cảnh quen thuộc trong đời sống) cho từ vựng "${frontText}" với nghĩa cụ thể là "${targetMeaning}".

YÊU CẦU BẮT BUỘC:
1. Ngắn gọn & Cụm thông dụng (Collocation): Câu/cụm từ phải ngắn gọn (5-10 từ), tự nhiên, chuẩn văn phong đời sống Nhật Bản, thể hiện cách dùng thực tế của "${frontText}". TUYỆT ĐỐI KHÔNG viết câu dài lan man khó hiểu.
2. Giữ nguyên từ vựng: Giữ nguyên vẹn từ "${frontText}" (hoặc dạng chia thì tự nhiên của nó) trong câu. TUYỆT ĐỐI KHÔNG dùng dấu gạch dưới ＿＿＿＿ hay che từ.
3. Không thêm phiên âm/furigana/romaji hay bất kỳ dấu ngoặc nào vào câu tiếng Nhật.
4. "exampleMeaning": Dịch nghĩa câu ví dụ sang tiếng Việt ngắn gọn, tự nhiên, chuẩn ngữ cảnh.

GỬI TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không chứa mã markdown/backticks):
{"example":"[câu/cụm ví dụ tiếng Nhật ngắn gọn chứa ${frontText}]","exampleMeaning":"[bản dịch tiếng Việt ngắn gọn]"}`;
};
