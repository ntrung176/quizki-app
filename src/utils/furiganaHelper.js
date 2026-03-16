import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let kuroshiroInstance = null;
let initPromise = null;

/**
 * Get or initialize the Kuroshiro instance.
 * Uses a CDN for the dictionary to avoid bloating the app bundle.
 */
export const getKuroshiro = async () => {
    if (kuroshiroInstance) return kuroshiroInstance;
    if (initPromise) return initPromise;

    const kuroshiro = new Kuroshiro();
    initPromise = kuroshiro.init(new KuromojiAnalyzer({
        // Use CDN for dictionary to avoid Vite serving issues (invalid file signature on .gz files)
        dictPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict"
    })).then(() => {
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
