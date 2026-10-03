import fs from 'fs';

async function inspectTranslations() {
    const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
    const text = await res.text();
    
    // Search for translation or particle chunks or i18n
    const locMatches = Array.from(text.matchAll(/["']([^"']*(?:translation|particle|lang|i18n|vi|vn|locales)[^"']*\.js)["']/gi)).map(m => m[1]);
    console.log('Locale / Translation chunks:', Array.from(new Set(locMatches)));
}

inspectTranslations();
