import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';

const TermsScreen = () => {
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
                            {isEn ? 'Legal Documentation' : 'Văn bản Pháp lý'}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 mb-2">
                            {isEn ? 'Terms of Service' : 'Điều khoản Dịch vụ'}
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
                                        1. Acceptance of Terms
                                    </h2>
                                    <p>
                                        Welcome to QuizKi AI ("Platform", "we", "us", or "our"). By accessing, registering, or using our web applications, spaced repetition services, and AI-powered learning modules, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service ("Terms").
                                    </p>
                                    <p>
                                        If you do not agree with any provision set forth in these Terms, please discontinue using the Platform immediately.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        2. Description of Service
                                    </h2>
                                    <p>
                                        QuizKi AI is an educational technology system developed to facilitate foreign language acquisition through spaced repetition algorithms (SRS), artificial intelligence conversational practice (AI Kaiwa), radical-based Kanji instruction, and standardized examination preparation modules (such as JLPT).
                                    </p>
                                    <p>
                                        We reserve the right to improve, update, or temporarily adjust features to enhance platform stability and learning efficacy without prior liability.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        3. User Account and Security Responsibilities
                                    </h2>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>You are responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your account.</li>
                                        <li>You agree to provide accurate, truthful registration information and notify our administrative team promptly upon detecting any unauthorized access.</li>
                                        <li>Each learner account is personal and non-transferable to ensure accurate adaptive SRS memory scheduling.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        4. Intellectual Property and Content Rights
                                    </h2>
                                    <p>
                                        <strong>4.1 Platform Assets:</strong> All software code, user interface designs, logos, algorithms, and systematized learning databases are the exclusive intellectual property of QuizKi AI and are protected under international copyright and intellectual property treaties.
                                    </p>
                                    <p>
                                        <strong>4.2 User-Generated Content:</strong> Study cards, personal memory notes, and folders created by you remain your property. By storing them on QuizKi, you grant us the technical license necessary to host, process, and synchronize your data across your devices.
                                    </p>
                                    <p>
                                        <strong>4.3 Third-Party Academic References:</strong> Standardized textbook titles, public domain dictionaries (e.g., JMdict, EDRDG), and examination references are utilized strictly under fair educational citation principles. All corresponding rights belong to their original publishers.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        5. Acceptable Use and Prohibited Conduct
                                    </h2>
                                    <p>When utilizing the Platform, you formally agree not to:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Engage in automated data scraping, crawling, reverse-engineering, or decompiling of QuizKi services.</li>
                                        <li>Attempt to compromise system integrity, circumvent security mechanisms, or overload infrastructure.</li>
                                        <li>Upload illegal, defamatory, obscene, or infringing content onto public decks or shared community surfaces.</li>
                                        <li>Abuse conversational AI models for unauthorized commercial synthesis or harmful activities.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        6. Artificial Intelligence Disclaimer
                                    </h2>
                                    <p>
                                        Conversational AI tutoring, contextual translations, and pitch accent explanations are generated via state-of-the-art language models to assist self-study. While we continuously refine accuracy, AI-generated outputs serve as educational aids and should be cross-referenced with authorized dictionaries and formal instructional guidance.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        7. Account Termination
                                    </h2>
                                    <p>
                                        Learners may request account deactivation and complete data deletion at any time via Account Settings. We reserve the right to suspend or terminate accounts that demonstrate severe or persistent violations of these Terms.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        8. Governing Law and Contact
                                    </h2>
                                    <p>
                                        These Terms are governed by applicable legal frameworks regarding electronic services. Any concerns or requests regarding these Terms may be formally addressed to our administrative support team via the Help Center.
                                    </p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 1. Phạm vi áp dụng và Chấp thuận Điều khoản
                                    </h2>
                                    <p>
                                        Chào mừng quý học viên đến với QuizKi AI ("Hệ thống", "Chúng tôi"). Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào thuộc nền tảng học tập ngoại ngữ QuizKi, quý học viên xác nhận đã đọc kỹ, thấu hiểu và đồng thuận tự nguyện chịu sự ràng buộc bởi bản Điều khoản Dịch vụ này.
                                    </p>
                                    <p>
                                        Trong trường hợp quý học viên không đồng ý với bất kỳ điều khoản nào dưới đây, vui lòng dừng sử dụng dịch vụ của hệ thống.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 2. Bản chất Dịch vụ & Mục đích Giáo dục
                                    </h2>
                                    <p>
                                        QuizKi AI là giải pháp công nghệ giáo dục được thiết kế nhằm hỗ trợ người học tối ưu hóa quá trình tiếp thu và ghi nhớ ngoại ngữ dài hạn thông qua:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li>Thuật toán lặp lại ngắt quãng (Spaced Repetition System - SRS) tự động thích ứng với tốc độ ghi nhớ của từng cá nhân.</li>
                                        <li>Gia sư trí tuệ nhân tạo (AI Kaiwa) hỗ trợ thực hành hội thoại, phản hồi phát âm và ngữ điệu (Pitch Accent).</li>
                                        <li>Hệ thống thư viện Hán tự Kanji, bài học ngữ pháp và đề thi thử chuẩn hóa (JLPT).</li>
                                    </ul>
                                    <p>
                                        Chúng tôi bảo lưu quyền bảo trì, nâng cấp thuật toán và cải tiến giao diện nhằm không ngừng nâng cao chất lượng phục vụ học tập.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 3. Trách nhiệm Tài khoản và Bảo mật Thông tin
                                    </h2>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Mỗi học viên có trách nhiệm tự bảo mật thông tin đăng nhập của mình và chịu trách nhiệm đối với toàn bộ hoạt động diễn ra dưới tài khoản đó.</li>
                                        <li>Quý học viên cam kết cung cấp thông tin chính xác khi thiết lập hồ sơ và có nghĩa vụ thông báo kịp thời cho ban quản trị nếu phát hiện dấu hiệu truy cập trái phép.</li>
                                        <li>Tài khoản học tập mang tính chất cá nhân hóa nhằm đảm bảo dữ liệu ghi nhớ SRS được phản ánh chính xác nhất, tránh việc chia sẻ tài khoản cho nhiều người cùng học làm sai lệch chu kỳ lặp lại.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 4. Quyền Sở hữu Trí tuệ và Nội dung Người học
                                    </h2>
                                    <p>
                                        <strong>4.1 Tài sản của QuizKi:</strong> Toàn bộ mã nguồn, cấu trúc phần mềm, thuật toán phân bổ bộ nhớ, thiết kế giao diện và tài liệu hướng dẫn thuộc quyền sở hữu trí tuệ của QuizKi AI và được pháp luật bảo vệ.
                                    </p>
                                    <p>
                                        <strong>4.2 Dữ liệu do người học khởi tạo:</strong> Các bộ từ vựng, ghi chú cá nhân và học phần do quý học viên tạo lập thuộc quyền sở hữu của quý học viên. Bằng việc lưu trữ trên QuizKi, quý vị cấp cho chúng tôi quyền kỹ thuật cần thiết để đồng bộ hóa và sao lưu dữ liệu phục vụ việc học tập trên các thiết bị của quý vị.
                                    </p>
                                    <p>
                                        <strong>4.3 Tôn trọng bản quyền học thuật:</strong> Các đầu sách giáo trình, từ điển cộng đồng (JMdict, EDRDG) được trích dẫn và sử dụng trên cơ sở tôn trọng bản quyền giáo dục phi thương mại. Bản quyền nguyên tác luôn thuộc về các tác giả và nhà xuất bản tương ứng.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 5. Quy tắc Hành xử và Các Hành vi bị Nghiêm cấm
                                    </h2>
                                    <p>Khi sử dụng nền tảng, quý học viên cam kết không thực hiện các hành vi sau:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li>Tự động thu thập dữ liệu (scraping), trích xuất mã nguồn hoặc can thiệp trái phép vào hệ thống máy chủ.</li>
                                        <li>Đưa lên hệ thống các nội dung vi phạm pháp luật, văn hóa phẩm độc hại hoặc xâm phạm quyền của bên thứ ba.</li>
                                        <li>Có hành vi phá hoại, gây gián đoạn đường truyền hoặc lạm dụng quá mức tài nguyên tính toán của mô hình AI.</li>
                                    </ul>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 6. Cơ chế Trí tuệ Nhân tạo & Giới hạn Trách nhiệm
                                    </h2>
                                    <p>
                                        Các tính năng gia sư AI, giải thích ngữ pháp và hỗ trợ dịch nghĩa tự động được xây dựng nhằm mục đích trợ giảng tham khảo. Mặc dù chúng tôi không ngừng kiểm soát và cải thiện độ chính xác, người học nên đối chiếu với các nguồn tài liệu chính thống đối với các kỳ thi học thuật quan trọng.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 7. Quyền Chấm dứt & Xóa Dữ liệu
                                    </h2>
                                    <p>
                                        Quý học viên có toàn quyền chủ động xóa dữ liệu hoặc ngừng sử dụng dịch vụ bất kỳ lúc nào tại mục Cài đặt Tài khoản. Hệ thống có quyền đình chỉ tài khoản nếu phát hiện hành vi vi phạm nghiêm trọng các quy định tại văn bản này.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Điều 8. Giải quyết Thắc mắc và Liên hệ
                                    </h2>
                                    <p>
                                        Mọi thắc mắc, đề xuất hoặc phản ánh liên quan đến Điều khoản Dịch vụ, xin vui lòng gửi về Trung tâm Trợ giúp của QuizKi AI để được tiếp nhận và xử lý thỏa đáng trên tinh thần hỗ trợ người học.
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

export default TermsScreen;
