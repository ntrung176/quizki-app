import { readFileSync, writeFileSync } from 'fs';

// Read the kanji data file
const content = readFileSync('src/data/jotobaKanjiData.js', 'utf-8');

// Extract all entries using regex
const entries = {};
const regex = /'([^']+)':\s*\{[^}]*sinoViet:\s*'([^']*)'/g;
let match;
while ((match = regex.exec(content)) !== null) {
    const kanji = match[1];
    const sinoViet = match[2];
    if (kanji.length === 1 && sinoViet) {
        // Take first reading only (before comma)
        const first = sinoViet.split(',')[0].trim();
        entries[kanji] = first;
    }
}

console.log(`Total kanji with sinoViet: ${Object.keys(entries).length}`);

// Generate the output file
let output = `// Auto-generated Kanji → Hán Việt lookup table
// Source: jotobaKanjiData.js (${Object.keys(entries).length} kanji, N5-N1)
// Generated: ${new Date().toISOString()}

export const KANJI_HV = {\n`;

const keys = Object.keys(entries);
let line = '';
for (let i = 0; i < keys.length; i++) {
    const entry = `'${keys[i]}':'${entries[keys[i]]}'`;
    const sep = i < keys.length - 1 ? ',' : '';
    if (line.length + entry.length + sep.length > 120) {
        output += `    ${line}\n`;
        line = entry + sep;
    } else {
        line += (line ? '' : '') + entry + sep;
    }
}
if (line) output += `    ${line}\n`;

output += `};\n\n`;
output += `// Hàm tra cứu Hán Việt từ bảng cứng
export const getSinoVietnamese = (word) => {
    if (!word) return '';
    const kanjiRegex = /[\\u4e00-\\u9faf\\u3400-\\u4dbf]/g;
    const kanjiList = word.match(kanjiRegex);
    if (!kanjiList || kanjiList.length === 0) return '';
    return kanjiList.map(k => KANJI_HV[k] || '').filter(Boolean).join(' ');
};
`;

writeFileSync('src/utils/kanjiHVLookup.js', output, 'utf-8');
console.log('Written to src/utils/kanjiHVLookup.js');
