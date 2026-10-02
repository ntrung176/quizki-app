async function main() {
    try {
        const res = await fetch('https://openjlpt.com/assets/index-BLp_TLqR.js');
        const text = await res.text();
        
        // Find all dynamic chunk imports
        const chunkMatches = text.match(/\/assets\/[a-zA-Z0-9_\-]+\.js/g);
        console.log('Dynamic chunks found in bundle:', [...new Set(chunkMatches || [])]);

        // Search for all /api/ endpoints
        const apiMatches = text.match(/\/api\/[a-zA-Z0-9_\-\/]+/g);
        console.log('All API endpoints found:', [...new Set(apiMatches || [])]);

        // Search for data JSON URLs
        const jsonMatches = text.match(/\/data\/[a-zA-Z0-9_\-\/]+\.json/g);
        console.log('JSON URLs found:', [...new Set(jsonMatches || [])]);
    } catch (e) {
        console.error(e);
    }
}

main();
