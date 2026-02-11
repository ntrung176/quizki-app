/**
 * Fetch Sino-Vietnamese (Hán Việt) readings from Mazii API
 * and add sinoViet field to jotobaKanjiData.js
 */
import fs from 'fs';

const dataPath = 'src/data/jotobaKanjiData.js';

async function fetchHanViet(kanji) {
    try {
        const r = await fetch('https://mazii.net/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dict: 'javi', type: 'kanji', query: kanji, page: 1 })
        });
        const d = await r.json();
        const result = d.results?.[0];
        if (result && result.mean) {
            // mean contains the Hán Việt reading like "NHẬT, NHỰT"
            return result.mean.trim();
        }
        return null;
    } catch (e) {
        console.error(`Error for ${kanji}:`, e.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let content = fs.readFileSync(dataPath, 'utf-8');

    // Extract all kanji
    const kanjiMatches = [...content.matchAll(/'([^']{1})': \{ literal:/g)];
    const allKanji = kanjiMatches.map(m => m[1]);
    console.log(`Total kanji: ${allKanji.length}`);

    let updated = 0;
    let errors = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < allKanji.length; i += BATCH_SIZE) {
        const batch = allKanji.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (k) => {
            const hv = await fetchHanViet(k);
            return { kanji: k, hv };
        }));

        for (const { kanji, hv } of results) {
            if (hv) {
                // Find the entry and add sinoViet after meaningVi
                const escaped = kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`('${escaped}': \\{ literal: '${escaped}', meaningVi: '[^']*')`);
                const match = content.match(regex);
                if (match) {
                    const line = content.substring(
                        content.lastIndexOf('\n', content.indexOf(match[0])),
                        content.indexOf('\n', content.indexOf(match[0]) + match[0].length)
                    );
                    if (!line.includes('sinoViet:')) {
                        content = content.replace(match[0], `${match[0]}, sinoViet: '${hv.replace(/'/g, "\\'")}'`);
                        updated++;
                    }
                }
            } else {
                errors++;
            }
        }

        process.stdout.write(`\r${i + batch.length}/${allKanji.length} (updated: ${updated}, errors: ${errors})`);

        // Rate limiting - wait between batches
        if (i + BATCH_SIZE < allKanji.length) {
            await sleep(200);
        }
    }

    fs.writeFileSync(dataPath, content);
    console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
}

main();
