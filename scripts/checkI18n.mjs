import fs from 'fs';

async function checkI18n() {
    const res = await fetch('https://openjlpt.com/assets/i18n-BEHEpGWX.js');
    const text = await res.text();
    console.log('i18n length:', text.length);
    console.log(text.slice(0, 2000));
}

checkI18n();
