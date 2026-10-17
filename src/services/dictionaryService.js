/**
 * dictionaryService.js
 * High-performance Yomitan Dictionary Service backed by browser IndexedDB.
 * Supports exact lookup, prefix search, deconjugation, and fast ranking.
 */

import { deconjugate } from '../utils/japaneseDeconjugator';
import { romajiToHiragana } from '../utils/romajiConverter';

const DB_NAME = 'quizki_yomitan_dict';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbInstance = null;

/**
 * Open or initialize IndexedDB connection
 */
function openDb() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('idx_w', 'w', { unique: false });
                store.createIndex('idx_r', 'r', { unique: false });
                store.createIndex('idx_hv', 'hv', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('Failed to open dictionary IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

export const CURRENT_DICT_VERSION = '1.3.1';

let activeSyncPromise = null;
const syncListeners = new Set();

/**
 * Subscribe to dictionary background sync progress updates
 */
export function onSyncProgress(listener) {
    if (typeof listener !== 'function') return () => {};
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
}

function broadcastProgress(progress) {
    for (const listener of syncListeners) {
        try {
            listener(progress);
        } catch (e) {
            console.error('Progress listener error:', e);
        }
    }
}

/**
 * Check if the dictionary has data and is ready for instantaneous searching.
 * Never blocks on version upgrades if existing data is present.
 */
export async function isDictionaryReady() {
    try {
        if (localStorage.getItem('quizki_dict_ready') === 'true') {
            return true;
        }

        const db = await openDb();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const countReq = store.count();

            countReq.onsuccess = () => {
                const hasData = countReq.result > 1000;
                if (hasData) {
                    localStorage.setItem('quizki_dict_ready', 'true');
                }
                resolve(hasData);
            };
            countReq.onerror = () => {
                resolve(false);
            };
        });
    } catch {
        return false;
    }
}

/**
 * Check if local dictionary version matches the current target version
 */
export function isDictionaryUpToDate() {
    return localStorage.getItem('quizki_dict_version') === CURRENT_DICT_VERSION;
}

/**
 * Check if dictionary sync is actively in progress
 */
export function isDictionarySyncing() {
    return activeSyncPromise !== null;
}

/**
 * Download dictionary chunks and import into IndexedDB.
 * Completely non-destructive: uses store.put() (upsert) instead of store.clear()
 * so searching remains 100% available and uninterrupted at all times.
 */
export async function syncDictionary({ onProgress = null, silent = false } = {}) {
    if (onProgress) {
        syncListeners.add(onProgress);
    }

    if (activeSyncPromise) {
        return activeSyncPromise;
    }

    activeSyncPromise = (async () => {
        try {
            const storedVer = localStorage.getItem('quizki_dict_version');
            if (storedVer === CURRENT_DICT_VERSION) {
                broadcastProgress({ percent: 100, text: 'Từ điển đã ở phiên bản mới nhất.' });
                return true;
            }

            broadcastProgress({ percent: 5, text: 'Kiểm tra tệp từ điển & ví dụ...' });
            const manifestRes = await fetch('/dictionary/manifest.json');
            if (!manifestRes.ok) {
                throw new Error('Không thể tải manifest từ điển.');
            }
            const manifest = await manifestRes.json();
            const totalChunks = manifest.chunks || 8;
            const totalEntries = manifest.totalEntries || 266886;

            const db = await openDb();
            let importedEntries = 0;

            for (let i = 1; i <= totalChunks; i++) {
                const pct = Math.round(10 + ((i - 1) / totalChunks) * 85);
                broadcastProgress({
                    percent: pct,
                    text: `Đang đồng bộ dữ liệu ${i}/${totalChunks}... (${importedEntries.toLocaleString()} từ & câu ví dụ)`
                });

                const chunkRes = await fetch(`/dictionary/chunk_${i}.json`);
                if (!chunkRes.ok) {
                    throw new Error(`Lỗi tải dữ liệu phần ${i}`);
                }
                const chunkData = await chunkRes.json();

                // Batch upsert into IndexedDB
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);

                    for (let j = 0; j < chunkData.length; j++) {
                        store.put(chunkData[j]);
                    }

                    tx.oncomplete = () => {
                        importedEntries += chunkData.length;
                        resolve();
                    };
                    tx.onerror = (err) => reject(err);
                });

                // Mark ready right after first chunk is imported
                localStorage.setItem('quizki_dict_ready', 'true');
            }

            broadcastProgress({
                percent: 100,
                text: `Hoàn tất! Đã đồng bộ ${totalEntries.toLocaleString()} từ & câu ví dụ.`
            });

            localStorage.setItem('quizki_dict_ready', 'true');
            localStorage.setItem('quizki_dict_version', manifest.version || CURRENT_DICT_VERSION);
            return true;
        } catch (err) {
            console.error('Error syncing dictionary:', err);
            if (!silent) {
                throw err;
            }
            return false;
        } finally {
            activeSyncPromise = null;
            if (onProgress) {
                syncListeners.delete(onProgress);
            }
        }
    })();

    return activeSyncPromise;
}

