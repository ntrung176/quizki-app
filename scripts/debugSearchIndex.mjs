import fs from 'fs';

async function testFetch() {
    const res = await fetch('https://openjlpt.com/assets/grammarSheetSearchIndex-CFN6mmTH.js');
    const text = await res.text();
    console.log('Downloaded length:', text.length);
    const startIdx = text.indexOf('JSON.parse(');
    console.log('JSON.parse index:', startIdx);
    if (startIdx !== -1) {
        const sliced = text.slice(startIdx, startIdx + 300);
        console.log('Snippet:', sliced);
    }
}

testFetch();
