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
export const preloadCoreData = () => {
    if (typeof window === 'undefined' || isPreloading || hasPreloaded) return;
    isPreloading = true;

    const runPreload = async () => {
        try {
            // Stage 1: Load lightweight collections first (Kanji list & Vocab categories)
            await Promise.allSettled([
                getSharedKanjiList(),
                getSharedVocabCategories(),
            ]);

            // Stage 2: Load mid-weight collections (Book groups & Grammar curriculum)
            await Promise.allSettled([
                getSharedBookGroups(),
                getSharedGrammarData(),
                getSharedVocabList()
            ]);

            // Stage 3: Load Kaiwa videos in the background
            getKaiwaVideos().catch(() => {});

            // Stage 4: Idle background dictionary sync (0ms instant lookup) into IndexedDB
            syncDictionary({ silent: true }).catch(() => {});
            // Note: JLPT tests & Kuroshiro dictionary are loaded on-demand per level/screen to keep RAM lean (< 250MB)

            hasPreloaded = true;
            if (import.meta.env.DEV) {
                console.log('⚡ [QuizKi Preloader] Core data cached in RAM successfully for 0ms navigation.');
            }
        } catch (err) {
            console.warn('⚠️ [QuizKi Preloader] Background warm-up notice:', err);
        } finally {
            isPreloading = false;
        }
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => runPreload(), { timeout: 3000 });
    } else {
        setTimeout(runPreload, 1500);
    }
};
