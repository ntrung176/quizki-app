import { getSharedBookGroups } from './bookService';
import { getSharedKanjiList, getSharedVocabList, getSharedVocabCategories } from './kanjiService';
import { getSharedGrammarData } from './grammarService';
import { getSharedJLPTTests } from '../services/jlptDataService';
import { getKaiwaVideos } from '../services/videoKaiwaService';
import { syncDictionary } from '../services/dictionaryService';
import { preloadKuroshiro } from './furiganaHelper';

let isPreloading = false;
let hasPreloaded = false;

/**
 * Intelligent background preloader to warm in-memory singletons during browser idle time.
 * Delivers instantaneous (0ms) page transitions for Books, Kanji, Grammar, and JLPT Tests,
 * and preloads the Yomitan Japanese Dictionary into IndexedDB.
 */
/**
 * Intelligent on-demand preloader.
 * High-memory datasets (Books, Grammar, Vocab, Kaiwa videos, Yomitan Dictionary, and JLPT banks)
 * are now strictly loaded on-demand per screen to keep active browser RAM lean (< 180MB),
 * identical to modern web apps like Nhaikanji.
 */
export const preloadCoreData = () => {
    // No-op: Eager background loading of multi-megabyte JSON databases into V8 heap is disabled.
    // Every module (Kanji, Books, Grammar, JLPT, Dictionary) automatically fetches its own
    // data smoothly and on-demand when the user opens that respective section.
};
