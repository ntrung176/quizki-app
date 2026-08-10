import React, { createContext, useContext, useState, useMemo } from 'react';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zh from '../locales/zh.json';
import ko from '../locales/ko.json';
import id from '../locales/id.json';
import th from '../locales/th.json';
import my from '../locales/my.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', countryCode: 'vn', country: 'Việt Nam' },
    { code: 'en', name: 'English', flag: '🇺🇸', countryCode: 'us', country: 'Global / US' },
    { code: 'ja', name: '日本語', flag: '🇯🇵', countryCode: 'jp', country: 'Japan' },
    { code: 'zh', name: '中文', flag: '🇨🇳', countryCode: 'cn', country: 'China' },
    { code: 'ko', name: '한국어', flag: '🇰🇷', countryCode: 'kr', country: 'Korea' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', countryCode: 'id', country: 'Indonesia' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭', countryCode: 'th', country: 'Thailand' },
    { code: 'my', name: 'မြန်မာစာ', flag: '🇲🇲', countryCode: 'mm', country: 'Myanmar' },
];

const dictionaries = { vi, en, ja, zh, ko, id, th, my };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        try {
            return localStorage.getItem('quizki_language') || 'vi';
        } catch (e) {
            return 'vi';
        }
    });

    const changeLanguage = (code) => {
        if (dictionaries[code]) {
            setLanguage(code);
            try {
                localStorage.setItem('quizki_language', code);
            } catch (e) {}
        }
    };

    const t = (keyPath, fallback = '') => {
        const dict = dictionaries[language] || dictionaries['vi'];
        const keys = keyPath.split('.');
        let current = dict;
        for (const k of keys) {
            if (current && current[k] !== undefined) {
                current = current[k];
            } else {
                let fallbackCurrent = dictionaries['vi'];
                for (const fk of keys) {
                    if (fallbackCurrent && fallbackCurrent[fk] !== undefined) {
                        fallbackCurrent = fallbackCurrent[fk];
                    } else {
                        return fallback || keyPath;
                    }
                }
                return fallbackCurrent;
            }
        }
        return current;
    };

    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

    const value = useMemo(() => ({
        language,
        setLanguage: changeLanguage,
        t,
        currentLangObj,
        SUPPORTED_LANGUAGES
    }), [language, changeLanguage, currentLangObj]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        return {
            language: 'vi',
            setLanguage: () => {},
            t: (keyPath, fallback = '') => fallback || keyPath,
            currentLangObj: SUPPORTED_LANGUAGES[0],
            SUPPORTED_LANGUAGES
        };
    }
    return context;
};
