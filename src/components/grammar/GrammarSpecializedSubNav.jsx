import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Brain, Bookmark } from 'lucide-react';
import { ROUTES } from '../../router';

const SUB_TABS = [
    {
        id: 'curriculum',
        label: 'Chủ đề theo cấp độ',
        icon: LayoutGrid,
        route: ROUTES.GRAMMAR_CURRICULUM,
        match: (path) => path.startsWith('/grammar/curriculum')
    },
    {
        id: 'nuances',
        label: 'Bản đồ tư duy',
        icon: Brain,
        route: ROUTES.GRAMMAR_NUANCES,
        match: (path) => path.startsWith('/grammar/nuances')
    },
    {
        id: 'cheatsheets',
        label: 'Sổ tay chuyên đề',
        icon: Bookmark,
        route: ROUTES.GRAMMAR_CHEATSHEETS,
        match: (path) => path.startsWith('/grammar/cheatsheets')
    }
];

export const GrammarSpecializedSubNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="w-full flex items-center justify-center py-2 mb-4">
            <div className="inline-flex p-1.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 shadow-xs max-w-full overflow-x-auto gap-1.5 scrollbar-none">
                {SUB_TABS.map((tab) => {
                    const isActive = tab.match(location.pathname);
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => navigate(tab.route)}
                            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap select-none border-2 active:translate-y-0.5 ${
                                isActive
                                    ? 'bg-emerald-500 border-b-4 border-emerald-700 text-white shadow-xs'
                                    : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default GrammarSpecializedSubNav;

