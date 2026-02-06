import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

const PaymentScreen = ({ displayName, onPaidClick, onLogout }) => {
    const [showPopup, setShowPopup] = useState(false);

    const handlePaidClick = () => {
        setShowPopup(true);
        onPaidClick();
        // Tự động đóng sau 3 giây
        setTimeout(() => {
            setShowPopup(false);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-8 md:p-10 border border-white/60 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">
                            Chào {displayName || 'bạn'} 👋
                        </h2>
                        <p className="mt-2 text-gray-500 text-sm">
                            Tài khoản của bạn đã được tạo và email đã được xác thực. Để tiếp tục sử dụng đầy đủ tính năng của QuizKi, vui lòng hoàn tất bước thanh toán kích hoạt bên phải.
                        </p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Quyền truy cập toàn bộ các tính năng học từ vựng, ôn tập SRS, thống kê.</li>
                        <li>• Dữ liệu được lưu trữ và đồng bộ giữa các thiết bị.</li>
                        <li>• Thanh toán một lần, sử dụng lâu dài cho tài khoản này.</li>
                    </ul>
                    <div className="text-xs text-gray-400">
                        Sau khi thanh toán, hãy nhấn nút <b>"Đã thanh toán"</b>. Admin sẽ kiểm tra và kích hoạt tài khoản cho bạn trong thời gian sớm nhất.
                    </div>
                </div>
                <div className="space-y-4 bg-gray-50 rounded-2xl border border-gray-100 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">Thông tin thanh toán</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                        <div>
                            <p className="text-gray-500 font-semibold">Chủ tài khoản</p>
                            <p className="text-gray-900 font-bold text-sm md:text-base">LÝ NGUYỄN NHẬT TRUNG</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold">STK MOMO / MB Bank</p>
                            <p className="text-gray-900 font-mono text-sm md:text-base font-bold">0376486121</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold">Nội dung chuyển khoản</p>
                            <p className="text-gray-900 text-[10px] md:text-xs bg-white border border-gray-200 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2">
                                QUIZKI - {displayName || 'TEN_TAI_KHOAN'}
                            </p>
                        </div>
                    </div>

                    {/* QR Codes */}
                    <div className="space-y-3 mt-4">
                        <p className="text-xs md:text-sm font-semibold text-gray-700">Quét mã QR để thanh toán:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col items-center">
                                <img
                                    src={`${import.meta.env.BASE_URL}qr-codes/qr-momo.png`}
                                    alt="QR Code MoMo"
                                    className="w-full max-w-[200px] h-auto rounded-lg shadow-sm"
                                />
                                <p className="text-[10px] md:text-xs text-gray-600 mt-2 text-center">MoMo / VietQR / Napas</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <img
                                    src={`${import.meta.env.BASE_URL}qr-codes/qr-vietqr.png`}
                                    alt="QR Code VietQR"
                                    className="w-full max-w-[200px] h-auto rounded-lg shadow-sm"
                                />
                                <p className="text-[10px] md:text-xs text-gray-600 mt-2 text-center">VietQR / Napas 247</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handlePaidClick}
                        className="w-full mt-2 px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-md"
                    >
                        Đã thanh toán
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="w-full px-4 py-2 text-[10px] md:text-xs font-semibold rounded-lg md:rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>

            {/* Popup thông báo */}
            {showPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPopup(false)}>
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-[280px] md:max-w-sm w-full p-4 md:p-5 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPopup(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800">Đã gửi yêu cầu thanh toán</h3>
                                <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">Vui lòng đợi ít phút</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentScreen;
