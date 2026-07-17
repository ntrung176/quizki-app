import { db, appId } from '../config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

let cachedConfig = null;
let configPromise = null;
let unsubConfig = null;

export const subscribeCacheConfig = () => {
    if (unsubConfig || !db) return;
    try {
        const ref = doc(db, `artifacts/${appId}/settings/cacheConfig`);
        unsubConfig = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                cachedConfig = snap.data();
            }
        }, (err) => {
            console.warn('Real-time cacheConfig listener error:', err);
        });
    } catch (e) {
        console.warn('Failed to start cacheConfig listener:', e);
    }
};

export const getCacheConfig = async () => {
    subscribeCacheConfig();
    if (cachedConfig) return cachedConfig;
    if (configPromise) return configPromise;

    configPromise = (async () => {
        try {
            console.log('Loading remote cache configuration...');
            const ref = doc(db, `artifacts/${appId}/settings/cacheConfig`);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                cachedConfig = snap.data();
                return cachedConfig;
            }
        } catch (e) {
            console.warn('Failed to load remote cache config:', e);
        }
        return null;
    })();

    return configPromise;
};

export const refreshCacheConfig = async () => {
    cachedConfig = null;
    configPromise = null;
    return getCacheConfig();
};
