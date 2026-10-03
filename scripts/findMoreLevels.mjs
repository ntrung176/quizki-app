import fs from 'fs';

async function findMoreLevelFiles() {
    const files = [
        'skmN3Bunpou-DBuCAeK8.js',
        'skmN2Bunpou-B3f1y9g0.js',
        'skmN1Bunpou-C0Y1z7lF.js'
    ];

    // Search index bundle for skm files
    const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
    const text = await res.text();
    const skmMatches = Array.from(text.matchAll(/["']([^"']*(?:skm|Bunpou|GrammarN|N5Grammar|N4Grammar|N3Grammar|N2Grammar|N1Grammar)[^"']*\.js)["']/gi)).map(m => m[1]);
    console.log('All level grammar files:', Array.from(new Set(skmMatches)));
}

findMoreLevelFiles();
