import React from 'react';

/**
 * CyberTechBackground Component
 * Renders a high-tech Cyber Grid Matrix background with ambient glowing orbs
 * using pure, GPU-accelerated radial gradients (zero rasterization lag on mobile).
 */
const CyberTechBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            {/* Base background color */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200"></div>

            {/* Tech Radial Dot Grid Matrix Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#06b6d4_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-30 dark:opacity-20"></div>

            {/* Glowing Ambient Light Orbs - GPU-friendly Radial Gradients */}
            {/* Orb 1: Top-Left Cyan/Sky Glow */}
            <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.22)_0%,transparent_70%)]"></div>

            {/* Orb 2: Top-Right / Center Electric Indigo Glow */}
            <div className="absolute top-1/4 -right-40 w-[32rem] h-[32rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(79,70,229,0.22)_0%,transparent_70%)]"></div>

            {/* Orb 3: Bottom-Left Emerald/Teal Glow */}
            <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.14)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(16,185,129,0.18)_0%,transparent_70%)]"></div>

            {/* Subtle Horizon Light Line Accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 dark:via-cyan-400/30 to-transparent"></div>
        </div>
    );
};

export default React.memo(CyberTechBackground);
