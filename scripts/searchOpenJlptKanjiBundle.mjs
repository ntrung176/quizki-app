async function main() {
    try {
        const res = await fetch('https://openjlpt.com/assets/index-BLp_TLqR.js');
        const text = await res.text();
        
        // Search around kanji master or n3-speed-kanji
        const pos = text.indexOf('kanji-master');
        if (pos !== -1) {
            console.log('Context around kanji-master:', text.slice(Math.max(0, pos - 200), pos + 300));
        }

        const pos2 = text.indexOf('speed-kanji');
        if (pos2 !== -1) {
            console.log('Context around speed-kanji:', text.slice(Math.max(0, pos2 - 200), pos2 + 300));
        }

        const pos3 = text.indexOf('/kanji"');
        if (pos3 !== -1) {
            console.log('Context around /kanji":', text.slice(Math.max(0, pos3 - 200), pos3 + 300));
        }

        // Look for imports or dynamic imports like import("./
        const importMatches = [...text.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
        console.log('Dynamic imports in text:', importMatches);

        // Or __vite_preload or similar
        const preloadMatches = [...text.matchAll(/"([^"]+\.js)"/g)].map(m => m[1]).filter(f => f.includes('Kanji') || f.includes('kanji') || f.includes('Screen') || f.includes('View'));
        console.log('Matching js files:', preloadMatches);
    } catch (e) {
        console.error(e);
    }
}

main();
