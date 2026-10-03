import fs from 'fs';
import path from 'path';

async function inspectAllGrammarAssets() {
    try {
        const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
        const js = await res.text();
        
        // Find all js imports matching sheet or grammar
        const allMatches = Array.from(js.matchAll(/["']([^"']*(?:[Ss]heet|Grammar|Deep|[Cc]onjugation|giving|passive|particle|keigo|verb)[^"']*\.js)["']/g)).map(m => m[1]);
        const unique = Array.from(new Set(allMatches));
        console.log('Found assets:', unique);
    } catch (e) {
        console.error(e);
    }
}

inspectAllGrammarAssets();
