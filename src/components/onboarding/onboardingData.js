/**
 * Onboarding Survey Data & Question Definitions (Duolingo Style)
 */

export const ONBOARDING_LANGUAGES = [
    {
        id: 'ja',
        code: 'jp',
        title: 'Tiếng Nhật',
        sub: '46 âm Kana, Kanji & Lộ trình JLPT N5 → N1 tương tác',
        tag: 'Sẵn sàng • Kana → N1',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        disabled: false
    },
    {
        id: 'en',
        code: 'gb',
        title: 'Tiếng Anh',
        sub: '3,000+ từ vựng Oxford, phản xạ Kaiwa & IELTS/TOEIC',
        tag: 'BETA • Sắp ra mắt',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
        disabled: true
    },
    {
        id: 'ko',
        code: 'kr',
        title: 'Tiếng Hàn',
        sub: 'Bảng chữ cái Hangul, giao tiếp K-Drama & TOPIK I - II',
        tag: 'BETA • Sắp ra mắt',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
        disabled: true
    }
];

export const NATIVE_LANGUAGES = [
    { id: 'vi', code: 'vn', title: 'Tiếng Việt', sub: 'Tôi là người Việt Nam' },
    { id: 'en', code: 'gb', title: 'English', sub: 'English speaker' },
    { id: 'ja', code: 'jp', title: '日本語', sub: '日本語ネイティブ' },
    { id: 'ko', code: 'kr', title: '한국어', sub: '한국어 사용자' }
];

export const DISCOVERY_SOURCES = [
    { id: 'tiktok', icon: '📱', title: 'TikTok', sub: 'Qua video ngắn và mẹo học' },
    { id: 'facebook', icon: '📘', title: 'Facebook / Instagram / Threads', sub: 'Bài đăng hoặc gợi ý từ cộng đồng' },
    { id: 'friends', icon: '👥', title: 'Bạn bè hoặc Người thân giới thiệu', sub: 'Được người quen chia sẻ' },
    { id: 'google', icon: '🔍', title: 'Tìm kiếm Google', sub: 'Tìm website học ngoại ngữ' },
    { id: 'youtube', icon: '📺', title: 'YouTube', sub: 'Xem video bài giảng & review' },
    { id: 'appstore', icon: '🛍️', title: 'Cửa hàng ứng dụng', sub: 'Tìm thấy trên App Store / Google Play' }
];

export const LEARNING_MOTIVATIONS = [
    { id: 'study_abroad', icon: '🎓', title: 'Du học & Định cư nước ngoài', sub: 'Chuẩn bị phỏng vấn visa và học tập' },
    { id: 'career', icon: '💼', title: 'Công việc & Cơ hội thăng tiến', sub: 'Làm việc tại công ty đa quốc gia' },
    { id: 'exam', icon: '📜', title: 'Luyện thi lấy chứng chỉ', sub: 'Chinh phục JLPT N5-N1, TOEIC, TOPIK...' },
    { id: 'travel', icon: '✈️', title: 'Du lịch & Giao tiếp tự tin', sub: 'Tự tin trò chuyện với người bản xứ' },
    { id: 'hobby', icon: '🧠', title: 'Rèn luyện trí não & Sở thích', sub: 'Yêu thích Anime, Phim ảnh, Văn hóa' }
];

export const PROFICIENCY_LEVELS = [
    {
        id: 'scratch',
        icon: '🌱',
        title: 'Mới bắt đầu từ con số 0',
        sub: 'Chưa biết bảng chữ cái hoặc chỉ biết vài từ bập bẹ'
    },
    {
        id: 'elementary',
        icon: '🌿',
        title: 'Đã biết bảng chữ cái và câu cơ bản',
        sub: 'Thuộc Kana / Hangul và vài mẫu câu chào hỏi hàng ngày'
    },
    {
        id: 'intermediate',
        icon: '🌳',
        title: 'Trình độ Trung cấp (N4 - N3)',
        sub: 'Tự tin giao tiếp các chủ đề quen thuộc, hiểu ngữ pháp cơ bản'
    },
    {
        id: 'advanced',
        icon: '🏆',
        title: 'Trình độ Cao cấp (N2 - N1)',
        sub: 'Muốn trau dồi vốn từ chuyên sâu, đọc báo và làm việc chuyên nghiệp'
    }
];

