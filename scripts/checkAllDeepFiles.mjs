import fs from 'fs';

async function checkAllDeepFiles() {
    const files = [
        'n5GrammarDeep-CgL_BzBr.js',
        'n4GrammarDeep-DxcLWTOX.js',
        'n3GrammarDeep-CMdHpsYW.js',
        'n2GrammarDeep-CAgaqBld.js',
        'grammarDrills-C3S35L8R.js'
    ];

    for (const f of files) {
        try {
            const res = await fetch(`https://openjlpt.com/assets/${f}`);
            const text = await res.text();
            console.log(`\n================== ${f} (${(text.length/1024).toFixed(1)} KB) ==================`);
            const patterns = Array.from(text.matchAll(/pattern:\s*"([^"]+)"/g)).map(m => m[1]);
            console.log(`Patterns count: ${patterns.length}`);
            console.log('Sample patterns:', patterns.slice(0, 8));
        } catch (e) {
            console.error(f, e.message);
        }
    }
}

checkAllDeepFiles();
