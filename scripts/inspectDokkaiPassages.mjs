import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scrapedDir = path.resolve(__dirname, '../data/openjlpt/books_scraped');
const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json') && !f.includes('__raw') && !f.includes('__q') && !f.includes('analysis__'));

const dokkaiFiles = files.filter(f => f.includes('dokkai') || f.includes('doc'));
console.log('Dokkai files count:', dokkaiFiles.length);

for (const f of dokkaiFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(scrapedDir, f), 'utf-8'));
  const bookData = data.default || data;
  const tests = bookData.tests || [];
  
  let testsWithPassage = 0;
  let qWithPassage = 0;
  let totalTests = tests.length;
  let samplePassage = '';
  
  for (const t of tests) {
    const tp = t.passage || t.passageData || t.readingText || t.passageHtml;
    if (tp) {
      testsWithPassage++;
      if (!samplePassage) samplePassage = typeof tp === 'object' ? (tp.body || tp.text || JSON.stringify(tp)) : String(tp);
    }
    for (const q of (t.questions || [])) {
      if (q.passage || q.passageData || q.readingText) qWithPassage++;
    }
  }
  
  console.log(`${f}: ${totalTests} tests, testsWithPassage=${testsWithPassage}, qWithPassage=${qWithPassage}, sampleLen=${samplePassage.length}`);
}
