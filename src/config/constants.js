// --- Cấu hình Từ Loại (POS) & Màu Sắc ---
export const POS_TYPES = {
    noun: { label: 'Danh từ', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ', color: 'bg-red-100 text-red-700 border-red-200' },
    suru_verb: { label: 'Danh động từ', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    'adj-i': { label: 'Tính từ -い', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'adj-na': { label: 'Tính từ -な', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    'noun/adj-na': { label: 'Danh từ / Tính từ -な', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    adverb: { label: 'Trạng từ', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    conjunction: { label: 'Liên từ', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    particle: { label: 'Trợ từ', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    grammar: { label: 'Ngữ pháp', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    phrase: { label: 'Cụm từ', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

export const ENGLISH_POS_TYPES = {
    noun: { label: 'Danh từ (n.)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ (v.)', color: 'bg-red-100 text-red-700 border-red-200' },
    adjective: { label: 'Tính từ (adj.)', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    adverb: { label: 'Trạng từ (adv.)', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    preposition: { label: 'Giới từ (prep.)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    conjunction: { label: 'Liên từ (conj.)', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    pronoun: { label: 'Đại từ (pron.)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    phrasal_verb: { label: 'Cụm động từ (Phrasal Verb)', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    idiom: { label: 'Thành ngữ / Quán ngữ (Idiom)', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

// Alias map: AI có thể trả về dạng khác
const POS_ALIASES = {
    'noun': 'noun',
    'verb': 'verb',
    'suru_verb': 'suru_verb',
    'suru-verb': 'suru_verb',
    'suru verb': 'suru_verb',
    'noun/verb': 'suru_verb',
    'noun-verb': 'suru_verb',
    'noun_verb': 'suru_verb',
    'verbal noun': 'suru_verb',
    'verbal_noun': 'suru_verb',
    'noun/suru_verb': 'suru_verb',
    'noun/suru-verb': 'suru_verb',
    'noun/verb/suru_verb': 'suru_verb',
    'noun, verb': 'suru_verb',
    'noun or verb': 'suru_verb',
    'danh động từ': 'suru_verb',
    'danh dong tu': 'suru_verb',
    'adj_i': 'adj-i',
    'adj-i': 'adj-i',
    'adjective-i': 'adj-i',
    'adj_na': 'adj-na',
    'adj-na': 'adj-na',
    'adjective-na': 'adj-na',
    'noun/adj-na': 'noun/adj-na',
    'noun/adj_na': 'noun/adj-na',
    'noun-adj-na': 'noun/adj-na',
    'noun_adj-na': 'noun/adj-na',
    'nound/adj-na': 'noun/adj-na',
    'noun/adjective-na': 'noun/adj-na',
    'noun, adj-na': 'noun/adj-na',
    'adjective': 'adj-i',
    'adverb': 'adverb',
    'conjunction': 'conjunction',
    'particle': 'particle',
    'grammar': 'grammar',
    'phrase': 'phrase',
    'pronoun': 'noun',
    'other': 'other'
};

// Chuẩn hóa pos key từ AI output
export const normalizePosKey = (posKey) => {
    if (!posKey) return '';
    const cleanKey = posKey.trim().toLowerCase();
    return POS_ALIASES[cleanKey] || cleanKey;
};

// --- Cấu hình Cấp độ JLPT & Chỉ tiêu (Ước lượng) ---
export const JLPT_LEVELS = [
    { value: 'N5', label: 'N5', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', target: 800, kanjiTarget: 80 },
    { value: 'N4', label: 'N4', color: 'bg-teal-100 text-teal-700 border-teal-200', target: 1500, kanjiTarget: 170 },
    { value: 'N3', label: 'N3', color: 'bg-blue-100 text-blue-700 border-blue-200', target: 3000, kanjiTarget: 370 },
    { value: 'N2', label: 'N2', color: 'bg-sky-100 text-sky-700 border-sky-200', target: 6000, kanjiTarget: 620 },
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

export const getPosLabel = (posKey) => {
    if (!posKey) return '';
    const cleanKey = posKey.trim().toLowerCase();
    
    // Bản dịch trực tiếp cho các từ loại tiếng Anh
    const dict = {
        'noun': 'Danh từ',
        'verb': 'Động từ',
        'suru_verb': 'Danh động từ',
        'suru-verb': 'Danh động từ',
        'suru verb': 'Danh động từ',
        'noun/verb': 'Danh động từ',
        'noun-verb': 'Danh động từ',
        'noun_verb': 'Danh động từ',
        'verbal noun': 'Danh động từ',
        'verbal_noun': 'Danh động từ',
        'noun/suru_verb': 'Danh động từ',
        'noun/suru-verb': 'Danh động từ',
        'noun/verb/suru_verb': 'Danh động từ',
        'noun, verb': 'Danh động từ',
        'noun or verb': 'Danh động từ',
        'adj-i': 'Tính từ -い',
        'adj_i': 'Tính từ -い',
        'i-adjective': 'Tính từ -い',
        'adjective-i': 'Tính từ -い',
        'adjective_i': 'Tính từ -い',
        'adj-na': 'Tính từ -な',
        'adj_na': 'Tính từ -な',
        'na-adjective': 'Tính từ -な',
        'adjective-na': 'Tính từ -な',
        'adjective_na': 'Tính từ -な',
        'noun/adj-na': 'Danh từ / Tính từ -な',
        'nound/adj-na': 'Danh từ / Tính từ -な',
        'noun/adj_na': 'Danh từ / Tính từ -な',
        'noun-adj-na': 'Danh từ / Tính từ -な',
        'noun_adj-na': 'Danh từ / Tính từ -な',
        'noun, adj-na': 'Danh từ / Tính từ -な',
        'noun/adjective-na': 'Danh từ / Tính từ -な',
        'adjective': 'Tính từ',
        'adverb': 'Trạng từ',
        'conjunction': 'Liên từ',
        'particle': 'Trợ từ',
        'grammar': 'Ngữ pháp',
        'phrase': 'Cụm từ',
        'expression': 'Cụm từ',
        'pronoun': 'Đại từ',
        'preposition': 'Giới từ',
        'interjection': 'Thán từ',
        'prefix': 'Tiền tố',
        'suffix': 'Hậu tố',
        'counter': 'Lượng từ / Từ đếm',
        'numeral': 'Số từ',
        'copula': 'Hệ từ (Copula)',
        'auxiliary-verb': 'Trợ động từ',
        'auxiliary verb': 'Trợ động từ',
        'auxiliary_verb': 'Trợ động từ',
        'auxiliary': 'Trợ động từ',
        'transitive-verb': 'Tha động từ',
        'transitive verb': 'Tha động từ',
        'transitive_verb': 'Tha động từ',
        'intransitive-verb': 'Tự động từ',
        'intransitive verb': 'Tự động từ',
        'intransitive_verb': 'Tự động từ',
        'transitive': 'Tha động từ',
        'intransitive': 'Tự động từ',
        'verb-group-1': 'Động từ nhóm 1',
        'verb-group-2': 'Động từ nhóm 2',
        'verb-group-3': 'Động từ nhóm 3',
        'v1': 'Động từ nhóm 2 (Ichidan)',
        'v5': 'Động từ nhóm 1 (Godan)',
        'vs': 'Danh động từ (Suru)',
        'vk': 'Động từ Kuru',
        'other': 'Khác'
    };
    
    if (dict[cleanKey]) return dict[cleanKey];
    
    const normalized = normalizePosKey(posKey);
    if (POS_TYPES[normalized]) return POS_TYPES[normalized].label;
    
    const matched = Object.keys(POS_TYPES).find(k => k.toLowerCase() === cleanKey);
    if (matched) return POS_TYPES[matched].label;
    
    return posKey;
};
export const getPosColor = (posKey) => {
    if (!posKey) return 'bg-gray-100 text-gray-700 border-gray-200';
    const normalized = normalizePosKey(posKey);
    return POS_TYPES[normalized]?.color || 'bg-gray-100 text-gray-700 border-gray-200';
};

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
const DARK_MODE_KEY = 'quizki-dark-mode';
