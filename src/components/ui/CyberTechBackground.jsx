import React from 'react';

/**
 * CyberTechBackground Component
 * Renders a high-tech Cyber Matrix grid with glowing cyan/emerald radial orbs
 * and crisp digital matrix grid in both Dark and Light modes.
 */
const CyberTechBackground = ({ isDarkMode = true }) => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            {/* 1. Base Gradient Canvas */}
            <div
                className={`absolute inset-0 transition-colors duration-300 ${
                    isDarkMode
                        ? 'bg-gradient-to-b from-[#030712] via-[#051124] to-[#040916]'
                        : 'bg-gradient-to-b from-[#f0f9ff] via-[#e0f2fe] to-[#f8fafc]'
                }`}
            />

            {/* 2. Cyber Matrix Linear Grid Lines */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                    isDarkMode
                        ? 'bg-[linear-gradient(to_right,#06b6d418_1px,transparent_1px),linear-gradient(to_bottom,#06b6d418_1px,transparent_1px)] [background-size:36px_36px]'
                        : 'bg-[linear-gradient(to_right,#0284c718_1px,transparent_1px),linear-gradient(to_bottom,#0284c718_1px,transparent_1px)] [background-size:36px_36px]'
                }`}
            />

            {/* 3. Intersection Matrix Tech Dots */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                    isDarkMode
                        ? 'bg-[radial-gradient(#22d3ee_1.5px,transparent_1.5px)] [background-size:36px_36px] opacity-60'
                        : 'bg-[radial-gradient(#0284c7_1.5px,transparent_1.5px)] [background-size:36px_36px] opacity-70'
                }`}
            />

            {/* 4. Glowing Ambient Cyber Light Orbs */}
            {/* Orb 1: Top-Left Electric Cyan Glow */}
            <div
                className={`absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
                    isDarkMode ? 'bg-cyan-500/25' : 'bg-cyan-400/20'
                }`}
            />

            {/* Orb 2: Center-Right Electric Emerald Glow */}
            <div
                className={`absolute top-1/4 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
                    isDarkMode ? 'bg-emerald-600/20' : 'bg-emerald-400/15'
                }`}
            />

            {/* Orb 3: Bottom-Center Teal Glow */}
            <div
                className={`absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
                    isDarkMode ? 'bg-teal-500/20' : 'bg-teal-400/15'
                }`}
            />

            {/* 5. Horizon Laser Accent Beam */}
            <div
                className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 dark:via-cyan-300/70 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.6)]`}
            />

            {/* 6. Subtle Cyber Scanning Light Line across the upper quarter */}
            <div
                className={`absolute top-24 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 dark:via-cyan-400/30 to-transparent`}
            />
        </div>
    );
};

export default React.memo(CyberTechBackground);
