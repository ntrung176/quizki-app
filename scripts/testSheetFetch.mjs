import fs from 'fs';

async function testFetchSheet() {
    const sampleFiles = [
        'KeigoSheet-B6UJWnHn.js',
        'GivingReceivingSheet-B_pN6Qu9.js',
        'ConditionalSheet-Ecru67i-.js',
        'PassiveCausativeSheet-DuP-EBsq.js',
        'particle-page-data-DuhrfwQ2.js',
        'TransitivitySheet-D0yjIadI.js'
    ];

    for (const f of sampleFiles) {
        console.log(`\n================== ${f} ==================`);
        const res = await fetch(`https://openjlpt.com/assets/${f}`);
        const text = await res.text();
        console.log(`Length: ${text.length} chars`);
        // Find arrays or objects in the file
        console.log('Snippet (first 800 chars):', text.slice(0, 800));
    }
}

testFetchSheet();
