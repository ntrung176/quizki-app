/**
 * Official JLPT Level & Era Blueprints (N5–N1, 2010–2021 vs 2022–2025).
 * Single source of truth for AI exam authoring, audio validation, Studio preview, and UI Mondai headers.
 */

export const normalizeJlptLevel = (level = 'N3') => {
    const norm = String(level || 'N3').toUpperCase().trim();
    return ['N5', 'N4', 'N3', 'N2', 'N1'].includes(norm) ? norm : 'N3';
};

export const getExamEra = (examYear = null) => {
    const yr = Number(examYear);
    if (!yr || Number.isNaN(yr)) return 'modern';
    return yr >= 2022 ? 'modern' : 'legacy';
};

const mDef = (mondai, ja, vi, formatHint, legacyCount, modernCount, extra = {}) => ({
    mondai,
    ja,
    vi,
    formatHint,
    counts: { legacy: legacyCount, modern: modernCount },
    ...extra
});

export const JLPT_BLUEPRINTS = {
    N5: {
        continuousLangReadingMondai: false,
        bookletNote: 'Tách 3 phần thi: 文字・語彙 (M1–M4) · 文法・読解 đánh số lại từ M1–M6 · 聴解 (M1–M4).',
        vocabulary: [
            mDef(1, '漢字読み', 'Đọc chữ Hán', 'underline target kanji -> 4 Hiragana readings', '12', '7'),
            mDef(2, '表記', 'Cách viết chữ Hán/Katakana', 'underline Hiragana -> 4 Kanji/Katakana writings', '8', '5'),
            mDef(3, '文脈規定', 'Chọn từ theo ngữ cảnh', 'blank (　　) in single sentence', '10', '7'),
            mDef(4, '言い換え類義', 'Từ/cách nói gần nghĩa', 'underline phrase -> closest meaning sentence', '5', '3')
        ],
        grammar: [
            mDef(1, '文の文法1', 'Ngữ pháp trong câu', 'blank (　　) particle/conjugation/pattern', '16', '9'),
            mDef(2, '文の文法2', '★ Sắp xếp câu', '4 blanks with ★ slot', '5', '4'),
            mDef(3, '文章の文法', 'Ngữ pháp theo đoạn văn', 'Cloze blanks [48]..[51] attached to shared passage', '5', '4')
        ],
        reading: [
            mDef(4, '内容理解（短文）', 'Đọc hiểu đoạn ngắn', 'short passage ~80–150 chars + 1 Q', '3', '2'),
            mDef(5, '内容理解（中文）', 'Đọc hiểu đoạn vừa', 'medium passage + 2 Qs', '2', '2'),
            mDef(6, '情報検索', 'Tìm kiếm thông tin', 'notice/timetable/flyer (HTML table) + 2 Qs', '1–2', '2')
        ],
        listening: [
            mDef(1, '課題理解', 'Hiểu nhiệm vụ', '4 lựa chọn (tranh minh họa hoặc chữ ngắn)', '7', '6–7', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(2, 'ポイント理解', 'Nắm bắt điểm chính', '4 lựa chọn (in trên đề hoặc tranh)', '6', '5–6', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(3, '発話表現', 'Diễn đạt lời nói theo tranh', '3 lựa chọn (tranh có mũi tên, KHÔNG in chữ lựa chọn)', '5', '5', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: true }),
            mDef(4, '即時応答', 'Phản xạ nhanh', '3 lựa chọn (trắng trên giấy, nghe 1 câu + 3 đáp)', '6', '6', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: false })
        ]
    },
    N4: {
        continuousLangReadingMondai: false,
        bookletNote: 'Tách 3 phần thi: 文字・語彙 (M1–M5) · 文法・読解 đánh số lại từ M1–M6 · 聴解 (M1–M4).',
        vocabulary: [
            mDef(1, '漢字読み', 'Đọc chữ Hán', 'underline target kanji -> 4 Hiragana readings', '9', '7'),
            mDef(2, '表記', 'Cách viết chữ Hán/Katakana', 'underline Hiragana -> 4 Kanji/Katakana writings', '6', '5'),
            mDef(3, '文脈規定', 'Chọn từ theo ngữ cảnh', 'blank (　　) in single sentence', '10', '7'),
            mDef(4, '言い換え類義', 'Từ/cách nói gần nghĩa', 'underline phrase -> closest meaning sentence', '5', '4'),
            mDef(5, '用法', 'Cách dùng từ đúng ngữ cảnh', 'headword + 4 example sentences', '5', '3')
        ],
        grammar: [
            mDef(1, '文の文法1', 'Ngữ pháp trong câu', 'blank (　　) grammar/conjugation', '15', '9–10'),
            mDef(2, '文の文法2', '★ Sắp xếp câu', '4 blanks with ★ slot', '5', '4'),
            mDef(3, '文章の文法', 'Ngữ pháp theo đoạn văn', 'Cloze passage with numbered blanks', '5', '4')
        ],
        reading: [
            mDef(4, '内容理解（短文）', 'Đọc hiểu đoạn ngắn', 'short passage/email + 1 Q', '4', '2–3'),
            mDef(5, '内容理解（中文）', 'Đọc hiểu đoạn vừa', 'medium passage + 3 Qs', '4', '3'),
            mDef(6, '情報検索', 'Tìm kiếm thông tin', 'schedule/poster/guide (HTML table) + 2 Qs', '2', '2')
        ],
        listening: [
            mDef(1, '課題理解', 'Hiểu nhiệm vụ', '4 lựa chọn (in chữ hoặc tranh)', '8', '7–8', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(2, 'ポイント理解', 'Nắm bắt điểm chính', '4 lựa chọn (in chữ trên đề)', '7', '6–7', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(3, '発話表現', 'Diễn đạt lời nói theo tranh', '3 lựa chọn (tranh mũi tên, audio-only choices)', '5', '5', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: true }),
            mDef(4, '即時応答', 'Phản xạ nhanh', '3 lựa chọn (trắng trên giấy, 3 đáp thoại)', '8', '7–8', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: false })
        ]
    },
    N3: {
        continuousLangReadingMondai: false,
        bookletNote: 'Tách 3 phần thi: 文字・語彙 (M1–M5) · 文法・読解 đánh số lại từ M1–M7 · 聴解 (M1–M5).',
        vocabulary: [
            mDef(1, '漢字読み', 'Đọc chữ Hán', 'underline target kanji -> 4 Hiragana readings', '8', '6–7'),
            mDef(2, '表記', 'Cách viết chữ Hán', 'underline Hiragana -> 4 Kanji writings', '6', '5'),
            mDef(3, '文脈規定', 'Chọn từ theo ngữ cảnh', 'blank (　　) vocabulary in sentence', '11', '7–8'),
            mDef(4, '言い換え類義', 'Từ/cụm gần nghĩa', 'underline word/phrase -> 4 equivalents', '5', '4'),
            mDef(5, '用法', 'Cách dùng từ', 'headword + 4 sentence usages', '5', '4')
        ],
        grammar: [
            mDef(1, '文の文法1', 'Ngữ pháp trong câu', 'blank (　　) N3 grammar', '13', '9'),
            mDef(2, '文の文法2', '★ Sắp xếp câu', '4 blanks with ★ slot', '5', '4'),
            mDef(3, '文章の文法', 'Ngữ pháp theo đoạn văn', 'Cloze passage with numbered blanks', '5', '4')
        ],
        reading: [
            mDef(4, '内容理解（短文）', 'Đọc hiểu đoạn ngắn', '4 short texts (1 Q each)', '4', '3'),
            mDef(5, '内容理解（中文）', 'Đọc hiểu đoạn vừa', '2 medium passages × 3 Qs', '6', '6'),
            mDef(6, '内容理解（長文）', 'Đọc hiểu đoạn dài', 'long essay/story + 3–4 Qs', '4', '3'),
            mDef(7, '情報検索', 'Tìm kiếm thông tin', 'flyer/schedule table (HTML) + 2 Qs', '2', '2')
        ],
        listening: [
            mDef(1, '課題理解', 'Hiểu nhiệm vụ', '4 lựa chọn (chữ hoặc hình minh họa)', '6', '6', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(2, 'ポイント理解', 'Nắm bắt điểm chính', '4 lựa chọn (in chữ trên đề)', '6', '6', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(3, '概要理解', 'Hiểu khái quát', '4 lựa chọn (giấy trắng, nghe toàn bộ)', '3', '3', { optionCount: 4, hasPaperTextOptions: false, canHaveIllustrations: false }),
            mDef(4, '発話表現', 'Diễn đạt lời nói theo tranh', '3 lựa chọn (tranh mũi tên, audio-only choices)', '4', '4', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: true }),
            mDef(5, '即時応答', 'Phản xạ nhanh', '3 lựa chọn (giấy trắng, 3 đáp thoại)', '9', '8', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: false })
        ]
    },
    N2: {
        continuousLangReadingMondai: true,
        bookletNote: 'Ngôn ngữ & Đọc hiểu gộp chung 1 quyển đánh số liên tục 問題1 → 問題14; Nghe 聴解 gồm M1–M5.',
        vocabulary: [
            mDef(1, '漢字読み', 'Đọc chữ Hán', 'underline Kanji -> 4 Hiragana', '5', '5'),
            mDef(2, '表記', 'Cách viết chữ Hán', 'underline Hiragana -> 4 Kanji', '5', '5'),
            mDef(3, '語形成', 'Cấu tạo từ ghép', 'compound prefix/suffix blank', '5', '3'),
            mDef(4, '文脈規定', 'Chọn từ theo ngữ cảnh', 'blank (　　) N2 vocabulary', '7', '7'),
            mDef(5, '言い換え類義', 'Từ/cụm gần nghĩa', 'underline phrase -> 4 equivalents', '5', '5'),
            mDef(6, '用法', 'Cách dùng từ', 'headword + 4 usage sentences', '5', '5')
        ],
        grammar: [
            mDef(7, '文の文法1', 'Ngữ pháp trong câu', 'blank (　　) N2 grammar', '12', '12'),
            mDef(8, '文の文法2', '★ Sắp xếp câu', '4 blanks with ★ slot', '5', '5'),
            mDef(9, '文章の文法', 'Ngữ pháp theo đoạn văn', 'Cloze passage (chú ý có thể vắt 2 trang)', '5', '4')
        ],
        reading: [
            mDef(10, '内容理解（短文）', 'Đọc hiểu đoạn ngắn', '5 short texts (1 Q each)', '5', '5'),
            mDef(11, '内容理解（中文）', 'Đọc hiểu đoạn vừa', '3 medium passages', '9', '8'),
            mDef(12, '総合理解', 'So sánh 2 đoạn A/B', 'A & B texts side-by-side + 2 Qs', '2', '2'),
            mDef(13, '主張理解（長文）', 'Đọc hiểu luận điểm (dài)', 'long opinion essay + 3 Qs', '3', '3'),
            mDef(14, '情報検索', 'Tìm kiếm thông tin', 'guide/schedule (HTML table + 注) + 2 Qs', '2', '2')
        ],
        listening: [
            mDef(1, '課題理解', 'Hiểu nhiệm vụ', '4 lựa chọn (in chữ hoặc tranh 4 ô)', '5', '5', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(2, 'ポイント理解', 'Nắm bắt điểm chính', '4 lựa chọn (in chữ trên đề)', '6', '6', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: false }),
            mDef(3, '概要理解', 'Hiểu khái quát', '4 lựa chọn (giấy trắng, đáp án nằm trong audio)', '5', '5', { optionCount: 4, hasPaperTextOptions: false, canHaveIllustrations: false }),
            mDef(4, '即時応答', 'Phản xạ nhanh', '3 lựa chọn (giấy trắng, 3 đáp thoại)', '12', '11', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: false }),
            mDef(5, '統合理解', 'Nghe tổng hợp', '4 lựa chọn; câu cuối (3番 cũ / 2番 từ 2022+) có 質問1 & 質問2 + đáp án in sẵn', '3', '2', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: false, hasFinalMultiSubQuestion: true })
        ]
    },
    N1: {
        continuousLangReadingMondai: true,
        bookletNote: 'Ngôn ngữ & Đọc hiểu đánh số liên tục 問題1 → 問題13 (N1 KHÔNG có 表記/語形成); Nghe 聴解 M1–M5.',
        vocabulary: [
            mDef(1, '漢字読み', 'Đọc chữ Hán', 'underline Kanji -> 4 Hiragana', '6', '6'),
            mDef(2, '文脈規定', 'Chọn từ theo ngữ cảnh', 'blank (　　) N1 vocabulary', '7', '6'),
            mDef(3, '言い換え類義', 'Từ/cụm gần nghĩa', 'underline phrase -> 4 equivalents', '6', '5–6'),
            mDef(4, '用法', 'Cách dùng từ', 'headword + 4 usage sentences', '6', '5–6')
        ],
        grammar: [
            mDef(5, '文の文法1', 'Ngữ pháp trong câu', 'blank (　　) N1 grammar', '10', '9–10'),
            mDef(6, '文の文法2', '★ Sắp xếp câu', '4 blanks with ★ slot', '5', '4'),
            mDef(7, '文章の文法', 'Ngữ pháp theo đoạn văn', 'Cloze passage with numbered blanks', '5', '4')
        ],
        reading: [
            mDef(8, '内容理解（短文）', 'Đọc hiểu đoạn ngắn', '4 short passages (1 Q each)', '4', '4'),
            mDef(9, '内容理解（中文）', 'Đọc hiểu đoạn vừa', '3 medium passages', '9', '8'),
            mDef(10, '内容理解（長文）', 'Đọc hiểu đoạn dài', 'long reading passage + Qs', '4', '3–4'),
            mDef(11, '総合理解', 'So sánh 2 đoạn A/B', 'A & B texts + Qs', '3', '2'),
            mDef(12, '主張理解（長文）', 'Đọc hiểu luận điểm (dài)', 'long argumentative essay + 3–4 Qs', '4', '3'),
            mDef(13, '情報検索', 'Tìm kiếm thông tin', 'table/notice/rules (HTML table + 注) + 2 Qs', '2', '2')
        ],
        listening: [
            mDef(1, '課題理解', 'Hiểu nhiệm vụ', '4 lựa chọn (in chữ hoặc biểu đồ/lịch trình)', '6', '5', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: true }),
            mDef(2, 'ポイント理解', 'Nắm bắt điểm chính', '4 lựa chọn (in chữ trên đề)', '7', '6', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: false }),
            mDef(3, '概要理解', 'Hiểu khái quát', '4 lựa chọn (giấy trắng, nghe toàn bộ)', '6', '5', { optionCount: 4, hasPaperTextOptions: false, canHaveIllustrations: false }),
            mDef(4, '即時応答', 'Phản xạ nhanh', '3 lựa chọn (giấy trắng, 3 đáp thoại)', '14', '11', { optionCount: 3, hasPaperTextOptions: false, canHaveIllustrations: false }),
            mDef(5, '統合理解', 'Nghe tổng hợp', '4 lựa chọn; câu cuối thường gồm 質問1 & 質問2 có đáp án in trên đề', '3–4', '3', { optionCount: 4, hasPaperTextOptions: true, canHaveIllustrations: false, hasFinalMultiSubQuestion: true })
        ]
    }
};

