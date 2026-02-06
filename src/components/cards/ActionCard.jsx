import React from 'react';

// ActionCard component - Liquid Glass Effect (iOS style)
const ActionCard = ({
    onClick,
    icon: IconComponent,
    title,
    count,
    gradient,
    disabled = false,
    description,
    hideCount = false
}) => {
    const Icon = IconComponent;

    // Map gradient colors to glass effect colors - More vibrant and eye-catching
    const getGlassColor = (gradient) => {
        if (gradient.includes('amber') || gradient.includes('orange')) {
            return 'bg-gradient-to-br from-amber-500/25 via-amber-600/20 to-orange-600/25 dark:from-amber-500/30 dark:via-amber-600/25 dark:to-orange-600/30 border-amber-400/70 dark:border-amber-500/60 shadow-amber-300/40 dark:shadow-amber-900/50';
        } else if (gradient.includes('purple') || gradient.includes('pink')) {
            return 'bg-gradient-to-br from-purple-600/25 via-purple-600/20 to-pink-600/25 dark:from-purple-600/30 dark:via-purple-600/25 dark:to-pink-600/30 border-purple-400/70 dark:border-purple-500/60 shadow-purple-300/40 dark:shadow-purple-900/50';
        } else if (gradient.includes('teal') || gradient.includes('emerald')) {
            return 'bg-gradient-to-br from-emerald-500/25 via-emerald-600/20 to-teal-600/25 dark:from-emerald-500/30 dark:via-emerald-600/25 dark:to-teal-600/30 border-emerald-400/70 dark:border-emerald-500/60 shadow-emerald-300/40 dark:shadow-emerald-900/50';
        } else if (gradient.includes('rose') || gradient.includes('red')) {
            return 'bg-gradient-to-br from-rose-500/25 via-rose-600/20 to-red-600/25 dark:from-rose-500/30 dark:via-rose-600/25 dark:to-red-600/30 border-rose-400/70 dark:border-rose-500/60 shadow-rose-300/40 dark:shadow-rose-900/50';
        } else if (gradient.includes('blue') || gradient.includes('cyan')) {
            return 'bg-gradient-to-br from-blue-500/25 via-blue-600/20 to-cyan-600/25 dark:from-blue-500/30 dark:via-blue-600/25 dark:to-cyan-600/30 border-blue-400/70 dark:border-blue-500/60 shadow-blue-300/40 dark:shadow-blue-900/50';
        } else if (gradient.includes('green')) {
            return 'bg-gradient-to-br from-green-500/25 via-green-600/20 to-emerald-600/25 dark:from-green-500/30 dark:via-green-600/25 dark:to-emerald-600/30 border-green-400/70 dark:border-green-500/60 shadow-green-300/40 dark:shadow-green-900/50';
        } else {
            return 'bg-gradient-to-br from-indigo-500/25 via-indigo-600/20 to-purple-600/25 dark:from-indigo-500/30 dark:via-indigo-600/25 dark:to-purple-600/30 border-indigo-400/70 dark:border-indigo-500/60 shadow-indigo-300/40 dark:shadow-indigo-900/50';
        }
    };

    const glassColor = getGlassColor(gradient);

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative overflow-hidden group flex items-center p-2 md:p-3 h-28 md:h-32 rounded-2xl md:rounded-3xl transition-all duration-300 w-[calc(50%-0.5rem)] md:w-[calc(50%-1rem)] max-w-xs md:max-w-sm text-left
                        backdrop-blur-xl ${glassColor} border
                        shadow-lg shadow-black/5 dark:shadow-black/20
                        ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]'}`}
        >
            {/* Liquid glass shine effect - More vibrant */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-3xl" />

            {/* Subtle inner glow - Enhanced */}
            <div className="absolute inset-[1px] bg-gradient-to-br from-white/20 via-white/10 to-transparent rounded-2xl md:rounded-3xl pointer-events-none" />

            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out rounded-2xl md:rounded-3xl pointer-events-none" />

            <div className="z-10 w-full flex items-center gap-2 md:gap-3 relative">
                {/* Icon với liquid glass effect */}
                <div className={`flex-shrink-0 w-10 h-24 md:w-14 md:h-32 rounded-xl md:rounded-2xl backdrop-blur-md flex items-center justify-center
                                ${disabled ? 'bg-gray-500/20 border border-gray-400/20' : 'bg-gradient-to-br from-white/40 via-white/30 to-white/20 dark:from-white/20 dark:via-white/15 dark:to-white/10 border border-white/50 dark:border-white/30 shadow-lg shadow-white/20 dark:shadow-white/10'}`}>
                    <Icon className={`w-5 h-5 md:w-7 md:h-7 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`} strokeWidth={2.5} />
                </div>

                {/* Text content bên phải */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between mb-0.5 md:mb-1">
                        <h3 className={`text-xs md:text-base font-extrabold tracking-tight truncate ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{title}</h3>
                        {!hideCount && typeof count !== 'undefined' && count > 0 && (
                            <span className={`backdrop-blur-md text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full flex-shrink-0 ml-1.5 border
                                            ${disabled ? 'bg-gray-500/20 border-gray-400/30 text-gray-400 dark:text-gray-500' : 'bg-white/40 dark:bg-white/20 border-white/40 dark:border-white/30 text-gray-700 dark:text-gray-200 shadow-sm'}`}>
                                {count} cần ôn
                            </span>
                        )}
                    </div>
                    <p className={`text-[10px] md:text-xs font-medium leading-snug ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>{description}</p>
                </div>
            </div>

            {/* Background Decoration - subtle */}
            <Icon className={`absolute -bottom-3 md:-bottom-4 -right-3 md:-right-4 w-24 h-24 md:w-32 md:h-32 group-hover:scale-110 transition-transform duration-500 ${disabled ? 'text-gray-300/5 dark:text-gray-600/5' : 'text-gray-400/5 dark:text-gray-500/5'}`} />
        </button>
    );
};

export default ActionCard;
