import fs from 'fs';
import path from 'path';

const setsDir = 'data/openjlpt/vocabulary/sets';
const files = fs.readdirSync(setsDir).filter(f => f.endsWith('.json'));

console.log(`Total set files: ${files.length}`);

let totalCards = 0;
const sampleCards = [];

for (const file of files) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(setsDir, file), 'utf-8'));
        const cards = data.cards || [];
        totalCards += cards.length;
        if (sampleCards.length < 5 && cards.length > 0) {
            sampleCards.push({
                setTitle: data.title,
                level: data.jlptLevel,
                card: cards[0]
            });
        }
    } catch (e) {}
}

console.log(`Total unique cards across all sets: ${totalCards}`);
console.log('\nSample cards from different sets:');
console.log(JSON.stringify(sampleCards, null, 2));
