// --- Cấu hình Từ Loại (POS) & Màu Sắc ---
export const POS_TYPES = {
    noun: { label: 'Danh từ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ', color: 'bg-red-100 text-red-700 border-red-200' },
    'adj-i': { label: 'Tính từ -い', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'adj-na': { label: 'Tính từ -な', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    adverb: { label: 'Trạng từ', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    conjunction: { label: 'Liên từ', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    particle: { label: 'Trợ từ', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    phrase: { label: 'Cụm từ', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

// --- Cấu hình Cấp độ JLPT & Chỉ tiêu (Ước lượng) ---
export const JLPT_LEVELS = [
    { value: 'N5', label: 'N5', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', target: 800 },
    { value: 'N4', label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200', target: 1500 },
    { value: 'N3', label: 'N3', color: 'bg-blue-100 text-blue-700 border-blue-200', target: 3000 },
    { value: 'N2', label: 'N2', color: 'bg-violet-100 text-violet-700 border-violet-200', target: 6000 },
    { value: 'N1', label: 'N1', color: 'bg-rose-100 text-rose-700 border-rose-200', target: 10000 }
];

// --- Cấu hình SRS (Tính bằng ngày) ---
export const SRS_INTERVALS = [
    1, // Index 0: Sau 1 ngày (Cấp độ 1)
    3, // Index 1: Sau 3 ngày (Cấp độ 2)
    7, // Index 2: Sau 7 ngày (Cấp độ 3) -> Đủ điều kiện Flashcard
    30, // Index 3: Sau 30 ngày (Cấp độ 4)
    90 // Index 4: Sau 90 ngày (Cấp độ 5)
];

// Helper functions
export const getPosLabel = (posKey) => POS_TYPES[posKey]?.label || posKey;
export const getPosColor = (posKey) => POS_TYPES[posKey]?.color || 'bg-gray-100 text-gray-700 border-gray-200';

export const getLevelColor = (levelValue) => {
    const level = JLPT_LEVELS.find(l => l.value === levelValue);
    return level ? level.color : 'bg-gray-100 text-gray-700 border-gray-200';
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
