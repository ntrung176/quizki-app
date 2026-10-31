import { useState, useEffect, useCallback } from 'react';

export const BG_THEMES = {
    TORII_STARS: 'torii-stars',
    TORII_SUNSET: 'torii-sunset',
    CYBER_TECH: 'cyber-tech',
    MINIMAL: 'minimal',
};

export const BG_THEME_LIST = [
    {
        id: BG_THEMES.TORII_STARS,
        nameKey: 'settings.general.bgThemeToriiStars',
        descKey: 'settings.general.bgThemeToriiStarsDesc',
        icon: '⛩️',
        hasAnimationOption: true,
        gradient: 'from-slate-950 via-indigo-950 to-slate-900',
        badge: 'Recommended',
    },
    {
        id: BG_THEMES.TORII_SUNSET,
        nameKey: 'settings.general.bgThemeToriiSunset',
        descKey: 'settings.general.bgThemeToriiSunsetDesc',
        icon: '🌅',
        hasAnimationOption: false,
        gradient: 'from-[#1e0e24] via-[#3d1326] to-[#120c1d]',
        badge: 'Serene',
    },
    {
        id: BG_THEMES.CYBER_TECH,
        nameKey: 'settings.general.bgThemeCyber',
        descKey: 'settings.general.bgThemeCyberDesc',
        icon: '⚡',
        hasAnimationOption: false,
        gradient: 'from-slate-950 via-cyan-950/40 to-slate-900',
        badge: 'Tech',
    },
    {
        id: BG_THEMES.MINIMAL,
        nameKey: 'settings.general.bgThemeMinimal',
        descKey: 'settings.general.bgThemeMinimalDesc',
        icon: '🍃',
        hasAnimationOption: false,
        gradient: 'from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900',
        badge: 'Focus',
    },
];

const STORAGE_KEY_THEME = 'quizki_bg_theme';
const STORAGE_KEY_ANIMATED = 'quizki_bg_stars_animated';
const EVENT_NAME = 'quizki-bg-theme-changed';

/**
 * Custom hook to read and update study background theme and animation state
 */
export function useAppBackground() {
    const [bgTheme, setBgThemeState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_THEME);
            if (saved && Object.values(BG_THEMES).includes(saved)) {
                return saved;
            }
            return BG_THEMES.TORII_STARS;
        } catch {
            return BG_THEMES.TORII_STARS;
        }
    });

    const [isAnimated, setIsAnimatedState] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_ANIMATED);
            return saved === null ? true : saved === 'true';
        } catch {
            return true;
        }
    });

    useEffect(() => {
        const handleSync = (e) => {
            if (e?.detail) {
                if (e.detail.theme !== undefined) setBgThemeState(e.detail.theme);
                if (e.detail.animated !== undefined) setIsAnimatedState(e.detail.animated);
            } else {
                try {
                    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
                    setBgThemeState(
                        savedTheme && Object.values(BG_THEMES).includes(savedTheme)
                            ? savedTheme
                            : BG_THEMES.TORII_STARS
                    );
                    const savedAnim = localStorage.getItem(STORAGE_KEY_ANIMATED);
                    setIsAnimatedState(savedAnim === null ? true : savedAnim === 'true');
                } catch {
                    // ignore
                }
            }
        };

        window.addEventListener(EVENT_NAME, handleSync);
        return () => window.removeEventListener(EVENT_NAME, handleSync);
    }, []);

    const setBgTheme = useCallback((themeId) => {
        try {
            localStorage.setItem(STORAGE_KEY_THEME, themeId);
        } catch (e) {
            console.warn('Failed to save bg theme to localStorage', e);
        }
        setBgThemeState(themeId);
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { theme: themeId } }));
    }, []);

    const setIsAnimated = useCallback((animated) => {
        try {
            localStorage.setItem(STORAGE_KEY_ANIMATED, String(animated));
        } catch (e) {
            console.warn('Failed to save bg animation to localStorage', e);
        }
        setIsAnimatedState(animated);
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { animated } }));
    }, []);

    return {
        bgTheme,
        isAnimated,
        setBgTheme,
        setIsAnimated,
        themes: BG_THEME_LIST,
    };
}

