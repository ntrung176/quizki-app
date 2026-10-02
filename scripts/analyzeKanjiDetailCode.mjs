import fs from 'fs';

const code = fs.readFileSync('data/openjlpt/KanjiDetail_openjlpt.js', 'utf-8');

// Find sections
const findContext = (keyword, span = 400) => {
    let idx = 0;
    while ((idx = code.indexOf(keyword, idx)) !== -1) {
        console.log(`\n=== Context for "${keyword}" at ${idx} ===`);
        console.log(code.slice(Math.max(0, idx - 100), idx + span));
        idx += keyword.length;
    }
};

console.log('--- Analysing Sections ---');
findContext('Cách đọc', 300);
findContext('Kho ký ức', 400);
findContext('kd-reading', 300);
findContext('kd-hvm', 300);
findContext('chuyen-am', 300);
