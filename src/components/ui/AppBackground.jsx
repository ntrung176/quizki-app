import React from 'react';
import { useAppBackground, BG_THEMES } from '../../hooks/useAppBackground';
import { ToriiStarsBackground, ToriiSunsetBackground, MinimalBackground } from './ToriiBackground';
import CyberTechBackground from './CyberTechBackground';

/**
 * AppBackground Router Component
 * Dynamically renders the selected background theme with smooth transitions:
 * - 'torii-stars': Japanese Vermilion Torii Gate with Starry Night Sky (Twinkling or Static)
 * - 'torii-sunset': Japanese Vermilion Torii Gate with Kyoto Twilight Dusk (100% Static)
 * - 'cyber-tech': Cyber Matrix Grid with glowing cyan/indigo radial orbs
 * - 'minimal': Clean minimal dot grid for zero-distraction focus
 */
const AppBackground = ({ isDarkMode = true }) => {
    const { bgTheme, isAnimated } = useAppBackground();

    switch (bgTheme) {
        case BG_THEMES.TORII_SUNSET:
            return <ToriiSunsetBackground isDarkMode={isDarkMode} />;

        case BG_THEMES.CYBER_TECH:
            return <CyberTechBackground isDarkMode={isDarkMode} />;

        case BG_THEMES.MINIMAL:
            return <MinimalBackground isDarkMode={isDarkMode} />;

        case BG_THEMES.TORII_STARS:
        default:
            return <ToriiStarsBackground isDarkMode={isDarkMode} isAnimated={isAnimated} />;
    }
};

export default React.memo(AppBackground);

