/**
 * Onboarding Survey Data & Question Definitions (Duolingo Style)
 */

export const ONBOARDING_LANGUAGES = [
    {
        id: 'ja',
        code: 'jp',
        title: 'Tiếng Nhật',
        sub: '46 âm Kana, 2,136 Kanji & Luyện thi JLPT N5 - N1',
        tag: 'Được yêu thích nhất ⭐',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
        id: 'en',
        code: 'gb',
        title: 'Tiếng Anh',
        sub: '3,000+ từ vựng Oxford, phản xạ Kaiwa & IELTS/TOEIC',
        tag: 'Phổ biến toàn cầu',
        tagColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
    },
    {
        id: 'ko',
        code: 'kr',
        title: 'Tiếng Hàn',
        sub: 'Bảng chữ cái Hangul, giao tiếp K-Drama & TOPIK I - II',
        tag: 'Xu hướng giới trẻ',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
        sub: 'Làm quen từ bảng chữ cái, quy tắc phát âm và các từ vựng chào hỏi nền tảng nhất.'
    },
    {
        id: 'test',
        icon: '🧭',
        title: 'Làm bài kiểm tra đánh giá trình độ (Placement Test)',
        sub: 'Bài test 14 câu hỏi trải đều từ N5 đến N3 để xác định chính xác lộ trình xuất phát của bạn.'
    }
];

