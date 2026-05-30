import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const TopTabBar = ({ tabs }) => {
    const location = useLocation();
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const activeIndex = tabs.findIndex(tab => 
            location.pathname === tab.route || (tab.exact === false && location.pathname.startsWith(tab.route))
        );

        if (activeIndex >= 0) {
            const tabsElements = containerRef.current.querySelectorAll('.tab-item');
            const activeElement = tabsElements[activeIndex];
            
            if (activeElement) {
                setIndicatorStyle({
                    left: activeElement.offsetLeft,
                    width: activeElement.offsetWidth,
                    opacity: 1
                });
            }
        } else {
            setIndicatorStyle({ left: 0, width: 0, opacity: 0 });
        }
    }, [location.pathname, tabs]);

    return (
        <div className="w-full border-b border-gray-200 dark:border-slate-700/50 bg-transparent relative">
            <div className="max-w-6xl mx-auto px-4 md:px-8">
                <div className="relative flex overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth" ref={containerRef}>
                    <div className="flex space-x-1 sm:space-x-2 relative w-full">
                        {tabs.map((tab) => {
                            const isActive = location.pathname === tab.route || (tab.exact === false && location.pathname.startsWith(tab.route));
                            
                            return (
                                <Link
                                    key={tab.id}
                                    to={tab.route}
                                    className={`tab-item relative z-10 flex items-center space-x-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                                        isActive
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {tab.icon && <tab.icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'}`} />}
                                    <span>{tab.label}</span>
                                </Link>
                            );
                        })}
                        {/* Animated Sliding Indicator */}
                        <div 
                            className="absolute bottom-0 h-0.5 bg-indigo-500 dark:bg-indigo-400 transition-all duration-300 ease-out z-20 rounded-t-full"
                            style={{ 
                                left: `${indicatorStyle.left}px`, 
                                width: `${indicatorStyle.width}px`,
                                opacity: indicatorStyle.opacity
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopTabBar;
