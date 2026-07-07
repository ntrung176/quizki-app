import { db, appId } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

let cachedConfig = null;
let configPromise = null;

/**
 * Fetches the remote cache config containing Storage URLs for static JSON files.
 * Caches the result in memory for subsequent requests.
 */
export const getCacheConfig = async () => {
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

/**
 * Force refetches the cache config from Firestore.
 */
export const refreshCacheConfig = async () => {
    cachedConfig = null;
    configPromise = null;
    return getCacheConfig();
};