export const PLACEMENT_QUESTIONS_JA = [
    // === N5 Level (Câu 1 - 4) ===
    {
        level: 'N5',
        question: 'Từ「ありがとう」(Arigatou) trong tiếng Nhật có nghĩa là gì?',
        options: ['Xin chào', 'Cảm ơn', 'Tạm biệt', 'Xin lỗi'],
        answer: 'Cảm ơn',
        explanation: '「ありがとう」(Arigatou) là lời cảm ơn thông dụng nhất trong tiếng Nhật.'
    },
    {
        level: 'N5',
        question: 'Chữ Hán「水」(Thủy) mang ý nghĩa gì?',
        options: ['Lửa', 'Nước uống', 'Cây cối', 'Mặt đất'],
        answer: 'Nước uống',
        explanation: 'Chữ 水 (Thủy) đọc là「みず」(Mizu), có nghĩa là nước uống.'
    },
    {
        level: 'N5',
        question: 'Điền trợ từ thích hợp:「ごはん ____ 食べます。」(Ăn cơm)',
        options: ['を', 'に', 'で', 'は'],
        answer: 'を',
        explanation: 'Trợ từ「を」(đọc là o) đứng sau danh từ tân ngữ chịu tác động của hành động.'
    },
    {
        level: 'N5',
        question: 'Cấu trúc「〜たい」(V-tai, ví dụ: 行きたい) diễn tả điều gì?',
        options: ['Mong muốn làm gì', 'Cấm chỉ làm gì', 'Khuyên nên làm gì', 'Đang làm gì'],
        answer: 'Mong muốn làm gì',
        explanation: 'Động từ thể ます bỏ ます + たい dùng để bày tỏ mong muốn của người nói.'
    },

    // === N4 Level (Câu 5 - 8) ===
    {
        level: 'N4',
        question: 'Câu「日本語が話せます」(Hanasemasu) có ý nghĩa là gì?',
        options: ['Đang nói tiếng Nhật', 'Có thể nói tiếng Nhật', 'Thích nói tiếng Nhật', 'Sẽ học tiếng Nhật'],
        answer: 'Có thể nói tiếng Nhật',
        explanation: '話せます là thể Khả năng (Potential form) của động từ 話します (Hanasu).'
    },
    {
        level: 'N4',
        question: 'Điền đuôi liên kết hai hành động đồng thời:「音楽を聴き ____ 勉強します。」',
        options: ['ながら', 'てから', 'まえに', 'ので'],
        answer: 'ながら',
        explanation: 'V-masu (bỏ masu) + ながら biểu thị vừa làm việc này vừa làm việc kia.'
    },
    {
        level: 'N4',
        question: 'Chữ Hán「案内」(Án Nội) có ý nghĩa là gì?',
        options: ['Hướng dẫn / Giới thiệu', 'Nguy hiểm', 'Bệnh viện', 'Sân bay'],
        answer: 'Hướng dẫn / Giới thiệu',
        explanation: '案内 (あんない / Annai) có nghĩa là hướng dẫn, chỉ đường hoặc giới thiệu.'
    },
    {
        level: 'N4',
        question: 'Từ「召し上がります」(Meshiagarimasu) là kính ngữ (Sonkeigo) của từ nào?',
        options: ['行きます (Đi)', '食べます / 飲みます (Ăn / Uống)', '見ます (Xem)', '言います (Nói)'],
        answer: '食べます / 飲みます (Ăn / Uống)',
        explanation: '召し上がります là kính ngữ tôn kính của 食べます (Ăn) và 飲みます (Uống).'
    },

    // === N3 Level (Câu 9 - 14) ===
    {
        level: 'N3',
        question: 'Mẫu câu「〜わけではない」(Wake dewa nai) diễn đạt điều gì?',
        options: ['Không hẳn là / Không có nghĩa là...', 'Nhất định phải làm...', 'Tuyệt đối không thể...', 'Đang chuẩn bị làm...'],
        answer: 'Không hẳn là / Không có nghĩa là...',
        explanation: '〜わけではない dùng để phủ định một phần: "không hẳn là...", "không có nghĩa là...".'
    },
    {
        level: 'N3',
        question: 'Điền mẫu câu thích hợp:「若者 ____ アンケートを行いました。」(Khảo sát đối với giới trẻ)',
        options: ['に対して', 'にとって', 'を通じて', 'にかぎって'],
        answer: 'に対して',
        explanation: '〜に対して (Ni taishite) có nghĩa là "đối với / hướng đến một đối tượng cụ thể".'
    },
    {
        level: 'N3',
        question: 'Chữ Hán「努力」(Nỗ Lực) có cách đọc Hiragana chuẩn là gì?',
        options: ['どりょく (Doryoku)', 'きょうりょく (Kyouryoku)', 'のうりょく (Nouryoku)', 'しんりょく (Shinryoku)'],
        answer: 'どりょく (Doryoku)',
        explanation: '努力 đọc là どりょく (Doryoku), mang ý nghĩa là nỗ lực, cố gắng hết mình.'
    },
    {
        level: 'N3',
        question: 'Điền phó từ biểu thị "quên sạch sành sanh":「約束を ____ 忘れてしまった。」',
        options: ['すっかり', 'ぎっしり', 'ぴったり', 'ゆっくり'],
        answer: 'すっかり',
        explanation: 'すっかり (Sukkari) diễn tả trạng thái hoàn toàn, triệt để (quên bẵng đi, khỏi hẳn).'
    },
    {
        level: 'N3',
        question: 'Mẫu ngữ pháp「〜ようにする」(You ni suru) mang ý nghĩa nào?',
        options: ['Cố gắng tạo thói quen làm gì', 'Vừa mới làm xong điều gì', 'Bị bắt buộc phải làm', 'Đã được quyết định từ trước'],
        answer: 'Cố gắng tạo thói quen làm gì',
        explanation: 'V-ru / V-nai + ようにする biểu đạt sự nỗ lực duy trì một thói quen tích cực.'
    },
    {
        level: 'N3',
        question: 'Cụm quán dụng từ「気に入る」(Ki ni iru) có nghĩa là gì?',
        options: ['Yêu thích / Ưng ý', 'Bận tâm / Lo lắng', 'Phát hiện / Nhận ra', 'Tức giận'],
        answer: 'Yêu thích / Ưng ý',
        explanation: '「気に入る」(Ki ni iru) nghĩa là cảm thấy ưng ý, vừa lòng hoặc yêu thích thứ gì đó.'
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

