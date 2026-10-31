import React, { useMemo } from 'react';

/**
 * Japanese Vermilion Torii Gate (朱色の鳥居) & Mount Fuji (富士山) Background
 * Features:
 * - Authentic Japanese Shinto Torii Gate architecture with Kasagi, Shimaki, Nuki, and Hashira pillars.
 * - Symmetrical snow-capped Mount Fuji silhouette in the distance.
 * - Starry night sky with optional twinkling stars animation or calm static mode.
 * - Twilight Sunset variant with Kyoto dusk glow.
 * - Pure SVG & CSS GPU-accelerated rendering (zero raster lag, ultra-lightweight).
 */

// Generate a deterministic set of star coordinates so they don't jump around on re-renders
const GENERATED_STARS = Array.from({ length: 48 }, (_, i) => {
    // Deterministic pseudo-randomness based on index
    const seedX = ((i * 137.5) % 100);
    const seedY = (((i * 89.3) + 7) % 65); // keep stars in top 65% of screen
    const size = (i % 5 === 0) ? 2.5 : (i % 3 === 0) ? 2 : 1.2;
    const opacity = 0.35 + ((i % 7) * 0.09);
    const animDelay = (i * 0.37) % 3;
    const animDuration = 2.2 + ((i % 4) * 0.7);

    return {
        id: i,
        x: seedX,
        y: seedY,
        size,
        opacity,
        animDelay,
        animDuration,
    };
});

export const ToriiGateSvg = ({ isDarkMode = true, opacity = 1 }) => {
    return (
        <svg
            viewBox="0 0 600 480"
            className="w-full h-full select-none pointer-events-none"
            preserveAspectRatio="xMidYMax meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity }}
        >
            <defs>
                {/* Vermilion Torii Red Gradient */}
                <linearGradient id="toriiRed" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isDarkMode ? '#b91c1c' : '#c2410c'} />
                    <stop offset="50%" stopColor={isDarkMode ? '#ef4444' : '#ea580c'} />
                    <stop offset="100%" stopColor={isDarkMode ? '#991b1b' : '#9a3412'} />
                </linearGradient>

                {/* Torii Pillar Shading */}
                <linearGradient id="pillarLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isDarkMode ? '#7f1d1d' : '#9a3412'} />
                    <stop offset="40%" stopColor={isDarkMode ? '#ef4444' : '#f97316'} />
                    <stop offset="100%" stopColor={isDarkMode ? '#991b1b' : '#c2410c'} />
                </linearGradient>

                <linearGradient id="pillarRight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isDarkMode ? '#991b1b' : '#c2410c'} />
                    <stop offset="60%" stopColor={isDarkMode ? '#ef4444' : '#f97316'} />
                    <stop offset="100%" stopColor={isDarkMode ? '#7f1d1d' : '#9a3412'} />
                </linearGradient>

                {/* Kasagi Black Top Copper Ridge */}
                <linearGradient id="toriiRoofBlack" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDarkMode ? '#0f172a' : '#1e293b'} />
                    <stop offset="100%" stopColor={isDarkMode ? '#1e293b' : '#334155'} />
                </linearGradient>

                {/* Soft Torii Ambient Glow */}
                <filter id="toriiGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Torii Gate Structure */}
            <g id="ToriiGroup" filter={isDarkMode ? "url(#toriiGlow)" : undefined}>
                {/* 1. Daiishi (Stone Foundation Bases) */}
                <rect x="156" y="440" width="48" height="32" rx="4" fill={isDarkMode ? '#1e293b' : '#64748b'} />
                <rect x="396" y="440" width="48" height="32" rx="4" fill={isDarkMode ? '#1e293b' : '#64748b'} />
                {/* Black Nemaki lower pillar wraps */}
                <rect x="162" y="405" width="36" height="35" rx="2" fill={isDarkMode ? '#090d16' : '#1e293b'} />
                <rect x="402" y="405" width="36" height="35" rx="2" fill={isDarkMode ? '#090d16' : '#1e293b'} />

                {/* 2. Hashira (Two Main Cylindrical Pillars, angled inward ~3 deg) */}
                {/* Left Pillar */}
                <polygon points="174,130 196,130 198,405 162,405" fill="url(#pillarLeft)" />
                {/* Right Pillar */}
                <polygon points="404,130 426,130 438,405 402,405" fill="url(#pillarRight)" />

                {/* 3. Nuki (Lower Horizontal Beam extending beyond pillars) */}
                <rect x="120" y="195" width="360" height="24" rx="3" fill="url(#toriiRed)" />
                {/* Wedge pins (Kusabi) on outer edges of Nuki */}
                <polygon points="135,190 142,190 139,224 132,224" fill={isDarkMode ? '#0f172a' : '#1e293b'} />
                <polygon points="458,190 465,190 468,224 461,224" fill={isDarkMode ? '#0f172a' : '#1e293b'} />

                {/* 4. Gaku-zuka (Center Tablet Plaque Support) */}
                <rect x="286" y="140" width="28" height="58" rx="2" fill={isDarkMode ? '#0f172a' : '#1e293b'} />
                <rect x="290" y="144" width="20" height="50" rx="1" fill={isDarkMode ? '#b45309' : '#d97706'} />
                <text
                    x="300"
                    y="174"
                    fill={isDarkMode ? '#fef08a' : '#ffffff'}
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="serif"
                >
                    道
                </text>

                {/* 5. Shimaki (Second Horizontal Lintel directly under Kasagi) */}
                <path
                    d="M 100 135 L 500 135 L 490 152 L 110 152 Z"
                    fill="url(#toriiRed)"
                />

                {/* 6. Kasagi (Upper Curved Lintel with upward swooping ends) */}
                <path
                    d="M 60 120 Q 300 130 540 120 L 550 102 Q 300 114 50 102 Z"
                    fill="url(#toriiRed)"
                />

                {/* 7. Black Copper Roof Ridge on top of Kasagi */}
                <path
                    d="M 46 104 Q 300 116 554 104 L 550 96 Q 300 108 50 96 Z"
                    fill="url(#toriiRoofBlack)"
                />
            </g>
        </svg>
    );
};

