import React from 'react';

/**
 * CyberTechBackground Component
 * Renders a high-tech Cyber Grid Matrix background with ambient glowing orbs
 * supporting both Light Mode & Dark Mode across all screens.
 */
const CyberTechBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            {/* Tech Radial Dot Grid Matrix Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#06b6d4_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-30 dark:opacity-20"></div>

            {/* Glowing Ambient Light Orbs - Light Mode & Dark Mode */}
            {/* Orb 1: Top-Left Cyan/Sky Glow */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-400/20 dark:bg-cyan-500/25 rounded-full blur-[120px] dark:blur-[130px] animate-pulse"></div>

            {/* Orb 2: Top-Right / Center Electric Indigo Glow */}
            <div className="absolute top-1/4 -right-40 w-[30rem] h-[30rem] bg-indigo-500/15 dark:bg-indigo-600/25 rounded-full blur-[140px] dark:blur-[150px]"></div>

            {/* Orb 3: Bottom-Left Emerald/Teal Glow */}
            <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-teal-400/15 dark:bg-emerald-500/20 rounded-full blur-[130px] dark:blur-[140px]"></div>

            {/* Subtle Horizon Light Line Accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 dark:via-cyan-400/30 to-transparent"></div>
        </div>
    );
};

export default CyberTechBackground;
