import React from 'react';

/**
 * MaziiSectionRow
 * Renders a standard Mazii-style section with the dark boxed pill label on the left
 * and content area on the right.
 */
const MaziiSectionRow = ({ label, children, className = '' }) => {
    if (!children) return null;

    return (
        <div className={`flex flex-col sm:flex-row items-start gap-3 md:gap-6 w-full min-w-0 ${className}`}>
            {/* Left Boxed Pill Label */}
            <div className="px-4 py-1.5 border-2 border-slate-700/80 dark:border-slate-500/80 bg-slate-800/95 dark:bg-slate-900/95 text-slate-100 dark:text-slate-100 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider text-center shrink-0 w-28 md:w-36 select-none shadow-xs mt-0.5">
                {label}
            </div>

            {/* Right Content */}
            <div className="flex-1 min-w-0 w-full">
                {children}
            </div>
        </div>
    );
};

export default MaziiSectionRow;