export const MountFujiSvg = ({ isDarkMode = true, opacity = 1 }) => {
    return (
        <svg
            viewBox="0 0 1000 400"
            className="w-full h-full select-none pointer-events-none"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity }}
        >
            <defs>
                <linearGradient id="fujiBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDarkMode ? '#1e1b4b' : '#cbd5e1'} stopOpacity="0.85" />
                    <stop offset="60%" stopColor={isDarkMode ? '#0f172a' : '#e2e8f0'} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#f8fafc'} stopOpacity="1" />
                </linearGradient>

                <linearGradient id="fujiSnow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDarkMode ? '#f8fafc' : '#ffffff'} stopOpacity="0.95" />
                    <stop offset="70%" stopColor={isDarkMode ? '#cbd5e1' : '#f1f5f9'} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={isDarkMode ? '#64748b' : '#cbd5e1'} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Symmetrical gentle volcano curves of Mt. Fuji */}
            <path
                d="M 120 400 Q 380 320 450 120 L 550 120 Q 620 320 880 400 Z"
                fill="url(#fujiBody)"
            />

            {/* Distinct jagged snow cap pattern */}
            <path
                d="M 450 120 
                   Q 470 180 475 220 
                   Q 485 190 495 240 
                   Q 500 200 505 230 
                   Q 515 190 525 245 
                   Q 530 200 538 220 
                   Q 545 170 550 120 Z"
                fill="url(#fujiSnow)"
            />

            {/* Subtle crater rim curve at top */}
            <ellipse cx="500" cy="120" rx="50" ry="6" fill={isDarkMode ? '#0f172a' : '#e2e8f0'} />
        </svg>
    );
};

