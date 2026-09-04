import fs from 'fs';
import path from 'path';

const cacheDir = './scripts/.grammar_cache';
const files = fs.readdirSync(cacheDir).filter(f => f.startsWith('detail_') && f.endsWith('.json'));

let samples = [];
for (let i = 0; i < files.length && samples.length < 10; i++) {
    const raw = fs.readFileSync(path.join(cacheDir, files[i]), 'utf8');
    const data = JSON.parse(raw);
    for (const u of data.usages || []) {
        if (u.synopsis && u.synopsis.includes('<s>')) {
            samples.push({ id: data._id, title: data.title, synopsis: u.synopsis });
            break;
        }
    }
}
console.log(JSON.stringify(samples, null, 2));
