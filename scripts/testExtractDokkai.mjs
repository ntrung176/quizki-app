import fs from 'fs';

const f = 'data/openjlpt/books_scraped/scraped_n1_books__shin_dokkai_n1.json';
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
const tests = d.default ? d.default.tests : d.tests;

tests.slice(0, 3).forEach((t, i) => {
    const q = t.questions[0];
    const html = q.explanationHtml || '';
    
    // Extract Japanese passage
    const jpMatch = html.match(/<div class="jlpt-lesson-cauhoi">\s*<p>([\s\S]*?)<\/p>/i);
    const vnMatch = html.match(/<p class="bg-cauvn">([\s\S]*?)<\/p>/i);
    const tomtatMatch = html.match(/<div class="col-12 tomtat"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    const memoMatch = html.match(/<div class="col-12 memo"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    
    console.log(`\n--- Test ${i + 1} (${t.title}) ---`);
    console.log('JP Passage:', jpMatch ? jpMatch[1].trim() : 'NONE');
    console.log('VN Translation:', vnMatch ? vnMatch[1].trim() : 'NONE');
    console.log('Summary (Tóm tắt):', tomtatMatch ? tomtatMatch[1].trim() : 'NONE');
    console.log('Memo/Grammar:', memoMatch ? memoMatch[1].trim() : 'NONE');
});
