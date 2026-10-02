import fs from 'fs';

const code = fs.readFileSync('data/openjlpt/KanjiDetail_openjlpt.js', 'utf-8');

const start = code.indexOf('kd-page');
if (start !== -1) {
    console.log(code.slice(Math.max(0, start - 200), start + 3000));
}
