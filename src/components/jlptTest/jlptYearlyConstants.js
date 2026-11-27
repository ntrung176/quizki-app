/**
 * Constants and metadata helpers for JLPT Yearly Exams (2010–2025)
 * and Level-specific Listening Mondai structure.
 */

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const JLPT_YEARS = Array.from({ length: 16 }, (_, idx) => 2025 - idx); // 2025 -> 2010

export const JLPT_SESSIONS = [
    { id: '12', label: 'Tháng 12', shortLabel: 'T12' },
    { id: '07', label: 'Tháng 07', shortLabel: 'T07' }
];

export const JLPT_TOTAL_TIME_BY_LEVEL = {
    N5: 90,
    N4: 105,
    N3: 140,
    N2: 155,
    N1: 170
};

export const JLPT_LISTENING_TIME_BY_LEVEL = {
    N5: 30,
    N4: 35,
    N3: 40,
    N2: 50,
    N1: 55
};

/**
 * Official JLPT Listening (聴解) Mondai definitions per level.
 * Note: N5/N4 have 4 Mondais, N3 has 5 Mondais (M4 = 発話表現, M5 = 即時応答),
 * while N2/N1 have 5 Mondais (M4 = 即時応答, M5 = 統合理解).
 */
export const JLPT_MONDAI_BY_LEVEL = {
    N5: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe tình huống & câu hỏi, chọn hành động/tranh đúng.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc sẵn 4 phương án và nghe thông tin cốt lõi.' },
        { mondai: 3, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Nhìn tranh mũi tên, chọn câu nói mở đầu tự nhiên (3 lựa chọn).' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe 1 câu ngắn và chọn câu đáp lại phù hợp (3 lựa chọn).' }
    ],
    N4: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe yêu cầu và chọn việc cần làm tiếp theo hoặc hình ảnh đúng.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc trước các lựa chọn và bắt chi tiết quan trọng trong hội thoại.' },
        { mondai: 3, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Quan sát tranh và chọn cách nói đúng ngữ cảnh (3 lựa chọn).' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Phản hồi nhanh câu thoại ngắn trong đời sống (3 lựa chọn).' }
    ],
    N3: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Nghe câu hỏi và hội thoại để chọn việc cần làm chuẩn xác.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đọc câu hỏi & 4 phương án, lọc thông tin trọng tâm.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Nghe hiểu chủ đề, ý chính hoặc quan điểm tổng quát (không in đề).' },
        { mondai: 4, key: 'hatsuwa', ja: '発話表現', vi: 'Diễn đạt lời nói', desc: 'Nhìn tranh hoàn cảnh, chọn lời thoại phù hợp với người chỉ mũi tên.' },
        { mondai: 5, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe câu ngắn và chọn câu đối đáp tự nhiên (3 lựa chọn).' }
    ],
    N2: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Xác định hành động/quyết định chính xác sau cuộc trao đổi.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Đối chiếu lý do, điều kiện và dữ kiện cụ thể với 4 phương án.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Nắm bắt thông điệp, mục đích hoặc chủ đề toàn bài nghe.' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Nghe câu nói giàu sắc thái/kính ngữ và chọn hồi đáp đúng (3 lựa chọn).' },
        { mondai: 5, key: 'tougou', ja: '統合理解', vi: 'Nghe tổng hợp', desc: 'Tổng hợp nhiều nguồn thông tin dài, phân tích điều kiện để chọn phương án.' }
    ],
    N1: [
        { mondai: 1, key: 'kadai', ja: '課題理解', vi: 'Hiểu nhiệm vụ', desc: 'Xử lý hội thoại phức tạp và xác định hành động tiếp theo.' },
        { mondai: 2, key: 'point', ja: 'ポイント理解', vi: 'Nắm bắt điểm chính', desc: 'Bắt chính xác nguyên nhân, kết luận giữa nhiều thông tin gây nhiễu.' },
        { mondai: 3, key: 'gaiyou', ja: '概要理解', vi: 'Hiểu khái quát', desc: 'Hiểu luận điểm cốt lõi của bài thuyết trình, phỏng vấn, tin tức.' },
        { mondai: 4, key: 'sokuji', ja: '即時応答', vi: 'Phản xạ nhanh', desc: 'Phản xạ nhanh với câu nói tự nhiên, ẩn ý và kính ngữ N1.' },
        { mondai: 5, key: 'tougou', ja: '統合理解', vi: 'Nghe tổng hợp', desc: 'Nghe bài dài đa nhân vật và trả lời 1–2 câu hỏi tổng hợp lập luận.' }
    ]
};

