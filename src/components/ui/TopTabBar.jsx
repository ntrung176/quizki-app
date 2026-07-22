import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const isTabActive = (tab, pathname, search) => {
    const searchParams = new URLSearchParams(search);
    const from = searchParams.get('from');

    if (pathname.startsWith('/grammar/detail') || pathname.startsWith('/grammar/practice')) {
        if (from === 'list') {
            return tab.id === 'grammar-list';
        }
        if (from === 'saved') {
            return tab.id === 'grammar-saved';
        }
        return tab.id === 'grammar-study';
    }

    if (tab.id === 'grammar-study') {
        return pathname === '/grammar' || 
               pathname === '/grammar/study' || 
               pathname.startsWith('/grammar/textbook');
    }
    return pathname === tab.route || (tab.exact === false && pathname.startsWith(tab.route));
};

const TopTabBar = ({ tabs }) => {
    const location = useLocation();
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const activeIndex = tabs.findIndex(tab => isTabActive(tab, location.pathname, location.search));

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
    }, [location.pathname, location.search, tabs]);

    return (
        <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-14 lg:top-0 z-30">
            <div className="max-w-6xl mx-auto px-4 md:px-8">
                <div className="relative flex overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth" ref={containerRef}>
                    <div className="flex space-x-1 sm:space-x-2 relative w-full">
                        {tabs.map((tab) => {
                            const isActive = isTabActive(tab, location.pathname, location.search);
                            
                            let destination = tab.route;
                            if (tab.id === 'kanji-study') {
                                const lastLesson = localStorage.getItem('last_kanji_lesson');
                                if (lastLesson) {
                                    destination = lastLesson;
                                }
                            }

                            return (
                                <Link
                                    key={tab.id}
                                    to={destination}
                                    className={`tab-item relative z-10 flex items-center space-x-2 px-4 py-3 text-sm font-bold whitespace-nowrap ${
                                        isActive
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {tab.icon && <tab.icon className={`w-4 h-4 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'}`} />}
                                    <span>{tab.label}</span>
                                </Link>
                            );
                        })}
                        {/* Animated Sliding Indicator */}
                        <div 
                            className="absolute bottom-0 h-0.5 bg-indigo-500 dark:bg-indigo-400 z-20 rounded-t-full"
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
