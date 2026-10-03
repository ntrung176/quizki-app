import fs from 'fs';

async function listAllLocaleFiles() {
    const res = await fetch('https://openjlpt.com/assets/i18n-BEHEpGWX.js');
    const text = await res.text();
    
    // Find all locale map entries
    // Usually formatted as "./locales/vi/sheetKeigo.json": () => import("./sheetKeigo-*.js")
    const matches = Array.from(text.matchAll(/["'](\.\/locales\/[a-z]{2}\/[^"']+\.json)["']\s*:\s*[^,;]+?["'](\.\/[^"']+\.js)["']/g));
    
    console.log(`Found ${matches.length} locale imports:`);
    const viLocales = [];
    matches.forEach(m => {
        const jsonPath = m[1];
        const jsFile = m[2];
        if (jsonPath.includes('/vi/')) {
            viLocales.push({ jsonPath, jsFile: jsFile.replace('./', '') });
        }
    });

    console.log(`Total Vietnamese locales: ${viLocales.length}`);
    viLocales.forEach(v => console.log(`${v.jsonPath} -> ${v.jsFile}`));
}

listAllLocaleFiles();
