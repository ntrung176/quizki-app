import fs from 'fs';

async function fetchAndAnalyzeKanjiDetail() {
    const res = await fetch('https://openjlpt.com/assets/KanjiDetail-G957m976.js');
    const js = await res.text();
    fs.writeFileSync('data/openjlpt/KanjiDetail_openjlpt.js', js, 'utf-8');
    console.log('Saved KanjiDetail_openjlpt.js. Size:', js.length);

    // Let's also check all datasets or helper functions inside
    console.log('Includes strokeData:', js.includes('stroke'));
    console.log('Includes memory art:', js.includes('kd-memory-art'));
    console.log('Includes flashcard:', js.includes('FLASHCARD'));
    console.log('Includes quy tac chuyen am:', js.includes('QUY TẮC CHUYỂN ÂM') || js.includes('chuyen am'));
}

fetchAndAnalyzeKanjiDetail();
