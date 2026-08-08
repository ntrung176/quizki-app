import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import * as kuromojiModule from "kuromoji";

const DICT_BASE_URL = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

let kuroshiroInstance = null;
let initPromise = null;

// Resolve CommonJS export
const kuromoji = kuromojiModule.default || kuromojiModule;

/**
 * Patch the KuromojiAnalyzer to load dictionary files using correct absolute URLs.
 * 
 * Problem: kuromoji internally uses `path.join(dicPath, filename)` to build dictionary URLs.
 * When `path` is polyfilled by vite-plugin-node-polyfills, `path.join` strips the "https://"
 * protocol from the CDN URL, producing "https:/cdn.jsdelivr.net/..." which causes a 404.
 * 
 * Fix: Patch XMLHttpRequest.prototype.open temporarily during initialization to fix the URL.
 */
const createPatchedAnalyzer = () => {
    const analyzer = new KuromojiAnalyzer({
        dictPath: DICT_BASE_URL
    });

    const originalInit = analyzer.init.bind(analyzer);

    analyzer.init = function () {
        return new Promise((resolve, reject) => {
            // Install XMLHttpRequest interceptor to fix mangled URLs
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                let fixedUrl = url;
                if (typeof url === 'string' && url.includes("https:/cdn.jsdelivr.net") && !url.includes("https://cdn.jsdelivr.net")) {
                    fixedUrl = url.replace("https:/cdn.jsdelivr.net", "https://cdn.jsdelivr.net");
                }
                return originalOpen.apply(this, [method, fixedUrl, ...rest]);
            };

            originalInit()
                .then(() => {
                    // Restore original open after dictionary is loaded
                    XMLHttpRequest.prototype.open = originalOpen;
                    resolve();
                })
                .catch((err) => {
                    // Restore on error as well
                    XMLHttpRequest.prototype.open = originalOpen;
                    reject(err);
                });
        });
    };

    return analyzer;
};

/**
 * Get or initialize the Kuroshiro instance.
 * Uses a CDN for the dictionary to avoid bloating the app bundle.
 */
const getKuroshiro = async () => {
    if (kuroshiroInstance) return kuroshiroInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const analyzer = createPatchedAnalyzer();
        const kuroshiro = new Kuroshiro();
        await kuroshiro.init(analyzer);
        kuroshiroInstance = kuroshiro;
        return kuroshiroInstance;
    })().catch(e => {
        initPromise = null;
        console.error("Failed to initialize Kuroshiro:", e);
        throw e;
    });

    return initPromise;
};

/**
 * Preload Kuroshiro in background idle time so card #1 never lags.
 */
export const preloadKuroshiro = () => {
    if (typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                getKuroshiro().catch(() => {});
            });
        } else {
            setTimeout(() => {
                getKuroshiro().catch(() => {});
            }, 1500);
        }
    }
};

const furiganaCache = new Map();

/**
 * Converts standard Japanese text to furigana format: 漢字(かんじ)
 * Example: 食べ物 -> 食(た)べ物(もの)
 */
export const generateFuriganaText = async (text, knownReading = '') => {
    if (!text) return text;
    if (furiganaCache.has(text)) return furiganaCache.get(text);

    // If knownReading is provided, format immediately in 0ms without Kuroshiro
    if (knownReading && knownReading.trim()) {
        const formatted = `${text.trim()}（${knownReading.trim()}）`;
        furiganaCache.set(text, formatted);
        return formatted;
    }

    try {
        // Add a 400ms timeout so Kuroshiro dictionary loading never hangs mobile JS thread
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Kuroshiro timeout')), 400));
        const kuroPromise = (async () => {
            const kuro = await getKuroshiro();
            return await kuro.convert(text, { mode: "okurigana", to: "hiragana" });
        })();

        const result = await Promise.race([kuroPromise, timeoutPromise]);
        furiganaCache.set(text, result);
        return result;
    } catch (e) {
        furiganaCache.set(text, text);
        return text;
    }
};

/**
 * Normalize and merge multiple parenthesis patterns into a single trailing bracket format.
 * E.g., "お土産（おみやげ）を届ける（おとどける）" -> "お土産を届ける（おみやげをとどける）"
 */
