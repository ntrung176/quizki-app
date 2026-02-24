// --- Cấu hình Từ Loại (POS) & Màu Sắc ---
export const POS_TYPES = {
    noun: { label: 'Danh từ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ', color: 'bg-red-100 text-red-700 border-red-200' },
    suru_verb: { label: 'Danh động từ', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    'adj-i': { label: 'Tính từ -い', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'adj-na': { label: 'Tính từ -な', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    adverb: { label: 'Trạng từ', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    conjunction: { label: 'Liên từ', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    particle: { label: 'Trợ từ', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    grammar: { label: 'Ngữ pháp', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    phrase: { label: 'Cụm từ', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

// Alias map: AI có thể trả về dạng khác (adj_i thay vì adj-i)
const POS_ALIASES = {
    'adj_i': 'adj-i',
    'adj_na': 'adj-na',
    'adj-na': 'adj-na',
    'adj-i': 'adj-i',
};

// Chuẩn hóa pos key từ AI output
export const normalizePosKey = (posKey) => {
    if (!posKey) return '';
    return POS_ALIASES[posKey] || posKey;
};

// --- Cấu hình Cấp độ JLPT & Chỉ tiêu (Ước lượng) ---
export const JLPT_LEVELS = [
    { value: 'N5', label: 'N5', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', target: 800, kanjiTarget: 80 },
    { value: 'N4', label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200', target: 1500, kanjiTarget: 170 },
    { value: 'N3', label: 'N3', color: 'bg-blue-100 text-blue-700 border-blue-200', target: 3000, kanjiTarget: 370 },
    { value: 'N2', label: 'N2', color: 'bg-violet-100 text-violet-700 border-violet-200', target: 6000, kanjiTarget: 620 },
    { value: 'N1', label: 'N1', color: 'bg-rose-100 text-rose-700 border-rose-200', target: 10000, kanjiTarget: 1000 }
];

// --- Cấu hình SRS Dynamic Multiplier (Tính bằng phút) ---
// Learning phase: các bước cố định để nạp trí nhớ ngắn hạn
// Graduated phase: interval = lastInterval × easeFactor (tăng trưởng luỹ kế)
export const SRS_INTERVALS = [
    10,     // Index 0: 10 phút (Bước học 1 - Learning)
    1440,   // Index 1: 1 ngày = 1440 phút (Bước học 2 - Learning)
    4320,   // Index 2: 3 ngày (Legacy - giờ dùng GRADUATION_INTERVAL)
    10080,  // Index 3: 7 ngày (Legacy - giờ dùng Dynamic Multiplier)
    43200,  // Index 4: 30 ngày (Legacy)
    129600  // Index 5: 90 ngày (Legacy)
];

// Interval đầu tiên sau khi tốt nghiệp learning phase (3 ngày)
export const GRADUATION_INTERVAL = 4320; // 3 ngày = 4320 phút

// Ngưỡng "Đã thuộc" (Mastered) - dựa trên actual interval, không phải index
export const MASTERED_THRESHOLD = 43200; // 30 ngày = 43200 phút

// Interval tối đa (365 ngày)
export const MAX_INTERVAL = 525600; // 365 ngày = 525600 phút

// Helper functions
export const getPosLabel = (posKey) => POS_TYPES[posKey]?.label || posKey;
export const getPosColor = (posKey) => POS_TYPES[posKey]?.color || 'bg-gray-100 text-gray-700 border-gray-200';

export const getLevelColor = (levelValue) => {
    const level = JLPT_LEVELS.find(l => l.value === levelValue);
    return level ? level.color : 'bg-gray-100 text-gray-700 border-gray-200';
};

// Format interval phút sang text đọc được
export const formatIntervalMinutes = (minutes) => {
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
    if (minutes < 43200) return `${Math.round(minutes / 1440)} ngày`;
    return `${Math.round(minutes / 43200)} tháng`;
};

// Danh sách hậu tố ngữ pháp cho động từ (ưu tiên từ dài đến ngắn)
export const GRAMMAR_SUFFIXES = [
    // Nhóm Thể Bị động & Sai khiến (Phức tạp nhất)
    'させられて', 'させられた', 'させられる', 'させて', 'させた', 'させる',
    'られて', 'られた', 'られる',
    // Nhóm Thể Lịch sự & Phủ định
    'ませんでした', 'ませんが', 'ません', 'ました', 'ます',
    'なかった', 'なければ', 'ないで', 'なくて', 'ない',
    // Nhóm Thể Te & Ta
    'ていた', 'ている', 'てきた', 'ていて', 'ていく', 'てから', 'ても', 'てみる', 'ておく', 'ておる', 'てあげる', 'てもらう', 'てくれる',
    'って', 'んで', 'いて', 'して', 'て', 'った', 'んだ', 'いた', 'した', 'た', 'だ',
    // Nhóm Thể Khả năng & Ý chí
    'ことができる', 'られた', 'られ', 'れる', 'よう', 'える', 'おう',
    // Nhóm Thể Giả định
    'ければ', 'なら', 'たら', 'れば', 'えば', 'けば', 'ば',
    // Nhóm Thể Điều kiện & Khác
    'はず', 'べき', 'そう', 'らしい', 'ようだ', 'みたい', 'っぽい',
    // Nhóm Bổ nghĩa
    'く', 'に', 'の', 'が', 'を', 'は'
];

// Danh sách trợ từ để dừng khi không tìm thấy hậu tố
export const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'から', 'まで', 'より', 'の', 'も', 'か', 'ね', 'よ', '。', '、', '！', '？'];

// Types cho Dark Mode
export const DARK_MODE_KEY = 'quizki-dark-mode';
