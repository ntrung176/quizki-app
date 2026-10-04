import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function seededShuffle(array, seedStr) {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  
  let currentSeed = Math.abs(hash) + 1;
  const rng = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };
  
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resolveAndShuffle(q, qId) {
  const rawChoices = (q.choices || []).map(c => typeof c === 'object' ? (c.ansText || c.text || '') : String(c)).map(s => s.trim());
  if (rawChoices.length < 2) return null;
  
  const rawAns = (q.correctAnswer ?? q.answer ?? q.correct ?? q.ans ?? '').toString().trim();
  
  let correctChoiceText = '';
  const exactIdx = rawChoices.findIndex(c => c === rawAns);
  if (exactIdx !== -1) {
    correctChoiceText = rawChoices[exactIdx];
  } else {
    const num = parseInt(rawAns, 10);
    if (!isNaN(num) && num >= 1 && num <= rawChoices.length) {
      correctChoiceText = rawChoices[num - 1];
    } else {
      correctChoiceText = rawChoices[0];
    }
  }
  
  const shuffledChoices = seededShuffle(rawChoices, qId);
  const newCorrectIdx = shuffledChoices.findIndex(c => c === correctChoiceText);
  
  return {
    options: shuffledChoices,
    correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : 0
  };
}

const scrapedDir = path.resolve(__dirname, '../data/openjlpt/books_scraped');
const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json') && !f.includes('__raw') && !f.includes('__q') && !f.includes('analysis__'));

const dist = { A: 0, B: 0, C: 0, D: 0 };
let count = 0;

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(scrapedDir, f), 'utf-8'));
    const book = data.default || data;
    for (const t of (book.tests || [])) {
      for (let i = 0; i < (t.questions || []).length; i++) {
        const q = t.questions[i];
        const res = resolveAndShuffle(q, `${f}-${t.title || 't'}-${i}`);
        if (res) {
          count++;
          if (res.correctAnswer === 0) dist.A++;
          else if (res.correctAnswer === 1) dist.B++;
          else if (res.correctAnswer === 2) dist.C++;
          else if (res.correctAnswer === 3) dist.D++;
        }
      }
    }
  } catch(e) {}
}

console.log('Total Questions tested:', count);
console.log('Answer Distribution with Deterministic Seeded Shuffle:');
console.table(dist);
console.log('Percentages:', {
  A: (dist.A / count * 100).toFixed(2) + '%',
  B: (dist.B / count * 100).toFixed(2) + '%',
  C: (dist.C / count * 100).toFixed(2) + '%',
  D: (dist.D / count * 100).toFixed(2) + '%'
});
