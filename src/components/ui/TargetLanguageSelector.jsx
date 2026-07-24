import React, { useState, useRef, useEffect } from 'react';
import { useTargetLanguage, SUPPORTED_TARGET_LANGUAGES } from '../../context/TargetLanguageContext';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { showToast } from '../../utils/toast';

const TargetLanguageSelector = ({ minimal = false, isAdmin = false }) => {
    const { targetLanguage, setTargetLanguage, activeTargetConfig } = useTargetLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectLanguage = (langCode) => {
        if (langCode === 'en' && !isAdmin) {
            setIsOpen(false);
            showToast('Tính năng đang phát triển', 'info');
            return;
        }

        setTargetLanguage(langCode);
        setIsOpen(false);
    };

    if (minimal) {
        return (
            <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    title={`Ngôn ngữ muốn học: ${activeTargetConfig.name}`}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                    <span>{activeTargetConfig.flag}</span>
                </button>

                {isOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 tracking-wider">
                            NGÔN NGỮ MUỐN HỌC
                        </div>
                        {SUPPORTED_TARGET_LANGUAGES.map((lang) => {
                            const isSelected = targetLanguage === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => handleSelectLanguage(lang.code)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-sm">{lang.flag}</span>
                                        <span>{lang.name}</span>
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
                <span className="text-base">{activeTargetConfig.flag}</span>
                <span className="hidden sm:inline font-mono">Target: <strong className="text-indigo-600 dark:text-indigo-400">{activeTargetConfig.name}</strong></span>
                <span className="sm:hidden font-mono">{activeTargetConfig.code.toUpperCase()}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        <span>NGÔN NGỮ MUỐN HỌC</span>
                    </div>

                    <div className="space-y-1 pt-1">
                        {SUPPORTED_TARGET_LANGUAGES.map((lang) => {
                            const isSelected = targetLanguage === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => handleSelectLanguage(lang.code)}
                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/60 dark:to-sky-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-xl drop-shadow-sm">{lang.flag}</span>
                                        <div className="text-left">
                                            <div className="leading-tight">{lang.name}</div>
                                            <div className="text-[9px] font-normal text-slate-400 font-mono mt-0.5">{lang.testName} • {lang.characterSystem}</div>
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TargetLanguageSelector;
