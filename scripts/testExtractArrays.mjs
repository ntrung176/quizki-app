import fs from 'fs';

async function testExtractAllSheetData() {
    const list = [
        { name: 'Keigo', file: 'KeigoSheet-B6UJWnHn.js' },
        { name: 'Conditional', file: 'ConditionalSheet-Ecru67i-.js' },
        { name: 'GivingReceiving', file: 'GivingReceivingSheet-B_pN6Qu9.js' },
        { name: 'Transitivity', file: 'TransitivitySheet-D0yjIadI.js' }
    ];

    for (const item of list) {
        const res = await fetch(`https://openjlpt.com/assets/${item.file}`);
        const text = await res.text();
        console.log(`\n================== ${item.name} ==================`);
        // Find arrays with objects in text: `[{key:...` or `[{plain:...`
        const arrayMatches = Array.from(text.matchAll(/\[\{[^\}]+\}(?:,\{[^\}]+\})*\]/g)).map(m => m[0]);
        console.log(`Found ${arrayMatches.length} data arrays`);
        arrayMatches.slice(0, 3).forEach((a, i) => console.log(`Array ${i + 1} (${a.length} chars):`, a.slice(0, 300)));
    }
}

testExtractAllSheetData();
