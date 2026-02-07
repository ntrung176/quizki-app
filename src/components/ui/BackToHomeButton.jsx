import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../router';

/**
 * Nút về trang chủ - dùng chung cho tất cả các trang
 * @param {string} variant - 'icon' (chỉ icon) hoặc 'full' (có text)
 * @param {string} className - class CSS tùy chỉnh
 */
const BackToHomeButton = ({ variant = 'full', className = '' }) => {
    if (variant === 'icon') {
        return (
            <Link
                to={ROUTES.HOME}
                className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 ${className}`}
                title="Về trang chủ"
            >
                <Home className="w-5 h-5" />
            </Link>
        );
    }

    return (
        <Link
            to={ROUTES.HOME}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm ${className}`}
        >
            <ArrowLeft className="w-4 h-4" />
            <span>Trang chủ</span>
        </Link>
    );
};

export default BackToHomeButton;