export const VALUE_PROPOSITIONS = [
    {
        icon: '⚡',
        title: 'Nhớ vĩnh viễn 3,000+ từ vựng & Kanji',
        desc: 'Thuật toán Lặp lại ngắt quãng (SRS) thông minh nhắc ôn tập đúng thời điểm vàng trước khi bạn kịp quên.'
    },
    {
        icon: '🗣️',
        title: 'Tự tin phản xạ cùng Gia sư AI Kaiwa 24/7',
        desc: 'Trò chuyện 1-1 không sợ sai, nhận xét ngữ điệu và sửa phát âm chuẩn như người bản xứ.'
    },
    {
        icon: '🎯',
        title: 'Lộ trình chia nhỏ bài bản hàng ngày',
        desc: 'Mỗi bài học chỉ 10 - 15 phút, thiết kế vừa vặn để bạn không bị quá tải và duy trì chuỗi Streak mỗi ngày.'
    },
    {
        icon: '📚',
        title: 'Kho giáo trình chuẩn & Luyện đề thực chiến',
        desc: 'Đầy đủ trọn bộ từ vựng, ngữ pháp, chữ Hán và đề thi thử mô phỏng kỳ thi thật.'
    }
];

export const DAILY_GOALS = [
    { id: 5, icon: '☕', minutes: 5, title: '5 phút / ngày', sub: 'Thư thái — Khởi đầu nhẹ nhàng để làm quen' },
    { id: 15, icon: '⭐', minutes: 15, title: '15 phút / ngày', sub: 'Tiêu chuẩn — Được 85% học viên QuizKi lựa chọn (Đề xuất)', isRecommended: true },
    { id: 30, icon: '🔥', minutes: 30, title: '30 phút / ngày', sub: 'Nghiêm túc — Tiến bộ trông thấy sau mỗi tuần' },
    { id: 60, icon: '🚀', minutes: 60, title: '60 phút / ngày', sub: 'Cường độ cao — Bứt phá thần tốc trong thời gian ngắn' }
];

export const STARTING_PATHS = [
    {
        id: 'scratch',
        icon: '🐣',
        title: 'Bắt đầu từ con số 0 (Học từ đầu)',
        sub: 'Làm quen từ bảng chữ cái Kana, quy tắc phát âm và các từ vựng chào hỏi nền tảng nhất (Chặng 1).'
    },
    {
        id: 'test',
        icon: '🧭',
        title: 'Làm bài kiểm tra đánh giá trình độ (Kana → N1)',
        sub: 'Bài đánh giá thích ứng tối đa 18 câu trải từ Kana đến N1 để xếp bạn vào đúng Chặng (1–10) trong lộ trình.'
    }
];

