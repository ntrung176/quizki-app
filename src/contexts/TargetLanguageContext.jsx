import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId, auth } from '../config/firebase';
import { showToast } from '../utils/toast';

export const SUPPORTED_TARGET_LANGUAGES = [
    { code: 'ja', name: 'Tiếng Nhật', nativeName: '日本語', flag: '🇯🇵', countryCode: 'jp', testName: 'JLPT', characterSystem: 'Kanji & Kana' },
    { code: 'en', name: 'Tiếng Anh', nativeName: 'English', flag: '🇬🇧', countryCode: 'gb', testName: 'IELTS / TOEIC', characterSystem: 'Alphabet & IPA', disabled: true },
];

const TargetLanguageContext = createContext();

export const TargetLanguageProvider = ({ children }) => {
    const [targetLanguage, setTargetLanguageState] = useState(() => {
        return localStorage.getItem('quizki_target_language') || 'ja';
    });

    const setTargetLanguage = async (newLang, isAdminOverride = false) => {
        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        const developerEmails = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
        const isUserAdmin = isAdminOverride || (!!adminEmailEnv && currentEmail === adminEmailEnv) || developerEmails.includes(currentEmail);

        if (newLang === 'en' && !isUserAdmin) {
            showToast('Tính năng học Tiếng Anh đang trong quá trình phát triển (Chỉ dành cho Admin thử nghiệm)!', 'info');
            return;
        }
        if (!SUPPORTED_TARGET_LANGUAGES.some(l => l.code === newLang)) return;
        setTargetLanguageState(newLang);
        localStorage.setItem('quizki_target_language', newLang);

        if (auth?.currentUser?.uid && db) {
            try {
                const userRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                await setDoc(userRef, { targetLanguage: newLang }, { merge: true });
            } catch (err) {
                console.warn('Could not sync targetLanguage to Firestore:', err);
            }
        }
    };

    useEffect(() => {
        const syncFromProfile = async () => {
            if (auth?.currentUser?.uid && db) {
                try {
                    const userRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists() && snap.data().targetLanguage) {
                        const cloudLang = snap.data().targetLanguage;
                        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
                        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
                        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
                        const developerEmails = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
                        const isUserAdmin = (!!adminEmailEnv && currentEmail === adminEmailEnv) || developerEmails.includes(currentEmail);

                        if (cloudLang === 'en' && !isUserAdmin) {
                            setTargetLanguageState('ja');
                            localStorage.setItem('quizki_target_language', 'ja');
                        } else if (SUPPORTED_TARGET_LANGUAGES.some(l => l.code === cloudLang)) {
                            setTargetLanguageState(cloudLang);
                            localStorage.setItem('quizki_target_language', cloudLang);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch user targetLanguage profile:', e);
                }
            }
        };
        syncFromProfile();
    }, [auth?.currentUser?.uid, auth?.currentUser?.email]);

    const activeTargetConfig = SUPPORTED_TARGET_LANGUAGES.find(l => l.code === targetLanguage) || SUPPORTED_TARGET_LANGUAGES[0];

    const value = useMemo(() => ({
        targetLanguage,
        setTargetLanguage,
        activeTargetConfig,
        isJapaneseMode: targetLanguage === 'ja',
        isEnglishMode: targetLanguage === 'en',
        SUPPORTED_TARGET_LANGUAGES
    }), [targetLanguage, setTargetLanguage, activeTargetConfig]);

    return (
        <TargetLanguageContext.Provider value={value}>
            {children}
        </TargetLanguageContext.Provider>
    );
};

export const useTargetLanguage = () => {
    const context = useContext(TargetLanguageContext);
    if (!context) {
        throw new Error('useTargetLanguage must be used within a TargetLanguageProvider');
    }
    return context;
};
