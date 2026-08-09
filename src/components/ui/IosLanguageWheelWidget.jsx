import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTargetLanguage, SUPPORTED_TARGET_LANGUAGES } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import { showToast } from '../../utils/toast';
import { IosWheelColumn } from './IosWheelPicker';

const IosLanguageWheelWidget = ({ isAdmin = false }) => {
    const { targetLanguage, setTargetLanguage } = useTargetLanguage();
    const { language: appLang, changeLanguage } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // Target Language Options (Japanese, English)
    const targetOptions = SUPPORTED_TARGET_LANGUAGES.map(lang => ({
        code: lang.code,
        name: lang.code === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh',
        flag: lang.flag,
        countryCode: lang.countryCode,
        disabled: lang.disabled
    }));

    // App Interface Language Options (Vietnamese, English)
    const appLangOptions = [
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', countryCode: 'VN' },
        { code: 'en', name: 'English', flag: '🇬🇧', countryCode: 'GB' }
    ];

    const handleTargetChange = (newCode) => {
        if (newCode === targetLanguage) return;

        if (newCode === 'en' && !isAdmin) {
            showToast('Tính năng học Tiếng Anh đang trong quá trình phát triển (BETA)!', 'info');
            return;
        }

        setTargetLanguage(newCode, isAdmin);
        showToast(`Đã chuyển sang ${newCode === 'en' ? 'Tiếng Anh (BETA)' : 'Tiếng Nhật'}!`, 'success');

        const path = location.pathname.toLowerCase();
        if (path.includes('/set') || path.includes('/study') || path.includes('/flashcard') || path.includes('/review') || path.includes('/kanji') || path.includes('/grammar') || path.includes('/kaiwa')) {
            setTimeout(() => {
                navigate('/vocab/sets');
            }, 150);
        } else {
            setTimeout(() => {
                window.location.reload();
            }, 200);
        }
    };

    const handleAppLangChange = (newCode) => {
        if (newCode === appLang) return;
        changeLanguage(newCode);
        showToast(`Đã đổi ngôn ngữ giao diện sang ${newCode === 'en' ? 'English' : 'Tiếng Việt'}!`, 'info');
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 shadow-sm space-y-1">
            {/* Header Titles */}
            <div className="grid grid-cols-2 text-[9px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase px-1 text-center tracking-wider border-b border-slate-100 dark:border-slate-800/80 pb-1">
                <span>🎯 MỤC TIÊU HỌC</span>
                <span>🌐 GIAO DIỆN</span>
            </div>

            {/* Dual Wheel Picker Columns (iOS Alarm Wheel Style) */}
            <div className="grid grid-cols-2 gap-1 items-center relative">
                {/* Center Divider Line */}
                <div className="absolute left-1/2 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800/80 -translate-x-1/2 z-20" />

                {/* Left Column: Target Language Wheel */}
                <IosWheelColumn
                    options={targetOptions}
                    value={targetLanguage}
                    onChange={handleTargetChange}
                />

                {/* Right Column: App Interface Language Wheel */}
                <IosWheelColumn
                    options={appLangOptions}
                    value={appLang}
                    onChange={handleAppLangChange}
                />
            </div>
        </div>
    );
};

export default IosLanguageWheelWidget;
