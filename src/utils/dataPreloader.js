import { getSharedBookGroups } from './bookService';
import { getSharedKanjiList, getSharedVocabList, getSharedVocabCategories } from './kanjiService';
import { getSharedGrammarData } from './grammarService';
import { getSharedJLPTTests } from '../services/jlptDataService';

let isPreloading = false;
let hasPreloaded = false;

/**
 * Intelligent background preloader to warm in-memory singletons during browser idle time.
 * Delivers instantaneous (0ms) page transitions for Books, Kanji, Grammar, and JLPT Tests.
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

            // Stage 3: Load JLPT tests in the background
            getSharedJLPTTests().catch(() => {});

            hasPreloaded = true;
            if (process.env.NODE_ENV === 'development') {
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
