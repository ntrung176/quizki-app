import React, { useRef, useEffect, useState } from 'react';
import FlagIcon from './FlagIcon';

const ITEM_HEIGHT = 40; // height of each item in px

export const IosWheelColumn = ({ options, value, onChange, disabledValues = [] }) => {
    const containerRef = useRef(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

    const selectedIndex = Math.max(0, options.findIndex(opt => opt.code === value));

    // Initial scroll positioning
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
        }
    }, []);

    // Handle scroll snapping detection
    const handleScroll = () => {
        if (!containerRef.current) return;
        
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = setTimeout(() => {
            if (!containerRef.current) return;
            const scrollTop = containerRef.current.scrollTop;
            const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));
            
            if (options[clampedIndex] && options[clampedIndex].code !== value) {
                onChange(options[clampedIndex].code);
            }
        }, 120);
    };

    const handleItemClick = (index, code) => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: index * ITEM_HEIGHT,
                behavior: 'smooth'
            });
        }
        onChange(code);
    };

    return (
        <div className="relative h-[120px] w-full overflow-hidden select-none touch-pan-y">
            {/* iOS Center Selection Bar Overlay */}
            <div 
                className="absolute left-0 right-0 top-[40px] h-[40px] pointer-events-none rounded-xl bg-slate-100/80 dark:bg-cyan-950/50 border-y border-cyan-500/30 shadow-inner z-10"
            />

            {/* Top Gradient Fade */}
            <div className="absolute top-0 left-0 right-0 h-[40px] bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-20 pointer-events-none" />
            
            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-20 pointer-events-none" />

            {/* Scrollable Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[40px]"
                style={{ scrollBehavior: 'smooth' }}
            >
                {options.map((option, idx) => {
                    const isSelected = option.code === value;
                    const isDisabled = disabledValues.includes(option.code);

                    return (
                        <div
                            key={option.code}
                            onClick={() => !isDisabled && handleItemClick(idx, option.code)}
                            className={`h-[40px] snap-center flex items-center justify-center gap-2 px-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
                                isDisabled 
                                    ? 'opacity-30 cursor-not-allowed'
                                    : isSelected
                                    ? 'text-cyan-700 dark:text-cyan-400 scale-105 font-black z-30'
                                    : 'text-slate-400 dark:text-slate-500 scale-90 opacity-60 hover:opacity-100'
                            }`}
                        >
                            {option.flag && (
                                <FlagIcon 
                                    countryCode={option.countryCode} 
                                    fallbackFlag={option.flag} 
                                    className="w-4 h-3 object-cover rounded-xs shrink-0 shadow-xs" 
                                />
                            )}
                            <span className="truncate">{option.name || option.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IosWheelColumn;
