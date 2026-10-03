import fs from 'fs';

async function inspectDeepStructure() {
    const res = await fetch('https://openjlpt.com/assets/n3GrammarDeep-CMdHpsYW.js');
    const text = await res.text();
    
    // Find all patterns
    const patterns = Array.from(text.matchAll(/pattern:\s*"([^"]+)"/g)).map(m => m[1]);
    console.log(`Total deep grammar patterns in file: ${patterns.length}`);
    console.log('Sample patterns:', patterns.slice(0, 15));
    
    // Let's print 1 full sample object
    const sampleStart = text.indexOf('{pattern:"〜だって"');
    if (sampleStart !== -1) {
        // find end of this object or next pattern
        const nextPattern = text.indexOf('{pattern:', sampleStart + 20);
        console.log('\n--- FULL DEEP GRAMMAR OBJECT SAMPLE (〜だって) ---');
        console.log(text.slice(sampleStart, nextPattern > 0 ? nextPattern : sampleStart + 2500));
    }
}

inspectDeepStructure();
