import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';

const PrivacyScreen = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();

    const isEn = language === 'en';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
            {/* Minimal Formal Top Navbar */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
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
            <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 md:py-16">
                <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-12 md:p-16 shadow-xs space-y-10">
                    {/* Header */}
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-8 text-center sm:text-left">
                        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                            {isEn ? 'Privacy Standards' : 'Tiêu chuẩn Bảo mật'}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 mb-2">
                            {isEn ? 'Privacy Policy' : 'Chính sách Quyền riêng tư'}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isEn ? 'Effective Date: October 2026 • Platform: QuizKi AI' : 'Hiệu lực áp dụng: Tháng 10/2026 • Nền tảng: QuizKi AI'}
                        </p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {isEn ? (
                            <>
                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        1. Our Commitment to Privacy
                                    </h2>
                                    <p>
                                        QuizKi AI respects your fundamental right to privacy. We design our educational platform with privacy-by-design principles, ensuring that your personal data is handled securely, transparently, and strictly for the enhancement of your language learning experience.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        2. Categories of Information Collected
                                    </h2>
                                    <p>To deliver an adaptive learning experience, we collect only the necessary information:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Account Credentials:</strong> Email address, display name, and avatar URL provided through authenticated sign-in methods (Google OAuth or email authentication).</li>
                                        <li><strong>Learning Telemetry:</strong> Study sets, flashcards created, spaced repetition review intervals, recall ratings (Again, Hard, Good, Easy), and daily streak history.</li>
                                        <li><strong>Speech and Interaction Data:</strong> Transient voice inputs during AI Kaiwa conversational practice. Voice recordings are processed in real time solely to evaluate pronunciation and pitch accent and are not retained as permanent biometric identifiers.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        3. Purpose of Data Processing
                                    </h2>
                                    <p>Your data is processed strictly for the following purposes:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li>Calculating mathematically optimal Spaced Repetition (SRS) intervals to prevent forgetting.</li>
                                        <li>Synchronizing study progress seamlessly across multiple personal devices.</li>
                                        <li>Displaying personalized statistics, habit streaks, and optional leaderboard standings.</li>
                                        <li>Maintaining system security and preventing unauthorized access.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        4. Non-Commercialization Guarantee
                                    </h2>
                                    <p>
                                        We affirm unequivocally that <strong>QuizKi AI does not sell, rent, monetize, or trade learner data</strong> to any advertising broker, marketing agency, or third-party commercial entity. Your focus should remain entirely on mastering your target language without invasive tracking.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        5. Cloud Infrastructure and Data Security
                                    </h2>
                                    <p>
                                        Our databases are hosted on Google Cloud Firebase infrastructure, utilizing enterprise-grade encryption both in transit (TLS/SSL) and at rest (AES-256). Robust security rules ensure that your personal study sets and progress logs are accessible only by your authenticated identity.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        6. Learner Data Rights (Access & Permanent Deletion)
                                    </h2>
                                    <p>You retain comprehensive ownership and control over your personal data:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li><strong>Export & Backup:</strong> You may export your flashcards and study sets at any time in standard formats.</li>
                                        <li><strong>Correction:</strong> You may update your profile details and display preferences directly in Account Settings.</li>
                                        <li><strong>Permanent Erasure:</strong> You possess the absolute right to delete your account and all associated study telemetry permanently from our servers. Once executed, data erasure is irreversible.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        7. Local Storage and Offline Technologies
                                    </h2>
                                    <p>
                                        The Platform uses browser LocalStorage and IndexedDB to cache dictionary indexes, pitch accent lookups, and study cards locally. This enables instant page transitions and allows uninterrupted offline learning even with unstable network connectivity.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        8. Policy Amendments and Inquiries
                                    </h2>
                                    <p>
                                        Should any updates to this Privacy Policy be enacted, notices will be transparently posted on the Platform. For privacy-related inquiries or formal requests, please reach out through our official Help Center.
                                    </p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 1. Cam kết Bảo vệ Quyền riêng tư
                                    </h2>
                                    <p>
                                        QuizKi AI trân trọng và cam kết bảo vệ quyền riêng tư chính đáng của quý học viên. Chúng tôi xây dựng nền tảng trên nguyên tắc bảo mật từ gốc (Privacy by Design), đảm bảo rằng mọi dữ liệu học tập cá nhân đều được lưu trữ và xử lý một cách minh bạch, an toàn và chỉ phục vụ duy nhất mục tiêu nâng cao hiệu quả tiếp thu kiến thức của người học.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 2. Các Loại Thông tin Thu thập
                                    </h2>
                                    <p>Hệ thống chỉ thu thập các dữ liệu thực sự cần thiết cho quá trình học tập cá nhân hóa:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Thông tin Định danh Tài khoản:</strong> Địa chỉ email, tên hiển thị và ảnh đại diện công khai được cung cấp khi quý học viên đăng nhập qua Google OAuth hoặc xác thực email an toàn.</li>
                                        <li><strong>Dữ liệu Tiến trình Học tập:</strong> Danh mục bộ từ vựng cá nhân, lịch sử đánh giá thẻ (Lại, Khó, Tốt, Dễ), chu kỳ Spaced Repetition (SRS), chỉ số chuỗi ngày học Streak và điểm kinh nghiệm XP.</li>
                                        <li><strong>Dữ liệu Luyện phát âm & Hội thoại AI:</strong> Các đoạn thoại âm thanh thực hành với gia sư AI Kaiwa chỉ được xử lý tức thời để phân tích độ chuẩn xác ngữ điệu (Pitch Accent) và không được lưu giữ vĩnh viễn dưới dạng sinh trắc học cá nhân.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 3. Mục đích và Phương thức Sử dụng Thông tin
                                    </h2>
                                    <p>Thông tin của quý học viên được sử dụng duy nhất cho các mục đích sau:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li>Tính toán thời điểm vàng để nhắc lại từ vựng theo thuật toán lặp lại ngắt quãng (SRS).</li>
                                        <li>Đồng bộ hóa dữ liệu học tập liền mạch giữa điện thoại, máy tính bảng và máy tính cá nhân.</li>
                                        <li>Hiển thị báo cáo thống kê tiến độ học tập và bảng vinh danh thành tích (nếu người học tham gia).</li>
                                        <li>Bảo vệ tài khoản và ngăn chặn các hành vi gian lận kỹ thuật.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 4. Cam kết Tuyệt đối Không Thương mại hóa Dữ liệu
                                    </h2>
                                    <p>
                                        Chúng tôi khẳng định một cách dứt khoát rằng: <strong>QuizKi AI không bán, không cho thuê, không chia sẻ và không thương mại hóa dữ liệu cá nhân của người học</strong> cho bất kỳ bên thứ ba, công ty quảng cáo hay đơn vị tiếp thị nào. Môi trường học tập trên QuizKi hoàn toàn trong lành và không bị làm phiền bởi quảng cáo theo dõi.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 5. Hạ tầng Lưu trữ và Biện pháp An ninh
                                    </h2>
                                    <p>
                                        Dữ liệu của hệ thống được lưu trữ trên nền tảng đám mây Google Cloud / Firebase tiêu chuẩn quốc tế, áp dụng mã hóa đầu cuối khi truyền tải (TLS/SSL) và mã hóa khi lưu trữ (AES-256). Quy tắc an ninh nghiêm ngặt đảm bảo chỉ có chủ tài khoản đã đăng nhập mới có quyền truy cập vào các dữ liệu học tập riêng tư của mình.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 6. Quyền của Học viên đối với Dữ liệu Cá nhân
                                    </h2>
                                    <p>Quý học viên luôn giữ toàn quyền kiểm soát dữ liệu của bản thân:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li><strong>Quyền Trích xuất & Sao lưu:</strong> Tải về toàn bộ danh sách thẻ học, từ vựng và ghi chú dưới dạng tệp dữ liệu chuẩn bất kỳ lúc nào.</li>
                                        <li><strong>Quyền Chỉnh sửa:</strong> Tự do cập nhật tên hiển thị, mục tiêu học tập hàng ngày và mật khẩu trong phần Cài đặt.</li>
                                        <li><strong>Quyền Yêu cầu Xóa vĩnh viễn:</strong> Thực hiện xóa toàn bộ tài khoản và toàn bộ dữ liệu học tập liên quan khỏi hệ sinh thái máy chủ bất cứ khi nào quý vị mong muốn. Quá trình xóa dữ liệu là triệt để và không thể phục hồi.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 7. Công nghệ Bộ nhớ Cục bộ (Local Storage)
                                    </h2>
                                    <p>
                                        Ứng dụng sử dụng bộ nhớ cục bộ trình duyệt (LocalStorage và IndexedDB) để lưu tạm thời chỉ mục tra cứu từ điển và bộ nhớ đệm học tập. Điều này giúp các thao tác chuyển trang đạt tốc độ 0ms và hỗ trợ học tập liên tục ngay cả khi kết nối mạng chập chờn.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 8. Cập nhật Chính sách và Kênh Liên hệ
                                    </h2>
                                    <p>
                                        Mọi cập nhật điều chỉnh chính sách nhằm tuân thủ quy định pháp luật sẽ được thông báo rõ ràng trên ứng dụng. Mọi yêu cầu hoặc thắc mắc về quyền riêng tư, xin vui lòng gửi về Trung tâm Trợ giúp của QuizKi AI.
                                    </p>
                                </section>
                            </>
                        )}
                    </div>
                </article>
            </main>
        </div>
    );
};

export default PrivacyScreen;
