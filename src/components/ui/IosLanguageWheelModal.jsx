import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Globe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTargetLanguage, SUPPORTED_TARGET_LANGUAGES } from '../../context/TargetLanguageContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import { showToast } from '../../utils/toast';
import FlagIcon from './FlagIcon';

const ITEM_HEIGHT = 48; // height of each wheel item

const WheelColumn = ({ options, value, onChange, disabledValues = [] }) => {
    const containerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    const selectedIndex = Math.max(0, options.findIndex(opt => opt.code === value));

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
        }
    }, [value]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = setTimeout(() => {
            if (!containerRef.current) return;
            const scrollTop = containerRef.current.scrollTop;
            const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));

            if (options[clampedIndex] && options[clampedIndex].code !== value) {
                onChange(options[clampedIndex].code);
            }
        }, 100);
    };

    const handleItemClick = (index, code) => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: index * ITEM_HEIGHT,
                behavior: 'smooth'
            });
        }
        onChange(code);
    };

    return (
        <div className="relative h-[192px] w-full overflow-hidden select-none touch-pan-y">
            {/* iOS Glass Center Selection Bar */}
            <div className="absolute left-1 right-1 top-[72px] h-[48px] pointer-events-none rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 shadow-inner z-10" />

            {/* Top Fade Mask */}
            <div className="absolute top-0 left-0 right-0 h-[72px] bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none" />

            {/* Bottom Fade Mask */}
            <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-20 pointer-events-none" />

            {/* Scroll Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[72px]"
                style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {options.map((option, idx) => {
                    const isSelected = option.code === value;
                    const isDisabled = disabledValues.includes(option.code);

                    return (
                        <div
                            key={option.code}
                            onClick={() => !isDisabled && handleItemClick(idx, option.code)}
                            className={`h-[48px] snap-center flex items-center justify-center gap-2.5 px-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
                                isDisabled
                                    ? 'opacity-30 cursor-not-allowed text-slate-500'
                                    : isSelected
                                    ? 'text-cyan-400 scale-105 font-extrabold z-30'
                                    : 'text-slate-400 scale-90 opacity-50 hover:opacity-90'
                            }`}
                        >
                            {option.flag && (
                                <FlagIcon
                                    countryCode={option.countryCode}
                                    fallbackFlag={option.flag}
                                    className="w-5 h-3.5 object-cover rounded-xs shrink-0 shadow-sm"
                                />
                            )}
                            <span className="truncate">{option.name || option.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const IosLanguageWheelModal = ({ isOpen, onClose, isAdmin = false }) => {
    const { targetLanguage, setTargetLanguage } = useTargetLanguage();
    const { language: appLang, changeLanguage } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // Temporary selection state until user clicks 'Done'
    const [tempTargetLang, setTempTargetLang] = useState(targetLanguage);
    const [tempAppLang, setTempAppLang] = useState(appLang);

    useEffect(() => {
        if (isOpen) {
            setTempTargetLang(targetLanguage);
            setTempAppLang(appLang);
        }
    }, [isOpen, targetLanguage, appLang]);

    if (!isOpen) return null;

    const targetOptions = SUPPORTED_TARGET_LANGUAGES.map(lang => ({
        code: lang.code,
        name: lang.code === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh',
        flag: lang.flag,
        countryCode: lang.countryCode,
        disabled: lang.disabled
    }));

    const appLangOptions = (SUPPORTED_LANGUAGES || []).map(lang => ({
        code: lang.code,
        name: lang.name,
        flag: lang.flag,
        countryCode: lang.countryCode
    }));

    const handleApply = () => {
        let hasTargetChanged = false;

        if (tempTargetLang !== targetLanguage) {
            if (tempTargetLang === 'en' && !isAdmin) {
                showToast('Tính năng học Tiếng Anh đang trong quá trình phát triển (BETA)!', 'info');
            } else {
                setTargetLanguage(tempTargetLang, isAdmin);
                showToast(`Đã chuyển sang ${tempTargetLang === 'en' ? 'Tiếng Anh (BETA)' : 'Tiếng Nhật'}!`, 'success');
                hasTargetChanged = true;
            }
        }

        if (tempAppLang !== appLang) {
            changeLanguage(tempAppLang);
            showToast('Đã cập nhật ngôn ngữ giao diện!', 'info');
        }

        onClose();

        if (hasTargetChanged) {
            const path = location.pathname.toLowerCase();
            if (path.includes('/set') || path.includes('/study') || path.includes('/flashcard') || path.includes('/review') || path.includes('/kanji') || path.includes('/grammar') || path.includes('/kaiwa')) {
                setTimeout(() => {
                    navigate('/vocab/sets');
                }, 150);
            }
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white space-y-6 animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white tracking-tight">Ngôn ngữ học & Giao diện</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* iOS Dual Wheel Roller */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-inner">
                    <div className="grid grid-cols-2 text-[10px] font-black font-mono text-slate-400 uppercase text-center tracking-wider pb-2 border-b border-slate-800/80">
                        <span>🎯 Mục Tiêu Học</span>
                        <span>🌐 Giao Diện</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 relative mt-2">
                        {/* Center Divider Line */}
                        <div className="absolute left-1/2 top-2 bottom-2 w-px bg-slate-800 -translate-x-1/2 z-30" />

                        {/* Column 1: Target Language */}
                        <WheelColumn
                            options={targetOptions}
                            value={tempTargetLang}
                            onChange={setTempTargetLang}
                        />

                        {/* Column 2: App Interface Language */}
                        <WheelColumn
                            options={appLangOptions}
                            value={tempAppLang}
                            onChange={setTempAppLang}
                        />
                    </div>
                </div>

                {/* Done Button */}
                <button
                    onClick={handleApply}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
                >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Hoàn tất</span>
                </button>
            </div>
        </div>,
        document.body
    );
};

export default IosLanguageWheelModal;
