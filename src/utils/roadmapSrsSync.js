import { db, appId } from '../config/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import {
    updateCachedUserSrs,
    getCachedUserSrsData,
    syncPendingKanjiSrs,
    getCachedKanjiList
} from './kanjiService';
import {
    updateCachedUserGrammarSrs,
    getCachedUserGrammarSrsData,
    syncPendingGrammarSrs
} from './grammarService';
import { recordPendingVocabSync, updateCachedVocabSrs } from './vocabSrsCache';

export const ROADMAP_FOLDER_ID = 'roadmap_japanese';

const normalizeBaseWord = (str = '') => String(str).split('（')[0].split('(')[0].trim();

const makeDeterministicCardId = (word) => {
    const clean = normalizeBaseWord(word);
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = ((hash << 5) - hash) + clean.charCodeAt(i);
        hash |= 0;
    }
    return `roadmap_ja_${Math.abs(hash).toString(36)}`;
};

/**
 * Ensure the Roadmap study set folder exists in Firestore so SRSVocabScreen renders all synced roadmap vocab cards.
 */
const ensureRoadmapFolderExists = async (userId, folders = []) => {
    if (!userId || !db || !appId) return;
    const alreadyExists = (folders || []).some((f) => f?.id === ROADMAP_FOLDER_ID);
    if (alreadyExists) return;

    try {
        const folderRef = doc(db, `artifacts/${appId}/users/${userId}/studySets`, ROADMAP_FOLDER_ID);
        await setDoc(folderRef, {
            id: ROADMAP_FOLDER_ID,
            name: '🗺️ Lộ Trình Tương Tác',
            description: 'Từ vựng tự động đồng bộ vào hệ thống SRS sau mỗi bài học trên Lộ Trình.',
            targetLanguage: 'ja',
            parentId: null,
            source: 'roadmap',
            updatedAt: Date.now()
        }, { merge: true });
    } catch (err) {
        console.warn('[roadmapSrsSync] Could not ensure roadmap folder:', err?.message);
    }
};

/**
 * Automatically sync and activate lesson's Vocab, Kanji, and Grammar items
 * into the user's SRS decks for spaced repetition review upon completing a roadmap lesson.
 */
