import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6 md:p-12">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">Điều khoản dịch vụ</h1>
                    <p className="text-center text-teal-100 font-medium">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 space-y-8 text-base leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-sm">1</span>
                            Chấp nhận Điều khoản
                        </h2>
                        <p>
                            Bằng việc truy cập hoặc sử dụng ứng dụng học từ vựng Quizki ("Ứng dụng"), bạn đồng ý bị ràng buộc bởi các Điều khoản và Điều kiện ("Điều khoản") này. Nếu bạn KHÔNG ĐỒNG Ý với toàn bộ Điều khoản, vui lòng không sử dụng Ứng dụng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-sm">2</span>
                            Sử dụng hợp pháp
                        </h2>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            <li>Quizki là một nền tảng tạo và học flashcard. Bạn có trách nhiệm đảm bảo nội dung (từ vựng, câu tiếng Nhật) bạn thêm không vi phạm pháp luật hoặc đạo đức.</li>
                            <li>Tài liệu do chúng tôi cung cấp là tài nguyên học thuật (với nguồn mở, các ứng dụng API của bên thứ ba), mọi quyền tác giả thuộc về chủ sở hữu ban đầu.</li>
                            <li>Bạn không được phép bẻ khóa, sao chép code gốc, thu thập dữ liệu tự động hoặc phá hoại dịch vụ hệ thống của chúng tôi.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-sm">3</span>
                            Tính sẵn sàng và độ tin cậy
                        </h2>
                        <p>
                            Mặc dù chúng tôi rất nỗ lực cung cấp dịch vụ xuyên suốt (trên hạ tầng Google Firebase), tuy nhiên dữ liệu của ứng dụng trong giai đoạn Beta có nguy cơ bị reset do bảo trì.
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            <li>Ứng dụng được cung cấp miễn phí. Sự cố về tính chính xác của flashcard do AI tạo ra hoàn toàn mang tính chất tham khảo.</li>
                            <li>Người dùng nên tự kiểm chứng lại các từ vựng trước khi lưu dài hạn.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
                    &copy; {new Date().getFullYear()} Quizki App. Được phát triển để hỗ trợ việc học tập.
                </div>
            </div>
        </div>
    );
};

export default TermsScreen;
