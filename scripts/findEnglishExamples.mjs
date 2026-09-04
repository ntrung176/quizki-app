import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/grammar_data.json', 'utf8'));

let totalEx = 0;
let engEx = 0;
const isEnglish = (str) => {
    if (!str) return false;
    const s = str.trim();
    return /^[a-zA-Z0-9\s,\.'\?!\":;—\(\)\/\$%\&-]+$/.test(s) && /[a-zA-Z]{3,}/.test(s);
};

const samples = [];
const engList = [];

for (const tb of data) {
    for (const ls of tb.lessons || []) {
        for (const pt of ls.points || []) {
            for (const ex of pt.examples || []) {
                totalEx++;
                if (ex.vi && isEnglish(ex.vi)) {
                    engEx++;
                    engList.push({ ja: ex.ja, vi: ex.vi, id: pt.id });
                    if (samples.length < 20) samples.push({ ja: ex.ja, vi: ex.vi });
                }
            }
        }
    }
}

console.log({ totalEx, engEx });
console.log('Sample English examples:', samples.slice(0, 10));
