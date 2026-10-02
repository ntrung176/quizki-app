async function main() {
    try {
        const res = await fetch('https://openjlpt.com');
        const html = await res.text();
        const scriptUrls = [];
        const regex = /src="([^"]+\.js[^"]*)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            scriptUrls.push(match[1]);
        }
        console.log('Script URLs on openjlpt.com:', scriptUrls);

        for (const sUrl of scriptUrls) {
            const fullUrl = sUrl.startsWith('http') ? sUrl : `https://openjlpt.com${sUrl}`;
            console.log('Fetching:', fullUrl);
            const sRes = await fetch(fullUrl);
            const text = await sRes.text();
            console.log(`Length of ${sUrl}:`, text.length);

            // Search for routes or kanji
            const kanjiMatches = text.match(/\/api\/content\/[a-zA-Z0-9_\-\/]+/g);
            if (kanjiMatches) {
                console.log('Found API endpoints in script:', [...new Set(kanjiMatches)]);
            }
            const routes = text.match(/"\/[a-zA-Z0-9_\-\/]+"/g);
            const candidateRoutes = [...new Set(routes || [])].filter(r => r.toLowerCase().includes('kanji') || r.toLowerCase().includes('han') || r.toLowerCase().includes('on-thi') || r.toLowerCase().includes('dojo'));
            console.log('Interesting routes:', candidateRoutes);
        }
    } catch (e) {
        console.error(e);
    }
}

main();
