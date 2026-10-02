import fs from 'fs';

const code = fs.readFileSync('data/openjlpt/KanjiDetail_openjlpt.js', 'utf-8');
const classNames = new Set([...code.matchAll(/class(?:Name)?:\s*["']([^"']+)["']/g)].map(m => m[1]));
console.log('All ClassNames in KanjiDetail_openjlpt.js:', [...classNames]);
