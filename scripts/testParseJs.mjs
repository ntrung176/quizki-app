import fs from 'fs';

async function testParseJs() {
    const res = await fetch('https://openjlpt.com/assets/sheetKeigo-C0AbBK7M.js');
    const text = await res.text();
    
    // In JS file, it has `var n={...},h="...",i={...};export{...}`
    // We can evaluate it in a sandbox or function by removing export
    const cleanJs = text.replace(/export\s*\{[^}]*\};?/g, '') + '\n return { title: n?.title || "", ...n, ...g };';
    try {
        const fn = new Function(cleanJs);
        const result = fn();
        console.log('Parsed successfully:', result);
    } catch (e) {
        console.error('Parse error:', e);
    }
}

testParseJs();
