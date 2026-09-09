// Levels definition
export const KAIWA_LEVELS = [
    { id: 'all', label: 'Tất cả cấp độ' },
    { id: 'N5', label: 'N5 - Nhập môn', color: 'bg-emerald-500 text-white' },
    { id: 'N4', label: 'N4 - Sơ cấp', color: 'bg-cyan-500 text-white' },
    { id: 'N3', label: 'N3 - Trung cấp', color: 'bg-indigo-500 text-white' },
    { id: 'N2', label: 'N2 - Thượng cấp', color: 'bg-purple-500 text-white' },
    { id: 'N1', label: 'N1 - Cao cấp', color: 'bg-rose-500 text-white' },
];

// Categories definition
export const KAIWA_CATEGORIES = [
    { id: 'all', label: 'Tất cả chủ đề', icon: 'Sparkles' },
    { id: 'kaigo', label: '🏥 Kaigo (Điều dưỡng/Hộ lý)', icon: 'HeartPulse' },
    { id: 'daily', label: '🍱 Đời sống thường nhật', icon: 'Coffee' },
    { id: 'business', label: '💼 Công sở & Thương mại', icon: 'Briefcase' },
    { id: 'interview', label: '🏢 Phỏng vấn Arubaito / Việc làm', icon: 'UserCheck' },
    { id: 'anime', label: '🍿 Anime & Phim ngắn', icon: 'Film' },
    { id: 'news', label: '📰 Tin tức NHK & Văn hóa', icon: 'Newspaper' },
];

// Seed Video Data - Empty by default (loaded dynamically from Firestore/Admin)
export const SEED_KAIWA_VIDEOS = [];

