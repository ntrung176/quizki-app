import fs from 'fs';

const code = fs.readFileSync('data/openjlpt/KanjiDetail_openjlpt.js', 'utf-8');

const idx = code.indexOf('Cách đọc');
if (idx !== -1) {
    console.log(code.slice(Math.max(0, idx - 200), idx + 800));
} else {
    console.log('Not found string "Cách đọc", searching for readings component...');
    const pos = code.indexOf('kd-readings');
    if (pos !== -1) {
        console.log(code.slice(Math.max(0, pos - 200), pos + 1000));
    }
}
