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
export const getKuroshiro = async () => {
    if (kuroshiroInstance) return kuroshiroInstance;
    if (initPromise) return initPromise;

    const kuroshiro = new Kuroshiro();
    initPromise = kuroshiro.init(createPatchedAnalyzer()).then(() => {
        kuroshiroInstance = kuroshiro;
        return kuroshiroInstance;
    }).catch(e => {
        initPromise = null;
        console.error("Failed to initialize Kuroshiro:", e);
        throw e;
    });

    return initPromise;
};

/**
 * Converts standard Japanese text to furigana format: 漢字(かんじ)
 * Example: 食べ物 -> 食(た)べ物(もの)
 */
export const generateFuriganaText = async (text) => {
    if (!text) return text;
    try {
        const kuro = await getKuroshiro();
        const result = await kuro.convert(text, { mode: "okurigana", to: "hiragana" });
        return result;
    } catch (e) {
        console.error("Furigana generation failed:", e);
        return text;
    }
};
