import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scrapedDir = path.resolve(__dirname, '../data/openjlpt/books_scraped');
const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json') && !f.includes('__raw') && !f.includes('__q') && !f.includes('analysis__'));

const stats = {
  N1: { validTests: 0, validQ: 0, books: [] },
  N2: { validTests: 0, validQ: 0, books: [] },
  N3: { validTests: 0, validQ: 0, books: [] },
  N4: { validTests: 0, validQ: 0, books: [] },
  N5: { validTests: 0, validQ: 0, books: [] }
};

function isValidChoice(c) {
  if (!c || typeof c !== 'string') return false;
  const s = c.trim();
  if (!s) return false;
  if (/^Đáp án [ABCD1234]$/i.test(s)) return false;
  if (s.includes('Tác giả phản đối và phủ định')) return false;
  if (s.includes('Đoạn văn chỉ tập trung phê bình')) return false;
  if (s.includes('Nội dung chỉ là trải nghiệm cá nhân')) return false;
  return true;
}

for (const f of files) {
  const lvlMatch = f.match(/n[1-5]/i);
  if (!lvlMatch) continue;
  const lvl = lvlMatch[0].toUpperCase();
  
  try {
    const rawData = JSON.parse(fs.readFileSync(path.join(scrapedDir, f), 'utf-8'));
    const bookData = rawData.default || rawData;
    const tests = bookData.tests || [];
    
    let bookValidTests = 0;
    let bookValidQ = 0;
    
    for (const t of tests) {
      const qs = t.questions || [];
      if (qs.length === 0) continue;
      
      let allQValid = true;
      for (const q of qs) {
        const choices = (q.choices || []).map(c => typeof c === 'object' ? (c.ansText || c.text || '') : String(c));
        if (choices.length < 2) {
          allQValid = false;
          break;
        }
        if (!choices.every(isValidChoice)) {
          allQValid = false;
          break;
        }
        // Question must have genuine stem or audio or passage
        const hasStem = (q.question && q.question.trim().length > 0);
        const hasPassage = (q.passage && (typeof q.passage === 'string' ? q.passage.trim().length > 0 : true));
        const hasAudio = (q.audio || q.audioUrl);
        if (!hasStem && !hasPassage && !hasAudio) {
          allQValid = false;
          break;
        }
      }
      
      if (allQValid) {
        bookValidTests++;
        bookValidQ += qs.length;
      }
    }
    
    if (bookValidTests > 0) {
      stats[lvl].validTests += bookValidTests;
      stats[lvl].validQ += bookValidQ;
      stats[lvl].books.push({ file: f, validTests: bookValidTests, validQ: bookValidQ, totalTests: tests.length });
    }
  } catch(e) {}
}

console.log('=== SUMMARY OF 100% REAL & VALID JLPT TESTS ===');
for (const [lvl, data] of Object.entries(stats)) {
  console.log(`\n--- ${lvl}: ${data.validTests} Standard Tests (${data.validQ.toLocaleString()} Real Questions) across ${data.books.length} Books ---`);
  console.table(data.books.map(b => ({ book: b.file.replace('scraped_' + lvl.toLowerCase() + '_books__', ''), valid: b.validTests, total: b.totalTests, questions: b.validQ })));
}
