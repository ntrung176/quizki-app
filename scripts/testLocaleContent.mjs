import fs from 'fs';

async function testLocaleContent() {
    const res = await fetch('https://openjlpt.com/assets/sheetKeigo-C0AbBK7M.js');
    const text = await res.text();
    console.log('sheetKeigo length:', text.length);
    console.log(text.slice(0, 1000));
}

testLocaleContent();
