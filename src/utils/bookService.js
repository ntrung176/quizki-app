import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getCacheConfig } from './cacheConfigService';

// In-memory module cache
let cachedBookGroups = null;
let lastLoadedExportedAt = null;

// Loading promise to coordinate concurrent requests
let bookGroupsPromise = null;

/**
 * Fetches all book groups with books, chapters, and lessons from Firestore.
 * Caches the results and shares the promise if concurrently requested.
 * @param {boolean} forceRefresh - If true, bypasses cache and forces a fresh query.
 */
export const getSharedBookGroups = async (forceRefresh = false, forceLiveFirestore = false) => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = forceRefresh || (currentExport && lastLoadedExportedAt && currentExport > lastLoadedExportedAt);

    if (needsRefresh) {
        cachedBookGroups = null;
        bookGroupsPromise = null;
    }

    if (cachedBookGroups && !needsRefresh && !forceLiveFirestore) return cachedBookGroups;
    if (bookGroupsPromise && !needsRefresh && !forceLiveFirestore) return bookGroupsPromise;

    bookGroupsPromise = (async () => {
        const fetchFromFirestoreFallback = async () => {
            try {
                console.log('Fetching shared book groups from Firestore fallback...');
                const COLLECTION = 'bookGroups';
                const groupsSnap = await getDocs(collection(db, COLLECTION));
                
                const groups = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
                    const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };
                    
                    // Fetch books inside this group
                    const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));
                    
                    group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
                        const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };
                        
                        // Fetch chapters inside this book
                        const chaptersSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters'));
                        
                        book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                            const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };
                            
                            // Fetch lessons inside this chapter
                            const lessonsSnap = await getDocs(
                                collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons')
                            );
                            
                            chapter.lessons = lessonsSnap.docs.map(lessonDoc => ({
                                id: lessonDoc.id,
                                _docPath: lessonDoc.ref.path,
                                ...lessonDoc.data()
                            })).sort((a, b) => (a.order || 0) - (b.order || 0));
                            
                            return chapter;
                        }));
                        
                        book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
                        return book;
                    }));
                    
                    group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
                    return group;
                }));
                
                groups.sort((a, b) => (a.order || 0) - (b.order || 0));
                cachedBookGroups = groups;
                lastLoadedExportedAt = currentExport || Date.now();
                return cachedBookGroups;
            } catch (fsErr) {
                console.error('Error loading shared book groups from Firestore fallback:', fsErr);
                bookGroupsPromise = null;
                throw fsErr;
            }
        };

        if (forceLiveFirestore) {
            return fetchFromFirestoreFallback();
        }

        try {
            console.log('Fetching shared book groups from CDN...');
            const cacheConfig = await getCacheConfig();
            
            let dataRes;
            if (cacheConfig && cacheConfig.booksUrl) {
                console.log('Using Firebase Storage CDN for Books cache');
                const urlWithBuster = cacheConfig.booksUrl.includes('?') 
                    ? `${cacheConfig.booksUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.booksUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                dataRes = await fetch(urlWithBuster);
            } else {
                console.log('Falling back to local bundle files for Books cache');
                dataRes = await fetch('/data/books_data.json');
            }

            if (!dataRes || !dataRes.ok) throw new Error('CDN fetch failed');
            const contentType = dataRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (got: ' + contentType + ')');
            }
            cachedBookGroups = await dataRes.json();
            lastLoadedExportedAt = currentExport || Date.now();
            return cachedBookGroups;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            return fetchFromFirestoreFallback();
        }
    })();

    return bookGroupsPromise;
};

/**
 * Returns the currently cached book groups synchronously, or null if not yet loaded.
 */
export const getCachedBookGroups = () => cachedBookGroups;

/**
 * Invalidates the in-memory cache.
 */
export const invalidateBookGroupsCache = () => {
    cachedBookGroups = null;
    bookGroupsPromise = null;
    lastLoadedExportedAt = null;
};
