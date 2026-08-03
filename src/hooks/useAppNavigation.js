import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../router';

export const useAppNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tourTrigger, setTourTrigger] = useState(0);

    const navigateTo = useCallback((viewName) => {
        const routeMap = {
            'HOME': ROUTES.HOME,
            'LOGIN': ROUTES.LOGIN,
            'ACCOUNT': ROUTES.ACCOUNT,
            'HELP': ROUTES.HELP,
            'LIST': ROUTES.VOCAB_REVIEW,
            'ADD_CARD': ROUTES.VOCAB_ADD,
            'REVIEW': ROUTES.REVIEW,
            'FLASHCARD': ROUTES.FLASHCARD,
            'KANJI': ROUTES.KANJI_LIST,
            'STUDY': ROUTES.STUDY,
            'TEST': ROUTES.TEST,
            'HUB': ROUTES.HUB,
            'IMPORT': ROUTES.IMPORT,
            'ADMIN': ROUTES.ADMIN,
            'SETTINGS': ROUTES.SETTINGS,
        };
        const route = routeMap[viewName] || ROUTES.HOME;
        if (location.pathname !== route) {
            navigate(route);
        }
    }, [navigate, location.pathname]);

    const getCurrentView = useCallback(() => {
        const path = location.pathname;
        if (path === ROUTES.HOME || path === '/') return 'HOME';
        if (path === ROUTES.LOGIN) return 'LOGIN';
        if (path === ROUTES.ACCOUNT) return 'ACCOUNT';
        if (path === ROUTES.HELP) return 'HELP';
        if (path === ROUTES.VOCAB_REVIEW) return 'VOCAB_REVIEW';
        if (path === ROUTES.VOCAB_LIST || path.startsWith('/vocab/list')) return 'VOCAB_LIST';
        if (path === ROUTES.VOCAB_ADD) return 'VOCAB_ADD';
        if (path === ROUTES.VOCAB_QUICK_ADD) return 'VOCAB_QUICK_ADD';
        if (path.startsWith('/vocab/edit/')) return 'EDIT_CARD';
        if (path === ROUTES.REVIEW) return 'REVIEW';
        if (path === ROUTES.FLASHCARD) return 'FLASHCARD';
        if (path === ROUTES.KANJI_LIST || path.startsWith(ROUTES.KANJI_LIST + '/')) return 'KANJI';
        if (path === ROUTES.KANJI_STUDY) return 'KANJI_STUDY';
        if (path === ROUTES.KANJI_LESSON) return 'KANJI_LESSON';
        if (path === ROUTES.KANJI_REVIEW) return 'KANJI_REVIEW';
        if (path === ROUTES.KANJI_SAVED) return 'KANJI_SAVED';
        if (path === ROUTES.STUDY) return 'STUDY';
        if (path === ROUTES.TEST) return 'TEST';
        if (path === ROUTES.HUB || path.startsWith('/hub')) return 'HUB';
        if (path === ROUTES.IMPORT) return 'IMPORT';
        if (path === ROUTES.ADMIN) return 'ADMIN';
        if (path === ROUTES.BOOKS) return 'BOOKS';
        if (path === ROUTES.SETTINGS) return 'SETTINGS';
        if (path === ROUTES.JLPT_TEST) return 'JLPT_TEST';
        if (path === ROUTES.JLPT_ADMIN) return 'JLPT_ADMIN';
        return 'HOME';
    }, [location.pathname]);

    const view = getCurrentView();

    const setView = useCallback((viewName) => {
        navigateTo(viewName);
    }, [navigateTo]);

    return {
        navigate,
        location,
        tourTrigger,
        setTourTrigger,
        navigateTo,
        getCurrentView,
        view,
        setView
    };
};
