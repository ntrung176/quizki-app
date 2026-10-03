import fs from 'fs';

async function checkTranslation() {
    const res = await fetch('https://openjlpt.com/assets/usePageTranslation-fYSlzzUZ.js');
    const text = await res.text();
    console.log('usePageTranslation length:', text.length);
    console.log(text.slice(0, 1500));
}

checkTranslation();
