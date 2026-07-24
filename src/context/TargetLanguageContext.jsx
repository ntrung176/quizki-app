import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, appId, auth } from '../config/firebase';

export const SUPPORTED_TARGET_LANGUAGES = [
    { code: 'ja', name: 'Tiếng Nhật', nativeName: '日本語', flag: '🇯🇵', testName: 'JLPT', characterSystem: 'Kanji & Kana' },
    { code: 'en', name: 'Tiếng Anh', nativeName: 'English', flag: '🇬🇧', testName: 'IELTS / TOEIC', characterSystem: 'Alphabet & IPA' },
];

const TargetLanguageContext = createContext();

export const TargetLanguageProvider = ({ children }) => {
    const [targetLanguage, setTargetLanguageState] = useState(() => {
        return localStorage.getItem('quizki_target_language') || 'ja';
    });

    const setTargetLanguage = async (newLang) => {
        if (!SUPPORTED_TARGET_LANGUAGES.some(l => l.code === newLang)) return;
        setTargetLanguageState(newLang);
        localStorage.setItem('quizki_target_language', newLang);

        // Sync with user profile in Firebase if logged in
        if (auth?.currentUser?.uid && db) {
            try {
                const userRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                await updateDoc(userRef, { targetLanguage: newLang });
            } catch (err) {
                console.warn('Could not sync targetLanguage to Firestore:', err);
            }
        }
    };

    // Load initial target language from Firestore profile if available
    useEffect(() => {
        const syncFromProfile = async () => {
            if (auth?.currentUser?.uid && db) {
                try {
                    const userRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists() && snap.data().targetLanguage) {
                        const cloudLang = snap.data().targetLanguage;
                        if (cloudLang !== targetLanguage && SUPPORTED_TARGET_LANGUAGES.some(l => l.code === cloudLang)) {
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
    }, [auth?.currentUser?.uid]);

    const activeTargetConfig = SUPPORTED_TARGET_LANGUAGES.find(l => l.code === targetLanguage) || SUPPORTED_TARGET_LANGUAGES[0];

    return (
        <TargetLanguageContext.Provider value={{
            targetLanguage,
            setTargetLanguage,
            activeTargetConfig,
            isJapaneseMode: targetLanguage === 'ja',
            isEnglishMode: targetLanguage === 'en',
            SUPPORTED_TARGET_LANGUAGES
        }}>
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
