import fs from 'fs';

const deepData = JSON.parse(fs.readFileSync('public/data/deep_grammar_data.json', 'utf8'));
const grammarData = JSON.parse(fs.readFileSync('public/data/grammar_data.json', 'utf8'));

// Count total points in grammarData
let totalQuizkiPoints = 0;
let matchedCount = 0;

const deepKeys = Object.keys(deepData);
console.log(`Total Deep Grammar Keys: ${deepKeys.length}`);

// Normalize pattern helper
function cleanPattern(p) {
    if (!p) return '';
    return p.replace(/^[〜～~]/, '').replace(/[〜～~]$/, '').trim();
}

const deepNormalizedMap = new Map();
deepKeys.forEach(k => {
    deepNormalizedMap.set(cleanPattern(k), deepData[k]);
});

grammarData.forEach(tb => {
    (tb.lessons || []).forEach(ls => {
        (ls.points || []).forEach(pt => {
            totalQuizkiPoints++;
            const rawP = pt.pattern || pt.title || '';
            const cleaned = cleanPattern(rawP);
            if (deepData[rawP] || deepNormalizedMap.has(cleaned)) {
                matchedCount++;
            }
        });
    });
});

console.log(`Total Quizki Points across all textbooks: ${totalQuizkiPoints}`);
console.log(`Matched with Deep Explanations: ${matchedCount}`);
