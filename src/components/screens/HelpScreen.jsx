import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    HelpCircle, Brain, Target, ArrowLeft, BookOpen,
    Languages, FileCheck, MessageSquare, Timer,
    Sparkles, PenTool, Flame, RefreshCw, MousePointer, Search,
    Loader2, CheckCircle2, Lightbulb, Shield, Globe
} from 'lucide-react';
import { ROUTES } from '../../router';

const HelpScreen = ({ isFirstTime, onConfirmFirstTime }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('ALL');
    const [searchFilter, setSearchFilter] = useState('');

    const handleClick = async () => {
        setIsLoading(true);
        if (onConfirmFirstTime) await onConfirmFirstTime();
    };

    const sections = [
        { id: 'ALL', label: '📌 Tất cả cẩm nang', icon: HelpCircle },
        { id: 'STEPS', label: '🚀 Các bước thao tác nhanh', icon: MousePointer },
        { id: 'SRS', label: '🧠 Thuật toán SRS & Thẻ Khó', icon: Brain },
        { id: 'HOME', label: '🏠 1. Trang Chủ', icon: Target },
        { id: 'VOCAB', label: '📖 2. Bộ Từ Vựng', icon: BookOpen },
        { id: 'KANJI', label: '🈁 3. Thư Viện Kanji', icon: Languages },
        { id: 'GRAMMAR', label: '🔄 4. Ngữ Pháp', icon: RefreshCw },
        { id: 'JLPT', label: '📄 5. Luyện Đề JLPT', icon: FileCheck },
        { id: 'KAIWA', label: '💬 6. Kaiwa AI', icon: MessageSquare },
        { id: 'TOOLS', label: '⏱️ 7. Đồng Hồ Focus & Tiện Ích', icon: Timer },
    ];

    // Structured Module Data for Responsive Cards
    const moduleGuides = useMemo(() => [
        {
            moduleId: 'HOME',
            moduleIcon: '🏠',
            moduleTitle: '1. Màn Hình Trang Chủ (Home Screen)',
            moduleSubtitle: 'Bảng điều khiển tổng quan, chỉ số tiến độ và phím tắt ôn tập',
            themeColor: 'cyan',
            items: [
                {
                    title: 'Profile Capsule & XP Level',
                    tag: 'Cá nhân & Cài đặt',
                    color: 'cyan',
                    desc: 'Hiển thị Avatar, Tên người dùng, Cấp độ LV (Level) và Huy hiệu Premium. Click vào capsule này sẽ mở Menu Profile nhanh chứa Cài Đặt và Đăng Xuất.',
                    tip: 'Mỗi bài học hoàn thành sẽ cộng XP giúp tăng Level.',
                },
                {
                    title: 'Thanh Chỉ Số SRS (Due Cards)',
                    tag: 'Nhắc nhở ôn tập',
                    color: 'purple',
                    desc: 'Tự động đếm tổng số thẻ Từ vựng, Kanji, Ngữ pháp đã đến hạn phải ôn trong ngày. Bấm nút "Bắt đầu ôn" để vào thẳng phòng học.',
                    tip: 'Thẻ Due cần được dọn sạch hàng ngày để giữ nhịp SRS.',
                },
                {
                    title: 'Chuỗi Học Hàng Ngày (Streak)',
                    tag: 'Giữ lửa học tập',
                    color: 'amber',
                    desc: 'Thanh điểm danh chuỗi ngày học liên tục. Tích lũy XP mỗi ngày để giữ biểu tượng ngọn lửa 🔥 hoạt động liên tục.',
                    tip: 'Bị đứt Streak nếu bỏ lỡ 1 ngày không học.',
                },
                {
                    title: 'Thanh Tra Cứu Nhanh (Global Search)',
                    tag: 'Tra cứu đa năng',
                    color: 'emerald',
                    desc: 'Ô tra cứu thông minh hỗ trợ tra tiếng Việt, Rōmaji, Hiragana, Katakana hoặc Hán tự Kanji siêu tốc.',
                    tip: 'Tự động gợi ý từ liên quan và công thức ngữ pháp.',
                },
            ],
        },
        {
            moduleId: 'VOCAB',
            moduleIcon: '📖',
            moduleTitle: '2. Quản Lý Từ Vựng, Sách Học & Chu Kỳ SRS',
            moduleSubtitle: 'Tạo bộ thẻ cá nhân, quét sách AI OCR, nhập Excel và quản lý Thẻ Khó (Leech)',
            themeColor: 'blue',
            items: [
                {
                    title: 'Tab 1: Bộ Từ Vựng (Study Sets)',
                    tag: 'Tạo & Quản lý thẻ',
                    color: 'blue',
                    desc: '• Tạo bộ thẻ mới: Tạo thư mục chứa từ vựng theo chủ đề cá nhân.\n• Trợ lý AI OCR: Chụp hoặc tải ảnh trang sách/đề thi, AI tự trích xuất Kanji, Furigana & Nghĩa chuẩn.\n• Nhập Excel/CSV hàng loạt: Dán danh sách từ dưới dạng bảng để tạo 100 từ trong 3 giây.',
                    tip: 'Lọc từ vựng theo tag JLPT (N5 - N1) vô cùng tiện lợi.',
                },
                {
                    title: 'Tab 2: Sách Học (Books)',
                    tag: 'Giáo trình chuẩn',
                    color: 'indigo',
                    desc: '• Chứa đầy đủ giáo trình chuẩn: Minna no Nihongo (50 bài), Soumatome, Mimi Kara Oboeru...\n• Nút Đồng Bộ CDN: Tải bản nén cache về máy giúp mở sách nhanh và không giật lag.\n• Tự động cuộn: Khi đổi bài học/chương, ứng dụng tự động cuộn mượt về đầu trang.',
                    tip: 'Mỗi bài học được chia nhỏ theo từ vựng, Kanji và ví dụ.',
                },
                {
                    title: 'Tab 3: Ôn Tập SRS Vocab',
                    tag: 'Phòng ôn thông minh',
                    color: 'emerald',
                    desc: '• Phòng ôn tập với Flashcard lật 3D 2 mặt kèm audio phát âm giọng đọc Tokyo.\n• Mẹo Nhớ Cá Nhân Inline: Bấm "💡 + Thêm mẹo nhớ", bấm "✨ AI Gợi ý" để AI sáng tác liên tưởng âm Hán Việt.\n• Quản Lý Thẻ Khó (Leech): Gom các từ quên ≥ 3 lần, cho phép sửa mẹo nhớ hoặc reset về chu kỳ chuẩn.',
                    tip: 'Tập trung gỡ các thẻ Leech để tăng tốc độ ghi nhớ dài hạn.',
                },
            ],
        },
        {
            moduleId: 'KANJI',
            moduleIcon: '🈁',
            moduleTitle: '3. Thư Viện Kanji & Tập Viết Nét Bút Tương Tác',
            moduleSubtitle: 'Tra cứu 2136 chữ Hán tự, tập viết trực tiếp và quản lý mẹo nhớ Kanji cá nhân',
            themeColor: 'emerald',
            items: [
                {
                    title: 'Danh Mục 2136 Hán Tự Kanji',
                    tag: 'Kho từ điển Hán Việt',
                    color: 'emerald',
                    desc: 'Tra cứu Hán tự theo Bộ Thủ (Radicals), Âm Hán Việt (NHẬT, NGUYỆT, THỦY, HỎA...), Âm Onyomi, Âm Kunyomi và danh sách từ ghép chứa chữ Kanji đó.',
                    tip: 'Phân loại chuẩn theo cấp độ từ JLPT N5 đến N1.',
                },
                {
                    title: 'Bảng Tập Viết Nét Bút (Stroke Order)',
                    tag: 'Cảm ứng & AI chấm điểm',
                    color: 'cyan',
                    desc: 'Màn hình tập viết có hình vẽ animation thứ tự từng nét. Dùng ngón tay hoặc chuột vẽ trực tiếp lên bảng cảm ứng, máy sẽ chấm điểm độ chính xác nét bút tức thì.',
                    tip: 'Tự động phát hiện lỗi sai thứ tự nét bút.',
                },
                {
                    title: 'Mẹo Nhớ Kanji Cá Nhân',
                    tag: 'Ghi chú riêng tư',
                    color: 'purple',
                    desc: 'Tự viết câu chuyện mẹo nhớ riêng cho từng chữ Kanji. Dữ liệu được lưu riêng trên tài khoản của bạn, không ảnh hưởng từ điển gốc.',
                    tip: 'Bảo mật 100% cho mỗi tài khoản người học.',
                },
            ],
        },
        {
            moduleId: 'GRAMMAR',
            moduleIcon: '🔄',
            moduleTitle: '4. Thư Viện Ngữ Pháp & Công Thức Chia Động Từ',
            moduleSubtitle: 'Tra cứu cấu trúc N5 - N1, câu ví dụ thực tế và bài tập nối câu',
            themeColor: 'purple',
            items: [
                {
                    title: 'Mã Hóa Màu Công Thức Chia Từ',
                    tag: 'Trực quan hóa công thức',
                    color: 'purple',
                    desc: 'Các công thức liên kết ngữ pháp được phân màu sắc chuẩn:\n• [V] Động từ (V-te, V-ta, V-nai, V-stem...)\n• [N] Danh từ (N + dewa, N + ni...)\n• [Adj] Tính từ (Đuôi -i / Đuôi -na)',
                    tip: 'Giúp mắt quét và nhận diện cấu trúc ngữ pháp chỉ trong 0.5s.',
                },
                {
                    title: 'Highlight Mẫu Trong Câu Ví Dụ',
                    tag: 'Ngữ cảnh thực tế',
                    color: 'indigo',
                    desc: 'Trong từng câu mẫu ví dụ, cấu trúc ngữ pháp chính sẽ tự động được tô màu rực rỡ kèm nút loa phát âm âm thanh mẫu chuẩn người bản xứ.',
                    tip: 'Tự động gắn Furigana lên chữ Kanji trong câu.',
                },
                {
                    title: 'Luyện Tập Điền Ngữ Pháp',
                    tag: 'Luyện đề trắc nghiệm',
                    color: 'rose',
                    desc: 'Làm các dạng bài tập chọn trợ từ (ni, de, wo, ga, wa), điền từ vào vị trí ngôi sao ★ và sắp xếp từ thành câu có nghĩa.',
                    tip: 'Có phần giải thích ngữ cảnh chi tiết sau mỗi câu làm.',
                },
            ],
        },
        {
            moduleId: 'JLPT',
            moduleIcon: '📄',
            moduleTitle: '5. Thi Thử JLPT, Công Cụ Bôi Màu Highlight & In Đề PDF',
            moduleSubtitle: 'Luyện làm đề thi thật có đếm giờ, tô màu từ khóa và xuất in khổ giấy A4',
            themeColor: 'rose',
            items: [
                {
                    title: 'Màn Hình Thi Thử (Test Engine)',
                    tag: 'Đúng chuẩn đề thi thật',
                    color: 'rose',
                    desc: 'Bộ đề N5 - N1 chia 4 phần thi rõ ràng: Chữ Hán - Từ Vựng, Ngữ Pháp, Đọc Hiểu, Nghe Hiểu (audio tích hợp). Có đồng hồ đếm ngược và bảng Navigator cố định bên hông giúp theo dõi đề thi thuận tiện.',
                    tip: 'Chấm điểm tự động ngay khi nộp bài và xem giải thích chi tiết.',
                },
                {
                    title: 'Công Cụ Bôi Màu Highlight (Overlay)',
                    tag: 'Đọc hiểu chuyên sâu',
                    color: 'amber',
                    desc: 'Trong lúc làm bài đọc hiểu, bật công cụ Highlight Pen để tô màu các từ khóa quan trọng hoặc vẽ ghi chú trực tiếp lên đề thi giống như làm bài trên giấy thật.',
                    tip: 'Lưu lại ghi chú ngay cả khi chuyển qua lại giữa các câu hỏi.',
                },
                {
                    title: 'Cổng In Đề Thi (Print Portal)',
                    tag: 'Xuất bản in A4',
                    color: 'emerald',
                    desc: 'Bấm biểu tượng 🖨️ In Đề để tự động định dạng đề thi JLPT kèm đáp án ra khổ giấy A4 tiêu chuẩn. Hỗ trợ tải PDF hoặc gửi lệnh in trực tiếp ra máy in.',
                    tip: 'Thích hợp cho bạn nào thích luyện giải đề trên giấy.',
                },
            ],
        },
        {
            moduleId: 'KAIWA',
            moduleIcon: '💬',
            moduleTitle: '6. Phòng Kaiwa AI - Luyện Nói Tiếng Nhật Thực Tế',
            moduleSubtitle: 'Trợ lý AI luyện giao tiếp theo chủ đề, phát âm giọng Tokyo & sửa lỗi ngữ pháp',
            themeColor: 'indigo',
            items: [
                {
                    title: '1. Chọn Kịch Bản Thực Tế',
                    tag: 'Tình huống đa dạng',
                    color: 'indigo',
                    desc: 'Chọn các chủ đề phong phú: Phỏng vấn xin việc, đi mua sắm tại Kombini, đặt bàn nhà hàng, hội thoại công sở hàng ngày...',
                    tip: 'Được thiết kế sát với các tình huống đời thực tại Nhật Bản.',
                },
                {
                    title: '2. Thu Âm Nói Trực Tiếp',
                    tag: 'Speech-to-Text',
                    color: 'purple',
                    desc: 'Giữ nút micro để nói câu Tiếng Nhật của bạn. Hệ thống tự nhận diện giọng nói và chuyển đổi tức thì thành văn bản.',
                    tip: 'Hỗ trợ nhận diện chuẩn ngay cả khi phát âm chưa hoàn hảo.',
                },
                {
                    title: '3. AI Sửa Lỗi Ngay Tức Thì',
                    tag: 'Phản hồi chi tiết',
                    color: 'emerald',
                    desc: 'AI sẽ chỉ ra chỗ sai ngữ pháp, từ dùng chưa tự nhiên và gợi ý câu nói chuẩn bản xứ để bạn luyện tập lại.',
                    tip: 'Học cách diễn đạt tự nhiên như người Nhật.',
                },
            ],
        },
        {
            moduleId: 'TOOLS',
            moduleIcon: '⏱️',
            moduleTitle: '7. Đồng Hồ Focus (Pomodoro) & Bánh Xe Cuộn Ngôn Ngữ iOS',
            moduleSubtitle: 'Các tiện ích thông minh tích hợp sẵn ở phần chân thanh Sidebar',
            themeColor: 'amber',
            items: [
                {
                    title: 'Đồng Hồ Focus Session (Pomodoro)',
                    tag: 'Tăng cường tập trung',
                    color: 'purple',
                    desc: 'Bấm icon ⏱️ ở đáy Sidebar để mở đồng hồ tập trung (15m, 25m Pomodoro, 40m, 60m). Đồng hồ chạy ngầm và tự phát chuông báo khi hết giờ để chuyển sang 5 phút nghỉ ngơi.',
                    tip: 'Giúp não duy trì phong độ cao mà không bị quá tải.',
                },
                {
                    title: 'Bánh Xe Chọn Ngôn Ngữ iOS Wheel',
                    tag: 'Trải nghiệm 3D iOS',
                    color: 'cyan',
                    desc: 'Bấm vào thanh ngôn ngữ ở chân Sidebar để mở Modal Bánh Xe Cuộn 3D chuẩn iOS. Chọn mục tiêu học (Tiếng Nhật/Anh) và 8 ngôn ngữ giao diện.',
                    tip: 'Vuốt mượt mà, lưu thiết lập tức thì.',
                },
                {
                    title: 'Support Chatbox Trực Tiếp Admin',
                    tag: 'Hỗ trợ 24/7',
                    color: 'amber',
                    desc: 'Bấm vào biểu tượng 💬 Chat ở đáy Sidebar để gửi thắc mắc, báo lỗi hoặc yêu cầu tính năng trực tiếp cho quản trị viên.',
                    tip: 'Giải đáp phản hồi của người học nhanh chóng.',
                },
            ],
        },
    ], []);

    // Filtered modules based on activeSection and searchFilter
    const filteredModules = useMemo(() => {
        return moduleGuides
            .filter(mod => activeSection === 'ALL' || activeSection === mod.moduleId)
            .map(mod => {
                if (!searchFilter.trim()) return mod;
                const filter = searchFilter.toLowerCase();
                const matchedItems = mod.items.filter(it =>
                    it.title.toLowerCase().includes(filter) ||
                    it.desc.toLowerCase().includes(filter) ||
                    it.tag.toLowerCase().includes(filter) ||
                    it.tip.toLowerCase().includes(filter)
                );
                return matchedItems.length > 0 ? { ...mod, items: matchedItems } : null;
            })
            .filter(Boolean);
    }, [moduleGuides, activeSection, searchFilter]);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 px-2.5 sm:px-4 md:px-6 py-4 md:py-6 pb-24 animate-fade-in text-slate-800 dark:text-slate-100 min-w-0 overflow-x-hidden">
            
            {/* TOP HEADER BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:pb-6 min-w-0">
                <div className="flex items-start gap-2.5 sm:gap-4 min-w-0 flex-1">
                    {!isFirstTime && (
                        <Link
                            to={ROUTES.HOME}
                            className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs transition-all shrink-0 active:scale-95 mt-0.5"
                            title="Về trang chủ"
                        >
                            <ArrowLeft className="w-4.5 h-4.5" />
                        </Link>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-mono font-bold mb-1">
                            <Sparkles className="w-3.5 h-3.5" /> BÁCH KHOA TOÀN THƯ QUIZKI
                        </div>
                        <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-snug break-words">
                            Hướng Dẫn Chi Tiết Từng Bước & Quy Trình Thao Tác
                        </h1>
                    </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative w-full sm:w-64 md:w-72 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tính năng..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors shadow-xs"
                    />
                </div>
            </div>

            {/* QUICK SECTION CHIPS */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2.5 px-2.5 sm:mx-0 sm:px-0">
                {sections.map(sec => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id)}
                            className={`px-3 sm:px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{sec.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* STEP-BY-STEP VISUAL WORKFLOW GUIDE */}
            {(activeSection === 'ALL' || activeSection === 'STEPS') && !searchFilter && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xs min-w-0">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                        <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shrink-0">
                            <MousePointer className="w-5 h-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                                🚀 Các Bước Thao Tác Nhanh
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Các bước click cụ thể giúp bạn làm chủ ứng dụng ngay lập tức
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 text-xs">
                        {/* Step Flow 1 */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                            <h3 className="font-bold text-cyan-600 dark:text-cyan-400 text-xs sm:text-sm flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 shrink-0" /> 1. Tạo Bộ Bài & Quét Ảnh Bằng AI OCR
                            </h3>
                            <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Từ Vựng</b> → Chọn tab <b>Bộ Từ Vựng</b>.</li>
                                <li>Bấm nút màu xanh <b>+ Tạo bộ bài học</b> → Nhập tên bộ thẻ.</li>
                                <li>Bấm <b>✨ AI Quét Từ Ảnh</b> → Tải ảnh chụp sách/đề thi lên.</li>
                                <li>AI tự trích xuất Kanji, Furigana & Nghĩa → Bấm <b>Lưu thẻ</b>.</li>
                            </ol>
                        </div>

                        {/* Step Flow 2 */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                            <h3 className="font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 shrink-0" /> 2. Tạo Mẹo Nhớ Cá Nhân & Nhờ AI Gợi Ý
                            </h3>
                            <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Trong lúc Ôn tập SRS hoặc Flashcard, lật mặt sau thẻ.</li>
                                <li>Bấm nút <b>💡 + Thêm mẹo nhớ cá nhân</b>.</li>
                                <li>Bấm nút <b>✨ AI Gợi ý</b> để AI tạo liên tưởng âm Hán Việt.</li>
                                <li>Chỉnh sửa theo ý muốn → Bấm dấu <b>Check (Lưu)</b>.</li>
                            </ol>
                        </div>

                        {/* Step Flow 3 */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5">
                                <PenTool className="w-4 h-4 shrink-0" /> 3. Tập Viết Nét Bút Kanji & Chấm Điểm
                            </h3>
                            <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Thư viện Kanji</b> → Chọn chữ Kanji muốn tập.</li>
                                <li>Xem animation hướng dẫn thứ tự nét ở bên trái.</li>
                                <li>Dùng ngón tay/chuột vẽ trực tiếp lên bảng cảm ứng.</li>
                                <li>Hệ thống tự nhận diện nét và chấm điểm độ chuẩn xác.</li>
                            </ol>
                        </div>

                        {/* Step Flow 4 */}
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                            <h3 className="font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-1.5">
                                <FileCheck className="w-4 h-4 shrink-0" /> 4. Làm Đề Thi JLPT, Highlight & In A4
                            </h3>
                            <ol className="space-y-1.5 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Luyện đề JLPT</b> → Chọn cấp độ → Bấm <b>Bắt đầu</b>.</li>
                                <li>Bật <b>🖊️ Highlight Pen</b> để bôi màu từ khóa quan trọng.</li>
                                <li>Bấm <b>Nộp bài</b> để xem điểm thi và giải thích chi tiết.</li>
                                <li>Muốn in đề ra giấy A4: Bấm biểu tượng <b>🖨️ In Đề</b> ở trên.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* SRS & LEECH EXPLANATION SECTION */}
            {(activeSection === 'ALL' || activeSection === 'SRS') && !searchFilter && (
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl p-4 sm:p-6 border border-indigo-800/60 shadow-lg space-y-5 min-w-0">
                    <div className="flex items-center gap-3 border-b border-indigo-800/50 pb-3.5">
                        <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            <Brain className="w-5 h-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                                Cơ Chế Thuật Toán SM-2 & Thẻ Khó (Leech)
                            </h2>
                            <p className="text-xs text-indigo-200 mt-0.5">
                                Khoảng cách lặp lại ngắt quãng giúp nhớ 90% từ vựng dài hạn
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-cyan-300 text-xs sm:text-sm flex items-center gap-1.5">
                                <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
                                1. Chu Kỳ 4 Mức Đánh Giá (SM-2)
                            </h3>
                            <ul className="space-y-2 text-slate-300 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Again</span>
                                    <span><b>Lặp lại:</b> Reset thẻ về bước đầu (10 phút). Số lần quên +1.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Hard</span>
                                    <span><b>Khó:</b> Tăng nhẹ 1.2 lần khoảng cách trước.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Good</span>
                                    <span><b>Tốt:</b> Nhân khoảng cách với Hệ số Dễ (Ease Factor ≈ 2.5x).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Easy</span>
                                    <span><b>Dễ:</b> Tăng khoảng cách vượt cấp (+ ngày thưởng).</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-rose-300 text-xs sm:text-sm flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                                2. Cơ Chế Thẻ Khó Thuộc (Leech)
                            </h3>
                            <ul className="space-y-2 text-slate-300 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold shrink-0">• Quy tắc:</span>
                                    <span>Khi bấm <b>Again ≥ 3 lần</b> trên 1 thẻ, hệ thống đánh dấu là <b>🩸 Thẻ Khó Thuộc (Leech)</b>.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-amber-400 font-bold shrink-0">• Hình phạt:</span>
                                    <span>Khi bấm "Good", khoảng cách chỉ hồi <b>20%</b> chu kỳ cũ để ép bạn ôn lại thường xuyên hơn.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold shrink-0">• Giải pháp:</span>
                                    <span>Thêm <b>💡 Mẹo nhớ cá nhân</b> hoặc nhờ AI gợi ý để khắc phục triệt để.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED RESPONSIVE CARDS FOR MODULES */}
            <div className="space-y-6 sm:space-y-8">
                {filteredModules.map((module) => (
                    <div
                        key={module.moduleId}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-xs min-w-0"
                    >
                        {/* Module Header */}
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                                {module.moduleIcon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                    {module.moduleTitle}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {module.moduleSubtitle}
                                </p>
                            </div>
                        </div>

                        {/* Fluid Responsive Cards Grid (No horizontal overflow clipping!) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                            {module.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-750 flex flex-col justify-between space-y-3 hover:border-cyan-400/50 transition-colors shadow-2xs"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                                {item.title}
                                            </h3>
                                            {item.tag && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60 shrink-0">
                                                    {item.tag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                                            {item.desc}
                                        </div>
                                    </div>

                                    {item.tip && (
                                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl">
                                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                            <span className="leading-snug"><b>Mẹo:</b> {item.tip}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredModules.length === 0 && (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                        Không tìm thấy tính năng nào khớp với từ khóa "{searchFilter}".
                    </div>
                )}
            </div>

            {/* BOTTOM ACKNOWLEDGEMENT */}
            {isFirstTime ? (
                <button
                    onClick={handleClick}
                    disabled={isLoading}
                    className="w-full py-3.5 sm:py-4 bg-cyan-600 text-white rounded-2xl font-bold shadow-lg hover:bg-cyan-500 transition-all text-xs sm:text-sm cursor-pointer active:scale-98"
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Đã Hiểu Toàn Bộ Cẩm Nang, Bắt Đầu Học Ngay!"}
                </button>
            ) : (
                <div className="text-center pt-4">
                    <Link
                        to={ROUTES.HOME}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại trang chủ QuizKi</span>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default HelpScreen;