const formatMondaiLine = (m, era) => {
    const count = m.counts?.[era] || m.counts?.modern || '?';
    return `  - 問題${m.mondai} (${m.ja} · ${m.vi}): ~${count} câu — ${m.formatHint}`;
};

/**
 * Returns level- & era-adapted blueprint metadata and AI prompt rules for JLPT Studio & authoring services.
 */
export const getLevelExamBlueprint = (level = 'N3', examYear = null) => {
    const normLevel = normalizeJlptLevel(level);
    const era = getExamEra(examYear);
    const eraLabel = era === 'legacy' ? '2010–2021 (Đề cũ)' : '2022–2025 (Đề cải cách mới)';
    const bp = JLPT_BLUEPRINTS[normLevel] || JLPT_BLUEPRINTS.N3;

    const langReadingLines = [
        `CẤU TRÚC CHUẨN JLPT ${normLevel} — KỲ THI ${eraLabel}:`,
        bp.bookletNote,
        '• Phần 文字・語彙 (sectionType: "vocabulary"):',
        ...bp.vocabulary.map((m) => formatMondaiLine(m, era)),
        '• Phần 文法 (sectionType: "grammar"):',
        ...bp.grammar.map((m) => formatMondaiLine(m, era)),
        '• Phần 読解 (sectionType: "reading"):',
        ...bp.reading.map((m) => formatMondaiLine(m, era))
    ].join('\n');

    const listeningLines = [
        `CẤU TRÚC CHUẨN NGHE HIỂU (聴解) JLPT ${normLevel} — ${eraLabel}:`,
        ...bp.listening.map((m) => {
            const count = m.counts?.[era] || m.counts?.modern || '?';
            const optsText = `${m.optionCount} lựa chọn`;
            const subNote = m.hasFinalMultiSubQuestion
                ? ' [ĐẶC BIỆT: Câu cuối có 2 câu hỏi phụ 質問1 & 質問2 -> xuất subQuestions!]'
                : '';
            return `  - 問題${m.mondai} (${m.ja} · ${m.vi}): ~${count} câu · ${optsText} · ${m.formatHint}${subNote}`;
        }),
        'LƯU Ý QUAN TRỌNG: Luôn ưu tiên khớp CHÍNH XÁC số Mondai và số câu thực tế xuất hiện trong file PDF/Script được upload (con số ~ trên là chuẩn tham chiếu kỳ thi).'
    ].join('\n');

    const listeningSummaryPills = bp.listening.map(
        (m) => `M${m.mondai}: ${m.counts?.[era] || '?'}c (${m.optionCount}đ/a${m.hasFinalMultiSubQuestion ? '+質問1/2' : ''})`
    );

    const langReadingSummary = bp.continuousLangReadingMondai
        ? `Từ vựng M${bp.vocabulary[0].mondai}–M${bp.vocabulary.at(-1).mondai} · Ngữ pháp M${bp.grammar[0].mondai}–M${bp.grammar.at(-1).mondai} · Đọc hiểu M${bp.reading[0].mondai}–M${bp.reading.at(-1).mondai}`
        : `Từ vựng M1–M${bp.vocabulary.length} · Ngữ pháp M1–M${bp.grammar.length} · Đọc hiểu M${bp.reading[0].mondai}–M${bp.reading.at(-1).mondai}`;

    return {
        level: normLevel,
        era,
        eraLabel,
        blueprint: bp,
        langReadingPromptRules: langReadingLines,
        listeningPromptRules: listeningLines,
        langReadingSummary,
        listeningSummaryPills
    };
};

