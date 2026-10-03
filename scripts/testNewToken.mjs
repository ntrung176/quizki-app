import fs from 'fs';

async function testFetchObject(key, hash) {
    const url = `https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/content-v1/objects/${hash}.json`;
    console.log(`Fetching ${key} from ${url}...`);
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    if (res.ok) {
        const text = await res.text();
        console.log(`Size: ${text.length} bytes`);
        const json = JSON.parse(text);
        const val = json.value || json;
        console.log('Keys:', typeof val === 'object' ? Object.keys(val) : typeof val);
        if (Array.isArray(val)) {
            console.log(`Array of ${val.length} items. Sample item:`, val[0]);
        } else if (typeof val === 'object') {
            const firstKey = Object.keys(val)[0];
            console.log(`Object with key ${firstKey}:`, val[firstKey]);
        }
    }
}

async function run() {
    await testFetchObject('scraped_n1_books/speed_goi_n1.json', '2dc7c60e3ad9dda9f9bb0689c231fc9bee55b095bac16336c9365a66dadbbae5');
    await testFetchObject('scraped_n2_books/speed_goi_n2.json', '9d7b32c89b2032f0373ccde6e8284ad2a62fcceef2ebbbd7b8d4663c974679fe');
    await testFetchObject('scraped_n3_books/speed_goi_n3.json', '0f641499e6e375e4d48fd41dd5eae32b8da3456a274837744fe0187c876b9ce9');
    await testFetchObject('scraped_n4_books/speedgoi_n4.json', '875efed117e68fcb7be49c14aadb5fab44acccddf80d25be9d5a178efe5459a6');
}

run().catch(console.error);
