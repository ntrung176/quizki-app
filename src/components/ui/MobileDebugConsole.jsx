import React, { useEffect } from 'react';

/**
 * MobileDebugConsole - Automatic Eruda DevTools for Admin on Mobile
 * Displays full Chrome/Safari console, network & storage inspector on mobile screens.
 */
const MobileDebugConsole = ({ isAdmin = false }) => {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const urlDebug = urlParams.get('debug');
            const storedDebug = localStorage.getItem('quizki_debug');

            // Force disable if explicit debug=false in URL
            if (urlDebug === 'false') {
                localStorage.setItem('quizki_debug', 'false');
                if (window.eruda) {
                    try { window.eruda.destroy(); } catch (_) {}
                }
                return;
            }

            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            
            // Default enabled for Admin on Mobile, or explicit debug=true in URL / localStorage
            const shouldEnable = (isAdmin && isMobileDevice) || urlDebug === 'true' || storedDebug === 'true';

            if (shouldEnable) {
                if (window.eruda) {
                    try { window.eruda.init(); } catch (_) {}
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
                    script.async = true;
                    script.onload = () => {
                        if (window.eruda) {
                            try {
                                window.eruda.init({
                                    defaults: {
                                        displaySize: 45,
                                        transparency: 90,
                                        theme: 'Dark'
                                    }
                                });
                            } catch (_) {}
                        }
                    };
                    document.head.appendChild(script);
                }
            }
        } catch (e) {
            console.warn('MobileDebugConsole init failed:', e);
        }
    }, [isAdmin]);

    return null;
};

export default MobileDebugConsole;
