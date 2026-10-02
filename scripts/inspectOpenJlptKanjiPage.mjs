async function inspect() {
    try {
        const text = await fetch('https://openjlpt.com/assets/index-DIWJCpud.js').then(r => r.text());
        const chunkMatches = [...text.matchAll(/"([^"]+\.js)"/g)].map(m => m[1]);
        console.log('Chunks in index-DIWJCpud:', chunkMatches.filter(c => c.includes('Kanji') || c.includes('kanji') || c.includes('chunk') || c.includes('Detail')));

        // Check if there are other JS files mentioned
        for (const chunk of chunkMatches) {
            if (chunk.toLowerCase().includes('kanji')) {
                const chunkUrl = `https://openjlpt.com/assets/${chunk.replace(/^\.?\/?assets\//, '')}`;
                console.log('Checking chunk:', chunkUrl);
                const chunkContent = await fetch(chunkUrl).then(r => r.text()).catch(e => null);
                if (chunkContent) {
                    console.log(`Chunk ${chunk} size: ${chunkContent.length}`);
                    if (chunkContent.includes('Kho ký ức') || chunkContent.includes('Khai thác') || chunkContent.includes('Âm On / Kun')) {
                        console.log('--> FOUND TARGET PHRASE IN CHUNK:', chunk);
                        const idx = chunkContent.indexOf('Kho ký ức');
                        console.log('Snippet around target:', chunkContent.slice(Math.max(0, idx - 200), idx + 400));
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
inspect();
