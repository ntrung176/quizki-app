function kataToHira(str) {
    return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
}

const isKanji = (ch) => /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch);
const isDigit = (ch) => /[0-9０-９]/.test(ch);
const isKana = (ch) => /[\u3040-\u309f\u30a0-\u30ff]/.test(ch);
const isRubyTarget = (ch) => isKanji(ch) || isDigit(ch);

export function buildRubySegments(ja, furigana) {
    if (!ja) return [];
    if (!furigana || furigana === ja) {
        return [{ text: ja, rt: '' }];
    }

    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ja)) {
        return [{ text: ja, rt: '' }];
    }

    const N = ja.length;
    const M = furigana.length;

    const dp = Array.from({ length: N + 1 }, () => new Int32Array(M + 1).fill(-100000));
    const parent = Array.from({ length: N + 1 }, () => new Array(M + 1));

    dp[0][0] = 0;

    for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= M; j++) {
            const score = dp[i][j];
            if (score < -50000) continue;

            const jChar = i < N ? ja[i] : null;
            const fChar = j < M ? furigana[j] : null;

            if (i < N && j < M) {
                const jHira = kataToHira(jChar);
                const fHira = kataToHira(fChar);

                // 1. Exact character match (kana or punctuation or english)
                if (jChar === fChar || (isKana(jChar) && isKana(fChar) && jHira === fHira)) {
                    if (score + 30 > dp[i + 1][j + 1]) {
                        dp[i + 1][j + 1] = score + 30;
                        parent[i + 1][j + 1] = { i, j, type: 'match' };
                    }
                }

                // 2. Ruby target (Kanji or Digit)
                if (isRubyTarget(jChar)) {
                    for (let step = 1; step <= 8 && j + step <= M; step++) {
                        let allKana = true;
                        for (let s = 0; s < step; s++) {
                            if (!isKana(furigana[j + s])) {
                                allKana = false;
                                break;
                            }
                        }
                        if (allKana) {
                            const bonus = 10;
                            if (score + bonus > dp[i + 1][j + step]) {
                                dp[i + 1][j + step] = score + bonus;
                                parent[i + 1][j + step] = { i, j, type: 'ruby', len: step };
                            }
                        }
                    }
                }
            }

            // Skip non-matching character in ja if not kanji
            if (i < N && !isKanji(jChar)) {
                if (score - 2 > dp[i + 1][j]) {
                    dp[i + 1][j] = score - 2;
                    parent[i + 1][j] = { i, j, type: 'skip_ja' };
                }
            }
        }
    }

    // Backtrack from (N, M)
    let curI = N;
    let curJ = M;
    const alignedOps = [];

    if (dp[N][M] < -50000) {
        let bestJ = M;
        let maxS = -Infinity;
        for (let j = 0; j <= M; j++) {
            if (dp[N][j] > maxS) {
                maxS = dp[N][j];
                bestJ = j;
            }
        }
        curJ = bestJ;
    }

    while (curI > 0 || curJ > 0) {
        const p = parent[curI]?.[curJ];
        if (!p) break;
        alignedOps.push({
            jIdx: p.i,
            jText: ja.slice(p.i, curI),
            fText: furigana.slice(p.j, curJ),
            type: p.type
        });
        curI = p.i;
        curJ = p.j;
    }

    alignedOps.reverse();

    const segments = [];
    for (const op of alignedOps) {
        if (op.type === 'ruby') {
            segments.push({ text: op.jText, rt: op.fText });
        } else {
            segments.push({ text: op.jText, rt: '' });
        }
    }

    // Merge contiguous ruby blocks (kanji/digits) and contiguous kana
    const merged = [];
    for (const seg of segments) {
        if (!seg.text) continue;
        if (merged.length > 0) {
            const prev = merged[merged.length - 1];
            if (!seg.rt && !prev.rt) {
                prev.text += seg.text;
                continue;
            }
            if (seg.rt && prev.rt && isRubyTarget(seg.text) && isRubyTarget(prev.text)) {
                prev.text += seg.text;
                prev.rt += seg.rt;
                continue;
            }
        }
        merged.push(seg);
    }

    // If a ruby segment is purely digits with no kanji and user prefers standard digits without ruby
    return merged.map(seg => {
        if (/^[0-9０-９]+$/.test(seg.text)) {
            return { text: seg.text, rt: '' };
        }
        return seg;
    });
}

const testCases = [
    {
        ja: "ダナンからフェまでバスで2時間くらいかかります。",
        furigana: "ダナンからフェまでバスでにじかんくらいかかります。"
    },
    {
        ja: "朝の会議は7時から10時まで行います。",
        furigana: "あさのかいぎはしちじからじゅうじまでおこないます。"
    },
    {
        ja: "銀行は午前9時から午後6時までです。",
        furigana: "ぎんこうはごぜんくじからごごろくじまでです。"
    },
    {
        ja: "昼休みは12時から12時50分までです。",
        furigana: "ひるやすみはじゅうにじからじゅうにじごじゅっぷんまでです。"
    },
    {
        ja: "明日から頑張ります。",
        furigana: "あしたからがんばります。"
    },
    {
        ja: "大阪まで飛行機に乗った。",
        furigana: "おおさかまでひこうきにのった。"
    }
];

for (const t of testCases) {
    console.log('--- JA:', t.ja);
    const segs = buildRubySegments(t.ja, t.furigana);
    console.log(segs);
}
