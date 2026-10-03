import fs from 'fs';

async function inspectGrammarHubData() {
    // Check main Grammar bundle
    const res = await fetch('https://openjlpt.com/assets/Grammar-EU6X_wOu.js');
    const text = await res.text();
    console.log('Grammar-EU6X_wOu.js length:', text.length);

    // Look for curriculum or topics arrays
    const topicMatches = Array.from(text.matchAll(/title:\s*"[^"]+",\s*kanji:\s*"[^"]+"/g));
    console.log('Topic matches with kanji:', topicMatches.length);
    
    // Check curriculum references
    const curriculumImports = Array.from(text.matchAll(/["']([^"']*(?:curriculum|minna|skm|topic|hub|n5|n4|n3|n2|n1)[^"']*\.js)["']/gi)).map(m => m[1]);
    console.log('Curriculum files imported in Grammar:', Array.from(new Set(curriculumImports)));

    // Let's also check minna-curriculum files in scripts
    const files = fs.readdirSync('scripts');
    const minnaFiles = files.filter(f => f.includes('curriculum') || f.includes('minna') || f.includes('skm'));
    console.log('Local curriculum files in scripts:', minnaFiles);
}

inspectGrammarHubData();
