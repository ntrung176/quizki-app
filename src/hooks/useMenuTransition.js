import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Custom hook to control page/sub-tab menu transitions.
 * If we switch between different main menus (e.g. Kanji to Vocab), the entire page fades in.
 * If we stay in the same main menu but switch tabs, the top-bar doesn't fade, only the content does.
 */
const useMenuTransition = () => {
    const location = useLocation();

    const fadeWholePage = useMemo(() => {
        const getMainMenuType = (path) => {
            if (path.startsWith('/kanji')) return 'kanji';
            if (path.startsWith('/vocab') || path === '/books') return 'vocab';
            return 'other';
        };

        const currentMenu = getMainMenuType(location.pathname);
        const lastMenu = window.lastActiveMainMenu;

        // Update the global reference immediately
        window.lastActiveMainMenu = currentMenu;

        if (lastMenu && lastMenu === currentMenu) {
            return false;
        }
        return true;
    }, [location.pathname]);

    return fadeWholePage;
};

export default useMenuTransition;
