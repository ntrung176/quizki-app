function buildRubySegments(ja, furigana) {
    if (!ja) return [];
    if (!furigana || furigana === ja) {
        return [{ text: ja, rt: '' }];
    }

    const isKanji = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch);

    // If ja has no kanji, return as is
    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ja)) {
        return [{ text: ja, rt: '' }];
    }

    // Extract contiguous non-kanji anchor blocks and kanji blocks in ja
    const blocks = [];
    let idx = 0;
    while (idx < ja.length) {
        if (isKanji(ja[idx])) {
            let k = '';
            while (idx < ja.length && isKanji(ja[idx])) {
                k += ja[idx];
                idx++;
            }
            blocks.push({ type: 'kanji', text: k });
        } else {
            let nk = '';
            while (idx < ja.length && !isKanji(ja[idx])) {
                nk += ja[idx];
                idx++;
            }
            blocks.push({ type: 'kana', text: nk });
        }
    }

    let fIdx = 0;
    const segments = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'kana') {
            const found = furigana.indexOf(block.text, fIdx);
            if (found !== -1) {
                fIdx = found + block.text.length;
            }
            segments.push({ text: block.text, rt: '' });
        } else {
            // Kanji block
            const nextKanaBlock = blocks[i + 1];
            let rt = '';
            if (nextKanaBlock) {
                // Search for nextKanaBlock text in furigana, but starting at least from fIdx + block.text.length
                const minOffset = fIdx + Math.max(1, block.text.length);
                let nextPos = furigana.indexOf(nextKanaBlock.text, minOffset);
                if (nextPos === -1) {
                    nextPos = furigana.indexOf(nextKanaBlock.text, fIdx);
                }
                if (nextPos !== -1) {
                    rt = furigana.slice(fIdx, nextPos);
                    fIdx = nextPos;
                } else {
                    rt = '';
                }
            } else {
                rt = furigana.slice(fIdx);
                fIdx = furigana.length;
            }
            segments.push({ text: block.text, rt });
        }
    }

    return segments;
}

const test1 = buildRubySegments(
    "今度来るときはぜひ、彼氏も連れて来てください。",
    "こんどくるときはぜひ、かれしもつれてきてください。"
);
console.log('Test 1:', test1);

const test2 = buildRubySegments(
    "大学を卒業するまでに、ぜひ一度日本に行ってみたいです。",
    "だいがくをそつぎょうするまでに、ぜひいちどにほんにいってみたいです。"
);
console.log('Test 2:', test2);

const test3 = buildRubySegments(
    "エベレスト山は富士山より高いです。",
    "エベレストやまはふじさんよりたかいです。"
);
console.log('Test 3:', test3);

const test4 = buildRubySegments(
    "ベトナムに旅行したら、ぜひフォーを食べてみたいです。",
    "ベトナムにりょこうしたら、ぜひフォーをたべてみたいです。"
);
console.log('Test 4:', test4);