export const normalizeParenthesesFormat = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    
    if (!trimmed.includes('(') && !trimmed.includes('（')) {
        return trimmed;
    }

    // First check if there is only one pair of parentheses and it is at the very end.
    const trailingRegex = /^([^\(（]+)[\(（]([^\)）]+)[\)）]$/;
    const trailingMatch = trimmed.match(trailingRegex);
    if (trailingMatch) {
        const raw = trailingMatch[1].trim();
        const reading = trailingMatch[2].trim();
        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(raw);
        if (hasKanji && reading !== raw) {
            return `${raw}（${reading}）`;
        }
        return raw;
    }

    let rawText = '';
    let readingText = '';
    
    // Match any text before parentheses, plus the content inside the parentheses
    const regex = /([^\(（]*)(?:[\(（]([^\)）]+)[\)）])/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(trimmed)) !== null) {
        const prefix = match[1];
        const inside = match[2];
        
        rawText += prefix;
        
        // Find where the word starts in the prefix
        // 1. Check for Kanji
        let wordStartIdx = prefix.search(/[\u4E00-\u9FAF\u3400-\u4DBF]/);
        // 2. If no Kanji, check for Katakana
        if (wordStartIdx === -1) {
            wordStartIdx = prefix.search(/[\u30A0-\u30FF]/);
        }
        
        if (wordStartIdx !== -1) {
            // Keep everything before the word start, and replace the word with the inside reading
            const kanaPrefix = prefix.slice(0, wordStartIdx);
            readingText += kanaPrefix + inside;
        } else {
            // If no Kanji or Katakana, just append the prefix and the inside reading
            readingText += prefix + inside;
        }
        
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < trimmed.length) {
        const remaining = trimmed.slice(lastIndex);
        rawText += remaining;
        readingText += remaining;
    }

    const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(rawText);
    if (hasKanji && readingText !== rawText) {
        return `${rawText}（${readingText}）`;
    }
    
    return rawText;
};

/**
 * Convert a word to standard format: "Word（reading）" if it contains Kanji and is missing brackets.
 * If the word has no Kanji, it keeps it as is (no brackets).
 * If the word already has brackets, it preserves/standardizes them.
 * If knownReading is provided and word is missing brackets, it uses knownReading instead of Kuroshiro.
 */
export const ensureFuriganaFormat = async (word, knownReading = '') => {
    if (!word) return '';
    const trimmedWord = word.trim();
    
    // Check if it already has full-width or half-width brackets
    if (trimmedWord.includes('（') || trimmedWord.includes('(')) {
        // Standardize and merge any misplaced parentheses
        return normalizeParenthesesFormat(trimmedWord);
    }

    // Check if it contains Kanji
    const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(trimmedWord);
    if (!hasKanji) {
        return trimmedWord; // Pure Kana/Romaji doesn't need brackets
    }

    // If knownReading is provided, use it
    if (knownReading && knownReading.trim()) {
        return `${trimmedWord}（${knownReading.trim()}）`;
    }

    try {
        const kuro = await getKuroshiro();
        // Convert the word to hiragana
        const reading = await kuro.convert(trimmedWord, { mode: "normal", to: "hiragana" });
        if (reading && reading !== trimmedWord) {
            return `${trimmedWord}（${reading}）`;
        }
    } catch (e) {
        console.error("Failed to generate reading for word:", trimmedWord, e);
    }
    return trimmedWord;
};

/**
 * Clean Japanese example sentence from Kuroshiro/AI garbled parenthesized reading clutter.
 * Removes duplicate reading brackets like "(きぎょう) (きぎょう)" or "(りつ) (た)"
 * and returns clean Japanese text for inputs and flashcard sentences.
 */
export const cleanJapaneseExampleSentence = (text) => {
    if (!text) return '';
    let str = text.trim();

    // 1. Remove duplicate identical adjacent brackets like "(きぎょう) (きぎょう)" or "（きぎょう）（きぎょう）"
    str = str.replace(/([\(（][^\)）]+[\)）])\s*[\(（]\1[\)）]/g, '$1');

    // 2. If sentence contains Kuroshiro garbled readings embedded after Kanji like "企業(きぎょう)" or "立(りつ) (た) ち上(じょう) (あ) げる", strip the reading parens to leave pure clean sentence
    if (/[\u4E00-\u9FAF\u3400-\u4DBF]+[\(（][\u3040-\u309F\u30A0-\u30FF\s]+[\)）]/.test(str)) {
        str = str.replace(/([\(（][\u3040-\u309F\u30A0-\u30FF\s]+[\)）])/g, '');
    }

    // Clean any remaining double spaces
    return str.replace(/\s+/g, ' ').trim();
};
