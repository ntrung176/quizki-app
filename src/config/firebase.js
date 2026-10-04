import { initializeApp } from 'firebase/app';
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    persistentSingleTabManager,
    memoryLocalCache 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { runStorageSanityCleanup } from '../utils/storageCleanup.js';

// Tự động dọn dẹp các cache quá lớn gây tràn quota localStorage trước khi khởi động
runStorageSanityCleanup();

// --- Cấu hình Firebase ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
let db;
let auth;
let storage;

const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');

try {
    app = initializeApp(firebaseConfig);

    try {
        if (isMobileDevice) {
            // Trên mobile: Dùng singleTabManager({ forceOwnership: true }) để tránh WebLocks deadlock khi Safari iOS đóng băng tab nền
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentSingleTabManager({ forceOwnership: true })
                })
            });
        } else {
            // Trên desktop: Ưu tiên Persistent Cache đa tab với IndexedDB
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
        }
    } catch (cacheErr) {
        console.warn("⚠️ Không thể khởi tạo cache Firestore, thử singleTabManager forceOwnership:", cacheErr);
        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentSingleTabManager({ forceOwnership: true })
                })
            });
        } catch (singleErr) {
            console.warn("⚠️ Không thể khởi tạo persistentSingleTabManager, chuyển sang memoryLocalCache:", singleErr);
            db = initializeFirestore(app, {
                localCache: memoryLocalCache()
            });
        }
    }

    auth = getAuth(app);
    storage = getStorage(app);
} catch (e) {
    console.error("Lỗi khởi tạo Firebase:", e);
}

// appId dùng chung cho đường dẫn Firestore (artifacts/${appId}/...)
const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'quizki-app';

export { app, db, auth, appId, storage };