/**
 * Resolves Mondai metadata across vocabulary, grammar, reading, or listening sections.
 */
export const resolveSectionMondaiMeta = (level = 'N3', sectionType = 'listening', mondaiNumber = 1, fallbackTitle = '') => {
    const normLevel = normalizeJlptLevel(level);
    const bp = JLPT_BLUEPRINTS[normLevel] || JLPT_BLUEPRINTS.N3;
    const mNum = Number(mondaiNumber) || 1;
    const secKey = ['vocabulary', 'grammar', 'reading', 'listening'].includes(sectionType)
        ? sectionType
        : (/聴解|nghe/i.test(fallbackTitle) ? 'listening'
            : /読解|đọc/i.test(fallbackTitle) ? 'reading'
                : /文法|ngữ pháp/i.test(fallbackTitle) ? 'grammar' : 'vocabulary');

    const list = bp[secKey] || bp.listening;
    const found = list.find((item) => item.mondai === mNum);
    if (found) {
        return { ...found, desc: found.formatHint, sectionType: secKey };
    }

    // Fallback search across non-listening sections in case sectionType is generic
    if (secKey !== 'listening') {
        for (const key of ['vocabulary', 'grammar', 'reading']) {
            const match = bp[key]?.find((item) => item.mondai === mNum);
            if (match) return { ...match, desc: match.formatHint, sectionType: key };
        }
    }

    return {
        mondai: mNum,
        ja: `問題${mNum}`,
        vi: `Mondai ${mNum}`,
        desc: '',
        optionCount: secKey === 'listening' && mNum === 4 ? 3 : 4,
        sectionType: secKey
    };
};

