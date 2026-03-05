import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect new app versions after deployment.
 * Periodically fetches /version.json and compares with the version at load time.
 * Shows an update notification when a new version is detected.
 * 
 * @param {number} intervalMs - How often to check (default: 60 seconds)
 * @param {number} deployDelayMs - Wait time after detecting update before showing notification
 *                                  (default: 3 minutes, to allow GitHub Actions to finish deploying)
 */
const useVersionCheck = (intervalMs = 60 * 1000, deployDelayMs = 3 * 60 * 1000) => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const initialVersionRef = useRef(null);
    const checkedRef = useRef(false);
    const delayTimerRef = useRef(null);

    const fetchVersion = useCallback(async () => {
        try {
            // Cache-bust to always get latest version.json
            const res = await fetch(`/version.json?_=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.version || null;
        } catch {
            return null;
        }
    }, []);

    // Schedule showing the update notification after deploy delay
    const scheduleUpdate = useCallback(() => {
        // Don't schedule if already scheduled or already shown
        if (delayTimerRef.current) return;

        console.log(`🔄 Phát hiện bản cập nhật mới! Chờ ${deployDelayMs / 1000}s để deploy hoàn tất...`);

        delayTimerRef.current = setTimeout(() => {
            setUpdateAvailable(true);
            delayTimerRef.current = null;
        }, deployDelayMs);
    }, [deployDelayMs]);

    useEffect(() => {
        // Don't run in development (version.json may not exist)
        if (import.meta.env.DEV) return;

        let timer;

        const init = async () => {
            // Store the version at page load
            const currentVersion = await fetchVersion();
            if (currentVersion) {
                initialVersionRef.current = currentVersion;
                checkedRef.current = true;
            }

            // Start periodic checks
            timer = setInterval(async () => {
                if (!checkedRef.current) return;
                const latestVersion = await fetchVersion();
                if (latestVersion && latestVersion !== initialVersionRef.current) {
                    scheduleUpdate();
                    clearInterval(timer); // Stop checking once detected
                }
            }, intervalMs);
        };

        init();

        // Also check when tab becomes visible again (user returns to tab)
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && checkedRef.current) {
                const latestVersion = await fetchVersion();
                if (latestVersion && latestVersion !== initialVersionRef.current) {
                    scheduleUpdate();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timer);
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchVersion, intervalMs, scheduleUpdate]);

    const refresh = useCallback(() => {
        window.location.reload();
    }, []);

    const dismiss = useCallback(() => {
        setUpdateAvailable(false);
    }, []);

    return { updateAvailable, refresh, dismiss };
};

export default useVersionCheck;
