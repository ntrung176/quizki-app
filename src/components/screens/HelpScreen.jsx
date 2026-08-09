import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    HelpCircle, Plus, Brain, Filter, Target, Zap, Repeat2,
    Keyboard, Ear, Lightbulb, Loader2, ArrowLeft, BookOpen,
    Languages, FileCheck, MessageSquare, Trophy, Shield,
    Crown, Timer, Globe, CheckCircle2, ChevronRight, AlertCircle,
    Search, Sparkles, Sliders, PenTool, Printer, Volume2, Flame,
    RefreshCw, Layers, Award, Info, AlertTriangle, BookMarked, MousePointer
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
        { id: 'GRAMMAR', label: '🔄 4. Ngữ Pháp', icon: Repeat2 },
        { id: 'JLPT', label: '📄 5. Luyện Đề JLPT', icon: FileCheck },
        { id: 'KAIWA', label: '💬 6. Kaiwa AI', icon: MessageSquare },
        { id: 'TOOLS', label: '⏱️ 7. Đồng Hồ Focus & Tiện Ích', icon: Timer },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-fade-in text-slate-800 dark:text-slate-100">
            
            {/* TOP HEADER BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                    {!isFirstTime && (
                        <Link
                            to={ROUTES.HOME}
                            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all shrink-0"
                            title="Về trang chủ"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    )}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold mb-1">
                            <Sparkles className="w-3.5 h-3.5" /> BÁCH KHOA TOÀN THƯ QUIZKI AI
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Hướng Dẫn Chi Tiết Từng Bước & Quy Trình Thao Tác
                        </h1>
                    </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative w-full md:w-72">
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
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {sections.map(sec => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id)}
                            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
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

            {/* STEP-BY-STEP VISUAL WORKFLOW GUIDE (CÁC BƯỚC THỰC HIỆN THỰC TẾ) */}
            {(activeSection === 'ALL' || activeSection === 'STEPS') && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                            <MousePointer className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">🚀 Hướng Dẫn Các Bước Thao Tác Thực Hiện Chi Tiết</h2>
                            <p className="text-xs text-slate-500">Các bước click từng bước cụ thể giúp bạn dễ dàng hình dung và làm chủ ứng dụng ngay lập tức</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                        
                        {/* Step Flow 1: Create Set & AI OCR */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-cyan-600 dark:text-cyan-400 text-sm flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" /> 1. Cách Tạo Bộ Bài & Quét Ảnh Từ Vựng Bằng AI OCR
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Từ Vựng</b> ở Sidebar $\rightarrow$ Chọn tab <b>Bộ Từ Vựng</b>.</li>
                                <li>Bấm nút màu xanh <b>+ Tạo bộ bài học</b> $\rightarrow$ Nhập tên bộ thẻ.</li>
                                <li>Bấm <b>✨ AI Quét Từ Ảnh</b> $\rightarrow$ Tải ảnh chụp trang sách hoặc đề thi lên.</li>
                                <li>AI sẽ tự trích xuất Kanji, Furigana & Nghĩa Tiếng Việt $\rightarrow$ Bấm <b>Lưu thẻ</b>.</li>
                            </ol>
                        </div>

                        {/* Step Flow 2: Personal Mnemonic */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4" /> 2. Cách Tạo Mẹo Nhớ Cá Nhân & Nhờ AI Gợi Ý
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Trong lúc Ôn tập SRS hoặc Flashcard, lật mặt sau của thẻ từ vựng / Kanji.</li>
                                <li>Nhấp nút <b>💡 + Thêm mẹo nhớ cá nhân</b> (hoặc bấm <b>+ Mẹo nhớ</b> trong Quản Lý Thẻ Khó).</li>
                                <li>Bấm nút <b>✨ AI Gợi ý</b> để AI tự bịa ra câu chuyện vui liên tưởng âm Hán Việt.</li>
                                <li>Chỉnh sửa nội dung theo ý muốn $\rightarrow$ Bấm dấu <b>Check (Lưu)</b> để hoàn tất.</li>
                            </ol>
                        </div>

                        {/* Step Flow 3: Kanji Practice */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                                <PenTool className="w-4 h-4" /> 3. Cách Tập Viết Nét Bút Kanji & Chấm Điểm
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Thư viện Kanji</b> $\rightarrow$ Tìm chọn chữ Kanji bạn muốn luyện tập.</li>
                                <li>Quan sát hình vẽ animation di chuyển nét theo thứ tự ở bên trái.</li>
                                <li>Dùng ngón tay hoặc giữ chuột vẽ từng nét trực tiếp lên bảng cảm ứng bên phải.</li>
                                <li>Hệ thống tự nhận diện nét vẽ và báo điểm độ chính xác nét bút tức thì.</li>
                            </ol>
                        </div>

                        {/* Step Flow 4: JLPT Exam & Highlight */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-1.5">
                                <FileCheck className="w-4 h-4" /> 4. Cách Làm Bài Thi JLPT, Highlight Đề & In A4
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Vào Menu <b>Luyện đề JLPT</b> $\rightarrow$ Chọn cấp độ N5 - N1 $\rightarrow$ Bấm <b>Bắt đầu thi</b>.</li>
                                <li>Bật công cụ <b>🖊️ Highlight Pen</b> để bôi màu từ khóa trọng tâm khi đọc bài.</li>
                                <li>Chọn đáp án và bấm <b>Nộp bài</b> để xem điểm thi và giải thích chi tiết từng câu.</li>
                                <li>Muốn in đề thi ra giấy A4: Bấm biểu tượng <b>🖨️ In Đề</b> ở góc trên màn hình.</li>
                            </ol>
                        </div>

                        {/* Step Flow 5: Focus Session */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-purple-600 dark:text-purple-400 text-sm flex items-center gap-1.5">
                                <Timer className="w-4 h-4" /> 5. Bật Đồng Hồ Focus Pomodoro Tắt Thông Báo
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Nhấp vào biểu tượng <b>⏱️</b> ở thanh nút dưới cùng của Sidebar.</li>
                                <li>Dùng 2 nút $\bigwedge / \bigvee$ để chọn số phút (25m Pomodoro, 40m, 60m).</li>
                                <li>Bấm <b>▶️ Bắt đầu phiên tập trung</b> $\rightarrow$ Đồng hồ tự đếm ngược ngầm.</li>
                                <li>Hệ thống phát chuông thông báo khi hoàn thành phiên học và chuyển sang giờ nghỉ 5 phút.</li>
                            </ol>
                        </div>

                        {/* Step Flow 6: iOS Language Wheel */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <h3 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1.5">
                                <Globe className="w-4 h-4" /> 6. Đổi Ngôn Ngữ Bằng Bánh Xe Cuộn 3D iOS
                            </h3>
                            <ol className="space-y-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed list-decimal list-inside">
                                <li>Nhấp vào thanh <b>🎯 Tiếng Nhật | 🌐 VI</b> ở chân thanh Sidebar.</li>
                                <li>Vuốt cuộn 2 bánh xe 3D để chọn Mục tiêu học và 8 Ngôn ngữ giao diện.</li>
                                <li>Bấm nút <b>✓ Hoàn tất</b> để lưu và kích hoạt cài đặt mới.</li>
                            </ol>
                        </div>

                    </div>
                </div>
            )}

            {/* 🧠 SECTION: THUẬT TOÁN SRS & THẺ KHÓ */}
            {(activeSection === 'ALL' || activeSection === 'SRS') && (
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 border border-indigo-800/60 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-indigo-800/50 pb-4">
                        <span className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <Brain className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">Cơ Chế Thuật Toán Học Tập Anki SM-2 & Xử Lý Thẻ Khó (Leech)</h2>
                            <p className="text-xs text-indigo-200 mt-0.5">Hiểu rõ cách QuizKi điều phối khoảng cách lặp lại để ghi nhớ 90% từ vựng dài hạn</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-cyan-300 text-sm flex items-center gap-1.5">
                                <RefreshCw className="w-4 h-4 text-cyan-400" />
                                1. Chu Kỳ Khoảng Cách 4 Mức Đánh Giá (SM-2)
                            </h3>
                            <ul className="space-y-2 text-slate-300 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Again</span>
                                    <span><b>Lặp lại:</b> Reset thẻ về lại bước học đầu tiên (10 phút). Số lần quên (Lapses) tăng thêm +1.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Hard</span>
                                    <span><b>Khó:</b> Khoảng cách tăng nhẹ 1.2 lần so với chu kỳ trước.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Good</span>
                                    <span><b>Tốt:</b> Nhân khoảng cách với Hệ số Dễ (Ease Factor: Khoảng cách mới = Khoảng cách cũ × EF). Mặc định nhân 2.5 lần.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold font-mono text-[10px] shrink-0 mt-0.5">Easy</span>
                                    <span><b>Dễ:</b> Tăng khoảng cách vượt cấp (nhân 1.3x Ease Factor + cộng thêm ngày thưởng).</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-rose-300 text-sm flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-rose-400" />
                                2. Hệ Thống Hình Phạt Thẻ Khó Thuộc (Leech Cards)
                            </h3>
                            <ul className="space-y-2 text-slate-300 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold shrink-0">• Quy tắc Leech:</span>
                                    <span>Khi bạn bấm <b>Lặp lại (Again) ≥ 3 lần</b> trên cùng 1 thẻ, hệ thống sẽ đánh dấu thẻ đó là <b>🩸 Thẻ Khó Thuộc (Leech)</b>.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-amber-400 font-bold shrink-0">• Hình phạt chu kỳ:</span>
                                    <span>Với Thẻ Khó, khi bạn bấm "Good", khoảng cách ôn mới chỉ phục hồi <b>20% khoảng cách trước khi quên</b> (Ví dụ 100 ngày → 20 ngày), và bấm "Hard" chỉ hồi 10% để ép bạn ôn lại thường xuyên hơn.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold shrink-0">• Giải pháp gỡ Leech:</span>
                                    <span>Bấm vào nút <b>💡 + Mẹo nhớ cá nhân</b> trên thẻ hoặc mở <b>Quản Lý Thẻ Khó</b> để tự tạo mẹo nhớ liên tưởng giúp não ghi nhớ dễ hơn!</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED TABLES FOR ALL MAIN APP MODULES */}
            <div className="space-y-8">

                {/* 🏠 MODULE 1: TRANG CHỦ */}
                {(activeSection === 'ALL' || activeSection === 'HOME') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-lg">
                                🏠
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Màn Hình Trang Chủ (Home Screen)</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Bảng điều khiển tổng quan, chỉ số tiến độ và phím tắt ôn tập</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Thành Phần / Khối UI</th>
                                        <th className="p-3.5 w-1/2">Chức Năng & Thao Tác Chi Tiết</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Mẹo & Lưu Ý</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-cyan-600 dark:text-cyan-400">Profile Capsule & XP Level</td>
                                        <td className="p-3.5">Hiển thị Avatar, Tên người dùng, Cấp độ LV (Level) và Huy hiệu Premium. Click vào capsule này sẽ mở <b>Menu Profile nhanh</b> chứa Cài Đặt và Đăng Xuất.</td>
                                        <td className="p-3.5 text-slate-500">Mỗi bài học hoàn thành sẽ cộng XP giúp tăng Level.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">Thanh Chỉ Số SRS (Due Cards)</td>
                                        <td className="p-3.5">Tự động đếm tổng số thẻ <b>Từ vựng, Kanji, Ngữ pháp</b> đã đến hạn phải ôn trong ngày. Bấm nút "Bắt đầu ôn" để vào thẳng phòng học.</td>
                                        <td className="p-3.5 text-slate-500">Thẻ Due cần được dọn sạch hàng ngày để giữ nhịp SRS.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">Chuỗi Học Hàng Ngày (Streak)</td>
                                        <td className="p-3.5">Thanh điểm danh chuỗi ngày học liên tục. Tích lũy XP mỗi ngày để giữ biểu tượng ngọn lửa 🔥 hoạt động.</td>
                                        <td className="p-3.5 text-slate-500">Bị đứt Streak nếu bỏ lỡ 1 ngày không học.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Thanh Tra Cứu Nhanh (Global Search)</td>
                                        <td className="p-3.5">Ô tra cứu thông minh hỗ trợ tra tiếng Việt, Rōmaji, Hiragana, Katakana hoặc Hán tự Kanji.</td>
                                        <td className="p-3.5 text-slate-500">Tự động gợi ý từ liên quan và công thức ngữ pháp.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 📖 MODULE 2: BỘ TỪ VỰNG */}
                {(activeSection === 'ALL' || activeSection === 'VOCAB') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                                📖
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Quản Lý Từ Vựng, Sách Học & Chu Kỳ SRS</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tạo bộ thẻ cá nhân, quét sách AI OCR, nhập Excel và quản lý Thẻ Khó (Leech)</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Tab Con / Tính Năng</th>
                                        <th className="p-3.5 w-1/2">Chi Tiết Cách Sử Dụng</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Công Cụ Đột Phá</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">Tab 1: Bộ Từ Vựng (Study Sets)</td>
                                        <td className="p-3.5">
                                            • <b>Tạo bộ thẻ mới:</b> Tạo thư mục chứa từ vựng theo chủ đề cá nhân.<br/>
                                            • <b>Trợ lý AI OCR từ ảnh:</b> Chụp hoặc tải ảnh trang sách/đề thi, AI tự trích xuất Kanji, Furigana & Nghĩa chuẩn.<br/>
                                            • <b>Nhập Excel/CSV hàng loạt:</b> Dán danh sách từ dối dạng bảng để tạo 100 từ trong 3 giây.
                                        </td>
                                        <td className="p-3.5 text-slate-500">Lọc từ vựng theo tag JLPT (N5 - N1) vô cùng tiện lợi.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">Tab 2: Sách Học (Books)</td>
                                        <td className="p-3.5">
                                            • Chứa đầy đủ giáo trình chuẩn: Minna no Nihongo (50 bài), Soumatome, Mimi Kara Oboeru...<br/>
                                            • <b>Nút Đồng Bộ CDN:</b> Tải bản nén cache về máy giúp mở sách không giật lag.<br/>
                                            • <b>Tự động cuộn:</b> Khi đổi bài học/chương, ứng dụng tự động cuộn mượt về đầu trang.
                                        </td>
                                        <td className="p-3.5 text-slate-500">Mỗi bài học được chia nhỏ theo từ vựng, Kanji và ví dụ.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Tab 3: Ôn Tập SRS Vocab</td>
                                        <td className="p-3.5">
                                            • Phòng ôn tập với Flashcard lật 3D 2 mặt kèm audio phát âm giọng đọc Tokyo.<br/>
                                            • <b>Mẹo Nhớ Cá Nhân Inline:</b> Bấm <b>💡 + Thêm mẹo nhớ cá nhân</b>, bấm <b>✨ AI Gợi ý</b> để AI bịa ra câu chuyện vui liên tưởng âm Hán Việt giúp nhớ ngay lập tức.<br/>
                                            • <b>Quản Lý Thẻ Khó (Leech Manager):</b> Danh sách gom các từ quên ≥ 3 lần, cho phép sửa mẹo nhớ hoặc bấm `Đã thuộc (Reset)` để đưa từ về chu kỳ bình thường.
                                        </td>
                                        <td className="p-3.5 text-slate-500">Chỉ hiển thị nút thêm mẹo nhớ cho các thẻ bị quên nhiều (Leech).</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 🈁 MODULE 3: THƯ VIỆN KANJI */}
                {(activeSection === 'ALL' || activeSection === 'KANJI') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                                🈁
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Thư Viện Kanji & Tập Viết Nét Bút Tương Tác</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tra cứu 2136 chữ Hán tự, tập viết trực tiếp và quản lý mẹo nhớ Kanji cá nhân</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Tính Năng Kanji</th>
                                        <th className="p-3.5 w-1/2">Chi Tiết Hướng Dẫn Sử Dụng</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Điểm Đặc Sắc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Danh Mục 2136 Kanji</td>
                                        <td className="p-3.5">Tra cứu Hán tự theo Bộ Thủ (Radicals), Âm Hán Việt (ví dụ: *NHẬT, NGUYỆT, THỦY, HỎA*), Âm Onyomi, Âm Kunyomi và danh sách từ ghép chứa chữ Kanji đó.</td>
                                        <td className="p-3.5 text-slate-500">Phân loại chuẩn từ JLPT N5 đến N1.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-cyan-600 dark:text-cyan-400">Bảng Tập Viết Nét Bút (Stroke Order)</td>
                                        <td className="p-3.5">Màn hình tập viết có hình vẽ animation thứ tự từng nét. Bạn dùng chuột hoặc ngón tay vẽ trực tiếp lên bảng cảm ứng, máy sẽ chấm điểm độ chính xác của nét vẽ.</td>
                                        <td className="p-3.5 text-slate-500">Tự động phát hiện lỗi sai thứ tự nét.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">Mẹo Nhớ Kanji Cá Nhân</td>
                                        <td className="p-3.5">Cho phép bạn tự viết mẹo nhớ riêng cho từng chữ Kanji. Mẹo nhớ này được lưu riêng trên kho dữ liệu cá nhân của bạn, không làm ảnh hưởng đến dữ liệu từ điển gốc. Nếu xóa mẹo riêng, app sẽ tự quay về hiển thị mẹo gốc hệ thống.</td>
                                        <td className="p-3.5 text-slate-500">Bảo mật 100% cho mỗi tài khoản học sinh.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 🔄 MODULE 4: NGỮ PHÁP */}
                {(activeSection === 'ALL' || activeSection === 'GRAMMAR') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                                🔄
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Thư Viện Ngữ Pháp & Công Thức Chia Động Từ</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tra cứu cấu trúc N5 - N1, câu ví dụ thực tế và bài tập nối câu</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Thành Phần Ngữ Pháp</th>
                                        <th className="p-3.5 w-1/2">Chi Tiết Hướng Dẫn Sử Dụng</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Cơ Chế Trực Quan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">Mã Hóa Màu Công Thức chia từ</td>
                                        <td className="p-3.5">
                                            Các công thức liên kết ngữ pháp được phân màu sắc chuẩn:<br/>
                                            • <span className="font-bold text-emerald-600 font-mono">[V] Động từ</span> (V-te, V-ta, V-nai, V-stem...)<br/>
                                            • <span className="font-bold text-cyan-600 font-mono">[N] Danh từ</span> (N + dewa, N + ni...)<br/>
                                            • <span className="font-bold text-amber-600 font-mono">[Adj] Tính từ</span> (Đuôi -i / Đuôi -na)
                                        </td>
                                        <td className="p-3.5 text-slate-500">Giúp mắt quét công thức trong 0.5s.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">Highlight Mẫu Trong Câu Ví Dụ</td>
                                        <td className="p-3.5">Trong từng câu mẫu ví dụ, cấu trúc ngữ pháp chính sẽ tự động được tô màu rực rỡ kèm nút loa phát âm âm thanh mẫu.</td>
                                        <td className="p-3.5 text-slate-500">Tự động gắn Furigana lên Kanji trong câu.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">Luyện Tập Điền Ngữ Pháp</td>
                                        <td className="p-3.5">Làm các dạng bài tập chọn trợ từ (ni, de, wo, ga, wa), điền từ vào vị trí ngôi sao ★ và sắp xếp từ thành câu có nghĩa.</td>
                                        <td className="p-3.5 text-slate-500">Có giải thích ngữ cảnh chi tiết sau mỗi câu.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 📄 MODULE 5: LUYỆN ĐỀ JLPT */}
                {(activeSection === 'ALL' || activeSection === 'JLPT') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg">
                                📄
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Thi Thử JLPT, Công Cụ Bôi Màu Highlight & In Đề PDF</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Luyện làm đề thi thật có đếm giờ, tô màu từ khóa và xuất in khổ giấy A4</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Công Cụ Đề Thi</th>
                                        <th className="p-3.5 w-1/2">Chi Tiết Hướng Dẫn Sử Dụng</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Ưu Điểm Nổi Bật</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">Màn Hình Thi Thử (Test Engine)</td>
                                        <td className="p-3.5">Bộ đề N5, N4, N3, N2, N1 gồm 3 phần thi: Chữ Hán - Từ Vựng, Đọc Hiểu, Nghe Hiểu (audio tích hợp). Có đồng hồ đếm ngược đúng thời gian thi chuẩn Nhật Bản. Bảng Navigator bên hông giúp theo dõi các câu đã làm / câu bỏ qua.</td>
                                        <td className="p-3.5 text-slate-500">Chấm điểm tự động ngay khi nộp bài.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">Công Cụ Bôi Màu Highlight (Overlay)</td>
                                        <td className="p-3.5">Trong lúc làm bài đọc hiểu, chọn công thức <b>Highlight Pen</b> để tô màu các từ khóa quan trọng hoặc vẽ ghi chú trực tiếp lên đề thi giống như làm bài trên giấy thật.</td>
                                        <td className="p-3.5 text-slate-500">Lưu lại ghi chú ngay cả khi chuyển câu.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Cổng In Đề Thi (Print Portal)</td>
                                        <td className="p-3.5">Bấm biểu tượng <b>🖨️ In Đề</b> để tự động định dạng đề thi JLPT kèm đáp án ra khổ giấy A4 tiêu chuẩn. Cho phép tải file PDF hoặc in trực tiếp ra máy in.</td>
                                        <td className="p-3.5 text-slate-500">Phù hợp cho học sinh muốn làm đề giấy.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 💬 MODULE 6: KAIWA AI */}
                {(activeSection === 'ALL' || activeSection === 'KAIWA') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                💬
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Phòng Kaiwa AI - Luyện Nói Tiếng Nhật Thực Tế</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Trợ lý AI luyện giao tiếp theo chủ đề, phát âm giọng Tokyo & sửa lỗi ngữ pháp</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">1. Chọn Kịch Bản</h4>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Chọn các chủ đề thực tế: Phỏng vấn xin việc, đi mua sắm tại Kombini, đặt bàn nhà hàng, hội thoại hàng ngày...</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                                <h4 className="font-bold text-purple-600 dark:text-purple-400 text-sm">2. Thu Âm Nói Giọng Nối</h4>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Giữ nút micro để nói câu Tiếng Nhật của bạn. Hệ thống tự nhận diện giọng nói (Speech-to-Text) và chuyển đổi thành văn bản.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">3. AI Sửa Lỗi Ngay Tức Thì</h4>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">AI sẽ chỉ ra chỗ sai ngữ pháp, từ dùng chưa tự nhiên và gợi ý câu nói chuẩn người bản xứ cho bạn luyện lại.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ⏱️ MODULE 7: TIỆN ÍCH ĐÁY SIDEBAR */}
                {(activeSection === 'ALL' || activeSection === 'TOOLS') && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                                ⏱️
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Đồng Hồ Focus (Pomodoro) & Bánh Xe Cuộn Ngôn Ngữ iOS</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Các tiện ích thông minh tích hợp sẵn ở phần chân thanh Sidebar</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3.5 rounded-l-xl w-1/4">Tiện Ích Đáy Sidebar</th>
                                        <th className="p-3.5 w-1/2">Hướng Dẫn Thao Tác Chi Tiết</th>
                                        <th className="p-3.5 rounded-r-xl w-1/4">Trải Nghiệm Đỉnh Cao</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium leading-relaxed">
                                    <tr>
                                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">Đồng Hồ Focus Session (Pomodoro)</td>
                                        <td className="p-3.5">
                                            Bấm vào icon <b>⏱️</b> ở đáy Sidebar để mở đồng hồ tập trung.<br/>
                                            • Chọn mốc thời gian: 15m, 25m (Pomodoro), 40m, 60m.<br/>
                                            • Máy tự động tính lượt nghỉ ngắn (5 phút) và nghỉ dài (15 phút).<br/>
                                            • Đồng hồ chạy ngầm toàn bộ app, có hiệu ứng đếm ngược và nhạc chuông thông báo khi hoàn thành.
                                        </td>
                                        <td className="p-3.5 text-slate-500">Giúp não sạc năng lượng không bị quá tải.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-cyan-600 dark:text-cyan-400">Bánh Xe Chọn Ngôn Ngữ iOS Wheel</td>
                                        <td className="p-3.5">
                                            Bấm vào thanh <b>🎯 Tiếng Nhật | 🌐 VI</b> để mở Modal Bánh Xe Cuộn 3D chuẩn iPhone Alarm.<br/>
                                            • Xoay chọn <b>Mục tiêu học</b>: Tiếng Nhật hoặc Tiếng Anh (BETA).<br/>
                                            • Xoay chọn <b>Ngôn ngữ giao diện</b>: 8 ngôn ngữ (Tiếng Việt, English, 日本語, 中文, 한국어, Bahasa Indonesia, ไทย, မြန်မာစာ).<br/>
                                            • Bấm nút <b>✓ Hoàn tất</b> để lưu và áp dụng cài đặt mới.
                                        </td>
                                        <td className="p-3.5 text-slate-500">Hiệu ứng cuộn kính mờ 3D đẹp mắt.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">Support Chatbox Trực Tiếp Admin</td>
                                        <td className="p-3.5">Bấm vào biểu tượng <b>💬 Chat</b> ở đáy Sidebar để gửi thắc mắc, báo lỗi hoặc yêu cầu tính năng trực tiếp cho quản trị viên hệ thống.</td>
                                        <td className="p-3.5 text-slate-500">Hỗ trợ sinh viên 24/7.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* BOTTOM ACKNOWLEDGEMENT */}
            {isFirstTime ? (
                <button
                    onClick={handleClick}
                    disabled={isLoading}
                    className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold shadow-xl hover:bg-cyan-500 transition-all text-sm cursor-pointer active:scale-98"
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Đã Hiểu Toàn Bộ Cẩm Nang, Bắt Đầu Học Ngay!"}
                </button>
            ) : (
                <div className="text-center pt-6">
                    <Link
                        to={ROUTES.HOME}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs shadow-xs"
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
