import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levels = ['n1', 'n2', 'n3', 'n4', 'n5'];

let grandTotalTests = 0;
let grandTotalQ = 0;
let anyInvalidQ = 0;

for (const lvl of levels) {
  const p = path.resolve(__dirname, `../public/data/jlpt/${lvl}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  
  let lvlQ = 0;
  let invalidInLvl = 0;
  
  for (const t of data) {
    grandTotalTests++;
    for (const s of (t.sections || [])) {
      for (const q of (s.questions || [])) {
        grandTotalQ++;
        lvlQ++;
        
        if (!q.options || q.options.length < 2) {
          invalidInLvl++;
          anyInvalidQ++;
        }
        
        if (q.options.some(c => typeof c === 'string' && (c.includes('Đáp án A') || c.includes('Tác giả phản đối') || c.includes('Đoạn văn chỉ tập trung')))) {
          invalidInLvl++;
          anyInvalidQ++;
        }
      }
    }
  }
  
  console.log(`Level ${lvl.toUpperCase()}: ${data.length} tests, ${lvlQ} questions. Invalids: ${invalidInLvl}`);
}

console.log(`\nGRAND TOTAL: ${grandTotalTests} tests, ${grandTotalQ} questions. Invalids: ${anyInvalidQ}`);
