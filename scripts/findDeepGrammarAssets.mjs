import fs from 'fs';

async function findAllDeepGrammarFiles() {
    const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
    const text = await res.text();
    
    const deepMatches = Array.from(text.matchAll(/["']([^"']*(?:Deep|Story|Galaxy|Roadmap|Drill)[^"']*\.js)["']/gi)).map(m => m[1]);
    console.log('Deep / Story assets found:', Array.from(new Set(deepMatches)));
}

findAllDeepGrammarFiles();
