import fs from 'fs';

const txt = fs.readFileSync('scripts/staticContent-BIa7ebYC.js', 'utf8');
const allKeys = [];
const regex = /"([^"]+)":"([a-f0-9]{32})"/g;
let m;
while ((m = regex.exec(txt)) !== null) {
    allKeys.push({ key: m[1], hash: m[2] });
}

console.log('Total static keys in OpenJLPT:', allKeys.length);

const grammarKeys = allKeys.filter(k => k.key.toLowerCase().includes('grammar') || k.key.toLowerCase().includes('bunpou') || k.key.toLowerCase().includes('minna') || k.key.toLowerCase().includes('skm') || k.key.toLowerCase().includes('sheet'));

console.log('Grammar-related keys:', grammarKeys);