/**
 * Backward compatibility alias for installDictionary
 */
export const installDictionary = (onProgress) => syncDictionary({ onProgress });

/**
 * Fast search in IndexedDB by word, reading, or Sino-Vietnamese
 */
export async function searchDictionary(queryStr, limit = 50) {
    if (!queryStr || typeof queryStr !== 'string') return [];
    const trimmed = queryStr.trim();
    if (!trimmed) return [];

    const db = await openDb();

    // Convert romaji if query is ascii romaji (e.g. "kaishi" -> "かいし")
    const kanaQuery = romajiToHiragana(trimmed);
    
    // Generate deconjugated candidates (e.g. "食べた" -> ["食べた", "食べる"])
    const candidates = Array.from(new Set([
        trimmed,
        kanaQuery,
        ...deconjugate(trimmed),
        ...deconjugate(kanaQuery)
    ])).filter(Boolean);

    const resultsMap = new Map();

    const addEntry = (entry, score) => {
        if (!entry || !entry.w) return;
        const key = `${entry.w}|${entry.r || ''}`;
        if (!resultsMap.has(key) || resultsMap.get(key).score < score) {
            resultsMap.set(key, { ...entry, _score: score });
        }
    };

    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const idxW = store.index('idx_w');
        const idxR = store.index('idx_r');
        const idxHv = store.index('idx_hv');

        let pending = 0;

        const checkDone = () => {
            pending--;
            if (pending <= 0) {
                // Sort by score desc, then by frequency rank asc
                const sorted = Array.from(resultsMap.values()).sort((a, b) => {
                    if (b._score !== a._score) return b._score - a._score;
                    const rankA = a.f || 999999;
                    const rankB = b.f || 999999;
                    return rankA - rankB;
                });
                resolve(sorted.slice(0, limit));
            }
        };

        // 1. Exact match lookups for all candidates
        for (const cand of candidates) {
            pending += 2;

            // Look up by Kanji/Word (w)
            const reqW = idxW.getAll(cand);
            reqW.onsuccess = () => {
                const list = reqW.result || [];
                for (const item of list) {
                    const isDirect = cand === trimmed || cand === kanaQuery;
                    addEntry(item, isDirect ? 1000 : 800);
                }
                checkDone();
            };
            reqW.onerror = () => checkDone();

            // Look up by Reading (r)
            const reqR = idxR.getAll(cand);
            reqR.onsuccess = () => {
                const list = reqR.result || [];
                for (const item of list) {
                    const isDirect = cand === trimmed || cand === kanaQuery;
                    addEntry(item, isDirect ? 900 : 750);
                }
                checkDone();
            };
            reqR.onerror = () => checkDone();
        }

        // 2. Prefix search on main query and kana query (e.g. typing "かい")
        const prefixTargets = Array.from(new Set([trimmed, kanaQuery])).filter(q => q.length >= 1);
        for (const pfx of prefixTargets) {
            pending += 2;
            const range = IDBKeyRange.bound(pfx, pfx + '\uffff', false, false);

            const cursorW = idxW.openCursor(range);
            let countW = 0;
            cursorW.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && countW < 25) {
                    addEntry(cursor.value, 400);
                    countW++;
                    cursor.continue();
                } else {
                    checkDone();
                }
            };
            cursorW.onerror = () => checkDone();

            const cursorR = idxR.openCursor(range);
            let countR = 0;
            cursorR.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && countR < 25) {
                    addEntry(cursor.value, 350);
                    countR++;
                    cursor.continue();
                } else {
                    checkDone();
                }
            };
            cursorR.onerror = () => checkDone();
        }

        // 3. Sino-Vietnamese lookup (e.g. user typed "KHAI THUY" or "THUC")
        const upperQuery = trimmed.toUpperCase();
        if (/^[A-ZÀ-Ỹ\s]+$/.test(upperQuery) && upperQuery.length >= 2) {
            pending++;
            const rangeHv = IDBKeyRange.bound(upperQuery, upperQuery + '\uffff', false, false);
            const cursorHv = idxHv.openCursor(rangeHv);
            let countHv = 0;
            cursorHv.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && countHv < 20) {
                    addEntry(cursor.value, 600);
                    countHv++;
                    cursor.continue();
                } else {
                    checkDone();
                }
            };
            cursorHv.onerror = () => checkDone();
        }

        if (pending === 0) {
            resolve([]);
        }
    });
}
