async function searchGrammar() {
    try {
        const res = await fetch('https://openjlpt.com/assets/index-D8FZiR3s.js');
        const js = await res.text();
        console.log('Bundle length:', js.length);

        // Find routes
        const routes = Array.from(js.matchAll(/path:["']([^"']+)["']/g)).map(m => m[1]);
        console.log('Routes in bundle:', Array.from(new Set(routes)));

        // Find dynamic imports
        const imports = Array.from(js.matchAll(/import\(["']([^"']+)["']\)/g)).map(m => m[1]);
        console.log('Dynamic imports:', Array.from(new Set(imports)));

        // Search for cloudfront or static URLs
        const cfUrls = Array.from(js.matchAll(/https:\/\/[a-zA-Z0-9_\-\.]+\.cloudfront\.net\/[^\s"'`)<]+/g)).map(m => m[0]);
        console.log('Cloudfront URLs:', Array.from(new Set(cfUrls)));

        // Search for grammar API
        const apis = Array.from(js.matchAll(/["']\/api\/([^"']+)["']/g)).map(m => '/api/' + m[1]);
        console.log('APIs found:', Array.from(new Set(apis)));
    } catch (e) {
        console.error(e);
    }
}

searchGrammar();
