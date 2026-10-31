import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Search } from 'lucide-react';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';

const HelpScreen = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();
    const isEn = language === 'en';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    const categories = useMemo(() => [
        { id: 'ALL', label: isEn ? 'All Topics' : 'Tất cả chủ đề' },
        { id: 'SRS', label: isEn ? '1. Spaced Repetition (SRS)' : '1. Thuật toán SRS' },
        { id: 'VOCAB', label: isEn ? '2. Vocabulary & Flashcards' : '2. Từ vựng & Thẻ học' },
        { id: 'KANJI', label: isEn ? '3. Kanji & Radicals' : '3. Hán tự & Bộ thủ' },
        { id: 'GRAMMAR', label: isEn ? '4. Grammar Curriculum' : '4. Ngữ pháp chuẩn' },
        { id: 'KAIWA', label: isEn ? '5. AI Voice Kaiwa' : '5. Gia sư AI Kaiwa' },
        { id: 'JLPT', label: isEn ? '6. JLPT Mock Exams' : '6. Luyện đề thi JLPT' },
        { id: 'FAQ', label: isEn ? '7. Common Questions (FAQ)' : '7. Câu hỏi thường gặp' },
    ], [isEn]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
            {/* Minimal Formal Top Navbar */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{isEn ? 'Back to Home' : 'Về trang chủ'}</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setLanguage(isEn ? 'vi' : 'en')}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Tiếng Việt' : 'English'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Document Body */}
            <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 md:py-16">
                <div className="space-y-8">
                    {/* Header */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xs">
                        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                            {isEn ? 'Documentation & User Guide' : 'Tài liệu Hướng dẫn & Hỗ trợ'}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 mb-2">
                            {isEn ? 'QuizKi AI Knowledge Center' : 'Trung tâm Hướng dẫn & Trợ giúp QuizKi'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            {isEn
                                ? 'Comprehensive documentation detailing spaced repetition memory science, artificial intelligence conversational practice, curriculum navigation, and platform features.'
                                : 'Tài liệu hướng dẫn chi tiết về phương pháp lặp lại ngắt quãng, gia sư hội thoại trí tuệ nhân tạo, lộ trình giáo trình chuẩn hóa và các tính năng hỗ trợ người học.'}
                        </p>

                        {/* Search Input */}
                        <div className="mt-6 relative max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isEn ? 'Search documentation topics...' : 'Tìm kiếm nội dung hướng dẫn...'}
                                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-400 transition-all"
                            />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="mt-4 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                        selectedCategory === cat.id
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-12 shadow-xs space-y-12 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {isEn ? (
                            <>
                                {/* 1. Spaced Repetition (SRS) */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'SRS') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            1. Spaced Repetition System (SRS) Methodology
                                        </h2>
                                        <p>
                                            Spaced Repetition is a scientifically validated learning technique based on Hermann Ebbinghaus's Forgetting Curve. Rather than massed practice (cramming), items are reviewed at systematically increasing intervals immediately before memory degradation occurs.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">1.1 Review Stages and Intervals:</h3>
                                            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                                                <li><strong>Stage 1 (Initial Acquisition):</strong> First repetition occurs after 4 hours.</li>
                                                <li><strong>Stage 2 (Short-Term Reinforcement):</strong> Next interval is scheduled after 24 hours.</li>
                                                <li><strong>Stage 3 (Consolidation):</strong> Repetition scheduled after 3 days.</li>
                                                <li><strong>Stage 4 (Deep Retention):</strong> Repetition scheduled after 7 days.</li>
                                                <li><strong>Stage 5 (Permanent Mastery):</strong> Interval extends to 30 days and beyond, graduating into long-term permanent recall.</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">1.2 Answering Criteria:</h3>
                                            <p className="text-xs sm:text-sm">
                                                When reviewing flashcards, select <strong>"Again"</strong> if the answer was forgotten (resets to Stage 1), <strong>"Hard"</strong> if recalled with substantial effort, <strong>"Good"</strong> for normal recall, or <strong>"Easy"</strong> if completely effortless (accelerates the interval).
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 2. Vocabulary & Flashcards */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'VOCAB') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            2. Vocabulary & Flashcard Management
                                        </h2>
                                        <p>
                                            The Vocabulary module allows learners to organize personal study sets by thematic folders, import bulk lists, and synchronize audio pronunciations.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">2.1 Creating and Importing Cards:</h3>
                                            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                                                <li><strong>Manual Entry:</strong> Enter the target term, phonetic reading (Furigana / Romaji), and translation.</li>
                                                <li><strong>Batch Paste / CSV:</strong> Quickly create dozens of flashcards simultaneously by pasting two-column tab-separated lists.</li>
                                                <li><strong>AI OCR Image Extraction:</strong> Upload photos of textbook pages or exam papers to automatically extract terms, readings, and example sentences.</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">2.2 Difficult Cards (Leech Management):</h3>
                                            <p className="text-xs sm:text-sm">
                                                Words rated "Again" 3 times or more are automatically flagged as "Leeches" (difficult items). You can isolate these terms in the Leech Manager to attach custom mnemonic hints or reset their progression.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 3. Kanji & Radicals */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'KANJI') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            3. Kanji Library & Radical Breakdown
                                        </h2>
                                        <p>
                                            The Kanji module categorizes 2,136 Joyo Kanji systematically across JLPT levels (N5 through N1).
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">3.1 Radical-Based Learning:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Each character is dissected into its constituent semantic radicals, allowing learners to understand logical stroke composition rather than memorizing random lines.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">3.2 Stroke Order & Readings:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Interactive stroke animations accompany every character alongside both On'yomi (Sino-Japanese) and Kun'yomi (native Japanese) readings and common compound words (Jukugo).
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 4. Grammar Curriculum */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'GRAMMAR') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            4. Interactive Grammar Curriculum
                                        </h2>
                                        <p>
                                            Our structured grammar module covers grammatical sentence structures from beginner N5 to advanced N1, complete with formal textbook alignments (such as Minna no Nihongo and Soumatome).
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">4.1 Formula Breakdown:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Every grammar point details connection rules (e.g., Verb Te-form + kudasai), register nuances (polite vs. casual), common pitfalls, and real-life dialogue examples.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 5. AI Voice Kaiwa */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'KAIWA') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            5. Conversational AI Practice (Kaiwa)
                                        </h2>
                                        <p>
                                            The Kaiwa room simulates realistic conversational environments with native-speaking AI tutors available 24/7.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">5.1 Real-Time Audio Feedback:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Speak naturally into your device microphone. The system transcribes your speech, evaluates pronunciation accuracy, highlights pitch accent discrepancies, and suggests grammatical corrections.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 6. JLPT Mock Exams */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'JLPT') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            6. Timed JLPT Mock Examinations
                                        </h2>
                                        <p>
                                            Prepare effectively for actual exam conditions with full-length simulated JLPT tests featuring official section timers (Language Knowledge, Reading, and Listening).
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">6.1 Automated Scoring & Explanations:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Upon completion, tests are instantly scored against official scaled thresholds. Detailed explanations are provided for every multiple-choice question.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 7. FAQ */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'FAQ') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            7. Frequently Asked Questions (FAQ)
                                        </h2>
                                        <div className="space-y-3 text-xs sm:text-sm">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Q: Can I use QuizKi offline without an active internet connection?</h3>
                                                <p className="mt-1">A: Yes. Your study sets and flashcard queues are cached in your browser's local memory, allowing continuous offline reviews. Changes synchronize automatically when your connection is restored.</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Q: How is my daily study streak calculated?</h3>
                                                <p className="mt-1">A: Completing at least one SRS review session or earning 10 XP within your local day maintains your flame streak.</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Q: How can I reach support for assistance?</h3>
                                                <p className="mt-1">A: You may submit technical feedback via the Feedback modal or contact our administration directly.</p>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </>
                        ) : (
                            <>
                                {/* 1. Spaced Repetition (SRS) */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'SRS') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            1. Nguyên lý Phương pháp Lặp lại Ngắt quãng (SRS)
                                        </h2>
                                        <p>
                                            Phương pháp lặp lại ngắt quãng (Spaced Repetition System - SRS) là phương pháp ghi nhớ khoa học được phát triển dựa trên Đường cong quên lãng của nhà tâm lý học Hermann Ebbinghaus. Thay vì ôn tập dồn dập trong một thời gian ngắn rồi nhanh chóng lãng quên, thuật toán SRS sẽ tự động tính toán thời điểm vàng — ngay trước khi não bộ chuẩn bị quên từ vựng — để nhắc bạn ôn tập lại.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">1.1 Các Giai đoạn và Khoảng cách Ôn tập:</h3>
                                            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                                                <li><strong>Giai đoạn 1 (Tiếp nhận ban đầu):</strong> Lần ôn đầu tiên diễn ra sau 4 giờ.</li>
                                                <li><strong>Giai đoạn 2 (Củng cố ngắn hạn):</strong> Lần ôn tiếp theo diễn ra sau 24 giờ (1 ngày).</li>
                                                <li><strong>Giai đoạn 3 (Khắc sâu trí nhớ):</strong> Lần ôn tiếp theo diễn ra sau 3 ngày.</li>
                                                <li><strong>Giai đoạn 4 (Ghi nhớ dài hạn):</strong> Lần ôn tiếp theo diễn ra sau 7 ngày (1 tuần).</li>
                                                <li><strong>Giai đoạn 5 (Thuộc vĩnh viễn):</strong> Khoảng cách kéo dài từ 30 ngày trở lên và chuyển hóa thành kiến thức dài hạn bền vững.</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">1.2 Quy tắc Đánh giá Thẻ khi Ôn tập:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Khi lật thẻ kiểm tra, quý học viên chọn: <strong>"Lại" (Again)</strong> nếu chưa nhớ (thẻ quay về Giai đoạn 1), <strong>"Khó" (Hard)</strong> nếu nhớ nhưng cần nhiều nỗ lực, <strong>"Tốt" (Good)</strong> nếu nhớ tự nhiên, hoặc <strong>"Dễ" (Easy)</strong> nếu đã quá quen thuộc (khoảng cách sẽ tăng tốc nhanh hơn).
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 2. Vocabulary & Flashcards */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'VOCAB') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            2. Quản lý Từ vựng và Bộ thẻ Flashcard
                                        </h2>
                                        <p>
                                            Phân hệ Từ vựng cho phép quý học viên tự do tổ chức các bộ thẻ học cá nhân theo chủ đề, nhập liệu nhanh và lưu trữ ví dụ thực tế.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">2.1 Tạo mới và Nhập dữ liệu Hàng loạt:</h3>
                                            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                                                <li><strong>Nhập thủ công:</strong> Điền từ vựng, phiên âm cách đọc (Furigana / Romaji) và nghĩa tiếng Việt.</li>
                                                <li><strong>Dán nhanh bảng dữ liệu:</strong> Sao chép danh sách từ bảng tính Excel hoặc văn bản hai cột để tạo hàng chục thẻ trong vài giây.</li>
                                                <li><strong>Trợ lý AI trích xuất hình ảnh (OCR):</strong> Tải ảnh trang sách hoặc đề thi, trợ lý AI sẽ tự động phân tích và trích xuất chữ Hán, Furigana và câu ví dụ chuẩn mực.</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">2.2 Quản lý Thẻ Khó (Leech Management):</h3>
                                            <p className="text-xs sm:text-sm">
                                                Những từ vựng bị đánh giá "Lại" từ 3 lần trở lên sẽ được tự động gắn nhãn "Thẻ khó" (Leech). Quý học viên có thể vào bộ lọc Thẻ khó để viết lại mẹo nhớ liên tưởng hoặc cài đặt lại chu kỳ ôn tập.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 3. Kanji & Radicals */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'KANJI') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            3. Thư viện Hán tự Kanji và Phân tích Bộ thủ
                                        </h2>
                                        <p>
                                            Hệ thống Hán tự được phân cấp chuẩn mực từ N5 đến N1 bao gồm toàn bộ 2.136 chữ Hán thường dùng (Jōyō Kanji).
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">3.1 Học Hán tự theo Bộ thủ:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Mỗi chữ Hán được phân rã thành các bộ thủ cấu thành kèm câu chuyện liên tưởng, giúp người học hiểu được bản chất logic của nét chữ thay vì học vẹt nét rời rạc.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">3.2 Thứ tự Nét bút & Âm đọc On/Kun:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Hình động minh họa thứ tự từng nét viết chuẩn mực, đi kèm âm On (âm Hán), âm Kun (âm thuần Nhật) và các từ ghép thực tế phổ biến nhất.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 4. Grammar Curriculum */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'GRAMMAR') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            4. Giáo trình Ngữ pháp Chuẩn mực
                                        </h2>
                                        <p>
                                            Phân hệ Ngữ pháp cung cấp đầy đủ các mẫu câu từ sơ cấp N5 đến cao cấp N1, đối chiếu sát với các giáo trình nổi tiếng (Minna no Nihongo, Soumatome).
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">4.1 Công thức và Sắc thái Diễn đạt:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Mỗi mẫu câu đều có quy tắc kết hợp từ loại rõ ràng (thể từ, trợ từ đi kèm), giải thích sắc thái biểu cảm trang trọng hay thân mật, và các lỗi sai người học hay mắc phải.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 5. AI Voice Kaiwa */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'KAIWA') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            5. Phòng Luyện Đàm thoại cùng Gia sư AI Kaiwa
                                        </h2>
                                        <p>
                                            Phòng Kaiwa giúp quý học viên rèn luyện phản xạ giao tiếp tự tin trong môi trường tương tác 1-1 không áp lực.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">5.1 Nhận diện Giọng nói & Sửa lỗi Tức thì:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Học viên phát âm qua micrô, gia sư AI sẽ nghe và phân tích chính xác cao độ ngữ điệu (Pitch Accent), chỉ ra từ phát âm chưa chuẩn và đưa ra câu phản hồi tự nhiên như người bản xứ.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 6. JLPT Mock Exams */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'JLPT') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            6. Luyện Đề Thi JLPT Chuẩn hóa Bấm giờ
                                        </h2>
                                        <p>
                                            Ngân hàng đề thi thử bám sát cấu trúc đề thi chính thức của kỳ thi Năng lực Nhật ngữ với đầy đủ các phần: Kiến thức ngôn ngữ (Từ vựng/Chữ Hán/Ngữ pháp), Đọc hiểu và Nghe hiểu.
                                        </p>
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">6.1 Chấm điểm Tự động & Giải thích Chi tiết:</h3>
                                            <p className="text-xs sm:text-sm">
                                                Hệ thống tự động chấm điểm theo thang chuẩn và hiển thị đáp án kèm giải thích ngữ pháp tường minh cho từng câu hỏi sau khi nộp bài.
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* 7. FAQ */}
                                {(selectedCategory === 'ALL' || selectedCategory === 'FAQ') && (
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                                            7. Các Câu hỏi Thường gặp (FAQ)
                                        </h2>
                                        <div className="space-y-3 text-xs sm:text-sm">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Hỏi: Tôi có thể ôn tập ngoại tuyến khi mất kết nối mạng không?</h3>
                                                <p className="mt-1">Đáp: Có. QuizKi tự động lưu trữ bộ thẻ học trong bộ nhớ máy, quý học viên có thể ôn tập bình thường. Dữ liệu sẽ tự động đồng bộ lên đám mây khi có kết nối trở lại.</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Hỏi: Chuỗi ngày học Streak được tính như thế nào?</h3>
                                                <p className="mt-1">Đáp: Hoàn thành ít nhất một lượt ôn tập thẻ SRS hoặc tích lũy từ 10 XP trong ngày sẽ duy trì ngọn lửa Streak của quý học viên.</p>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white">Hỏi: Tôi muốn gửi góp ý hoặc báo lỗi thì liên hệ qua đâu?</h3>
                                                <p className="mt-1">Đáp: Quý học viên có thể gửi phản hồi trực tiếp qua biểu mẫu Góp ý trong ứng dụng để ban quản trị hỗ trợ giải quyết nhanh chóng.</p>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HelpScreen;
