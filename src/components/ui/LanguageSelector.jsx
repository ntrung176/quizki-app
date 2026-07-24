import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LanguageSelector = ({ compact = false, minimal = false, direction = 'up' }) => {
    const { language, setLanguage, currentLangObj, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuPositionClass = direction === 'up' 
        ? 'bottom-full mb-2 left-0' 
        : 'top-full mt-2 right-0';

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                    minimal
                        ? 'w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-base'
                        : compact
                            ? 'px-2.5 py-1.5 rounded-xl gap-1.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'px-3 py-2 rounded-xl gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold hover:border-cyan-500/50'
                }`}
                title={t('common.selectLanguage', 'Chọn ngôn ngữ')}
            >
                <span className="text-base select-none leading-none">{currentLangObj.flag}</span>
                {!minimal && <span className="font-mono uppercase font-black">{currentLangObj.code}</span>}
                {!minimal && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && (
                <div className={`absolute ${menuPositionClass} w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-cyan-500" />
                            {t('common.selectLanguage')}
                        </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                        {SUPPORTED_LANGUAGES.map((lang) => {
                            const isSelected = language === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer text-left ${
                                        isSelected
                                            ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg select-none">{lang.flag}</span>
                                        <div>
                                            <p className="font-semibold leading-none">{lang.name}</p>
                                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{lang.country}</p>
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-cyan-500 stroke-[3]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
