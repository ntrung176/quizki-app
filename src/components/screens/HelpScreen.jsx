import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    HelpCircle, Plus, Brain, Filter, Target, Zap, Repeat2,
    Keyboard, Ear, Lightbulb, Loader2, ArrowLeft
} from 'lucide-react';
import { ROUTES } from '../../router';

const HelpScreen = ({ isFirstTime, onConfirmFirstTime }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        await onConfirmFirstTime();
    };

    return (
        <div className="space-y-8">
            {/* Header with back button */}
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                {!isFirstTime && (
                    <Link
                        to={ROUTES.HOME}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                        title="Về trang chủ"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                )}
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center">
                        <HelpCircle className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" /> Hướng dẫn nhanh
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Làm chủ QuizKi trong 3 phút</p>
                </div>
            </div>

            {/* Mẹo thêm từ vựng */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-3">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center text-lg">
                    <Plus className="w-5 h-5 mr-2" /> Thêm Từ Vựng Hiệu Quả
                </h3>
                <ul className="space-y-3 text-blue-900 dark:text-blue-200 text-sm font-medium">
                    <li className="flex items-start">
                        <Brain className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0" />
                        <span>Với từ nhiều nghĩa, hãy <b>chọn Kanji chính xác</b> rồi mới dùng AI để lấy nghĩa chuẩn nhất.</span>
                    </li>
                    <li className="flex items-start">
                        <Filter className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0" />
                        <span><b>Từ đồng nghĩa:</b> Nếu thấy gợi ý không quen thuộc, hãy xoá bớt để tránh bị quá tải kiến thức.</span>
                    </li>
                    <li className="flex items-start">
                        <Target className="w-4 h-4 mr-2 mt-0.5 text-blue-500 shrink-0" />
                        <span><b>Mới bắt đầu:</b> Chỉ nên học khoảng <b>15 từ/ngày</b>. Đừng quá tham lam kẻo dễ bị "ngộp" và nản chí.</span>
                    </li>
                </ul>
            </div>

            {/* Mẹo học tập */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800 space-y-3">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center text-lg">
                    <Zap className="w-5 h-5 mr-2" /> Mẹo Học Tập Siêu Tốc
                </h3>
                <ul className="space-y-3 text-amber-900 dark:text-amber-200 text-sm font-medium">
                    <li className="flex items-start">
                        <Repeat2 className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" />
                        <span>Bắt đầu ôn tập với chế độ <b>Ý nghĩa</b> trước để nắm từ gốc.</span>
                    </li>
                    <li className="flex items-start">
                        <Keyboard className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" />
                        <span>Nếu quên, cứ ấn <b>Enter</b> để xem đáp án, sau đó <b>nhập lại từ đúng</b> để nhớ dai hơn.</span>
                    </li>
                    <li className="flex items-start">
                        <Ear className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" />
                        <span><b>Đa giác quan:</b> Nghe audio, đọc to thành tiếng và nhìn kỹ Kanji.</span>
                    </li>
                    <li className="flex items-start">
                        <Lightbulb className="w-4 h-4 mr-2 mt-0.5 text-amber-500 shrink-0" />
                        <span>Gặp từ khó? Hãy liên tưởng đến <b>từ cùng âm tiếng Việt</b> hoặc tự bịa ra một câu chuyện thú vị cho nó!</span>
                    </li>
                </ul>
            </div>

            {/* Quy tắc SRS */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Cơ chế SRS (Lặp lại ngắt quãng)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center font-bold mr-3 text-xs">1</span>
                        <span className="text-gray-600 dark:text-gray-300">Trả lời <b>Đúng</b> → Ôn lại ngày mai.</span>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mr-3 text-xs">2</span>
                        <span className="text-gray-600 dark:text-gray-300">Đúng liên tiếp → Giãn cách (3, 7, 30 ngày...).</span>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold mr-3 text-xs">!</span>
                        <span className="text-red-700 dark:text-red-400 font-medium">Trả lời <b>Sai</b> → Phải ôn lại ngay hôm nay.</span>
                    </div>
                </div>
            </div>

            {isFirstTime ? (
                <button
                    onClick={handleClick}
                    disabled={isLoading}
                    className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:-translate-y-1 transition-all"
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Đã hiểu, Bắt đầu ngay!"}
                </button>
            ) : (
                <Link
                    to={ROUTES.HOME}
                    className="block w-full py-4 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-center"
                >
                    Quay lại trang chủ
                </Link>
            )}
        </div>
    );
};

export default HelpScreen;
