import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

async function test() {
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "./public/dict" }));
    const result_furigana = await kuroshiro.convert("食べ物", { mode: "furigana", to: "hiragana" });
    const result_okurigana = await kuroshiro.convert("食べ物", { mode: "okurigana", to: "hiragana" });

    console.log("Furigana:", result_furigana);
    console.log("Okurigana:", result_okurigana);
}

test();
