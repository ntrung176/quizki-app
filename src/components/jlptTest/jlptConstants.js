import { Languages, BookOpen, Award, FileText, Headphones } from 'lucide-react';

export const SECTION_ICONS = {
    vocabulary: Languages,
    grammar: BookOpen,
    kanji: Award,
    reading: FileText,
    listening: Headphones,
};

export const SECTION_COLORS = {
    vocabulary: 'blue',
    grammar: 'sky',
    kanji: 'teal',
    reading: 'green',
    listening: 'orange',
};

export const LEVEL_GRADIENTS = {
    N5: 'from-emerald-500 to-teal-600',
    N4: 'from-teal-500 to-cyan-600',
    N3: 'from-blue-500 to-indigo-600',
    N2: 'from-sky-500 to-blue-600',
    N1: 'from-rose-500 to-red-600',
};

export const WEEK_GROUPS = [
    { label: "Tuần 1-2", range: [1, 10], theme: "Từ vựng & Hán tự cơ bản" },
    { label: "Tuần 3-4", range: [11, 20], theme: "Ngữ pháp & Từ vựng nâng cao" },
    { label: "Tuần 5-6", range: [21, 30], theme: "Kỹ năng Đọc & Nghe hiểu" },
    { label: "Tuần 7-8", range: [31, 40], theme: "Luyện chuyên sâu đề ngắn" },
    { label: "Tuần 9-10", range: [41, 50], theme: "Đọc hiểu & Nghe hiểu tổng hợp" },
    { label: "Tuần 11-12", range: [51, 60], theme: "Giải đề Mock Exam trọn bộ" }
];

export const ROADMAP_TASKS = {
    vocabulary: { title: "Từ vựng & Hán tự", desc: "Học 20 từ vựng mới & ôn tập Hán tự theo chủ đề." },
    grammar: { title: "Ngữ pháp trọng tâm", desc: "Luyện 3 mẫu cấu trúc ngữ pháp phổ biến và đặt câu." },
    reading: { title: "Kỹ năng Đọc hiểu", desc: "Luyện 1 bài đọc ngắn, phân tích ngữ pháp cấu trúc câu." },
    listening: { title: "Kỹ năng Nghe hiểu", desc: "Nghe hội thoại ngắn 10 phút và trả lời câu hỏi." },
    practice: { title: "Luyện đề thi thử", desc: "Làm 1 bài thi mini test kiểm tra năng lực tổng quát." }
};
