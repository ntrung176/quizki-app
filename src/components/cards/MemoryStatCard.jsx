import React from 'react';

// MemoryStatCard - displays memory statistics with icon and color
const MemoryStatCard = ({ title, count, icon: IconComponent, color, subtext }) => {
    const Icon = IconComponent;

    return (
        <div className={`relative overflow-hidden p-2 md:p-3 rounded-lg md:rounded-xl border transition-all duration-300 ${color.bg} ${color.border} group h-full`}>
            {/* Glow background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute -inset-10 bg-gradient-to-br from-white/40 via-transparent to-white/10 blur-2xl" />
            </div>

            {/* Animated top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-lg md:text-2xl font-black text-gray-900 dark:text-gray-100 drop-shadow-sm">{count}</p>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-0.5">{title}</p>
                    {subtext && <p className="text-[8px] md:text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{subtext}</p>}
                </div>
                <div className={`p-1.5 md:p-2 rounded-md md:rounded-lg ${color.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 flex-shrink-0`}>
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color.text}`} />
                </div>
            </div>
        </div>
    );
};

export default MemoryStatCard;