export const getMondaiListForLevel = (level = 'N3') => {
    const norm = String(level || 'N3').toUpperCase().trim();
    return JLPT_MONDAI_BY_LEVEL[norm] || JLPT_MONDAI_BY_LEVEL.N3;
};

export const getMondaiMeta = (level = 'N3', mondaiNumber = 1) => {
    const list = getMondaiListForLevel(level);
    const num = Number(mondaiNumber) || 1;
    return list.find((m) => m.mondai === num) || list[0];
};

/**
 * Extracts yearly exam metadata (year 2010–2025, session '07'|'12') from a test object.
 */
export const parseYearlyExamMeta = (test) => {
    if (!test) return { isYearly: false, year: null, session: null, periodKey: '' };

    if (test.examYear && (test.examSession === '07' || test.examSession === '12' || test.examSession === 7 || test.examSession === 12)) {
        const y = Number(test.examYear);
        const s = String(test.examSession).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    const hay = `${test.id || ''} ${test.title || ''} ${test.bookSlug || ''}`;

    // Match patterns like 2023-12, 2023_07, 12/2023, 07/2023, 2023年12月, Tháng 7 năm 2023
    const yFirst = hay.match(/(201[0-9]|202[0-6])\s*[-_/年.\s]+\s*(0?[7]|12)/);
    if (yFirst) {
        const y = Number(yFirst[1]);
        const s = String(Number(yFirst[2])).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    const sFirst = hay.match(/(?:tháng|kỳ|ky|month|t)?\s*(0?[7]|12)\s*[-_/年.\s]+(201[0-9]|202[0-6])/i);
    if (sFirst) {
        const y = Number(sFirst[2]);
        const s = String(Number(sFirst[1])).padStart(2, '0');
        return { isYearly: true, year: y, session: s, periodKey: `${y}-${s}` };
    }

    return { isYearly: false, year: null, session: null, periodKey: '' };
};

/**
 * Resolves Mondai number (1..5) from a listening question object or title.
 */
export const resolveQuestionMondai = (q = {}, fallbackTitle = '') => {
    const explicit = Number(q.mondai ?? q.mondaiNumber ?? 0);
    if (explicit >= 1 && explicit <= 5) return explicit;

    const text = `${q.mondaiTitle || ''} ${q.stem || ''} ${q.question || ''} ${fallbackTitle || ''}`;
    const match = text.match(/(?:mondai|問題|m)\s*([1-5１-５])/i);
    if (match) {
        const digitMap = { '１': 1, '２': 2, '３': 3, '４': 4, '５': 5 };
        return digitMap[match[1]] || Number(match[1]) || 1;
    }
    return 1;
};

/**
 * Checks whether a test contains listening sections (safe even on summary-only test objects).
 */
export const testHasListening = (test) => {
    if (!test) return false;
    if (test.hasListening) return true;
    if (test.skillType === 'listening') return true;
    if (Array.isArray(test.sections)) {
        return test.sections.some((s) => s?.type === 'listening' || /聴解|nghe hiểu|listening/i.test(s?.title || ''));
    }
    return /nghe hiểu|聴解|listening/i.test(`${test.title || ''} ${test.description || ''}`);
};
