import React, { createContext, useContext, useState } from 'react';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import ko from '../locales/ko.json';
import id from '../locales/id.json';
import th from '../locales/th.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', country: 'Việt Nam' },
    { code: 'en', name: 'English', flag: '🇺🇸', country: 'Global / US' },
    { code: 'zh', name: '中文', flag: '🇨🇳', country: 'China' },
    { code: 'ko', name: '한국어', flag: '🇰🇷', country: 'Korea' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', country: 'Indonesia' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭', country: 'Thailand' },
];

const dictionaries = { vi, en, zh, ko, id, th };

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

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, currentLangObj, SUPPORTED_LANGUAGES }}>
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
