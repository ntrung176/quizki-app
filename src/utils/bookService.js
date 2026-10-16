import { db, storage, appId } from '../config/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCacheConfig } from './cacheConfigService';

// In-memory module cache
let cachedBookGroups = null;
let lastLoadedExportedAt = null;

// Loading promise to coordinate concurrent requests
let bookGroupsPromise = null;

export const deepMergeBookGroups = (baseGroups, overrideGroups) => {
    const groupMap = new Map();

    // 1. Index base groups (which have all pre-compiled rich chapters and vocabulary)
    if (Array.isArray(baseGroups)) {
        baseGroups.forEach(g => {
            if (g) {
                const key = g.id || (g.name || '').trim().toLowerCase();
                groupMap.set(key, JSON.parse(JSON.stringify(g)));
            }
        });
    }

    // 2. Merge overrides (Firestore / CDN)
    if (Array.isArray(overrideGroups)) {
        overrideGroups.forEach(oGroup => {
            if (!oGroup) return;
            const key = oGroup.id || (oGroup.name || '').trim().toLowerCase();
            if (!groupMap.has(key)) {
                groupMap.set(key, JSON.parse(JSON.stringify(oGroup)));
            } else {
                const existing = groupMap.get(key);
                // Merge group-level fields
                const { books: oBooks, ...groupMeta } = oGroup;
                Object.assign(existing, groupMeta);

                // Merge books inside this group
                if (Array.isArray(oBooks) && oBooks.length > 0) {
                    const bookMap = new Map();
                    (existing.books || []).forEach(b => {
                        const bKey = b.id || (b.name || '').trim().toLowerCase();
                        bookMap.set(bKey, b);
                    });

                    oBooks.forEach(oBook => {
                        if (!oBook) return;
                        const bKey = oBook.id || (oBook.name || '').trim().toLowerCase();
                        if (!bookMap.has(bKey)) {
                            bookMap.set(bKey, oBook);
                        } else {
                            const existingBook = bookMap.get(bKey);
                            const { chapters: oChapters, ...bookMeta } = oBook;
                            Object.assign(existingBook, bookMeta);

                            if (Array.isArray(oChapters) && oChapters.length > 0) {
                                const chapterMap = new Map();
                                (existingBook.chapters || []).forEach(ch => {
                                    const chKey = ch.id || (ch.name || '').trim().toLowerCase();
                                    chapterMap.set(chKey, ch);
                                });

                                oChapters.forEach(oChapter => {
                                    if (!oChapter) return;
                                    const chKey = oChapter.id || (oChapter.name || '').trim().toLowerCase();
                                    if (!chapterMap.has(chKey)) {
                                        chapterMap.set(chKey, oChapter);
                                    } else {
                                        const existingChapter = chapterMap.get(chKey);
                                        const { lessons: oLessons, ...chapterMeta } = oChapter;
                                        Object.assign(existingChapter, chapterMeta);

                                        if (Array.isArray(oLessons) && oLessons.length > 0) {
                                            const lessonMap = new Map();
                                            (existingChapter.lessons || []).forEach(ls => {
                                                const lsKey = ls.id || (ls.name || '').trim().toLowerCase();
                                                lessonMap.set(lsKey, ls);
                                            });

                                            oLessons.forEach(oLesson => {
                                                if (!oLesson) return;
                                                const lsKey = oLesson.id || (oLesson.name || '').trim().toLowerCase();
                                                if (!lessonMap.has(lsKey)) {
                                                    lessonMap.set(lsKey, oLesson);
                                                } else {
                                                    const existingLesson = lessonMap.get(lsKey);
                                                    Object.assign(existingLesson, oLesson);
                                                    if (Array.isArray(oLesson.vocab) && oLesson.vocab.length > 0) {
                                                        existingLesson.vocab = oLesson.vocab;
                                                    }
                                                }
                                            });

                                            existingChapter.lessons = Array.from(lessonMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
                                        }
                                    }
                                });

                                existingBook.chapters = Array.from(chapterMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
                            }
                        }
                    });

                    existing.books = Array.from(bookMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
                }
            }
        });
    }

    return Array.from(groupMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
};

const mergeWithLocalBundle = async (groups) => {
    try {
        const localRes = await fetch(`/data/books_data.json?t=${Date.now()}`);
        if (localRes && localRes.ok) {
            const localData = await localRes.json();
            if (Array.isArray(localData) && localData.length > 0) {
                return deepMergeBookGroups(localData, groups);
            }
        }
    } catch (err) {
        console.warn('Could not merge local books bundle:', err);
    }
    return groups || [];
};

if (typeof window !== 'undefined') {
    window.addEventListener('cache-config-updated', () => {
        invalidateBookGroupsCache();
    });
}

/**
 * Fetches all book groups with books, chapters, and lessons.
 * Hierarchy: In-Memory RAM -> Firebase Storage CDN -> Local Bundled JSON -> Firestore Live DB
 * @param {boolean} forceRefresh - If true, bypasses cache and forces a fresh query.
 */
export const getSharedBookGroups = async (forceRefresh = false, forceLiveFirestore = false) => {
    let cacheConfig = null;
    try {
        cacheConfig = await getCacheConfig();
    } catch (e) {
        console.warn('Cache config fetch error in bookService:', e);
    }

    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = forceRefresh || (currentExport && (!lastLoadedExportedAt || currentExport > lastLoadedExportedAt));

    if (needsRefresh) {
        cachedBookGroups = null;
        bookGroupsPromise = null;
    }

    if (cachedBookGroups && !needsRefresh && !forceLiveFirestore) return cachedBookGroups;
    if (bookGroupsPromise && !needsRefresh && !forceLiveFirestore) return bookGroupsPromise;

    bookGroupsPromise = (async () => {
        const fetchFromFirestoreFallback = async () => {
            try {
                console.log('Fetching shared book groups from Firestore live database...');
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
                const merged = await mergeWithLocalBundle(groups);
                cachedBookGroups = merged;
                lastLoadedExportedAt = currentExport || null;
                return cachedBookGroups;
            } catch (fsErr) {
                console.error('Error loading shared book groups from Firestore fallback:', fsErr);
                try {
                    const localOnly = await mergeWithLocalBundle([]);
                    if (localOnly && localOnly.length > 0) {
                        cachedBookGroups = localOnly;
                        return cachedBookGroups;
                    }
                } catch (_) {}
                bookGroupsPromise = null;
                throw fsErr;
            }
        };

        const checkIsAdmin = () => {
            try {
                if (typeof window !== 'undefined' && window.__QUIZKI_IS_ADMIN__) return true;
                if (import.meta.env.DEV) return true;
                const adminCache = sessionStorage.getItem('quizki_is_admin');
                if (adminCache === 'true') return true;
                const profile = JSON.parse(localStorage.getItem('quizki-profile') || '{}');
                if (profile?.isAdmin || profile?.role === 'admin') return true;
            } catch (_) {}
            return false;
        };

        if (forceLiveFirestore || checkIsAdmin()) {
            const fsResult = await fetchFromFirestoreFallback();
            return mergeEditedBookGroups(fsResult);
        }

        // 1. Try Firebase Storage CDN if available
        if (cacheConfig && cacheConfig.booksUrl) {
            try {
                console.log('Fetching shared book groups from Firebase Storage CDN...');
                const urlWithBuster = cacheConfig.booksUrl.includes('?') 
                    ? `${cacheConfig.booksUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.booksUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                const dataRes = await fetch(urlWithBuster);
                if (dataRes && dataRes.ok) {
                    const data = await dataRes.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const merged = await mergeWithLocalBundle(data);
                        cachedBookGroups = merged;
                        lastLoadedExportedAt = currentExport || null;
                        return mergeEditedBookGroups(cachedBookGroups);
                    }
                }
            } catch (cdnErr) {
                console.warn('CDN fetch for books failed, falling back to local bundle / Firestore...', cdnErr);
            }
        }

        // 2. Try Local Bundle file /data/books_data.json as primary fast offline fallback
        try {
            console.log('Fetching shared book groups from local bundle (/data/books_data.json)...');
            const dataRes = await fetch(`/data/books_data.json?t=${Date.now()}`);
            if (dataRes && dataRes.ok) {
                const data = await dataRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    cachedBookGroups = data;
                    lastLoadedExportedAt = null;
                    return mergeEditedBookGroups(cachedBookGroups);
                }
            }
        } catch (localErr) {
            console.warn('Local bundle fetch for books failed, falling back to Firestore...', localErr);
        }

        // 3. Last Resort Fallback: Firestore live database query
        try {
            console.log('Fetching shared book groups from Firestore live database fallback...');
            const fsResult = await fetchFromFirestoreFallback();
            return mergeEditedBookGroups(fsResult);
        } catch (fsErr) {
            console.warn('Firestore fallback failed:', fsErr);
        }

        throw new Error('All data sources for books failed');
    })();

    const result = await bookGroupsPromise;
    return mergeEditedBookGroups(result);
};

const EDITED_BOOKS_KEY = 'quizki_edited_book_groups';

export const getEditedBookGroupsMap = () => {
    try {
        const stored = localStorage.getItem(EDITED_BOOKS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

const stripHeavyFields = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripHeavyFields);

    const clean = {};
    for (const key in obj) {
        if (key === 'audioBase64' || key === 'imageBase64') {
            continue; // Skip heavy base64 data to save localStorage quota
        }
        clean[key] = stripHeavyFields(obj[key]);
    }
    return clean;
};

export const updateEditedBookGroupLocalCache = (groupData) => {
    try {
        if (!groupData || !groupData.id) return;
        const currentMap = getEditedBookGroupsMap();

        // Strip heavy base64 audio/images before saving to localStorage
        const cleanGroup = stripHeavyFields(groupData);

        currentMap[cleanGroup.id] = {
            ...(currentMap[cleanGroup.id] || {}),
            ...cleanGroup,
            updatedAt: Date.now()
        };

        // Prune older cached groups if map exceeds 2 entries
        const groupIds = Object.keys(currentMap);
        if (groupIds.length > 2) {
            groupIds.sort((a, b) => (currentMap[b]?.updatedAt || 0) - (currentMap[a]?.updatedAt || 0));
            const toKeep = groupIds.slice(0, 2);
            Object.keys(currentMap).forEach(id => {
                if (!toKeep.includes(id)) delete currentMap[id];
            });
        }

        try {
            localStorage.setItem(EDITED_BOOKS_KEY, JSON.stringify(currentMap));
        } catch (_) {
            // Silently clear item if browser quota is strictly full.
            // Admin reads directly from live Firestore DB so no data is ever lost.
            try { localStorage.removeItem(EDITED_BOOKS_KEY); } catch (__) {}
        }
    } catch (_) {
        // Ignore cache errors silently: Firestore remains authoritative
    }
};

export const mergeEditedBookGroups = (groups) => {
    if (!Array.isArray(groups)) return groups;
    const editedMap = getEditedBookGroupsMap();
    if (Object.keys(editedMap).length === 0) return groups;

    let hasCleaned = false;
    const result = groups
        .filter(group => !editedMap[group.id]?.isDeleted)
        .map(group => {
            const editedGroup = editedMap[group.id];
            if (editedGroup) {
                // If incoming group from Firestore/CDN is fresher, discard stale local cache
                if (group.updatedAt && editedGroup.updatedAt && group.updatedAt >= editedGroup.updatedAt) {
                    delete editedMap[group.id];
                    hasCleaned = true;
                    return group;
                }
                const [merged] = deepMergeBookGroups([group], [editedGroup]);
                return merged || group;
            }
            return group;
        });

    if (hasCleaned) {
        try { localStorage.setItem(EDITED_BOOKS_KEY, JSON.stringify(editedMap)); } catch (_) {}
    }

    return result;
};

/**
 * Returns the currently cached book groups synchronously, or null if not yet loaded.
 */
export const getCachedBookGroups = () => {
    if (!cachedBookGroups) return null;
    return mergeEditedBookGroups(cachedBookGroups);
};

/**
 * Invalidates the in-memory cache.
 */
export const invalidateBookGroupsCache = () => {
    cachedBookGroups = null;
    bookGroupsPromise = null;
    lastLoadedExportedAt = null;
};

/**
 * Updates a specific lesson's vocabulary in the in-memory cache directly.
 */
export const updateBookLessonVocabInMemory = (groupId, bookId, chapterId, lessonId, newVocab) => {
    if (!cachedBookGroups || !Array.isArray(cachedBookGroups)) return;
    for (const g of cachedBookGroups) {
        if (g.id === groupId) {
            for (const b of (g.books || [])) {
                if (b.id === bookId) {
                    for (const c of (b.chapters || [])) {
                        if (c.id === chapterId) {
                            for (const l of (c.lessons || [])) {
                                if (l.id === lessonId) {
                                    l.vocab = newVocab;
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

export const syncBooksToCDN = async () => {
    const COLLECTION = 'bookGroups';
    const groupsSnap = await getDocs(collection(db, COLLECTION));
    const groups = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
        const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };
        const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));
        group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
            const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };
            const chaptersSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters'));
            book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };
                const lessonsSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons'));
                chapter.lessons = lessonsSnap.docs.map(lessonDoc => ({ id: lessonDoc.id, _docPath: lessonDoc.ref.path, ...lessonDoc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
                return chapter;
            }));
            book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
            return book;
        }));
        group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
        return group;
    }));
    groups.sort((a, b) => (a.order || 0) - (b.order || 0));
    const mergedGroups = await mergeWithLocalBundle(groups);

    const blob = new Blob([JSON.stringify(mergedGroups)], { type: 'application/json' });
    const fileRef = ref(storage, `cache/${appId}/books_data.json`);
    await uploadBytes(fileRef, blob);
    const booksUrl = await getDownloadURL(fileRef);
    const exportedAt = Date.now();

    await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { booksUrl, exportedAt }, { merge: true });
    cachedBookGroups = mergedGroups;
    lastLoadedExportedAt = exportedAt;
    window.dispatchEvent(new CustomEvent('cache-config-updated'));
    return { booksUrl, exportedAt };
};