export const PLACEMENT_QUESTIONS_JA = [
    // === TIER 1: KANA (Câu 1 - 3) ===
    {
        level: 'Kana',
        skill: 'Hiragana',
        question: 'Chữ Hiragana 「ありがとう」 đọc như thế nào và mang nghĩa gì?',
        options: [
            'A-ri-ga-to-u (Cảm ơn)',
            'O-ha-yo-u (Chào buổi sáng)',
            'Su-mi-ma-sen (Xin lỗi)',
            'Ko-n-ni-chi-wa (Xin chào)'
        ],
        answer: 'A-ri-ga-to-u (Cảm ơn)',
        explanation: '「ありがとう」(あ・り・が・と・う / Arigatou) là lời cảm ơn thông dụng nhất trong tiếng Nhật.'
    },
    {
        level: 'Kana',
        skill: 'Katakana',
        question: 'Chữ Katakana 「コーヒー」 có cách đọc và nghĩa là gì?',
        options: [
            'Cà phê (Koohii)',
            'Trà xanh (Ocha)',
            'Bánh mì (Pan)',
            'Nước ép (Juusu)'
        ],
        answer: 'Cà phê (Koohii)',
        explanation: '「コーヒー」(Koohii) viết bằng Katakana với trường âm「ー」, nghĩa là Cà phê.'
    },
    {
        level: 'Kana',
        skill: 'Kana Đọc hiểu',
        question: 'Cụm chữ 「たべもの」 đọc chuẩn là gì?',
        options: [
            'Ta-be-mo-no (Đồ ăn)',
            'No-mi-mo-no (Đồ uống)',
            'Ki-mo-no (Trang phục)',
            'Ka-i-mo-no (Mua sắm)'
        ],
        answer: 'Ta-be-mo-no (Đồ ăn)',
        explanation: 'た (ta) ・ べ (be) ・ も (mo) ・ の (no) đọc là たべもの (đồ ăn).'
    },

    // === TIER 2: N5 (Câu 4 - 6) ===
    {
        level: 'N5',
        skill: 'Ngữ pháp N5',
        question: 'Điền trợ từ thích hợp: 「わたしは まいにち にほんご ____ べんきょうします。」',
        options: ['を', 'に', 'で', 'へ'],
        answer: 'を',
        explanation: 'Trợ từ「を」(o) đánh dấu tân ngữ trực tiếp chịu tác động của động từ「べんきょうします」(học).'
    },
    {
        level: 'N5',
        skill: 'Kanji N5',
        question: 'Chữ Hán 「土曜日」 đọc như thế nào và là thứ mấy?',
        options: [
            'どようび (Thứ Bảy)',
            'にちようび (Chủ Nhật)',
            'きんようび (Thứ Sáu)',
            'すいようび (Thứ Tư)'
        ],
        answer: 'どようび (Thứ Bảy)',
        explanation: '土 (Thổ) + 曜日 đọc là どようび (Doyoubi), nghĩa là Thứ Bảy.'
    },
    {
        level: 'N5',
        skill: 'Chia động từ N5',
        question: 'Hoàn thành câu "Tôi muốn đi Nhật Bản": 「にほんへ ____ です。」',
        options: ['いきたい', 'いって', 'いった', 'いかない'],
        answer: 'いきたい',
        explanation: 'Động từ thể ます bỏ ます +「たい」diễn tả mong muốn làm gì (行きます → 行きたい).'
    },

    // === TIER 3: N4 (Câu 7 - 9) ===
    {
        level: 'N4',
        skill: 'Ngữ pháp N4',
        question: 'Điền cấu trúc biểu thị 2 hành động diễn ra song song: 「音楽を 聴き____ 勉強します。」',
        options: ['ながら', 'てから', 'まえに', 'あいだに'],
        answer: 'ながら',
        explanation: 'V-ます (bỏ ます) + ながら nghĩa là "vừa làm A vừa làm B cùng lúc".'
    },
    {
        level: 'N4',
        skill: 'Kanji N4',
        question: 'Chữ Hán 「案内」(Án Nội) có cách đọc và nghĩa đúng là gì?',
        options: [
            'あんない (Hướng dẫn, chỉ đường)',
            'あんぜん (An toàn, bảo vệ)',
            'しょうかい (Giới thiệu bản thân)',
            'じゅんび (Chuẩn bị trước)'
        ],
        answer: 'あんない (Hướng dẫn, chỉ đường)',
        explanation: '案内 (あんない / Annai) mang nghĩa hướng dẫn, đón tiếp hoặc chỉ đường.'
    },
    {
        level: 'N4',
        skill: 'Kính ngữ N4',
        question: 'Từ tôn kính ngữ 「召し上がります」 tương ứng với động từ thường nào?',
        options: [
            '食べます / 飲みます (Ăn / Uống)',
            '行きます / 来ます (Đi / Đến)',
            '見ます / 読みます (Xem / Đọc)',
            '言います / 話します (Nói / Kể)'
        ],
        answer: '食べます / 飲みます (Ăn / Uống)',
        explanation: '「召し上がります」(めしあがります) là Tôn kính ngữ đặc biệt của 食べます (ăn) và 飲みます (uống).'
    },

    // === TIER 4: N3 (Câu 10 - 12) ===
    {
        level: 'N3',
        skill: 'Ngữ pháp N3',
        question: 'Điền mẫu ngữ pháp đúng: 「この調査は 若者____ 行われました。」 (Khảo sát hướng đến giới trẻ)',
        options: ['に対して', 'にとって', 'につれて', 'にかわって'],
        answer: 'に対して',
        explanation: '「〜に対して」(ni taishite) mang nghĩa "đối với / hướng tới đối tượng cụ thể".'
    },
    {
        level: 'N3',
        skill: 'Kanji N3',
        question: 'Cách đọc Hiragana chuẩn của từ 「努力」 là gì?',
        options: ['どりょく', 'きょうりょく', 'のうりょく', 'しんりょく'],
        answer: 'どりょく',
        explanation: '努力 (Nỗ lực) đọc là どりょく (Doryoku), nghĩa là cố gắng hết mình.'
    },
    {
        level: 'N3',
        skill: 'Sắc thái N3',
        question: 'Câu 「嫌いなわけではないが、今は食べたくない」 sử dụng「〜わけではない」 mang sắc thái gì?',
        options: [
            'Không hẳn là ~ (phủ định một phần)',
            'Nhất định phải ~ (bắt buộc làm)',
            'Chỉ cần ~ là đủ (điều kiện tối thiểu)',
            'Thảo nào mà ~ (tán thành lý do)'
        ],
        answer: 'Không hẳn là ~ (phủ định một phần)',
        explanation: '「〜わけではない」 dùng để phủ định một phần nhận định: "không hẳn là ghét, chỉ là lúc này không muốn ăn".'
    },

    // === TIER 5: N2 (Câu 13 - 15) ===
    {
        level: 'N2',
        skill: 'Ngữ pháp N2',
        question: 'Chọn ngữ pháp mang nghĩa "dù có làm cũng vô ích": 「今から急いだ____、終電には間に合わない。」',
        options: ['ところで', 'ばかりに', 'ものの', 'わりに'],
        answer: 'ところで',
        explanation: '「V-た + ところで」 nhấn mạnh dù có làm X đi nữa thì kết quả cũng không thay đổi theo chiều hướng tích cực.'
    },
    {
        level: 'N2',
        skill: 'Kanji N2',
        question: 'Cách đọc và ý nghĩa chính xác của chữ 「把握」(Bá Ác) là gì?',
        options: [
            'はあく (Nắm bắt, hiểu rõ tình hình)',
            'はかい (Phá hủy, tàn phá)',
            'ひはん (Phê phán, chỉ trích)',
            'ほご (Bảo hộ, che chở)'
        ],
        answer: 'はあく (Nắm bắt, hiểu rõ tình hình)',
        explanation: '把握 đọc là はあく (Haaku), thường dùng trong công việc với nghĩa nắm bắt thông tin/tình huống.'
    },
    {
        level: 'N2',
        skill: 'Sắc thái N2',
        question: 'Cấu trúc 「〜てたまらない」(VD: 帰りたくてたまらない) diễn đạt trạng thái nào?',
        options: [
            'Rất ~ đến mức không kìm nén nổi',
            'Cố tránh làm ~ kẻo gây rắc rối',
            'Không còn lựa chọn nào khác ngoài ~',
            'Tỏ vẻ như đang ~ trước mặt người khác'
        ],
        answer: 'Rất ~ đến mức không kìm nén nổi',
        explanation: '「〜てたまらない」 diễn tả cảm xúc/trạng thái dâng trào cực độ, không thể chịu đựng hay kìm lại được.'
    },

    // === TIER 6: N1 (Câu 16 - 18) ===
    {
        level: 'N1',
        skill: 'Ngữ pháp N1',
        question: 'Điền biểu hiện văn viết trang trọng: 「台風の接近により、イベントは中止____。」 (Buộc phải hủy)',
        options: [
            'を余儀なくされた',
            'を禁じ得なかった',
            'に耐えなかった',
            'にとどまらなかった'
        ],
        answer: 'を余儀なくされた',
        explanation: '「〜を余儀なくされる」 là cấu trúc N1 mang nghĩa "bất đắc dĩ bị buộc phải chấp nhận/làm điều không mong muốn".'
    },
    {
        level: 'N1',
        skill: 'Từ vựng N1',
        question: 'Từ Hán 「網羅」(Võng La) có cách đọc và nghĩa chuẩn là gì?',
        options: [
            'もうら (Bao quát, tổng hợp đầy đủ)',
            'もうまい (Mơ hồ, u tối)',
            'めんみつ (Tỉ mỉ, chi tiết)',
            'もうれつ (Mãnh liệt, dữ dội)'
        ],
        answer: 'もうら (Bao quát, tổng hợp đầy đủ)',
        explanation: '網羅 (もうら / Moura) nghĩa là bao quát, thu thập đầy đủ không bỏ sót yếu tố nào.'
    },
    {
        level: 'N1',
        skill: 'Sắc thái N1',
        question: 'Ý nghĩa cốt lõi của mẫu 「〜んばかりに」 (VD: 泣き出さんばかりに) là gì?',
        options: [
            'Như thể sắp ~ (trạng thái cảm xúc chạm ngưỡng cực điểm)',
            'Không thể ~ (phủ định hoàn toàn năng lực trong quá khứ)',
            'Cấm không được ~ (quy định trang trọng trên văn bản)',
            'Rốt cuộc vẫn ~ (kết quả trái ngược hoàn toàn kỳ vọng)'
        ],
        answer: 'Như thể sắp ~ (trạng thái cảm xúc chạm ngưỡng cực điểm)',
        explanation: '「V(ない) + んばかりに」 (N1) miêu tả vẻ mặt/hành động đạt đến mức cực điểm như thể sắp làm gì ngay lập tức.'
    }
];