const GEMINI_EXPLANATION_SPEC_NON_LISTEN = `"explanation": viết chuẩn form ngắn gọn súc tích (người học đọc 5 giây hình dung được ngay) dùng "\\n\\n" ngăn các mục:\n     ✅ Lựa chọn chính xác: [1 câu ngắn nêu rõ đáp án đúng, nghĩa/cách dùng trọng tâm]\n     📖 Dịch câu hỏi: [Dịch tự nhiên toàn bộ câu đề hoặc câu chốt bài đọc sang tiếng Việt]\n     📌 Phân tích các phương án:\n     ✗ (a) [1 dòng ngắn: nghĩa & lý do sai — CHỈ liệt kê các câu sai, dùng (a)/(b)/(c)/(d)]\n     💡 Mẹo làm bài: [1 câu dấu hiệu nhận biết / bẫy dễ nhầm để người học nhớ ngay]`;

const GEMINI_EXPLANATION_SPEC_LISTENING = `"explanation": BẮT BUỘC dựa trực tiếp vào nội dung Script gốc, viết ngắn gọn súc tích để người học đọc 5 giây hình dung ngay bối cảnh & lý do đúng/sai, dùng "\\n\\n" ngăn các mục:
     ✅ Lựa chọn chính xác: [1 câu ngắn chốt hành động/ý chính trả lời đúng dựa theo Script]
     📖 Dịch câu hỏi: [Dịch tự nhiên bối cảnh + câu hỏi chốt cuối đoạn nghe sang tiếng Việt]
     📖 Trích dẫn: 「[Trích nguyên văn 1–2 câu thoại tiếng Nhật then chốt quyết định đáp án trong Script]」
     📌 Phân tích các phương án:
     ✗ (1) [1 dòng ngắn: phương án này nói gì trong hội thoại & vì sao sai/bị loại — CHỈ liệt kê phương án sai bằng (1)/(2)/(3)/(4)]
     💡 Mẹo làm bài: [1 câu từ khóa chuyển ý hoặc bẫy nghe cần chú ý ở câu này]`;