export const ToriiStarsBackground = React.memo(({ isDarkMode = true, isAnimated = true }) => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            {/* 1. Deep Midnight Night Sky Gradient */}
            <div
                className={`absolute inset-0 transition-colors duration-300 ${
                    isDarkMode
                        ? 'bg-gradient-to-b from-[#060913] via-[#0b1328] to-[#0e172e]'
                        : 'bg-gradient-to-b from-[#eef4ff] via-[#f1f5fd] to-[#f8fafc]'
                }`}
            />

            {/* 2. Ambient Moonlight / Halo Glow */}
            <div
                className={`absolute top-8 sm:top-14 right-1/4 sm:right-1/3 w-64 h-64 sm:w-80 sm:h-80 rounded-full pointer-events-none blur-3xl transition-opacity duration-300 ${
                    isDarkMode ? 'bg-indigo-400/10' : 'bg-amber-200/20'
                }`}
            />

            {/* 3. Luminous Crescent / Full Moon */}
            <div
                className={`absolute top-12 sm:top-16 right-16 sm:right-32 w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-300 ${
                    isDarkMode
                        ? 'bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200/60 shadow-[0_0_40px_rgba(254,243,199,0.35)]'
                        : 'bg-gradient-to-br from-amber-200/50 via-amber-100/40 to-transparent'
                }`}
            />

            {/* 4. Starfield (Twinkling or Static based on isAnimated) */}
            <div className="absolute inset-0 pointer-events-none">
                {GENERATED_STARS.map((star) => (
                    <div
                        key={star.id}
                        className={`absolute rounded-full ${
                            isDarkMode ? 'bg-white' : 'bg-slate-400'
                        }`}
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            opacity: isDarkMode ? star.opacity : star.opacity * 0.4,
                            animation: isAnimated
                                ? `pulse ${star.animDuration}s cubic-bezier(0.4, 0, 0.6, 1) infinite`
                                : 'none',
                            animationDelay: isAnimated ? `${star.animDelay}s` : '0s',
                        }}
                    />
                ))}
            </div>

            {/* 5. Distant Mount Fuji Silhouette */}
            <div className="absolute bottom-0 inset-x-0 h-44 sm:h-64 pointer-events-none">
                <MountFujiSvg isDarkMode={isDarkMode} opacity={isDarkMode ? 0.65 : 0.4} />
            </div>

            {/* 6. Distant Pine / Mountain Ridgeline */}
            <div
                className={`absolute bottom-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-t pointer-events-none ${
                    isDarkMode ? 'from-[#070b14] via-[#091122]/80 to-transparent' : 'from-[#e2e8f0] via-[#f1f5f9]/80 to-transparent'
                }`}
            />

            {/* 7. Majestic Red Torii Gate (Subtle, balanced so content remains 100% readable) */}
            <div className="absolute bottom-0 right-4 sm:right-16 md:right-28 w-72 sm:w-96 md:w-[480px] h-60 sm:h-80 md:h-[400px] pointer-events-none transition-opacity duration-300">
                <ToriiGateSvg isDarkMode={isDarkMode} opacity={isDarkMode ? 0.38 : 0.28} />
            </div>

            {/* Subtle Horizon Mist Accent */}
            <div
                className={`absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t pointer-events-none ${
                    isDarkMode ? 'from-[#060913]/90 to-transparent' : 'from-[#f8fafc]/90 to-transparent'
                }`}
            />
        </div>
    );
});

export const ToriiSunsetBackground = React.memo(({ isDarkMode = true }) => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            {/* 1. Serene Kyoto Twilight Sunset Gradient (100% Static, Peaceful) */}
            <div
                className={`absolute inset-0 transition-colors duration-300 ${
                    isDarkMode
                        ? 'bg-gradient-to-b from-[#160a22] via-[#2f1025] to-[#11091a]'
                        : 'bg-gradient-to-b from-[#fdf2f8] via-[#fff1f2] to-[#faf5ff]'
                }`}
            />

            {/* 2. Giant Crimson / Amber Setting Sun behind Mount Fuji */}
            <div
                className={`absolute bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2 w-64 h-64 sm:w-96 sm:h-96 rounded-full pointer-events-none blur-xl transition-all duration-300 ${
                    isDarkMode
                        ? 'bg-gradient-to-t from-red-600/40 via-amber-500/30 to-rose-500/20 shadow-[0_0_90px_rgba(239,68,68,0.3)]'
                        : 'bg-gradient-to-t from-rose-400/25 via-amber-300/20 to-transparent'
                }`}
            />

            {/* 3. Distant Mount Fuji Silhouette */}
            <div className="absolute bottom-0 inset-x-0 h-44 sm:h-64 pointer-events-none">
                <MountFujiSvg isDarkMode={isDarkMode} opacity={isDarkMode ? 0.75 : 0.45} />
            </div>

            {/* 4. Layered Dusk Mist */}
            <div
                className={`absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t pointer-events-none ${
                    isDarkMode ? 'from-[#11091a] via-[#1f0d24]/80 to-transparent' : 'from-[#faf5ff] via-[#fce7f3]/80 to-transparent'
                }`}
            />

            {/* 5. Serene Red Torii Gate standing peacefully in the twilight */}
            <div className="absolute bottom-0 right-4 sm:right-16 md:right-28 w-72 sm:w-96 md:w-[480px] h-60 sm:h-80 md:h-[400px] pointer-events-none transition-opacity duration-300">
                <ToriiGateSvg isDarkMode={isDarkMode} opacity={isDarkMode ? 0.42 : 0.3} />
            </div>

            {/* Static horizon glow */}
            <div
                className={`absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t pointer-events-none ${
                    isDarkMode ? 'from-[#11091a]/90 to-transparent' : 'from-[#faf5ff]/90 to-transparent'
                }`}
            />
        </div>
    );
});

export const MinimalBackground = React.memo(({ isDarkMode = true }) => {
    return (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-200" />
            <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-30" />
        </div>
    );
});

