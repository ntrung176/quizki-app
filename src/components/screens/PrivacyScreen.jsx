import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6 md:p-12">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-8 text-white relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">Chính sách bảo mật</h1>
                    <p className="text-center text-sky-100 font-medium">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 space-y-8 text-base leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sm">1</span>
                            Mục đích thu thập dữ liệu
                        </h2>
                        <p>
                            Quizki cam kết bảo vệ quyền riêng tư của bạn. Việc thu thập địa chỉ email và tên hồ sơ từ Google (thông qua đăng nhập OAuth) chỉ nhằm mục đích duy nhất:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            <li>Lưu trữ tiến độ học tập (flashcard, kanji, JLPT) trên cơ sở dữ liệu để đồng bộ hóa giữa các thiết bị.</li>
                            <li>Định danh người dùng trong mục Bảng xếp hạng thi đua (Leaderboard).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sm">2</span>
                            Bảo mật thông tin
                        </h2>
                        <p>
                            Chúng tôi KHÔNG sử dụng mật khẩu của bạn (đăng nhập hoàn toàn xử lý bởi hệ thống Google an toàn). Chúng tôi cam kết:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            <li><strong>Không bán đổi:</strong> Không bán, cho thuê hoặc chia sẻ dữ liệu người dùng với bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc thương mại.</li>
                            <li><strong>Bảo vệ dữ liệu:</strong> Dữ liệu học tập được lưu trữ trên nền tảng Google Firebase được bảo mật và mã hóa.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sm">3</span>
                            Quyền của bạn
                        </h2>
                        <p>
                            Bạn có toàn quyền đối với dữ liệu cá nhân của mình:
                        </p>
                        <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                            <li>Bạn có thể tải xuống, sửa đổi hoặc xóa bất kỳ flashcard/kanji cá nhân nào.</li>
                            <li>Bạn có thể yêu cầu xóa toàn bộ tài khoản và dữ liệu liên quan bất cứ lúc nào thông qua phần "Cài đặt &gt; Xóa tài khoản". Mọi dữ liệu sẽ bị xóa hoàn toàn khỏi hệ thống của chúng tôi và không thể khôi phục.</li>
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

export default PrivacyScreen;
