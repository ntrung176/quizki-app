async function inspectGrammarChunks() {
    const chunks = [
        'Grammar-EU6X_wOu.js',
        'GrammarDetail-CNXe-16x.js',
        'ConjugationTables-D7q93ZZq.js',
        'VerbCheatSheet-DEeQwjPm.js',
        'ParticleSheet-uYk8Y_NO.js',
        'KeigoSheet-D-wU8gQW.js',
        'GivingReceivingSheet-B_pN6Qu9.js',
        'ConditionalSheet-Ecru67i-.js'
    ];

    for (const chunk of chunks) {
        console.log(`\n================== Chunk: ${chunk} ==================`);
        try {
            const res = await fetch(`https://openjlpt.com/assets/${chunk}`);
            const js = await res.text();
            console.log(`Length: ${js.length} chars`);
            
            // Check sample content
            console.log('Snippet (first 500 chars):', js.slice(0, 500));

            // Check if there are static data arrays or CloudFront URLs
            const cfUrls = Array.from(js.matchAll(/https:\/\/[a-zA-Z0-9_\-\.]+\.cloudfront\.net\/[^\s"'`)<]+/g)).map(m => m[0]);
            if (cfUrls.length) console.log('CloudFront URLs:', Array.from(new Set(cfUrls)));

            // Check for json files
            const jsonFiles = Array.from(js.matchAll(/["']\/data\/([^"']+)["']/g)).map(m => m[1]);
            if (jsonFiles.length) console.log('JSON files referenced:', Array.from(new Set(jsonFiles)));
        } catch (e) {
            console.error('Error fetching chunk:', e.message);
        }
    }
}

inspectGrammarChunks();
