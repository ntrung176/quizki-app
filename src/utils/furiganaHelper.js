import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const DICT_BASE_URL = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict";

let kuroshiroInstance = null;
let initPromise = null;

/**
 * Patch the KuromojiAnalyzer to load dictionary files using correct absolute URLs.
 * 
 * Problem: kuromoji internally uses `path.join(dicPath, filename)` to build dictionary URLs.
 * When `path` is polyfilled by vite-plugin-node-polyfills, `path.join` strips the "https://"
 * protocol from the CDN URL, producing "https:/cdn.jsdelivr.net/..." which the browser
 * resolves as a relative URL → "https://quizki.id.vn/cdn.jsdelivr.net/..." → 404.
 * 
 * Fix: After creating the KuromojiAnalyzer, we monkey-patch the internal kuromoji builder
 * so that loadArrayBuffer uses proper string concatenation for the URL instead of path.join.
 */
const createPatchedAnalyzer = () => {
    const analyzer = new KuromojiAnalyzer({
        dictPath: DICT_BASE_URL
    });

    // Wrap the original init method to patch the loader after kuromoji builder is created
    const originalInit = analyzer.init.bind(analyzer);
    analyzer.init = function () {
        return new Promise((resolve, reject) => {
            // Access the internal kuromoji module to patch loader
            import("kuromoji").then((kuromojiModule) => {
                const kuromoji = kuromojiModule.default || kuromojiModule;

                // Create a builder with the dict path
                const builder = kuromoji.builder({ dicPath: DICT_BASE_URL });

                // Patch the DictionaryLoader's loadArrayBuffer to use correct absolute URLs
                const originalLoadArrayBuffer = builder.loader.loadArrayBuffer.bind(builder.loader);
                builder.loader.loadArrayBuffer = function (url, callback) {
                    // Fix the URL: if path.join mangled the https:// protocol, reconstruct it
                    let fixedUrl = url;
                    if (!url.startsWith("https://") && !url.startsWith("http://")) {
                        // Extract just the filename from the mangled path
                        const filename = url.split("/").pop();
                        fixedUrl = DICT_BASE_URL + "/" + filename;
                    }
                    return originalLoadArrayBuffer(fixedUrl, callback);
                };

                builder.build((err, tokenizer) => {
                    if (err) {
                        return reject(err);
                    }
                    this._analyzer = tokenizer;
                    resolve();
                });
            }).catch(reject);
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
