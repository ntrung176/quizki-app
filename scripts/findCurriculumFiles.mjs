import fs from 'fs';

async function findAllCurriculumFiles() {
    const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
    const text = await res.text();
    
    const curMatches = Array.from(text.matchAll(/["']([^"']*(?:curriculum|skm|minna|patterns|dojoMap|GrammarN|DeepDive)[^"']*\.js)["']/gi)).map(m => m[1]);
    console.log('Curriculum & Pattern files found:', Array.from(new Set(curMatches)));
}

findAllCurriculumFiles();
