async function main() {
    try {
        console.log('Fetching OpenJLPT kanjiData chunk...');
        const res = await fetch('https://openjlpt.com/assets/kanjiData-h05BVsbL.js');
        const text = await res.text();
        console.log('Downloaded kanjiData size:', (text.length / 1024).toFixed(1), 'KB');

        // Let's inspect what data is exported or defined in this chunk
        console.log('Preview first 500 chars:');
        console.log(text.slice(0, 500));

        // Let's save it to data/openjlpt/kanjiData.js to parse and inspect
        const fs = await import('fs');
        const path = await import('path');
        const outDir = path.resolve('data/openjlpt');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'kanjiData_openjlpt.js'), text, 'utf-8');
        console.log('Saved to data/openjlpt/kanjiData_openjlpt.js');
    } catch (e) {
        console.error(e);
    }
}

main();