export const addRoadmapLessonItemsToSrs = async ({ lesson, userId, allCards = [], folders = [] }) => {
    if (!lesson || !lesson.items) {
        return { vocabCount: 0, kanjiCount: 0, grammarCount: 0, vocabItems: [], kanjiItems: [], grammarItems: [] };
    }

    const { vocab = [], kanji = [], grammar = [] } = lesson.items;
    const now = Date.now();
    const vocabItems = [];
    const kanjiItems = [];
    const grammarItems = [];
    const optimisticCards = [];

    // 1. Activate / Add Vocab to user's SRS Vocabulary
    if (Array.isArray(vocab) && vocab.length > 0) {
        try {
            await ensureRoadmapFolderExists(userId, folders);

            const batch = userId && db && appId ? writeBatch(db) : null;
            let batchCount = 0;

            for (const v of vocab) {
                const rawWord = v.word || v.front || v.kanji;
                const word = normalizeBaseWord(rawWord);
                if (!word) continue;

                const existing = (allCards || []).find((c) => {
                    const cFront = normalizeBaseWord(c.front || c.word || '');
                    return cFront === word;
                });

                const cardId = existing?.id || makeDeterministicCardId(word);
                const alreadyStudied = existing && Number(existing.srsReps || 0) > 0 && existing.srsEnabled !== false;

                const cardPayload = {
                    id: cardId,
                    front: word,
                    frontWithFurigana: v.reading && v.reading !== word ? `${word}[${v.reading}]` : (existing?.frontWithFurigana || word),
                    reading: v.reading || existing?.reading || '',
                    back: v.meaning || v.back || existing?.back || '',
                    sinoVietnamese: v.sinoVietnamese || v.sinoViet || existing?.sinoVietnamese || '',
                    example: v.example || existing?.example || '',
                    exampleMeaning: v.exampleMeaning || existing?.exampleMeaning || '',
                    jlptLevel: v.level || existing?.jlptLevel || '',
                    targetLanguage: 'ja',
                    srsEnabled: true,
                    folderId: existing?.folderId || ROADMAP_FOLDER_ID,
                    source: existing?.source || 'roadmap',
                    lessonId: lesson.id,
                    createdAt: existing?.createdAt || now,
                    updatedAt: now,
                    // Only schedule immediately due if card is brand new or SRS was turned off; never reset mastered cards
                    ...(alreadyStudied ? {} : {
                        intervalIndex_back: 0,
                        srsInterval: 0,
                        srsEase: 2.5,
                        srsLearningStep: 0,
                        srsReps: 0,
                        srsLapseCount: 0,
                        srsState: 'learning',
                        nextReview_back: now,
                        nextReview: now,
                        lastReviewed: now
                    })
                };

                if (userId && batch) {
                    const cardRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, String(cardId));
                    batch.set(cardRef, cardPayload, { merge: true });
                    batchCount++;

                    updateCachedVocabSrs(userId, cardId, cardPayload);
                    recordPendingVocabSync(userId, cardId, cardPayload);
                }

                optimisticCards.push(cardPayload);
                vocabItems.push({ word, reading: cardPayload.reading, meaning: cardPayload.back });
            }

            if (batch && batchCount > 0) {
                await batch.commit().catch((err) => {
                    console.warn('[roadmapSrsSync] Vocab batch commit deferred to pending queue:', err?.message);
                });
            }
        } catch (e) {
            console.error('Error syncing roadmap vocab to SRS:', e);
        }
    }

    // 2. Activate Kanji into user's Kanji SRS (using canonical kanji_data IDs when available)
    if (Array.isArray(kanji) && kanji.length > 0) {
        try {
            const cachedKanjiList = getCachedKanjiList() || [];
            const charToCanonicalId = new Map();
            cachedKanjiList.forEach((item) => {
                if (item?.character && item?.id) charToCanonicalId.set(item.character, item.id);
            });
            const existingSrsMap = userId ? (getCachedUserSrsData(userId) || {}) : {};

            for (const k of kanji) {
                const char = k.character || k.literal;
                if (!char) continue;

                const canonicalId = k.id || charToCanonicalId.get(char) || char;
                const prevSrs = existingSrsMap[canonicalId] || existingSrsMap[char] || existingSrsMap[`kanji_${char}`];
                const alreadyStudied = prevSrs && Number(prevSrs.reps || 0) > 0;

                const kanjiSrsPayload = alreadyStudied ? {
                    ...prevSrs,
                    character: char,
                    sinoViet: prevSrs.sinoViet || k.sinoViet || '',
                    meaning: prevSrs.meaning || k.meaning || '',
                    onyomi: prevSrs.onyomi || k.onyomi || '',
                    kunyomi: prevSrs.kunyomi || k.kunyomi || '',
                    lessonId: lesson.id
                } : {
                    state: 'learning',
                    learningStep: 0,
                    interval: 0,
                    ease: 2.5,
                    reps: 0,
                    lapseCount: 0,
                    nextReview: now,
                    nextReview_back: now,
                    lastReviewed: now,
                    isDue: true,
                    character: char,
                    sinoViet: k.sinoViet || '',
                    meaning: k.meaning || '',
                    onyomi: k.onyomi || '',
                    kunyomi: k.kunyomi || '',
                    source: 'roadmap',
                    lessonId: lesson.id
                };

                if (userId) {
                    updateCachedUserSrs(userId, canonicalId, kanjiSrsPayload, char);
                }
                kanjiItems.push({ character: char, sinoViet: k.sinoViet || '', meaning: k.meaning || '' });
            }

            if (userId) {
                await syncPendingKanjiSrs(userId).catch(() => {});
            }
        } catch (e) {
            console.error('Error syncing roadmap kanji to SRS:', e);
        }
    }

    // 3. Activate Grammar into user's Grammar SRS (using canonical master grammar IDs)
    if (Array.isArray(grammar) && grammar.length > 0) {
        try {
            const existingGrammarSrs = userId ? (getCachedUserGrammarSrsData(userId) || {}) : {};

            for (const g of grammar) {
                const grammarId = g.id || g.pattern;
                if (!grammarId) continue;

                const prevG = existingGrammarSrs[grammarId];
                const alreadyStudied = prevG && Number(prevG.reps || 0) > 0;

                const grammarSrsPayload = alreadyStudied ? {
                    ...prevG,
                    pattern: prevG.pattern || g.pattern || '',
                    meaning: prevG.meaning || g.meaning || '',
                    meaningShort: prevG.meaningShort || g.meaningShort || '',
                    lessonId: lesson.id
                } : {
                    state: 'learning',
                    learningStep: 0,
                    interval: 0,
                    ease: 2.5,
                    reps: 0,
                    lapseCount: 0,
                    nextReview: now,
                    nextReview_back: now,
                    lastReviewed: now,
                    isDue: true,
                    pattern: g.pattern || '',
                    meaning: g.meaning || '',
                    meaningShort: g.meaningShort || '',
                    level: g.level || '',
                    source: 'roadmap',
                    lessonId: lesson.id
                };

                if (userId) {
                    updateCachedUserGrammarSrs(userId, grammarId, grammarSrsPayload);
                }
                grammarItems.push({ pattern: g.pattern || '', meaning: g.meaningShort || g.meaning || '' });
            }

            if (userId) {
                await syncPendingGrammarSrs(userId).catch(() => {});
            }
        } catch (e) {
            console.error('Error syncing roadmap grammar to SRS:', e);
        }
    }

    // Dispatch global events so HomeScreen & SRS Screens re-calculate due counts immediately
    try {
        if (typeof window !== 'undefined') {
            if (optimisticCards.length > 0) {
                window.dispatchEvent(new CustomEvent('quizki-roadmap-vocab-added', {
                    detail: { cards: optimisticCards, userId }
                }));
            }
            window.dispatchEvent(new Event('srs-updated'));
            window.dispatchEvent(new CustomEvent('quizki-cards-updated'));
        }
    } catch (_) {}

    return {
        vocabCount: vocabItems.length,
        kanjiCount: kanjiItems.length,
        grammarCount: grammarItems.length,
        vocabItems,
        kanjiItems,
        grammarItems
    };
};
