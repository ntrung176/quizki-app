import fs from 'fs';

function cleanSummaryForOption(raw) {
    if (!raw) return '';
    let s = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Strip trailing memo numbers like '1. こと: ...' or '1. 【...】'
    s = s.replace(/\d+\.\s*(?:【[^】]+】|[^\s:]+)\s*[:：][\s\S]*$/, '');
    // Strip trailing Japanese sentences '► ...'
    s = s.replace(/[►►]\s*[\s\S]*$/, '');
    // Strip trailing 'Giải thích đúng sai...'
    s = s.replace(/Giải thích đúng sai[\s\S]*$/, '');
    // Strip trailing translations
    s = s.replace(/Dịch nghĩa[\s\S]*$/, '');
    s = s.trim();

    // Take complete sentences
    const sentences = s.match(/[^.!?]+[.!?]+/g) || [s];
    if (sentences.length >= 2) {
        const two = (sentences[0] + ' ' + sentences[1]).trim();
        if (two.length <= 220) {
            s = two;
        } else {
            s = sentences[0].trim();
        }
    } else if (sentences.length === 1) {
        s = sentences[0].trim();
    }
    return s.trim();
}

const f = 'data/openjlpt/books_scraped/scraped_n1_books__fujidokkai_n1.json';
const d = JSON.parse(fs.readFileSync(f, 'utf8'));
const tests = d.default ? d.default.tests : d.tests;

for (let i = 0; i < 5; i++) {
    const q = tests[i].questions[0];
    const html = q.explanationHtml || '';
    const tomtatMatch = html.match(/<div class="col-12 tomtat"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    const raw = tomtatMatch ? tomtatMatch[1] : q.explanationText;
    console.log(`\n--- Test ${i + 1} (${tests[i].title}) ---`);
    console.log('Clean Option A:', cleanSummaryForOption(raw));
}