/**
 * Generates a copy-ready prompt tailored to (level, examYear, examSession, part)
 * for Google Gemini Web (Pro / 4 Neon) to extract exam PDFs/images into QuizKi JSON.
 */
export const buildGeminiWebExtractionPrompt = ({
    level = 'N3',
    examYear = 2024,
    examSession = '12',
    part = 'all' // 'vocab_grammar' | 'reading' | 'listening' | 'listening_script_explain' | 'all' | 'full_exam'
} = {}) => {
    const bp = getLevelExamBlueprint(level, examYear);
    const yr = Number(examYear) || 2024;
    const sess = String(Number(examSession) || 12);

    if (part === 'listening' || part === 'listening_script_explain') {
        const hasMultiSub = bp.blueprint.listening.some((m) => m.hasFinalMultiSubQuestion);
        const isScriptEnrich = part === 'listening_script_explain';
        return `Bạn là chuyên gia khảo thí JLPT ${bp.level} (${bp.eraLabel}). Tôi gửi kèm **file PDF Script Nghe hiểu**${isScriptEnrich ? ' (và có thể kèm PDF tờ đề / danh sách câu hiện có / bảng đáp án)' : ', file PDF đề Nghe hiểu (聴解) và bảng đáp án'} kỳ ${sess}/${yr}.

NHIỆM VỤ:
${isScriptEnrich
    ? `Từ file Script Nghe hiểu gửi kèm, trích xuất ĐẦY ĐỦ Script song ngữ Nhật–Việt và viết Giải thích bám sát Script cho TẤT CẢ từng câu hỏi Nghe hiểu (từ 問題1 đến 問題${bp.blueprint.listening.length}) sang JSON chuẩn QuizKi để hệ thống tự ghép vào từng câu.`
    : `Trích xuất ĐẦY ĐỦ TẤT CẢ các câu hỏi phần Nghe hiểu (聴解 — toàn bộ từ 問題1 đến 問題${bp.blueprint.listening.length}) sang JSON chuẩn cho QuizKi. KHÔNG cần file âm thanh (để trống "audioUrl": ""), Admin sẽ cắt audio theo từng Mondai riêng.`}

${bp.listeningPromptRules}

QUY TẮC XUẤT JSON PHẦN NGHE HIỂU & SCRIPT BẮT BUỘC:
1. BẮT BUỘC xử lý ĐỦ TẤT CẢ các câu hỏi theo đúng thứ tự Mondai (1..${bp.blueprint.listening.length}) và "questionNumber" trên đề (1, 2, 3...). Bỏ qua phần Ví dụ (例).
2. Định dạng từng câu nghe trong section "type": "listening":
   - "mondai": số nguyên (1..${bp.blueprint.listening.length})
   - "mondaiTitle": ví dụ "問題1：課題理解"
   - "questionNumber": số thứ tự câu trong Mondai đó (1, 2, 3...)
   - "stem": câu dẫn bối cảnh mở đầu trong Script (vd: "図書館で男の職員と女の職員が話しています。" — CHỈ lưu trong stem/script, TUYỆT ĐỐI KHÔNG đưa ra làm câu hỏi trên đề!)
   - "spokenQuestion": câu hỏi chốt đọc trong audio (vd: "女の職員はこの後まず何をしますか。" — chỉ lưu để hiện sau khi nghe trong Script!)
   - "question": BẮT BUỘC CHỈ GHI SỐ CÂU như "1番", "2番", "3番" (TUYỆT ĐỐI KHÔNG viết nội dung hội thoại hay câu hỏi nghe vào trường "question" vì đề nghe thật không in chữ câu hỏi!).
   - "paperPrompt": BẮT BUỘC để "" đối với mọi câu nghe bình thường (chỉ ghi nếu tờ đề giấy thực sự có bảng biểu tham chiếu in sẵn bên cạnh tranh).
   - "options": mảng đúng 3 hoặc 4 đáp án đúng chuẩn Mondai đó:
     * Mondai có phương án in chữ trên tờ đề giấy (thường là 問題1, 問題2): GHI NGUYÊN VĂN tiếng Nhật của từng lựa chọn, bỏ số 1/2/3/4 ở đầu (nếu chỉ gửi Script không thấy tờ đề thì ghi ["1","2","3","4"], hệ thống sẽ tự giữ đáp án in cũ khi ghép!).
     * RIÊNG 問題4 (即時応答 — Trả lời nhanh): CHỈ CÓ ĐÚNG 3 LỰA CHỌN ["1", "2", "3"] (hoặc ["1","2","3","4"] nếu 4 lựa, ghi đúng số câu trả lời đọc trong script vào "spokenOptions")! Tuyệt đối KHÔNG xuất 4 lựa chọn cho Mondai 3 đáp án!
     * Với Mondai không in chữ phương án (tranh vẽ, câu khái quát M3/M4/M5): chỉ xuất ["1","2","3","4"] (hoặc ["1","2","3"]) ở "options", còn câu đọc từng phương án bỏ vào "spokenOptions"!
   - "spokenOptions": mảng 3 hoặc 4 câu đọc nguyên văn trong Script ứng với từng phương án (rất quan trọng với 問題3, 問題4, 問題5 không in chữ trên giấy!).
   - "correctAnswer": chỉ số 0-based (0 = số 1, 1 = số 2, 2 = số 3, 3 = số 4). Đối chiếu chuẩn xác với đáp án đính kèm hoặc câu trả lời cuối Script.${hasMultiSub ? `\n   - RIÊNG câu cuối của 問題5 có 2 câu hỏi phụ (質問1 và 質問2): xuất thêm mảng "subQuestions": [{ "question": "質問1 ...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📖 Dịch câu hỏi: ...\\n\\n📖 Trích dẫn: 「...」\\n\\n📌 Phân tích các phương án:\\n✗ (2) ...\\n\\n💡 Mẹo làm bài: ..." }, { "question": "質問2 ...", "options": [...], "correctAnswer": 1, "explanation": "..." }]. Đồng thời vẫn xuất đầy đủ "script" ở object câu cha để hiển thị hội thoại!` : ''}
   - "script": BẮT BUỘC chép ĐẦY ĐỦ NGUYÊN VĂN TỪNG LỜI THOẠI của câu đó từ file Script gửi kèm (KHÔNG tóm tắt, KHÔNG bỏ câu nào!) gồm:
     [{ "speaker": "Narrator" | "M" | "F", "ja": "câu tiếng Nhật gốc", "vi": "dịch nghĩa tiếng Việt tự nhiên sát ngữ cảnh" }, ...]
   - ${GEMINI_EXPLANATION_SPEC_LISTENING}
   - "audioUrl": ""
3. CHỈ TRẢ VỀ DUY NHẤT 1 KHỐI JSON HỢP LỆ (KHÔNG CHÈN CHỮ GIẢI THÍCH BÊN NGOÀI):

{
  "title": "Đề thi JLPT ${bp.level} · Kỳ Tháng ${sess}/${yr}",
  "level": "${bp.level}",
  "sections": [
    {
      "type": "listening",
      "title": "Nghe hiểu (聴解)",
      "questions": [
        {
          "mondai": 1,
          "mondaiTitle": "問題1：${bp.blueprint.listening[0].ja}",
          "questionNumber": 1,
          "paperPrompt": "",
          "stem": "図書館で男の職員と女の職員が話しています。",
          "spokenQuestion": "女の職員はこの後まず何をしますか。",
          "question": "1番",
          "options": ["...", "...", "...", "..."],
          "spokenOptions": [],
          "correctAnswer": 0,
          "script": [
            { "speaker": "Narrator", "ja": "...", "vi": "..." },
            { "speaker": "M", "ja": "...", "vi": "..." },
            { "speaker": "F", "ja": "...", "vi": "..." }
          ],
          "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📖 Dịch câu hỏi: ...\\n\\n📖 Trích dẫn: 「...」\\n\\n📌 Phân tích các phương án:\\n✗ (2) ...\\n✗ (3) ...\\n✗ (4) ...\\n\\n💡 Mẹo làm bài: ...",
          "audioUrl": ""
        }
      ]
    }
  ]
}`;
    }

    const scopeText = part === 'vocab_grammar'
        ? 'CHỈ trích xuất PHẦN 1: Từ vựng (文字・語彙) & Ngữ pháp (文法). Dừng lại trước phần Đọc hiểu (読解) và BỎ QUA phần Nghe (聴解).'
        : part === 'reading'
            ? 'CHỈ trích xuất PHẦN 2: Đọc hiểu (読解 — từ bài ngắn, bài vừa, so sánh A/B, bài dài đến tìm kiếm thông tin 情報検索). BỎ QUA Từ vựng/Ngữ pháp và Nghe (聴解).'
            : part === 'full_exam'
                ? 'Trích xuất TRỌN BỘ NGUYÊN ĐỀ THI gồm ĐẦY ĐỦ 4 phần: Từ vựng ("vocabulary"), Ngữ pháp ("grammar"), Đọc hiểu ("reading") VÀ Nghe hiểu ("listening" — toàn bộ 問題 từ đề Nghe + Script, để "audioUrl": ""). KHÔNG ĐƯỢC cắt bớt hoặc tóm tắt bất kỳ câu nào.'
                : 'Trích xuất ĐẦY ĐỦ TẤT CẢ các câu hỏi Từ vựng (文字・語彙), Ngữ pháp (文法) và Đọc hiểu (読解). BỎ QUA phần Nghe hiểu (聴解) vì phần Nghe sẽ chạy riêng bằng audio MP3.';

    const partRules = part === 'vocab_grammar'
        ? [
            '• Phần Từ vựng ("type": "vocabulary"):',
            ...bp.blueprint.vocabulary.map((m) => formatMondaiLine(m, bp.era)),
            '• Phần Ngữ pháp ("type": "grammar"):',
            ...bp.blueprint.grammar.map((m) => formatMondaiLine(m, bp.era))
        ].join('\n')
        : part === 'reading'
            ? [
                '• Phần Đọc hiểu ("type": "reading"):',
                ...bp.blueprint.reading.map((m) => formatMondaiLine(m, bp.era))
            ].join('\n')
            : part === 'full_exam'
                ? `${bp.langReadingPromptRules}\n\n${bp.listeningPromptRules}`
                : bp.langReadingPromptRules;

    const readingBreakdownRule = part !== 'vocab_grammar'
        ? `\n   - PHÂN TÍCH TỪNG CÂU BÀI ĐỌC ("passageData" — DÀNH CHO CHẾ ĐỘ LUYỆN TẬP): Đối với MỌI bài đọc ("type": "reading"), ở CÂU ĐẦU TIÊN của mỗi bài đọc (các câu tiếp theo chung bài đọc đó không cần lặp lại "passageData" để tránh dài JSON), BẮT BUỘC thêm object "passageData" gồm:\n     * "title": tên ngắn gọn tiếng Nhật\n     * "titleVi": tiêu đề tiếng Việt ngắn\n     * "vietnamese": bản dịch tiếng Việt đầy đủ toàn bài đọc\n     * "sentences": mảng phân tích ĐỦ TỪNG CÂU trong bài đọc theo đúng thứ tự: [{ "jp": "nguyên văn câu tiếng Nhật", "vi": "dịch tiếng Việt tự nhiên câu đó", "vocab": [{ "w": "Từ Kanji", "read": "cách đọc hiragana", "vi": "nghĩa ngắn" }], "grammar": [{ "point": "〜mẫu ngữ pháp", "vi": "ý nghĩa ngắn" }] }]`
        : '';

    const listeningRuleBlock = part === 'full_exam'
        ? `\n7. RIÊNG PHẦN NGHE HIỂU ("type": "listening"):\n   - Đề Nghe thật KHÔNG in câu hỏi nên trường "question" CHỈ GHI SỐ CÂU ("1番", "2番"...), "paperPrompt": "". Câu dẫn mở đầu đặt vào "stem", câu hỏi đọc trong băng đặt vào "spokenQuestion".\n   - Gồm "mondai", "mondaiTitle", "questionNumber", "options" (chép lựa chọn in trên đề hoặc ["1","2","3","4"]/["1","2","3"] nếu tranh/giấy trắng), "spokenOptions", "correctAnswer" (0-based), "script": [{ "speaker": "M"|"F"|"Narrator", "ja": "...", "vi": "..." }], "audioUrl": "".\n   - "explanation" phần Nghe viết theo đúng form: ✅ Lựa chọn chính xác / 📖 Dịch câu hỏi / 📖 Trích dẫn / 📌 Phân tích các phương án dùng ✗ (1)... / 💡 Mẹo làm bài.\n   - Nếu câu cuối 問題5 có 質問1 & 質問2, xuất mảng "subQuestions".`
        : '';

    const readingSampleFields = part === 'vocab_grammar'
        ? ''
        : `,\n          "passageData": {\n            "title": "Chủ đề tiếng Nhật",\n            "titleVi": "Tiêu đề tiếng Việt",\n            "vietnamese": "Bản dịch trọn vẹn bài đọc...",\n            "sentences": [\n              {\n                "jp": "Câu tiếng Nhật 1...",\n                "vi": "Dịch câu 1...",\n                "vocab": [{ "w": "本音", "read": "ほんね", "vi": "suy nghĩ thật lòng" }],\n                "grammar": [{ "point": "〜なければ", "vi": "nếu không... thì không" }]\n              }\n            ]\n          }`;

    return `Bạn là chuyên gia khảo thí JLPT ${bp.level} (${bp.eraLabel}). Tôi gửi kèm file PDF đề thi JLPT ${bp.level} kỳ ${sess}/${yr}${part === 'full_exam' ? ', file Script Nghe hiểu' : ''} (và bảng/ảnh đáp án nếu có).

NHIỆM VỤ:
${scopeText}

CẤU TRÚC CHUẨN ${bp.level} CẦN BÁM SÁT:
${partRules}

QUY TẮC XUẤT JSON BẮT BUỘC (KHÔNG BỎ SÓT BẤT KỲ CÂU NÀO):
1. Nếu có 2 bài Cloze/Đọc nhiều câu hoặc nhiều trang liên tiếp, phải nối mạch văn đầy đủ, KHÔNG bỏ sót câu nào từ câu đầu tới câu cuối của phần này.
2. Gán đúng:
   - "type": ${part === 'full_exam' ? '"vocabulary" | "grammar" | "reading" | "listening"' : '"vocabulary" | "grammar" | "reading"'}
   - "mondai": số nguyên (1, 2, ... đúng theo đề)
   - "mondaiTitle": ví dụ "問題1：漢字読み"
   - "questionNumber": số thứ tự câu trên đề (1, 2, 3...)
3. Định dạng HTML sạch:
   - Từ/cụm gạch chân: bọc bằng <u>...</u>
   - Câu sắp xếp ★: ghi đủ "<u>\\u3000</u> <u>\\u3000</u> <u>★</u> <u>\\u3000</u>"
   - Câu Đọc hiểu & Điền đoạn văn (文章の文法): COPY TOÀN BỘ đoạn văn gốc (bao gồm cả đoạn A & B của bài so sánh 総合理解, bảng biểu HTML <table> và ghi chú (注) của bài 情報検索) vào trường "passage" của từng câu thuộc bài đó!${readingBreakdownRule}
4. "options": mảng đúng 4 đáp án tiếng Nhật nguyên văn (hoặc 3 đáp án đối với Nghe hiểu Trả lời nhanh), bỏ số 1/2/3/4 ở đầu.
5. "correctAnswer": chỉ số 0-based (0 = lựa chọn 1, 1 = lựa chọn 2, 2 = lựa chọn 3, 3 = lựa chọn 4). Đối chiếu chuẩn xác với đáp án đính kèm (nếu đề không kèm đáp án, hãy tự giải chính xác tuyệt đối).
6. ${GEMINI_EXPLANATION_SPEC_NON_LISTEN}${listeningRuleBlock}
${part === 'full_exam' ? '8' : '7'}. CHỈ TRẢ VỀ DUY NHẤT 1 KHỐI JSON HỢP LỆ THEO ĐÚNG CẤU TRÚC SAU (KHÔNG CHÈN CHỮ BÊN NGOÀI):

{
  "title": "Đề thi JLPT ${bp.level} · Kỳ Tháng ${sess}/${yr}",
  "level": "${bp.level}",
  "sections": [
    {
      "type": "${part === 'reading' ? 'reading' : 'vocabulary'}",
      "title": "${part === 'reading' ? 'Đọc hiểu (読解)' : 'Từ vựng (文字・語彙)'}",
      "questions": [
        {
          "mondai": ${part === 'reading' ? bp.blueprint.reading[0].mondai : 1},
          "mondaiTitle": "${part === 'reading' ? `問題${bp.blueprint.reading[0].mondai}：${bp.blueprint.reading[0].ja}` : '問題1：漢字読み'}",
          "questionNumber": 1,
          "passage": "",
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correctAnswer": 0,
          "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📖 Dịch câu hỏi: ...\\n\\n📌 Phân tích các phương án:\\n✗ (b) ...\\n✗ (c) ...\\n✗ (d) ...\\n\\n💡 Mẹo làm bài: ..."${readingSampleFields}
        }
      ]
    }${part === 'full_exam' ? `,
    {
      "type": "listening",
      "title": "Nghe hiểu (聴解)",
      "questions": [
        {
          "mondai": 1,
          "mondaiTitle": "問題1：${bp.blueprint.listening[0].ja}",
          "questionNumber": 1,
          "paperPrompt": "",
          "stem": "図書館で男の職員と女の職員が話しています。",
          "spokenQuestion": "女の職員はこの後まず何をしますか。",
          "question": "1番",
          "options": ["...", "...", "...", "..."],
          "correctAnswer": 0,
          "script": [{ "speaker": "Narrator", "ja": "...", "vi": "..." }],
          "explanation": "✅ Lựa chọn chính xác: ...\\n\\n📖 Dịch câu hỏi: ...\\n\\n📌 Phân tích các phương án:\\n✗ (2) ...\\n✗ (3) ...\\n✗ (4) ...\\n\\n💡 Mẹo làm bài: ...",
          "audioUrl": ""
        }
      ]
    }` : ''}
  ]
}`;
};
