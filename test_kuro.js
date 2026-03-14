import KuroshiroModule from "kuroshiro";
import KuromojiAnalyzerModule from "kuroshiro-analyzer-kuromoji";

async function run() {
    const Kuroshiro = KuroshiroModule.default || KuroshiroModule;
    const KuromojiAnalyzer = KuromojiAnalyzerModule.default || KuromojiAnalyzerModule;

    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
    const res = await kuroshiro.convert("見失う", { mode: "okurigana", to: "hiragana" });
    console.log("Kuroshiro Output:", res);

    const text = res;
    const furiganaRegex = /([\u4E00-\u9FAF\u3400-\u4DBF]+)[（\(\[]([^）\)\]]+)[）\)\]]/g;

    let match;
    while ((match = furiganaRegex.exec(text)) !== null) {
        console.log("Matched:", match[1], match[2]);
    }
}
run();