export const PLACEMENT_QUESTIONS_EN = [
    {
        question: 'Từ "Apple" có nghĩa là quả gì?',
        options: ['Quả táo', 'Quả cam', 'Quả chuối', 'Quả xoài'],
        answer: 'Quả táo',
        explanation: 'Apple nghĩa là quả táo.'
    },
    {
        question: 'Chọn câu chào buổi sáng chuẩn xác:',
        options: ['Good night', 'Good morning', 'Good afternoon', 'Good bye'],
        answer: 'Good morning',
        explanation: '"Good morning" là lời chào buổi sáng phổ biến nhất.'
    },
    {
        question: 'Điền từ thích hợp: "She ____ a brilliant doctor."',
        options: ['are', 'am', 'is', 'be'],
        answer: 'is',
        explanation: 'Chủ ngữ ngôi thứ 3 số ít "She" đi với to-be "is".'
    },
    {
        question: 'Từ nào đồng nghĩa với "Happy"?',
        options: ['Sad', 'Angry', 'Joyful', 'Tired'],
        answer: 'Joyful',
        explanation: 'Joyful nghĩa là vui mừng, hạnh phúc, đồng nghĩa với Happy.'
    },
    {
        question: '"I have lived here for 5 years" thuộc thì nào?',
        options: ['Quá khứ đơn', 'Hiện tại hoàn thành', 'Tương lai đơn', 'Hiện tại tiếp diễn'],
        answer: 'Hiện tại hoàn thành',
        explanation: 'Have + V3/ed diễn tả hành động bắt đầu trong quá khứ và vẫn tiếp diễn tới hiện tại.'
    }
];

