import { db, appId } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateCachedUserSrs } from './kanjiService';
import { updateCachedUserGrammarSrs } from './grammarService';

/**
 * Automatically sync and activate lesson's Vocab, Kanji, and Grammar items
 * into the user's SRS decks for spaced repetition review upon completing a roadmap lesson.
 */
export const addRoadmapLessonItemsToSrs = async ({ lesson, userId, allCards = [] }) => {
    if (!lesson || !lesson.items) return { vocabCount: 0, kanjiCount: 0, grammarCount: 0 };

    const { vocab = [], kanji = [], grammar = [] } = lesson.items;
    let vocabCount = 0;
    let kanjiCount = 0;
    let grammarCount = 0;

    const now = Date.now();

    // 1. Activate / Add Vocab to user's SRS Vocabulary
    if (Array.isArray(vocab) && vocab.length > 0) {
        try {
            const cachedVocabKey = userId ? `quizki_cached_vocab_${userId}` : 'quizki_cached_vocab';
            let localCards = [];
            try {
                const raw = localStorage.getItem(cachedVocabKey);
                if (raw) localCards = JSON.parse(raw);
            } catch (_) {}

            for (const v of vocab) {
                const word = v.word || v.front || v.kanji;
                if (!word) continue;

                // Check if card already exists in allCards or localCards
                const existing = (allCards || []).find(c => c.front === word || c.word === word) ||
                    localCards.find(c => c.front === word || c.word === word);

                const cardId = existing?.id || `roadmap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const newCard = {
                    id: cardId,
                    front: word,
                    frontWithFurigana: v.reading && v.reading !== word ? `${word}[${v.reading}]` : word,
                    reading: v.reading || '',
                    back: v.meaning || v.back || '',
                    sinoVietnamese: v.sinoVietnamese || v.sinoViet || '',
                    targetLanguage: 'ja',
                    srsEnabled: true,
                    intervalIndex_back: 0,
                    srsInterval: 0,
                    srsEase: 2.5,
                    srsLearningStep: 0,
                    srsReps: 0,
                    srsLapseCount: 0,
                    srsState: 'learning',
                    nextReview_back: now, // Due immediately
                    nextReview: now,
                    lastReviewed: now,
                    folderId: 'roadmap_japanese',
                    source: 'roadmap',
                    lessonId: lesson.id,
                    createdAt: existing?.createdAt || now,
                    updatedAt: now
                };

                // Save to Firestore if user is authenticated
                if (userId && db && appId) {
                    try {
                        const cardRef = doc(db, `artifacts/${appId}/users/${userId}/vocabulary`, String(cardId));
                        await setDoc(cardRef, newCard, { merge: true });
                    } catch (fsErr) {
                        console.warn('Failed to save roadmap vocab to Firestore:', fsErr);
                    }
                }

                // Update local storage cache
                const existIdx = localCards.findIndex(c => c.id === cardId);
                if (existIdx >= 0) {
                    localCards[existIdx] = { ...localCards[existIdx], ...newCard };
                } else {
                    localCards.push(newCard);
                }
                vocabCount++;
            }

            try {
                localStorage.setItem(cachedVocabKey, JSON.stringify(localCards));
            } catch (_) {}
        } catch (e) {
            console.error('Error syncing roadmap vocab to SRS:', e);
        }
    }

    // 2. Activate Kanji into user's Kanji SRS
    if (Array.isArray(kanji) && kanji.length > 0) {
        try {
            for (const k of kanji) {
                const char = k.character || k.literal;
                if (!char) continue;

                const kanjiSrsPayload = {
                    state: 'learning',
                    learningStep: 0,
                    interval: 0,
                    ease: 2.5,
                    reps: 0,
                    lapseCount: 0,
                    nextReview: now, // Due immediately
                    nextReview_back: now,
                    lastReviewed: now,
                    isDue: true,
                    sinoViet: k.sinoViet || '',
                    meaning: k.meaning || '',
                    onyomi: k.onyomi || '',
                    kunyomi: k.kunyomi || '',
                    source: 'roadmap',
                    lessonId: lesson.id
                };

                updateCachedUserSrs(userId, char, kanjiSrsPayload, char);
                kanjiCount++;
            }
        } catch (e) {
            console.error('Error syncing roadmap kanji to SRS:', e);
        }
    }

    // 3. Activate Grammar into user's Grammar SRS
    if (Array.isArray(grammar) && grammar.length > 0) {
        try {
            for (const g of grammar) {
                const grammarId = g.id || g.pattern;
                if (!grammarId) continue;

                const grammarSrsPayload = {
                    state: 'learning',
                    learningStep: 0,
                    interval: 0,
                    ease: 2.5,
                    reps: 0,
                    lapseCount: 0,
                    nextReview: now, // Due immediately
                    nextReview_back: now,
                    lastReviewed: now,
                    isDue: true,
                    pattern: g.pattern || '',
                    meaning: g.meaning || '',
                    meaningShort: g.meaningShort || '',
                    source: 'roadmap',
                    lessonId: lesson.id
                };

                updateCachedUserGrammarSrs(userId, grammarId, grammarSrsPayload);
                grammarCount++;
            }
        } catch (e) {
            console.error('Error syncing roadmap grammar to SRS:', e);
        }
    }

    // Dispatch global events so HomeScreen & SRS Screens re-calculate due counts immediately
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('srs-updated'));
            window.dispatchEvent(new CustomEvent('quizki-cards-updated'));
        }
    } catch (_) {}

    return { vocabCount, kanjiCount, grammarCount };
};

