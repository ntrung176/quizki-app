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

const getThemeClasses = (pathname, tabs, themeProp) => {
    if (
        themeProp === 'red' || 
        themeProp === 'kanji' || 
        pathname.startsWith('/kanji') || 
        tabs?.some(t => t.id?.startsWith('kanji') || t.route?.startsWith('/kanji'))
    ) {
        return {
            gradient: 'from-red-500 via-rose-600 to-red-600',
            shadow: 'shadow-rose-500/25 dark:shadow-rose-950/40',
        };
    }
    if (
        themeProp === 'green' || 
        themeProp === 'grammar' || 
        pathname.startsWith('/grammar') || 
        tabs?.some(t => t.id?.startsWith('grammar') || t.route?.startsWith('/grammar'))
    ) {
        return {
            gradient: 'from-emerald-500 via-green-600 to-emerald-600',
            shadow: 'shadow-emerald-500/25 dark:shadow-emerald-950/40',
        };
    }
    return {
        gradient: 'from-cyan-500 via-indigo-600 to-sky-500',
        shadow: 'shadow-cyan-500/20 dark:shadow-cyan-950/20',
    };
};

const TopTabBar = ({ tabs, theme }) => {
    const location = useLocation();
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

    const themeClasses = getThemeClasses(location.pathname, tabs, theme);

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
        <div className="w-full sticky top-14 lg:top-3 z-30 pt-3 pb-2 px-4 pointer-events-none flex justify-center">
            {/* Floating Glass Capsule Container */}
            <div className={`max-w-full overflow-x-auto scrollbar-hide p-1.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-lg pointer-events-auto transition-all duration-300 ${themeClasses.shadow}`}>
                <div className="relative flex items-center space-x-1" ref={containerRef}>
                    {/* Sliding Capsule Pill Indicator */}
                    <div 
                        className={`absolute top-0 bottom-0 rounded-xl bg-gradient-to-r ${themeClasses.gradient} shadow-md transition-all duration-300 ease-out z-0`}
                        style={{ 
                            left: `${indicatorStyle.left}px`, 
                            width: `${indicatorStyle.width}px`,
                            opacity: indicatorStyle.opacity
                        }}
                    />

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
                                className={`tab-item group relative z-10 flex items-center space-x-2 px-3.5 py-2 text-xs md:text-sm font-bold whitespace-nowrap rounded-xl transition-colors duration-200 ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                {tab.icon && (
                                    <tab.icon className={`w-4 h-4 transition-colors duration-200 ${
                                        isActive 
                                            ? 'text-white' 
                                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                                    }`} />
                                )}
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TopTabBar;
