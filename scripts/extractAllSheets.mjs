import fs from 'fs';

async function parseIndex() {
    const res = await fetch('https://openjlpt.com/assets/grammarSheetSearchIndex-CFN6mmTH.js');
    const text = await res.text();
    
    // Find the string inside JSON.parse('...')
    const firstQuote = text.indexOf("JSON.parse('") + "JSON.parse('".length;
    const lastQuote = text.lastIndexOf("')");
    const jsonStr = text.slice(firstQuote, lastQuote);
    
    // Unescape
    const cleanJson = jsonStr.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    const data = JSON.parse(cleanJson);
    
    const groups = {};
    data.forEach(item => {
        const route = item.r;
        if (!groups[route]) {
            groups[route] = {
                titleVi: item.s || item.v,
                titleEn: item.e,
                itemsCount: 0,
                samples: []
            };
        }
        groups[route].itemsCount++;
        if (groups[route].samples.length < 4) {
            groups[route].samples.push(item.v);
        }
    });

    console.log(`\n================ OPENJLPT GRAMMAR SYSTEM BREAKDOWN ================`);
    console.log(`Total Search Entries: ${data.length}`);
    console.log(`Total Sheets / Topics: ${Object.keys(groups).length}\n`);

    Object.entries(groups).forEach(([route, info], idx) => {
        console.log(`${(idx + 1).toString().padStart(2, ' ')}. [${route}]`);
        console.log(`    Tiêu đề : ${info.titleVi} (${info.titleEn})`);
        console.log(`    Số mục  : ${info.itemsCount}`);
        console.log(`    Ví dụ   : ${info.samples.join(' | ')}`);
        console.log('');
    });
}

parseIndex();
