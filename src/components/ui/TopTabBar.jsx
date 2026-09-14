import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

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

    if (pathname.startsWith('/kanji/list/')) {
        if (from === 'saved') {
            return tab.id === 'kanji-saved';
        }
        return tab.id === 'kanji-list';
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
    const { t, language } = useLanguage();
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0, animated: false });
    const isMounted = useRef(false);

    const themeClasses = getThemeClasses(location.pathname, tabs, theme);

    const getTabLabel = (tab) => {
        if (tab.id === 'vocab-review' || tab.id === 'kanji-review' || tab.id === 'grammar-review') {
            return t('tabs.review', 'Ôn tập');
        }
        if (tab.id === 'vocab-list') return t('tabs.library', 'Thư viện');
        if (tab.id === 'vocab-add') return t('tabs.addSet', 'Thêm học phần');
        if (tab.id === 'vocab-books' || tab.id === 'kanji-study' || tab.id === 'grammar-study') {
            return t('tabs.lessons', 'Bài học');
        }
        if (tab.id === 'kanji-saved' || tab.id === 'grammar-saved') return t('tabs.saved', 'Đã lưu');
        if (tab.id === 'kanji-list' || tab.id === 'grammar-list') return t('tabs.search', 'Tra cứu');
        return tab.label;
    };

    const updateIndicator = (animate = true) => {
        if (!containerRef.current) return;
        const activeIndex = tabs.findIndex(tab => isTabActive(tab, location.pathname, location.search));

        if (activeIndex >= 0) {
            const tabsElements = containerRef.current.querySelectorAll('.tab-item');
            const activeElement = tabsElements[activeIndex];
            
            if (activeElement) {
                setIndicatorStyle({
                    left: activeElement.offsetLeft,
                    width: activeElement.offsetWidth,
                    opacity: 1,
                    animated: animate
                });
            }
        } else {
            setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
        }
    };

    // Use async requestAnimationFrame in useEffect to prevent blocking layout reflow on mobile
    useEffect(() => {
        let frameId = requestAnimationFrame(() => {
            updateIndicator(isMounted.current);
            isMounted.current = true;
        });
        return () => {
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [location.pathname, location.search, tabs, language]);

    // Handle resize smoothly
    useEffect(() => {
        const handleResize = () => updateIndicator(false);
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, [tabs]);

    return (
        <div className="w-full sticky top-14 lg:top-3 z-30 pt-2 pb-2 px-2 sm:px-4 flex justify-center">
            {/* Floating Anti-Slop Glass Capsule Container */}
            <div className={`w-full max-w-xl sm:max-w-max p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md transition-shadow duration-200 overflow-hidden ${themeClasses.shadow}`}>
                <div className="relative flex items-center justify-between w-full space-x-1" ref={containerRef}>
                    {/* Sliding Capsule Pill Indicator (GPU-accelerated translate3d) */}
                    <div 
                        className={`absolute top-0 bottom-0 rounded-xl bg-gradient-to-r ${themeClasses.gradient} shadow-lg shadow-indigo-500/25 z-0 transform-gpu ${
                            indicatorStyle.animated ? 'transition-all duration-250 ease-out' : 'transition-none'
                        }`}
                        style={{ 
                            transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
                            width: `${indicatorStyle.width}px`,
                            opacity: indicatorStyle.opacity,
                            willChange: 'transform, width'
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

                        const label = getTabLabel(tab);

                        return (
                            <Link
                                key={tab.id}
                                to={destination}
                                className={`tab-item group relative z-10 flex-1 flex items-center justify-center space-x-1.5 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap rounded-xl transition-colors duration-150 min-h-[40px] select-none active:scale-95 ${
                                    isActive
                                        ? 'text-white drop-shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                {tab.icon && (
                                    <tab.icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                                        isActive 
                                            ? 'text-white' 
                                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                                    }`} />
                                )}
                                {tab.id === 'vocab-add' ? (
                                    <>
                                        <span className="hidden min-[380px]:inline">{label}</span>
                                        <span className="inline min-[380px]:hidden">Thêm</span>
                                    </>
                                ) : (
                                    <span>{label}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default React.memo(TopTabBar);

