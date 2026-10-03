import fs from 'fs';

async function parseGrammarStructure() {
    try {
        const res = await fetch('https://openjlpt.com/assets/grammarSheetSearchIndex-CFN6mmTH.js');
        const js = await res.text();
        
        // Extract JSON from `JSON.parse('[...]')`
        const jsonMatch = js.match(/JSON\.parse\('([^']+)'\)/);
        if (jsonMatch) {
            const rawJson = jsonMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
            const data = JSON.parse(rawJson);
            
            // Group by route / topic
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
                if (groups[route].samples.length < 3) {
                    groups[route].samples.push(item.v);
                }
            });
            
            console.log(`Total Search Entries: ${data.length}`);
            console.log(`Total Unique Cheat Sheets / Topics: ${Object.keys(groups).length}\n`);
            
            console.log('--- ALL CHEAT SHEETS & TOPICS ---');
            Object.entries(groups).forEach(([route, info], idx) => {
                console.log(`${idx + 1}. [${route}] -> ${info.titleVi} (${info.itemsCount} entries)`);
                console.log(`   Sample: ${info.samples.join(' | ')}`);
            });
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

parseGrammarStructure();
