import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// In-memory module cache
let cachedBookGroups = null;

// Loading promise to coordinate concurrent requests
let bookGroupsPromise = null;

/**
 * Fetches all book groups with books, chapters, and lessons from Firestore.
 * Caches the results and shares the promise if concurrently requested.
 * @param {boolean} forceRefresh - If true, bypasses cache and forces a fresh query.
 */
export const getSharedBookGroups = async (forceRefresh = false) => {
    if (cachedBookGroups && !forceRefresh) return cachedBookGroups;
    if (bookGroupsPromise && !forceRefresh) return bookGroupsPromise;

    bookGroupsPromise = (async () => {
        try {
            console.log('Fetching shared book groups from Firestore...');
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
            return cachedBookGroups;
        } catch (e) {
            console.error('Error loading shared book groups:', e);
            bookGroupsPromise = null; // Reset promise so we can retry on failure
            throw e;
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
};
