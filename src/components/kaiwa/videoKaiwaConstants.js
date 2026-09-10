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
    { id: 'all', label: 'Tất cả chủ đề', title: 'Tất cả chủ đề', titleGradient: 'from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] dark:from-[#00d2ff] dark:via-[#70bbfd] dark:to-[#bfdbfe]', badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
    { id: 'kaigo', label: 'Kaigo (Điều dưỡng & Chăm sóc)', title: 'Kaigo (Điều dưỡng & Chăm sóc)', subtitle: 'Giao tiếp chăm sóc y tế, người cao tuổi & nghiệp vụ hộ lý', titleGradient: 'from-[#e11d48] via-[#f43f5e] to-[#fb7185]', badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    { id: 'daily', label: 'Đời sống thường nhật & Giao tiếp', title: 'Đời sống thường nhật & Giao tiếp', subtitle: 'Hội thoại thường ngày, đi siêu thị, mua sắm, kết bạn', titleGradient: 'from-[#059669] via-[#10b981] to-[#34d399]', badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { id: 'business', label: 'Công sở & Thương mại (Keigo)', title: 'Công sở & Thương mại (Keigo)', subtitle: 'Kính ngữ Keigo, email, họp đối tác và tác phong công ty Nhật', titleGradient: 'from-[#4f46e5] via-[#6366f1] to-[#818cf8]', badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
    { id: 'interview', label: 'Phỏng vấn Arubaito & Việc làm', title: 'Phỏng vấn Arubaito & Việc làm', subtitle: 'Kỹ năng trả lời phỏng vấn, giới thiệu bản thân, xin việc', titleGradient: 'from-[#0891b2] via-[#06b6d4] to-[#22d3ee]', badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
    { id: 'news', label: 'Tin tức Thời sự & Văn hóa', title: 'Tin tức Thời sự & Văn hóa', subtitle: 'Phóng sự NHK, thời sự xã hội và trải nghiệm văn hóa Nhật', titleGradient: 'from-[#7c3aed] via-[#9333ea] to-[#c084fc]', badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    { id: 'anime', label: 'Anime & Phim ngắn', title: 'Anime & Phim ngắn', subtitle: 'Luyện nghe ngữ điệu tự nhiên, khẩu ngữ đời thực và giải trí', titleGradient: 'from-[#db2777] via-[#ec4899] to-[#f472b6]', badgeColor: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
];

// Seed Video Data - Empty by default (loaded dynamically from Firestore/Admin)
export const SEED_KAIWA_VIDEOS = [];

