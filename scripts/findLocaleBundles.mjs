import fs from 'fs';

async function findLocaleUrls() {
    const res = await fetch('https://openjlpt.com/assets/i18n-BEHEpGWX.js');
    const text = await res.text();
    
    // Find all dynamic imports in this file
    const imports = Array.from(text.matchAll(/["'](\.\/[^"']+\.js)["']/g)).map(m => m[1]);
    console.log('Imports in i18n:', Array.from(new Set(imports)));
    
    // Find vi or particle locale paths
    const viMatches = Array.from(text.matchAll(/["']([^"']*(?:particle|keigo|sheet|vi|grammar)[^"']*)["']/gi)).map(m => m[1]);
    console.log('Vi matches in i18n:', Array.from(new Set(viMatches)));
}

findLocaleUrls();
